from datetime import datetime, timezone
from app.models.user import User
from app.models.document import Document, DocumentChunk


def test_document_and_chunk_creation(db_session):
    user = User(
        name="Dr. Test Researcher",
        email="researcher@vault.edu",
        hashed_password="hashed_pw_xyz"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    doc = Document(
        user_id=user.id,
        filename="attention_paper.pdf",
        file_path="/uploads/uuid_attention.pdf",
        file_size=1048576,
        mime_type="application/pdf",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status="uploaded",
        title="Attention Is All You Need",
        authors="Vaswani et al.",
        publication_year=2017,
        abstract="The dominant sequence transduction models...",
        doi="10.48550/arXiv.1706.03762",
        total_pages=15,
        total_chunks=25
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    assert doc.id is not None
    assert doc.created_at is not None
    assert doc.status == "uploaded"

    chunk1 = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        page_number=1,
        text="Attention mechanisms have become an integral part of sequence modeling.",
        token_count=12,
        content_hash="abc123hash"
    )
    chunk2 = DocumentChunk(
        document_id=doc.id,
        chunk_index=1,
        page_number=1,
        text="In this work we propose the Transformer, a model architecture relying entirely on attention.",
        token_count=16,
        content_hash="def456hash"
    )
    db_session.add_all([chunk1, chunk2])
    db_session.commit()

    db_session.refresh(doc)
    assert len(doc.chunks) == 2
    assert doc.chunks[0].chunk_index == 0
    assert doc.chunks[1].chunk_index == 1


def test_cascade_delete_document_chunks(db_session):
    user = User(
        name="Cascade User",
        email="cascade@vault.edu",
        hashed_password="pw"
    )
    db_session.add(user)
    db_session.commit()

    doc = Document(
        user_id=user.id,
        filename="to_delete.pdf",
        file_path="/uploads/delete.pdf",
        file_size=2048,
        mime_type="application/pdf",
        sha256_hash="hash123",
        status="indexed"
    )
    db_session.add(doc)
    db_session.commit()

    chunk = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        page_number=1,
        text="Sample chunk for deletion",
        token_count=5,
        content_hash="hash"
    )
    db_session.add(chunk)
    db_session.commit()

    doc_id = doc.id
    chunk_id = chunk.id

    # Delete the document
    db_session.delete(doc)
    db_session.commit()

    # Verify both document and its chunks are removed
    assert db_session.query(Document).filter(Document.id == doc_id).first() is None
    assert db_session.query(DocumentChunk).filter(DocumentChunk.id == chunk_id).first() is None


def test_cascade_delete_user_documents(db_session):
    user = User(
        name="User To Delete",
        email="delete_user@vault.edu",
        hashed_password="pw"
    )
    db_session.add(user)
    db_session.commit()

    doc = Document(
        user_id=user.id,
        filename="user_doc.pdf",
        file_path="/uploads/user_doc.pdf",
        file_size=1024,
        mime_type="application/pdf",
        sha256_hash="hashuser123",
        status="indexed"
    )
    db_session.add(doc)
    db_session.commit()

    user_id = user.id
    doc_id = doc.id

    # Delete the user
    db_session.delete(user)
    db_session.commit()

    # Verify user and their documents are deleted
    assert db_session.query(User).filter(User.id == user_id).first() is None
    assert db_session.query(Document).filter(Document.id == doc_id).first() is None
