import io
import pymupdf
import pytest
from app.core.config import settings
from app.models.document import Document


def create_minimal_pdf_bytes():
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text(pymupdf.Point(72, 100), "Academic Test Document", fontsize=16)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_upload_pdf_success(client, auth_headers):
    pdf_bytes = create_minimal_pdf_bytes()
    files = {"file": ("test_paper.pdf", pdf_bytes, "application/pdf")}

    response = client.post("/api/documents/upload", files=files, headers=auth_headers)
    assert response.status_code == 202
    data = response.json()
    assert data["filename"] == "test_paper.pdf"
    assert data["status"] == "uploaded"
    assert data["is_duplicate"] is False
    assert "sha256_hash" in data
    assert "id" in data


def test_upload_sha256_deduplication(client, auth_headers):
    pdf_bytes = create_minimal_pdf_bytes()
    files1 = {"file": ("first_upload.pdf", pdf_bytes, "application/pdf")}

    # First upload
    res1 = client.post("/api/documents/upload", files=files1, headers=auth_headers)
    assert res1.status_code in [200, 202]
    first_id = res1.json()["id"]

    # Second upload with identical bytes
    files2 = {"file": ("second_upload.pdf", pdf_bytes, "application/pdf")}
    res2 = client.post("/api/documents/upload", files=files2, headers=auth_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_duplicate"] is True
    assert data2["id"] == first_id
    assert "already exists in your library" in data2["message"]


def test_upload_size_limit_enforced(client, auth_headers, monkeypatch):
    # Temporarily set max size to 1000 bytes to test streaming limit without 50MB RAM allocation
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE", 1000)

    oversized_bytes = b"%PDF-" + (b"0" * 2000)
    files = {"file": ("large_paper.pdf", oversized_bytes, "application/pdf")}

    response = client.post("/api/documents/upload", files=files, headers=auth_headers)
    assert response.status_code == 413
    assert "exceeds maximum allowed size" in response.json()["detail"]


def test_upload_invalid_extension(client, auth_headers):
    files = {"file": ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/octet-stream")}
    response = client.post("/api/documents/upload", files=files, headers=auth_headers)
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_upload_magic_bytes_mismatch(client, auth_headers):
    # File has .pdf extension but plain text content
    fake_pdf = b"This is plainly not a real PDF file."
    files = {"file": ("corrupted.pdf", fake_pdf, "application/pdf")}
    response = client.post("/api/documents/upload", files=files, headers=auth_headers)
    assert response.status_code == 400
    assert "File content does not match" in response.json()["detail"]


def test_get_document_status_and_detail(client, auth_headers):
    pdf_bytes = create_minimal_pdf_bytes()
    files = {"file": ("status_test.pdf", pdf_bytes, "application/pdf")}
    res = client.post("/api/documents/upload", files=files, headers=auth_headers)
    doc_id = res.json()["id"]

    # Status endpoint
    status_res = client.get(f"/api/documents/{doc_id}/status", headers=auth_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["id"] == doc_id
    assert status_data["filename"] == "status_test.pdf"

    # Detail endpoint
    detail_res = client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == doc_id


def test_document_idor_protection(client, auth_headers, auth_headers_user2):
    pdf_bytes = create_minimal_pdf_bytes()
    files = {"file": ("user1_paper.pdf", pdf_bytes, "application/pdf")}
    res = client.post("/api/documents/upload", files=files, headers=auth_headers)
    doc_id = res.json()["id"]

    # User 2 attempts to view User 1's document status
    idor_res = client.get(f"/api/documents/{doc_id}/status", headers=auth_headers_user2)
    assert idor_res.status_code == 404

    # User 2 attempts to delete User 1's document
    delete_idor = client.delete(f"/api/documents/{doc_id}", headers=auth_headers_user2)
    assert delete_idor.status_code == 404


def test_delete_document_success(client, auth_headers):
    pdf_bytes = create_minimal_pdf_bytes()
    files = {"file": ("delete_me.pdf", pdf_bytes, "application/pdf")}
    res = client.post("/api/documents/upload", files=files, headers=auth_headers)
    doc_id = res.json()["id"]

    del_res = client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["message"]

    # Verify 404 after deletion
    check_res = client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert check_res.status_code == 404


def test_unauthorized_endpoints(client):
    res1 = client.get("/api/documents/")
    assert res1.status_code == 401

    res2 = client.post("/api/documents/upload")
    assert res2.status_code == 401
