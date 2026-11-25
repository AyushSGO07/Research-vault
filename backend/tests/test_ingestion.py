from pathlib import Path
import pymupdf
import pytest
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.services.ingestion import process_document_background


@pytest.fixture
def sample_pdf_on_disk(tmp_path):
    pdf_file = tmp_path / "ingestion_test.pdf"
    doc = pymupdf.open()
    
    p1 = doc.new_page(width=612, height=792)
    p1.insert_text(pymupdf.Point(72, 100), "Transformer Scaling Laws", fontsize=20)
    p1.insert_text(pymupdf.Point(72, 130), "Jared Kaplan, Sam McCandlish", fontsize=11)
    p1.insert_text(pymupdf.Point(72, 160), "doi: 10.48550/arXiv.2001.08361", fontsize=9)
    p1.insert_text(
        pymupdf.Point(72, 200),
        "Abstract: We study empirical scaling laws for language model performance. 1 Introduction",
        fontsize=10
    )

    p2 = doc.new_page(width=612, height=792)
    p2.insert_text(pymupdf.Point(72, 100), "Performance depends strongly on scale, and relatively weakly on model shape.", fontsize=11)

    doc.save(str(pdf_file))
    doc.close()
    return str(pdf_file)


def test_process_document_background_success(db_session, sample_pdf_on_disk):
    user = User(
        name="Scaling Researcher",
        email="scaling@vault.edu",
        hashed_password="pw"
    )
    db_session.add(user)
    db_session.commit()

    doc = Document(
        user_id=user.id,
        filename="ingestion_test.pdf",
        file_path=sample_pdf_on_disk,
        file_size=Path(sample_pdf_on_disk).stat().st_size,
        mime_type="application/pdf",
        sha256_hash="test_scaling_hash_123",
        status="uploaded"
    )
    db_session.add(doc)
    db_session.commit()
    doc_id = doc.id

    # Execute background worker synchronously
    process_document_background(doc_id)

    # Re-fetch from database
    db_session.expire_all()
    updated_doc = db_session.query(Document).filter(Document.id == doc_id).first()

    assert updated_doc.status == "indexed"
    assert updated_doc.error_message is None
    assert updated_doc.total_pages == 2
    assert updated_doc.total_chunks >= 1
    assert updated_doc.title == "Transformer Scaling Laws"
    assert updated_doc.doi == "10.48550/arXiv.2001.08361"
    assert "empirical scaling laws" in updated_doc.abstract

    # Verify chunks persisted
    chunks = (
        db_session.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )
    assert len(chunks) == updated_doc.total_chunks
    assert chunks[0].page_number in [1, 2]
    assert chunks[0].token_count > 0


def test_process_document_background_failure(db_session):
    user = User(
        name="Failure Researcher",
        email="failure@vault.edu",
        hashed_password="pw"
    )
    db_session.add(user)
    db_session.commit()

    doc = Document(
        user_id=user.id,
        filename="nonexistent.pdf",
        file_path="/tmp/nonexistent_file_path_12345.pdf",
        file_size=100,
        mime_type="application/pdf",
        sha256_hash="failure_hash_999",
        status="uploaded"
    )
    db_session.add(doc)
    db_session.commit()
    doc_id = doc.id

    # Execute background worker synchronously on invalid file
    process_document_background(doc_id)

    db_session.expire_all()
    updated_doc = db_session.query(Document).filter(Document.id == doc_id).first()

    assert updated_doc.status == "failed"
    assert updated_doc.error_message is not None
    assert len(updated_doc.error_message) > 0
