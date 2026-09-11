"""
test_postgres_full_link.py
==========================
Comprehensive integration tests verifying that HyperQDS is fully linked to PostgreSQL:
1. Database connectivity and schema initialization
2. Database health diagnostics in /health and /api/v1/health
3. Audit ledger event persistence and SHA3-512 / HMAC chain verification under PostgreSQL
4. End-to-end user authentication backed by PostgreSQL
"""

from __future__ import annotations

import os
import pytest
from fastapi.testclient import TestClient

import backend.env_loader
from backend.main import app
from backend.db import init_db, check_db_connection, get_connection, release_connection
from backend.audit_ledger import AuditLedger

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def ensure_postgres_connected():
    """Ensure PostgreSQL is reachable and initialized before running test suite."""
    init_db()
    diag = check_db_connection()
    if diag.get("status") != "connected":
        pytest.skip(f"PostgreSQL not connected ({diag.get('error')}). Skipping integration tests.")


def test_postgres_schema_and_connection():
    """Verify that all required tables exist in PostgreSQL with correct permissions."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cur.fetchall()]
            
            assert "users" in tables, "users table missing in PostgreSQL"
            assert "oauth_accounts" in tables, "oauth_accounts table missing in PostgreSQL"
            assert "audit_metadata" in tables, "audit_metadata table missing in PostgreSQL"
            assert "audit_records" in tables, "audit_records table missing in PostgreSQL"
    finally:
        release_connection(conn)


def test_health_endpoints_report_postgres():
    """Verify that /health and /api/v1/health report live PostgreSQL connectivity."""
    # 1. Root /health
    res_root = client.get("/health")
    assert res_root.status_code == 200
    data_root = res_root.json()
    assert data_root["status"] == "ok"
    assert "database" in data_root
    assert data_root["database"]["status"] == "connected"
    assert data_root["database"]["engine"] == "postgresql"
    assert data_root["database"]["database"] == "hyperqds"

    # 2. Versioned /api/v1/health
    res_v1 = client.get("/api/v1/health")
    assert res_v1.status_code == 200
    data_v1 = res_v1.json()
    assert data_v1["status"] in ("ok", "degraded")
    assert data_v1["database"] is not None
    assert data_v1["database"]["status"] == "connected"
    assert data_v1["database"]["engine"] == "postgresql"


def test_audit_ledger_postgres_persistence():
    """Verify that AuditLedger persists, loads, and cryptographically verifies events in PostgreSQL."""
    ledger = AuditLedger(use_postgres=True)
    assert ledger._use_postgres is True

    # Record test event
    initial_count = ledger.count()
    test_session = "test_pg_session_999"
    rec = ledger.record_event(
        session_id=test_session,
        event_type="POSTGRES_LINK_TEST",
        node_id="Alice",
        message_hash="a" * 64,
        threat_classification="BENIGN",
        recommended_action="ALLOW",
    )

    assert rec is not None
    assert ledger.count() == initial_count + 1

    # Verify chain integrity
    verify_result = ledger.verify_chain()
    assert verify_result["valid"] is True
    assert verify_result["hmac_verified"] is True
    assert verify_result["records_checked"] == ledger.count()

    # Verify persistence directly in PostgreSQL
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT event_type FROM audit_records WHERE record_id = %s;", (rec.record_id,))
            row = cur.fetchone()
            assert row is not None
            assert row[0] == "POSTGRES_LINK_TEST"
    finally:
        release_connection(conn)


def test_user_authentication_flow_postgres():
    """Verify user registration, login, and session check via PostgreSQL."""
    test_email = "pg_link_user@hyperqds.io"
    password = "QuantumTestPassword2026!"

    # Clean up any previous test user
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE email = %s;", (test_email,))
            conn.commit()
    finally:
        release_connection(conn)

    # 1. Register user
    reg_res = client.post("/auth/register", json={
        "email": test_email,
        "password": password,
        "full_name": "Postgres Test User",
    })
    assert reg_res.status_code == 200
    assert reg_res.json()["status"] == "success"

    # 2. Login user
    login_res = client.post("/auth/login", json={
        "email": test_email,
        "password": password,
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["status"] == "success"
    assert "token" in login_data

    # 3. Authenticate with session token
    headers = {"Authorization": f"Bearer {login_data['token']}"}
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == test_email

    # Clean up test user
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE email = %s;", (test_email,))
            conn.commit()
    finally:
        release_connection(conn)
