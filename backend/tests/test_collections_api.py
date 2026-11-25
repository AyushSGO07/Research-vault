import pytest
from app.models.document import Document
from app.services.search import search_service


@pytest.fixture
def collections_test_corpus(db_session, auth_headers):
    user_id = int(auth_headers["User-Id"])

    doc1 = Document(
        user_id=user_id,
        filename="paper_cs.pdf",
        file_path="/uploads/cs.pdf",
        file_size=1024,
        mime_type="application/pdf",
        sha256_hash="hash_cs_col",
        status="indexed",
        title="Computer Science Paper",
        domain="Computer Science",
        document_type="Preprint",
        total_pages=5,
        total_chunks=1,
    )
    doc2 = Document(
        user_id=user_id,
        filename="paper_physics.pdf",
        file_path="/uploads/ph.pdf",
        file_size=1024,
        mime_type="application/pdf",
        sha256_hash="hash_ph_col",
        status="indexed",
        title="Quantum Physics Paper",
        domain="Physics",
        document_type="Journal",
        total_pages=6,
        total_chunks=1,
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()
    db_session.refresh(doc1)
    db_session.refresh(doc2)

    yield {"doc1": doc1, "doc2": doc2}

    for d in [doc1, doc2]:
        db_session.delete(d)
    db_session.commit()


def test_collections_crud(client, auth_headers):
    # 1. Create Collection
    create_payload = {
        "name": "Machine Learning Research",
        "description": "Selected transformer and deep learning literature",
        "color": "#315EAB",
    }
    res_create = client.post("/api/collections/", json=create_payload, headers=auth_headers)
    assert res_create.status_code == 201
    col_data = res_create.json()
    assert col_data["name"] == "Machine Learning Research"
    assert col_data["document_count"] == 0
    col_id = col_data["id"]

    # 2. List Collections
    res_list = client.get("/api/collections/", headers=auth_headers)
    assert res_list.status_code == 200
    collections = res_list.json()
    assert any(c["id"] == col_id for c in collections)

    # 3. Update Collection
    update_payload = {"name": "ML & Deep Learning", "color": "#25845B"}
    res_update = client.put(f"/api/collections/{col_id}", json=update_payload, headers=auth_headers)
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "ML & Deep Learning"
    assert res_update.json()["color"] == "#25845B"

    # 4. Delete Collection
    res_del = client.delete(f"/api/collections/{col_id}", headers=auth_headers)
    assert res_del.status_code == 200

    # Verify deleted
    res_get = client.get(f"/api/collections/{col_id}", headers=auth_headers)
    assert res_get.status_code == 404


def test_add_and_remove_document_from_collection(client, auth_headers, collections_test_corpus):
    doc1 = collections_test_corpus["doc1"]

    # Create collection
    res_create = client.post("/api/collections/", json={"name": "Thesis Papers"}, headers=auth_headers)
    col_id = res_create.json()["id"]

    # Add document to collection
    res_add = client.post(f"/api/collections/{col_id}/documents/{doc1.id}", headers=auth_headers)
    assert res_add.status_code == 200

    # Get collection details: should contain doc1
    res_detail = client.get(f"/api/collections/{col_id}", headers=auth_headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert len(detail["documents"]) == 1
    assert detail["documents"][0]["id"] == doc1.id

    # Test get_collections_for_document endpoint
    res_doc_colls = client.get(f"/api/collections/document/{doc1.id}", headers=auth_headers)
    assert res_doc_colls.status_code == 200
    assert col_id in res_doc_colls.json()

    # Remove document from collection
    res_rem = client.delete(f"/api/collections/{col_id}/documents/{doc1.id}", headers=auth_headers)
    assert res_rem.status_code == 200

    # Verify document no longer assigned to collection
    res_doc_colls2 = client.get(f"/api/collections/document/{doc1.id}", headers=auth_headers)
    assert res_doc_colls2.status_code == 200
    assert col_id not in res_doc_colls2.json()

    # Verify empty now
    res_detail2 = client.get(f"/api/collections/{col_id}", headers=auth_headers)
    assert len(res_detail2.json()["documents"]) == 0
