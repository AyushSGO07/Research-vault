import pytest
from app.models.document import Document, DocumentChunk
from app.database.vector_store import vector_store
from app.services.bm25 import bm25_retriever


@pytest.fixture
def eval_test_corpus(db_session, auth_headers):
    user_id = int(auth_headers["User-Id"])

    doc = Document(
        user_id=user_id,
        filename="attention_paper.pdf",
        file_path="/uploads/attention.pdf",
        file_size=2048,
        mime_type="application/pdf",
        sha256_hash="hash_attention_eval",
        status="indexed",
        title="Attention Is All You Need",
        abstract="We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.",
        authors="Vaswani et al.",
        publication_year=2017,
        domain="Computer Science",
        document_type="Conference",
        total_pages=15,
        total_chunks=1,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    chunk = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        page_number=1,
        text="We propose the Transformer, a model architecture eschewing recurrence and relying entirely on an attention mechanism. The Transformer allows for significantly more parallelization.",
        token_count=35,
    )
    db_session.add(chunk)
    db_session.commit()
    db_session.refresh(chunk)

    # Index in vector store for user
    vector_store.add_chunks(
        chunks=[chunk],
        metadata_extra={
            "user_id": user_id,
            "title": doc.title,
            "doi": doc.doi,
            "publication_year": doc.publication_year,
        },
    )

    yield {"doc": doc, "chunk": chunk}

    # Teardown
    vector_store.delete_document_chunks(document_id=doc.id)
    db_session.delete(chunk)
    db_session.delete(doc)
    db_session.commit()


def test_get_and_seed_suites(client, auth_headers):
    res = client.get("/api/evaluation/suites", headers=auth_headers)
    assert res.status_code == 200
    suites = res.json()
    assert len(suites) >= 1
    default_suite = next((s for s in suites if s["is_default"]), None)
    assert default_suite is not None
    assert default_suite["name"] == "Standard Academic IR Benchmark"
    assert default_suite["query_count"] > 0


def test_suite_crud_and_query_management(client, auth_headers, eval_test_corpus):
    doc_id = eval_test_corpus["doc"].id

    # 1. Create custom suite
    create_payload = {
        "name": "NLP Retrieval Benchmark",
        "description": "Evaluation suite for dense vs sparse language retrieval",
    }
    res_create = client.post("/api/evaluation/suites", json=create_payload, headers=auth_headers)
    assert res_create.status_code == 201
    suite_data = res_create.json()
    suite_id = suite_data["id"]
    assert suite_data["name"] == "NLP Retrieval Benchmark"

    # 2. Add query with ground-truth judgment
    query_payload = {
        "query_text": "transformer self-attention mechanism dependencies",
        "category": "conceptual",
        "difficulty": "medium",
        "judgments": [
            {
                "document_id": doc_id,
                "relevance_grade": 2,
                "rationale": "Canonical transformer paper describing self-attention",
            }
        ],
    }
    res_q = client.post(f"/api/evaluation/suites/{suite_id}/queries", json=query_payload, headers=auth_headers)
    assert res_q.status_code == 201
    q_data = res_q.json()
    assert q_data["query_text"] == "transformer self-attention mechanism dependencies"
    assert len(q_data["judgments"]) == 1
    assert q_data["judgments"][0]["document_id"] == doc_id

    # 3. Retrieve suite detail
    res_detail = client.get(f"/api/evaluation/suites/{suite_id}", headers=auth_headers)
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data["query_count"] == 1
    assert len(detail_data["queries"]) == 1

    # 4. Attempt to delete default suite (should fail with 400)
    res_suites = client.get("/api/evaluation/suites", headers=auth_headers)
    default_suite_id = next(s["id"] for s in res_suites.json() if s["is_default"])
    res_del_def = client.delete(f"/api/evaluation/suites/{default_suite_id}", headers=auth_headers)
    assert res_del_def.status_code == 400

    # 5. Delete custom suite
    res_del = client.delete(f"/api/evaluation/suites/{suite_id}", headers=auth_headers)
    assert res_del.status_code == 200

    # Confirm 404
    res_get_deleted = client.get(f"/api/evaluation/suites/{suite_id}", headers=auth_headers)
    assert res_get_deleted.status_code == 404


def test_evaluation_run_execution_and_reporting(client, auth_headers, eval_test_corpus):
    # Execute benchmark run across all modes
    run_payload = {"modes": ["keyword", "semantic", "hybrid", "reranked"]}
    res = client.post("/api/evaluation/run", json=run_payload, headers=auth_headers)
    assert res.status_code == 200
    report = res.json()

    # Validate high-level report structure
    assert "run_id" in report
    assert report["total_queries"] > 0
    assert report["winner_mode"] in ["keyword", "semantic", "hybrid", "reranked"]
    assert report["duration_ms"] > 0

    # Validate mode metrics presence
    assert "keyword" in report["mode_metrics"]
    assert "semantic" in report["mode_metrics"]
    assert "hybrid" in report["mode_metrics"]
    assert "reranked" in report["mode_metrics"]

    for mode in ["keyword", "semantic", "hybrid", "reranked"]:
        m = report["mode_metrics"][mode]
        assert "ndcg_10" in m
        assert "mrr" in m
        assert "precision_1" in m
        assert "precision_5" in m
        assert "recall_5" in m
        assert "mean_latency_ms" in m

    # Validate query breakdowns
    assert len(report["query_breakdowns"]) == report["total_queries"]
    for q_res in report["query_breakdowns"]:
        assert "query_text" in q_res
        assert "mode_results" in q_res
        assert "qualitative_insight" in q_res
        assert len(q_res["qualitative_insight"]) > 0

    run_id = report["run_id"]

    # 2. Check history listing
    res_runs = client.get("/api/evaluation/runs", headers=auth_headers)
    assert res_runs.status_code == 200
    runs = res_runs.json()
    assert len(runs) >= 1
    assert any(r["id"] == run_id for r in runs)

    # 3. Check run detail
    res_run_detail = client.get(f"/api/evaluation/runs/{run_id}", headers=auth_headers)
    assert res_run_detail.status_code == 200
    detail = res_run_detail.json()
    assert detail["run_id"] == run_id

    # 4. Check Markdown Export
    res_md = client.get(f"/api/evaluation/export/{run_id}?format=markdown", headers=auth_headers)
    assert res_md.status_code == 200
    md_content = res_md.text
    assert "# ResearchVault Search Evaluation Benchmark Report" in md_content
    assert "Macro Comparative Metrics" in md_content
    assert "NDCG@10" in md_content

    # 5. Check JSON Export
    res_json = client.get(f"/api/evaluation/export/{run_id}?format=json", headers=auth_headers)
    assert res_json.status_code == 200
    assert res_json.json()["run_id"] == run_id


def test_evaluation_idor_isolation(client, auth_headers):
    # Create custom suite as User A
    res_create = client.post(
        "/api/evaluation/suites",
        json={"name": "User A Private Benchmark"},
        headers=auth_headers,
    )
    suite_id = res_create.json()["id"]

    # Other user headers
    other_headers = {
        "Authorization": "Bearer fake_token",
        "User-Id": "9999",
    }

    # Other user cannot view or delete User A's custom suite
    res_get = client.get(f"/api/evaluation/suites/{suite_id}", headers=other_headers)
    assert res_get.status_code in [401, 403, 404]

    res_del = client.delete(f"/api/evaluation/suites/{suite_id}", headers=other_headers)
    assert res_del.status_code in [401, 403, 404]
