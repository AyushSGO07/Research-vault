import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings
from app.models.document import DocumentChunk
from app.services.embeddings import embedding_service

logger = logging.getLogger(__name__)


class ChromaVectorStore:
    """
    Persistent ChromaDB vector store repository with cosine similarity space
    and strict multi-tenant user isolation.
    """
    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or settings.CHROMA_PERSIST_DIRECTORY
        Path(self.persist_dir).mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection_name = settings.CHROMA_COLLECTION_NAME
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(
        self,
        chunks: List[DocumentChunk],
        metadata_extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Embed and persist document chunks into ChromaDB with metadata.
        """
        if not chunks:
            return

        extra = metadata_extra or {}
        user_id = extra.get("user_id")
        title = extra.get("title") or ""
        doi = extra.get("doi") or ""
        pub_year = extra.get("publication_year") or 0

        texts = [c.text for c in chunks]
        embeddings = embedding_service.embed_documents(texts)

        ids = [f"chunk_{c.id}" for c in chunks]
        metadatas = [
            {
                "chunk_id": c.id,
                "document_id": c.document_id,
                "chunk_index": c.chunk_index,
                "page_number": c.page_number,
                "user_id": user_id,
                "title": title,
                "doi": doi,
                "publication_year": pub_year,
            }
            for c in chunks
        ]

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )
        logger.info(f"Persisted {len(chunks)} chunks to ChromaDB collection '{self.collection_name}'.")

    def query_similar(
        self,
        query_text: str,
        user_id: int,
        top_k: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Execute cosine similarity search against user's chunks in ChromaDB.
        Enforces user_id filter to prevent cross-tenant IDOR leakage.
        """
        total_count = self.collection.count()
        if total_count == 0:
            return []

        query_vector = embedding_service.embed_text(query_text)
        actual_k = min(top_k, total_count)

        try:
            results = self.collection.query(
                query_embeddings=[query_vector],
                n_results=actual_k,
                where={"user_id": user_id},
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.warning(f"ChromaDB query failed: {e}")
            return []

        if not results or not results["ids"] or not results["ids"][0]:
            return []

        matched: List[Dict[str, Any]] = []
        ids = results["ids"][0]
        distances = results["distances"][0] if results.get("distances") else [0.0] * len(ids)
        metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(ids)
        documents = results["documents"][0] if results.get("documents") else [""] * len(ids)

        for i in range(len(ids)):
            meta = metadatas[i] or {}
            # Cosine distance in Chroma: d in [0, 2]. Cosine similarity: s = 1.0 - d
            dist = distances[i] if distances[i] is not None else 1.0
            similarity = max(0.0, min(1.0, 1.0 - dist))

            matched.append({
                "chunk_id": meta.get("chunk_id"),
                "document_id": meta.get("document_id"),
                "chunk_index": meta.get("chunk_index"),
                "page_number": meta.get("page_number"),
                "text": documents[i],
                "similarity": similarity,
                "title": meta.get("title"),
                "doi": meta.get("doi"),
                "publication_year": meta.get("publication_year"),
            })

        return matched

    def delete_document_chunks(self, document_id: int) -> None:
        """
        Delete all vector embeddings associated with a document_id.
        """
        try:
            self.collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted vector chunks for document_id {document_id} from ChromaDB.")
        except Exception as e:
            logger.warning(f"Failed to delete ChromaDB vectors for doc {document_id}: {e}")


vector_store = ChromaVectorStore()
