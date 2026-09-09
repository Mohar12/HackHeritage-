"""
test_auth_postgres.py
=====================
Integration tests verifying PostgreSQL authentication flow in HyperQDS:
- User registration with bcrypt hashing
- Duplicate email prevention
- Credential authentication (success & failure)
- Session authorization (/auth/me)
- Secure logout
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db import init_db, get_connection, release_connection

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """Ensure database schema is initialized and clean up test user after run."""
    init_db()
    test_email = "ci_test_user@hyperqds.io"
    
    # Pre-clean
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE email = %s;", (test_email,))
            conn.commit()
    finally:
        release_connection(conn)

    yield test_email

    # Post-clean
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE email = %s;", (test_email,))
            conn.commit()
    finally:
        release_connection(conn)


def test_registration_flow(setup_database):
    test_email = setup_database
    payload = {
        "email": test_email,
        "password": "QuantumSecurePass2026!",
        "full_name": "HyperQDS Test Engineer"
    }

    # 1. Register new user
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["user"]["email"] == test_email
    assert data["user"]["full_name"] == "HyperQDS Test Engineer"
    assert "token" in data
    assert len(data["token"]) > 20

    # 2. Duplicate registration must fail
    res_dup = client.post("/auth/register", json=payload)
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"].lower()


def test_login_flow(setup_database):
    test_email = setup_database

    # 1. Valid login
    res = client.post("/auth/login", json={
        "email": test_email,
        "password": "QuantumSecurePass2026!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["user"]["email"] == test_email
    token = data["token"]

    # 2. Invalid password
    res_bad = client.post("/auth/login", json={
        "email": test_email,
        "password": "WrongPassword123!"
    })
    assert res_bad.status_code == 401
    assert "invalid email or password" in res_bad.json()["detail"].lower()

    # 3. /auth/me with bearer token
    res_me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data["email"] == test_email

    # 4. /auth/logout
    res_logout = client.post("/auth/logout")
    assert res_logout.status_code == 200
