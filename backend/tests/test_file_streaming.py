import os
from pathlib import Path
from datetime import datetime, timezone
import pytest
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.core.security import create_access_token


@pytest.fixture
def sample_pdf_doc(db_session, auth_headers):
    user_id = int(auth_headers["User-Id"])

    # Create dummy pdf file on disk
    upload_dir = Path("uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"test_streaming_{user_id}.pdf"
    file_path.write_bytes(b"%PDF-1.5 test pdf content stream bytes")

    doc = Document(
        user_id=user_id,
        filename="test_streaming.pdf",
        file_path=str(file_path),
        file_size=len(file_path.read_bytes()),
        mime_type="application/pdf",
        sha256_hash="hash_stream_pdf",
        status="indexed",
        title="Test Streaming Paper",
        total_pages=5,
        total_chunks=2,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    c1 = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        page_number=1,
        text="Introduction passage chunk for streaming test.",
        token_count=10,
        created_at=datetime.now(timezone.utc),
    )
    c2 = DocumentChunk(
        document_id=doc.id,
        chunk_index=1,
        page_number=2,
        text="Methodology passage chunk for streaming test.",
        token_count=12,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    yield doc

    if file_path.exists():
        file_path.unlink()
    db_session.delete(doc)
    db_session.commit()


def test_stream_pdf_file_authenticated(client, auth_headers, sample_pdf_doc):
    resp = client.get(f"/api/documents/{sample_pdf_doc.id}/file", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "inline" in resp.headers["content-disposition"]
    assert b"%PDF-1.5" in resp.content


def test_stream_pdf_file_with_query_token(client, auth_headers, sample_pdf_doc):
    user_id = int(auth_headers["User-Id"])
    token = create_access_token(user_id)

    # In iframe embeds, auth token is provided via ?token= query parameter without headers
    resp = client.get(f"/api/documents/{sample_pdf_doc.id}/file?token={token}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert b"%PDF-1.5" in resp.content


def test_stream_file_unauthorized_fails(client, sample_pdf_doc):
    resp = client.get(f"/api/documents/{sample_pdf_doc.id}/file")
    assert resp.status_code == 401


def test_stream_file_idor_protection(client, auth_headers_user2, sample_pdf_doc):
    # Other user should not be able to stream user 1's private document
    resp = client.get(f"/api/documents/{sample_pdf_doc.id}/file", headers=auth_headers_user2)
    assert resp.status_code == 404


def test_get_document_chunks_ordered(client, auth_headers, sample_pdf_doc):
    resp = client.get(f"/api/documents/{sample_pdf_doc.id}/chunks", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["chunk_index"] == 0
    assert data[0]["page_number"] == 1
    assert data[1]["chunk_index"] == 1
    assert data[1]["page_number"] == 2
