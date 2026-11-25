import pytest
from app.models.document import Document


@pytest.fixture
def saved_test_doc(db_session, auth_headers):
    user_id = int(auth_headers["User-Id"])

    doc = Document(
        user_id=user_id,
        filename="bookmark_test.pdf",
        file_path="/uploads/bm.pdf",
        file_size=1024,
        mime_type="application/pdf",
        sha256_hash="hash_bm_test",
        status="indexed",
        title="Bookmarked Research Paper",
        total_pages=3,
        total_chunks=1,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    yield doc

    db_session.delete(doc)
    db_session.commit()


def test_bookmark_and_unbookmark_paper(client, auth_headers, saved_test_doc):
    doc_id = saved_test_doc.id

    # Initially not saved
    res_ids_initial = client.get("/api/saved/ids", headers=auth_headers)
    assert res_ids_initial.status_code == 200
    assert doc_id not in res_ids_initial.json()

    # Save/Bookmark document
    res_save = client.post(f"/api/saved/{doc_id}", headers=auth_headers)
    assert res_save.status_code == 200
    assert res_save.json()["saved"] is True

    # Verify ID is in saved IDs
    res_ids_after = client.get("/api/saved/ids", headers=auth_headers)
    assert doc_id in res_ids_after.json()

    # Verify document appears in list of saved documents
    res_list = client.get("/api/saved/", headers=auth_headers)
    assert res_list.status_code == 200
    saved_list = res_list.json()
    assert any(d["id"] == doc_id for d in saved_list)

    # Remove bookmark
    res_unsave = client.delete(f"/api/saved/{doc_id}", headers=auth_headers)
    assert res_unsave.status_code == 200
    assert res_unsave.json()["saved"] is False

    # Verify ID no longer in saved IDs
    res_ids_final = client.get("/api/saved/ids", headers=auth_headers)
    assert doc_id not in res_ids_final.json()
