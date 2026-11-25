import pytest


def test_search_history_api(client, auth_headers):
    # 1. Clear any existing history
    client.delete("/api/history/", headers=auth_headers)

    # 2. Record search queries
    client.post(
        "/api/history/",
        json={"query": "quantum entanglement qubits", "mode": "semantic", "result_count": 5},
        headers=auth_headers,
    )
    client.post(
        "/api/history/",
        json={"query": "transformer attention models", "mode": "hybrid", "result_count": 12},
        headers=auth_headers,
    )

    # 3. List search history
    res_list = client.get("/api/history/", headers=auth_headers)
    assert res_list.status_code == 200
    history = res_list.json()
    assert len(history) == 2
    assert history[0]["query"] == "transformer attention models"
    assert history[1]["query"] == "quantum entanglement qubits"

    entry_to_delete = history[0]["id"]

    # 4. Delete single entry
    res_del_entry = client.delete(f"/api/history/{entry_to_delete}", headers=auth_headers)
    assert res_del_entry.status_code == 200

    # Verify only 1 remains
    res_list_after = client.get("/api/history/", headers=auth_headers)
    assert len(res_list_after.json()) == 1

    # 5. Clear all history
    res_clear = client.delete("/api/history/", headers=auth_headers)
    assert res_clear.status_code == 200

    # Verify empty
    res_empty = client.get("/api/history/", headers=auth_headers)
    assert len(res_empty.json()) == 0
