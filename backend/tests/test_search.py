from datetime import datetime, timezone
import pytest
from app.database.vector_store import vector_store
from app.models.user import User
from app.models.document import Document, DocumentChunk


@pytest.fixture
def indexed_search_corpus(db_session):
    # User 1
    user1 = db_session.query(User).filter(User.email == "test_author@vault.edu").first()
    if not user1:
        user1 = User(name="Test Author", email="test_author@vault.edu", hashed_password="pw")
        db_session.add(user1)
        db_session.commit()
        db_session.refresh(user1)

    doc1 = Document(
        user_id=user1.id,
        filename="attention_paper.pdf",
        file_path="/uploads/uuid_attention.pdf",
        file_size=1024,
        mime_type="application/pdf",
        sha256_hash="hash_attention_123",
        status="indexed",
        title="Attention Is All You Need",
        authors="Vaswani et al.",
        publication_year=2017,
        doi="10.48550/arXiv.1706.03762",
        total_pages=15,
        total_chunks=2,
    )
    db_session.add(doc1)
    db_session.commit()
    db_session.refresh(doc1)

    c1 = DocumentChunk(
        document_id=doc1.id,
        chunk_index=0,
        page_number=1,
        text="The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We introduce the Transformer.",
        token_count=20,
        created_at=datetime.now(timezone.utc),
    )
    c2 = DocumentChunk(
        document_id=doc1.id,
        chunk_index=1,
        page_number=2,
        text="Self-attention, sometimes called intra-attention, is an attention mechanism relating different positions of a single sequence.",
        token_count=18,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    # Index into ChromaDB
    vector_store.add_chunks(
        [c1, c2],
        metadata_extra={"user_id": user1.id, "title": doc1.title, "doi": doc1.doi, "publication_year": doc1.publication_year}
    )

    # User 2 (private documents)
    user2 = db_session.query(User).filter(User.email == "other_researcher@vault.edu").first()
    if not user2:
        user2 = User(name="Other Researcher", email="other_researcher@vault.edu", hashed_password="pw")
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user2)

    doc2 = Document(
        user_id=user2.id,
        filename="private_genomics.pdf",
        file_path="/uploads/uuid_genomics.pdf",
        file_size=2048,
        mime_type="application/pdf",
        sha256_hash="hash_genomics_456",
        status="indexed",
        title="CRISPR Gene Editing Analysis",
        authors="Doudna et al.",
        publication_year=2020,
        total_pages=10,
        total_chunks=1,
    )
    db_session.add(doc2)
    db_session.commit()
    db_session.refresh(doc2)

    c3 = DocumentChunk(
        document_id=doc2.id,
        chunk_index=0,
        page_number=1,
        text="CRISPR-Cas9 enables precise targeted genetic modifications and nucleotide sequencing.",
        token_count=14,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(c3)
    db_session.commit()

    vector_store.add_chunks(
        [c3],
        metadata_extra={"user_id": user2.id, "title": doc2.title, "publication_year": doc2.publication_year}
    )

    return {"user1": user1, "doc1": doc1, "user2": user2, "doc2": doc2}


def test_hybrid_search_post(client, auth_headers, indexed_search_corpus):
    payload = {
        "query": "transformer sequence transduction models",
        "mode": "hybrid",
        "page": 1,
        "page_size": 10
    }
    response = client.post("/api/search/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["query"] == payload["query"]
    assert data["mode"] == "hybrid"
    assert data["total_documents"] >= 1
    assert data["latency_ms"] >= 0.0

    top_result = data["results"][0]
    assert top_result["document_id"] == indexed_search_corpus["doc1"].id
    assert top_result["title"] == "Attention Is All You Need"
    assert top_result["score"] > 0.0
    assert "primary_passage" in top_result
    assert "Transformer" in top_result["primary_passage"]["text"]


def test_semantic_search_mode(client, auth_headers, indexed_search_corpus):
    payload = {
        "query": "deep learning architectures for natural language",
        "mode": "semantic",
        "page": 1,
        "page_size": 10
    }
    response = client.post("/api/search/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "semantic"
    assert data["total_documents"] >= 1


def test_keyword_search_mode(client, auth_headers, indexed_search_corpus):
    payload = {
        "query": "intra-attention",
        "mode": "keyword",
        "page": 1,
        "page_size": 10
    }
    response = client.post("/api/search/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "keyword"
    assert data["total_documents"] >= 1


def test_get_search_endpoint(client, auth_headers, indexed_search_corpus):
    response = client.get("/api/search/?q=Transformer&mode=hybrid", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_documents"] >= 1


def test_search_idor_tenant_isolation(client, auth_headers, indexed_search_corpus):
    # User 1 searches for User 2's specific private keyword
    payload = {
        "query": "CRISPR-Cas9 genetic modifications",
        "mode": "hybrid"
    }
    response = client.post("/api/search/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # User 1 MUST NOT see User 2's document
    for res in data["results"]:
        assert res["document_id"] != indexed_search_corpus["doc2"].id
        assert "CRISPR" not in res["title"]


def test_search_unauthorized(client):
    response = client.post("/api/search/", json={"query": "test query"})
    assert response.status_code == 401
