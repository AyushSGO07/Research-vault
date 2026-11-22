def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ResearchVault"


def test_register_user_success(client):
    payload = {
        "name": "Dr. Alan Turing",
        "email": "alan.turing@cambridge.edu",
        "password": "computation_master"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"]
    assert "id" in data
    assert "password" not in data
    assert "hashed_password" not in data


def test_register_duplicate_email_fails(client):
    payload = {
        "name": "Duplicate User",
        "email": "alan.turing@cambridge.edu",
        "password": "another_password"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_login_success(client):
    login_data = {
        "email": "alan.turing@cambridge.edu",
        "password": "computation_master"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password_fails(client):
    login_data = {
        "email": "alan.turing@cambridge.edu",
        "password": "incorrect_password"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_get_me_with_token(client):
    login_data = {
        "email": "alan.turing@cambridge.edu",
        "password": "computation_master"
    }
    login_res = client.post("/api/auth/login", json=login_data)
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "alan.turing@cambridge.edu"
    assert data["name"] == "Dr. Alan Turing"


def test_get_me_unauthorized_fails(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
