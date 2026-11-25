import pytest
from unittest.mock import MagicMock
from app.core.rate_limiter import limiter
from app.models.document import Document
from app.models.user import User


def test_security_headers_present(client):
    """Test that all required production security headers are set on HTTP responses."""
    response = client.get("/api/health")
    headers = response.headers

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "SAMEORIGIN"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "content-security-policy" in headers
    csp = headers["content-security-policy"]
    assert "default-src 'self'" in csp
    assert "frame-src 'self' blob:" in csp


def test_deep_health_check_healthy(client):
    """Test deep health check endpoint probes database, vector store, and storage directory."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ResearchVault"
    assert "version" in data
    assert "uptime_seconds" in data
    assert "checks" in data

    checks = data["checks"]
    assert checks["database"]["status"] == "ok"
    assert "latency_ms" in checks["database"]

    assert checks["vector_store"]["status"] == "ok"
    assert "total_chunks" in checks["vector_store"]

    assert checks["storage"]["status"] == "ok"
    assert checks["storage"]["writable"] is True
    assert checks["storage"]["free_space_mb"] > 0


def test_deep_health_check_database_failure(client):
    """Test that health check flags 503 and unhealthy status when a core dependency fails."""
    from app.database.session import get_db

    def failing_get_db():
        mock_db = MagicMock()
        mock_db.execute.side_effect = RuntimeError("Database connection timed out")
        yield mock_db

    from app.main import app
    app.dependency_overrides[get_db] = failing_get_db

    try:
        response = client.get("/api/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["database"]["status"] == "error"
    finally:
        from tests.conftest import override_get_db
        app.dependency_overrides[get_db] = override_get_db


def test_path_traversal_protection(client, auth_headers, db_session):
    """Test that file streaming rejects any attempt to traverse outside the upload directory."""
    user = db_session.query(User).filter(User.email == "test_author@vault.edu").first()

    # Create document with malicious traversal path
    malicious_doc = Document(
        user_id=user.id,
        filename="traversal_test.pdf",
        file_path="../../etc/passwd",
        file_size=1024,
        mime_type="application/pdf",
        sha256_hash="dummy_hash_for_traversal_test_12345",
        status="indexed",
    )
    db_session.add(malicious_doc)
    db_session.commit()
    db_session.refresh(malicious_doc)

    response = client.get(f"/api/documents/{malicious_doc.id}/file", headers=auth_headers)
    assert response.status_code == 403
    assert "path traversal" in response.json()["detail"].lower()


def test_rate_limiting_enforcement(client):
    """Test that exceeding route rate limits returns structured 429 response envelope."""
    limiter.reset()

    # Endpoint limit on /auth/login is 10/minute
    hit_limit = False
    for i in range(12):
        resp = client.post(
            "/api/auth/login",
            json={"email": "nonexistent@user.com", "password": "wrongpassword"},
        )
        if resp.status_code == 429:
            hit_limit = True
            data = resp.json()
            assert data["error_code"] == "RATE_LIMIT_EXCEEDED"
            assert "Rate limit exceeded" in data["detail"]
            assert "retry-after" in resp.headers or "Retry-After" in resp.headers
            break

    assert hit_limit is True, "Rate limit should have been triggered within 12 requests"

    # Reset limiter after test so subsequent tests remain unaffected
    limiter.reset()
