from datetime import datetime, timezone
import pytest
from app.core.security import get_password_hash
from app.database.vector_store import vector_store
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.services.search import search_service


@pytest.fixture
def multi_doc_corpus(db_session):
    user = db_session.query(User).filter(User.email == "test_author@vault.edu").first()
    if not user:
        user = User(name="Test Author", email="test_author@vault.edu", hashed_password=get_password_hash("secure_password_123"))
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    # Clean existing documents and chunks for this user before each test to guarantee fresh isolation
    existing_docs = db_session.query(Document).filter(Document.user_id == user.id).all()
    for ed in existing_docs:
        db_session.delete(ed)
    db_session.commit()
    try:
        vector_store.delete_document_chunks(user.id)
    except Exception:
        pass

    # Document 1: 2017, Computer Science, Preprint, Vaswani
    doc1 = Document(
        user_id=user.id,
        filename="transformer.pdf",
        file_path="/uploads/transformer.pdf",
        file_size=1024,
        mime_type="application/pdf",
        sha256_hash="hash_t_1",
        status="indexed",
        title="Attention Is All You Need",
        authors="Vaswani, Shazeer, Parmar",
        publication_year=2017,
        domain="Computer Science",
        document_type="Preprint",
        total_pages=15,
        total_chunks=1,
    )
    # Document 2: 2023, Computer Science, Conference, Hinton
    doc2 = Document(
        user_id=user.id,
        filename="forward_forward.pdf",
        file_path="/uploads/ff.pdf",
        file_size=2048,
        mime_type="application/pdf",
        sha256_hash="hash_ff_2",
        status="indexed",
        title="The Forward-Forward Algorithm",
        authors="Geoffrey Hinton",
        publication_year=2023,
        domain="Computer Science",
        document_type="Conference",
        total_pages=20,
        total_chunks=1,
    )
    # Document 3: 2020, Physics, Journal, Penrose
    doc3 = Document(
        user_id=user.id,
        filename="black_holes.pdf",
        file_path="/uploads/bh.pdf",
        file_size=3072,
        mime_type="application/pdf",
        sha256_hash="hash_bh_3",
        status="indexed",
        title="Gravitational Collapse and Space-Time Singularities",
        authors="Roger Penrose",
        publication_year=2020,
        domain="Physics",
        document_type="Journal",
        total_pages=10,
        total_chunks=1,
    )
    db_session.add_all([doc1, doc2, doc3])
    db_session.commit()
    db_session.refresh(doc1)
    db_session.refresh(doc2)
    db_session.refresh(doc3)

    c1 = DocumentChunk(
        document_id=doc1.id,
        chunk_index=0,
        page_number=1,
        text="The Transformer relies entirely on an attention mechanism to model sequence relationships.",
        token_count=15,
        created_at=datetime.now(timezone.utc),
    )
    c2 = DocumentChunk(
        document_id=doc2.id,
        chunk_index=0,
        page_number=1,
        text="The Forward-Forward algorithm replaces backpropagation in deep neural networks with two forward passes.",
        token_count=18,
        created_at=datetime.now(timezone.utc),
    )
    c3 = DocumentChunk(
        document_id=doc3.id,
        chunk_index=0,
        page_number=1,
        text="Singularity formation in general relativity spacetime geometry and quantum black hole horizons.",
        token_count=16,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add_all([c1, c2, c3])
    db_session.commit()

    vector_store.add_chunks(
        [c1, c2, c3],
        metadata_extra={"user_id": user.id}
    )

    yield {
        "user": user,
        "docs": [doc1, doc2, doc3],
        "chunks": [c1, c2, c3],
    }

    # Teardown
    for d in [doc1, doc2, doc3]:
        db_session.delete(d)
    db_session.commit()
    try:
        vector_store.delete_document_chunks(user.id)
    except Exception:
        pass


def test_filter_by_year_range(db_session, multi_doc_corpus):
    user = multi_doc_corpus["user"]

    # Filter year_start=2021 (should exclude doc1: 2017 and doc3: 2020, keeping only doc2: 2023)
    resp = search_service.search(
        db=db_session,
        user_id=user.id,
        query="algorithm neural network attention",
        year_start=2021,
    )
    assert resp.total_documents == 1
    assert resp.results[0].title == "The Forward-Forward Algorithm"
    assert resp.results[0].publication_year == 2023

    # Filter year_end=2019 (should return only doc1: 2017)
    resp_past = search_service.search(
        db=db_session,
        user_id=user.id,
        query="algorithm neural network attention",
        year_end=2019,
    )
    assert resp_past.total_documents == 1
    assert resp_past.results[0].title == "Attention Is All You Need"


def test_filter_by_domain(db_session, multi_doc_corpus):
    user = multi_doc_corpus["user"]

    # Filter by Physics domain
    resp_physics = search_service.search(
        db=db_session,
        user_id=user.id,
        query="relativity quantum geometry",
        domain="Physics",
    )
    assert resp_physics.total_documents == 1
    assert resp_physics.results[0].title == "Gravitational Collapse and Space-Time Singularities"
    assert resp_physics.results[0].domain == "Physics"

    # Filter by Computer Science domain
    resp_cs = search_service.search(
        db=db_session,
        user_id=user.id,
        query="algorithm network",
        domain="Computer Science",
    )
    assert resp_cs.total_documents == 2
    for r in resp_cs.results:
        assert r.domain == "Computer Science"


def test_filter_by_document_type(db_session, multi_doc_corpus):
    user = multi_doc_corpus["user"]

    # Filter by Journal
    resp_journal = search_service.search(
        db=db_session,
        user_id=user.id,
        query="spacetime singularity",
        document_type="Journal",
    )
    assert resp_journal.total_documents == 1
    assert resp_journal.results[0].document_type == "Journal"

    # Filter by Conference
    resp_conf = search_service.search(
        db=db_session,
        user_id=user.id,
        query="neural network",
        document_type="Conference",
    )
    assert resp_conf.total_documents == 1
    assert resp_conf.results[0].title == "The Forward-Forward Algorithm"


def test_filter_by_author(db_session, multi_doc_corpus):
    user = multi_doc_corpus["user"]

    # Filter by author "Vaswani"
    resp_author = search_service.search(
        db=db_session,
        user_id=user.id,
        query="transformer attention",
        author="Vaswani",
    )
    assert resp_author.total_documents == 1
    assert "Vaswani" in resp_author.results[0].authors

    # Non-existent author
    resp_none = search_service.search(
        db=db_session,
        user_id=user.id,
        query="transformer attention",
        author="NonExistentAuthorXYZ",
    )
    assert resp_none.total_documents == 0


def test_sorting_newest_and_oldest(db_session, multi_doc_corpus):
    user = multi_doc_corpus["user"]

    # Sort newest: 2023 -> 2020 -> 2017
    resp_newest = search_service.search(
        db=db_session,
        user_id=user.id,
        query="algorithm network geometry spacetime",
        sort_by="newest",
    )
    assert resp_newest.total_documents == 3
    years = [r.publication_year for r in resp_newest.results]
    assert years == [2023, 2020, 2017]

    # Sort oldest: 2017 -> 2020 -> 2023
    resp_oldest = search_service.search(
        db=db_session,
        user_id=user.id,
        query="algorithm network geometry spacetime",
        sort_by="oldest",
    )
    years_oldest = [r.publication_year for r in resp_oldest.results]
    assert years_oldest == [2017, 2020, 2023]


def test_search_facets_generation(db_session, multi_doc_corpus):
    user = multi_doc_corpus["user"]

    facets = search_service.get_user_facets(db=db_session, user_id=user.id)
    assert facets.min_year == 2017
    assert facets.max_year == 2023

    domains_dict = {d.name: d.count for d in facets.domains}
    assert domains_dict["Computer Science"] == 2
    assert domains_dict["Physics"] == 1

    types_dict = {t.name: t.count for t in facets.document_types}
    assert types_dict["Preprint"] == 1
    assert types_dict["Conference"] == 1
    assert types_dict["Journal"] == 1

    assert "Geoffrey Hinton" in facets.authors
    assert "Roger Penrose" in facets.authors


def test_api_filters_endpoint(client, auth_headers, multi_doc_corpus):
    resp = client.get("/api/search/filters", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["min_year"] == 2017
    assert data["max_year"] == 2023
    assert len(data["domains"]) >= 2
    assert len(data["document_types"]) >= 2
    assert len(data["authors"]) >= 2


def test_api_search_with_rerank_and_filters(client, auth_headers, multi_doc_corpus):
    payload = {
        "query": "neural attention transformer",
        "mode": "hybrid",
        "enable_reranking": True,
        "domain": "Computer Science",
        "sort_by": "relevance",
    }
    resp = client.post("/api/search/", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_reranked"] is True
    assert data["sort_by"] == "relevance"
    assert len(data["results"]) >= 1
    assert data["results"][0]["is_reranked"] is True
    assert data["results"][0]["domain"] == "Computer Science"
