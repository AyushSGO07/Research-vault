import logging
from typing import Optional
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.database.session import SessionLocal
from app.models.document import Document, DocumentChunk
from app.services.extractor import DocumentExtractor
from app.services.chunker import SemanticChunker

logger = logging.getLogger(__name__)


def process_document_background(
    document_id: int,
    session_factory: Optional[sessionmaker] = None,
) -> None:
    """
    Background worker function that performs text extraction, academic metadata
    recovery, and semantic chunking using an isolated database session.
    """
    factory = session_factory or SessionLocal
    db = factory()
    try:
        # Step 1: Retrieve Document & Transition to Processing
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Background worker: Document {document_id} not found in database.")
            return

        doc.status = "processing"
        db.commit()

        # Step 2: Multi-format text and academic metadata extraction
        extracted = DocumentExtractor.extract(doc.file_path, doc.mime_type)
        meta = extracted.get("metadata", {})

        # Preserve existing metadata if set (e.g. from authoritative external repository import)
        doc.title = doc.title or meta.get("title") or doc.filename
        doc.authors = doc.authors or meta.get("authors")
        doc.publication_year = doc.publication_year or meta.get("publication_year")
        doc.abstract = doc.abstract or meta.get("abstract")
        doc.doi = doc.doi or meta.get("doi")
        doc.journal = doc.journal or meta.get("journal")
        doc.domain = doc.domain or meta.get("domain") or "Computer Science"
        doc.document_type = doc.document_type or meta.get("document_type") or "Preprint"
        doc.total_pages = extracted.get("total_pages", 0)

        # Step 3: Semantic Chunking (800-token target, 120-token overlap)
        chunker = SemanticChunker(
            target_tokens=settings.CHUNK_TARGET_TOKENS,
            overlap_tokens=settings.CHUNK_OVERLAP_TOKENS,
        )
        chunks_data = chunker.chunk_document(extracted.get("pages", []))

        # Step 4: Persist Chunks & Transition to Indexed
        db_chunks = [
            DocumentChunk(
                document_id=doc.id,
                chunk_index=c["chunk_index"],
                page_number=c["page_number"],
                text=c["text"],
                token_count=c["token_count"],
                content_hash=c["content_hash"],
            )
            for c in chunks_data
        ]
        db.add_all(db_chunks)

        doc.total_chunks = len(chunks_data)
        doc.status = "indexed"
        doc.error_message = None
        db.commit()

        # Step 5: Index vectors into ChromaDB
        try:
            from app.database.vector_store import vector_store
            vector_store.add_chunks(
                db_chunks,
                metadata_extra={
                    "user_id": doc.user_id,
                    "title": doc.title,
                    "doi": doc.doi,
                    "publication_year": doc.publication_year,
                    "domain": doc.domain,
                    "document_type": doc.document_type,
                }
            )
        except Exception as vec_err:
            logger.warning(f"Failed to index chunks into ChromaDB for document {doc.id}: {vec_err}")

        logger.info(
            f"Successfully processed document {doc.id} ({doc.filename}): "
            f"{doc.total_pages} pages, {doc.total_chunks} chunks."
        )

    except Exception as e:
        db.rollback()
        logger.exception(f"Background ingestion failed for document {document_id}: {e}")
        try:
            failed_doc = db.query(Document).filter(Document.id == document_id).first()
            if failed_doc:
                failed_doc.status = "failed"
                failed_doc.error_message = str(e)
                db.commit()
        except Exception as update_err:
            logger.exception(f"Failed to record failure status for document {document_id}: {update_err}")
    finally:
        db.close()
