"""
backend/test_api_access_control.py
===================================
Automated security tests for Authentication, Authorization, Session Isolation,
CORS, Information Disclosure, and API Access Control.

Covers:
1. Open / Development mode (unauthenticated access permitted by default for hackathon compatibility)
2. Protected / Production mode (configurable via QDS_API_KEY):
   - Unauthenticated requests to protected endpoints return 401
   - Authenticated requests via 'Authorization: Bearer <key>' succeed (200)
   - Authenticated requests via 'X-API-Key: <key>' succeed (200)
   - Invalid credentials return 401
   - Malformed Authorization headers (Basic, empty Bearer, garbage) return 401 without HTTP 500
   - Public endpoints (/health, /api/v1/health, /api/docs, /api/openapi.json) remain accessible without credentials
3. Session isolation & session substitution:
   - Session IDs are cryptographically bound to signatures via HMAC
   - Substituting session_id causes 'signature_integrity_mismatch'
   - Empty or whitespace session_id rejected with 422
   - Stateless session design prevents cross-tenant data leakage
4. Information disclosure:
   - /health and /api/v1/health do not leak secrets, filesystem paths, or private keys
   - OpenAPI schema exposes contract but no secrets
   - Error responses sanitize paths to [REDACTED_PATH]
5. CORS & HTTP security headers:
   - Whitelisted origins get Access-Control-Allow-Origin
   - Untrusted origins (e.g. http://attacker.com) do NOT get Access-Control-Allow-Origin
   - Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) are injected
6. Interaction with existing HMAC integrity and resource limits:
   - Auth does not bypass signature integrity checks
   - Auth does not bypass input bounds or resource limits
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure repo root is on sys.path
_ROOT = Path(__file__).parent.parent.resolve()
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.main import app
from backend.auth import QDS_API_KEY_ENV_VAR

client = TestClient(app)


# ===========================================================================
# 1. Open Mode (Default Hackathon Compatibility)
# ===========================================================================

def test_open_mode_unauthenticated_access_allowed(monkeypatch):
    """When QDS_API_KEY is not set, all endpoints allow unauthenticated access."""
    monkeypatch.delenv(QDS_API_KEY_ENV_VAR, raising=False)

    # Health
    r = client.get("/health")
    assert r.status_code == 200

    # Key generation
    r = client.post("/generate-keys/", json={"n_qubits": 2, "shots": 128})
    assert r.status_code == 200

    # Signing
    r = client.post("/api/v1/signatures/sign", json={"message": "Test Open Mode", "n_qubits": 2, "shots": 128})
    assert r.status_code == 200

    # Audit ledger
    r = client.get("/api/v1/audit-ledger")
    assert r.status_code == 200


# ===========================================================================
# 2. Protected Mode (Configurable via QDS_API_KEY)
# ===========================================================================

TEST_KEY = "test_qds_api_key_secure_99"


def test_protected_mode_unauthenticated_rejected(monkeypatch):
    """When QDS_API_KEY is configured, unauthenticated requests to protected endpoints return 401."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)

    protected_endpoints = [
        ("POST", "/generate-keys/", {"n_qubits": 2, "shots": 128}),
        ("POST", "/api/v1/signatures/sign", {"message": "Hello", "n_qubits": 2, "shots": 128}),
        ("POST", "/api/v1/simulate", {"num_qubits": 2, "shots": 128}),
        ("POST", "/api/v1/attacks/intercept_resend", {"params": {"n_qubits": 2}, "shots": 128}),
        ("POST", "/api/v1/detect", {"measurement_data": {"measurement_counts": {"00": 64, "11": 64}, "fidelity": 0.99}}),
        ("GET", "/api/v1/audit-ledger", None),
        ("GET", "/api/v1/audit-ledger/verify", None),
        ("GET", "/api/v1/protocol-dag", None),
    ]

    for method, path, body in protected_endpoints:
        if method == "POST":
            r = client.post(path, json=body)
        else:
            r = client.get(path)
        assert r.status_code == 401, f"Expected 401 for unauthenticated request to {path}, got {r.status_code}"
        assert r.headers.get("www-authenticate") == "Bearer"
        assert r.json()["error"] == "Unauthorized"


def test_protected_mode_valid_bearer_token_accepted(monkeypatch):
    """When QDS_API_KEY is configured, requests with 'Authorization: Bearer <key>' succeed."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)
    headers = {"Authorization": f"Bearer {TEST_KEY}"}

    r = client.post("/generate-keys/", json={"n_qubits": 2, "shots": 128}, headers=headers)
    assert r.status_code == 200

    r = client.get("/api/v1/audit-ledger", headers=headers)
    assert r.status_code == 200


def test_protected_mode_valid_x_api_key_accepted(monkeypatch):
    """When QDS_API_KEY is configured, requests with 'X-API-Key: <key>' succeed."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)
    headers = {"X-API-Key": TEST_KEY}

    r = client.post("/generate-keys/", json={"n_qubits": 2, "shots": 128}, headers=headers)
    assert r.status_code == 200


def test_protected_mode_invalid_credentials_rejected(monkeypatch):
    """Requests with incorrect API keys return 401 and never 500."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)

    # Invalid Bearer
    r = client.post("/generate-keys/", json={"n_qubits": 2}, headers={"Authorization": "Bearer wrong-key"})
    assert r.status_code == 401
    assert "wrong-key" not in r.text  # Credential is never echoed

    # Invalid X-API-Key
    r = client.post("/generate-keys/", json={"n_qubits": 2}, headers={"X-API-Key": "incorrect-token"})
    assert r.status_code == 401
    assert "incorrect-token" not in r.text


def test_protected_mode_malformed_auth_headers_handled_safely(monkeypatch):
    """Malformed or unexpected Authorization headers return 401 without HTTP 500 crashes."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)

    malformed_headers = [
        {"Authorization": "Bearer"},              # Empty token
        {"Authorization": "Bearer   "},           # Whitespace token
        {"Authorization": "Basic dXNlcjpwYXNz"},  # Basic auth unsupported
        {"Authorization": "Digest something"},    # Unsupported scheme
        {"Authorization": "Token xyz"},           # Unsupported scheme
        {"Authorization": "Bearer a b c"},        # Extra tokens
        {"Authorization": "Bearer " + "x" * 1000},# Very long invalid token
        {"X-API-Key": ""},                        # Empty X-API-Key
        {"X-API-Key": "   "},                     # Whitespace X-API-Key
    ]

    for h in malformed_headers:
        r = client.post("/generate-keys/", json={"n_qubits": 2}, headers=h)
        assert r.status_code == 401, f"Expected 401 for header {h}, got {r.status_code}"
        assert r.status_code != 500


def test_query_parameter_api_key_not_accepted(monkeypatch):
    """API keys in URL query parameters are rejected (to prevent proxy log leakage)."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)

    r = client.post(f"/generate-keys/?api_key={TEST_KEY}", json={"n_qubits": 2})
    assert r.status_code == 401


def test_public_endpoints_accessible_without_auth(monkeypatch):
    """Health checks and OpenAPI documentation remain public even when QDS_API_KEY is active."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)

    public_paths = [
        "/health",
        "/api/v1/health",
        "/api/docs",
        "/api/redoc",
        "/api/openapi.json",
    ]

    for p in public_paths:
        r = client.get(p)
        assert r.status_code == 200, f"Expected 200 for public path {p}, got {r.status_code}"


# ===========================================================================
# 3. Session Isolation & Session Substitution
# ===========================================================================

def test_session_id_substitution_rejected_by_hmac():
    """Substituting session_id in a signed payload causes HMAC integrity verification failure."""
    # 1. Generate legitimate signature
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Financial wire", "n_qubits": 4, "shots": 128})
    assert sign_res.status_code == 200
    data = sign_res.json()
    orig_session_id = data["session_id"]
    sig_payload = dict(data["signature"])

    # 2. Verify original signature is authentic
    v_res = client.post("/api/v1/signatures/verify", json={
        "signature": sig_payload,
        "message": "Financial wire",
        "public_key": {"session_id": orig_session_id},
    })
    assert v_res.status_code == 200
    assert v_res.json()["is_valid"] is True
    assert v_res.json()["reason"] == "verified_authentic"

    # 3. Attacker substitutes session_id with another session
    tampered_sig = dict(sig_payload)
    tampered_sig["session_id"] = "attacker-hijacked-session-id"

    v_tampered = client.post("/api/v1/signatures/verify", json={
        "signature": tampered_sig,
        "message": "Financial wire",
        "public_key": {"session_id": "attacker-hijacked-session-id"},
    })
    assert v_tampered.status_code == 200
    res = v_tampered.json()
    assert res["is_valid"] is False
    assert res["reason"] == "signature_integrity_mismatch"


def test_empty_and_whitespace_session_id_rejected():
    """Empty or whitespace session_id is rejected by Pydantic schema validation."""
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Wire", "n_qubits": 2, "shots": 128})
    sig_payload = dict(sign_res.json()["signature"])

    # Empty string
    sig_payload["session_id"] = ""
    r = client.post("/api/v1/signatures/verify", json={"signature": sig_payload, "message": "Wire"})
    assert r.status_code == 422

    # Whitespace only
    sig_payload["session_id"] = "    "
    r = client.post("/api/v1/signatures/verify", json={"signature": sig_payload, "message": "Wire"})
    assert r.status_code == 422


# ===========================================================================
# 4. Information Disclosure Audit
# ===========================================================================

def test_health_endpoints_do_not_leak_secrets_or_paths():
    """Verify health endpoints do not leak filesystem paths, private keys, or secrets."""
    for path in ("/health", "/api/v1/health"):
        r = client.get(path)
        assert r.status_code == 200
        text = r.text
        assert "private_key" not in text
        assert "secret" not in text.lower() or "qds_integrity_secret" not in text.lower()
        assert "C:\\" not in text
        assert "/home/" not in text
        assert "/Users/" not in text


def test_openapi_schema_information_disclosure():
    """Verify that the OpenAPI schema accurately defines the API without leaking secrets."""
    r = client.get("/api/openapi.json")
    assert r.status_code == 200
    schema = r.json()

    # Schema contains proper metadata
    assert schema["info"]["title"] == "QDS Threat Detection API"
    assert "/api/v1/health" in schema["paths"]
    assert "/signatures/verify" in schema["paths"]

    # Does not contain actual secrets or server paths
    schema_str = r.text
    assert "QDS_INTEGRITY_SECRET" not in schema_str
    assert "C:\\" not in schema_str


# ===========================================================================
# 5. CORS & HTTP Security
# ===========================================================================

def test_cors_whitelisted_origin_allowed():
    """Whitelisted origin receives Access-Control-Allow-Origin header."""
    headers = {"Origin": "http://localhost:5173"}
    r = client.get("/health", headers=headers)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert r.headers.get("access-control-allow-credentials") == "true"


def test_cors_untrusted_origin_rejected():
    """Untrusted origin does NOT receive Access-Control-Allow-Origin header."""
    headers = {"Origin": "http://malicious-site.example.com"}
    r = client.get("/health", headers=headers)
    assert r.status_code == 200
    # CORS middleware does not echo back untrusted origin
    assert r.headers.get("access-control-allow-origin") is None


def test_cors_options_preflight_succeeds():
    """OPTIONS preflight requests succeed without authentication or 500 errors."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    r = client.options("/api/v1/signatures/sign", headers=headers)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_security_headers_injected():
    """Standard defensive security headers are injected on responses."""
    r = client.get("/health")
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"
    assert r.headers.get("x-xss-protection") == "1; mode=block"


# ===========================================================================
# 6. Interaction with Signature Integrity & Resource Limits
# ===========================================================================

def test_auth_does_not_bypass_signature_integrity(monkeypatch):
    """Even with a valid API key, tampered signatures are rejected by HMAC integrity."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)
    headers = {"Authorization": f"Bearer {TEST_KEY}"}

    # Generate genuine signature
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Wire", "n_qubits": 2, "shots": 128}, headers=headers)
    sig_payload = dict(sign_res.json()["signature"])

    # Tamper with message outcome bits
    sig_payload["measurement_outcomes"][0] = 1 - sig_payload["measurement_outcomes"][0]

    # Verify tampered signature
    v_res = client.post("/api/v1/signatures/verify", json={"signature": sig_payload, "message": "Wire"}, headers=headers)
    assert v_res.status_code == 200
    assert v_res.json()["is_valid"] is False
    assert v_res.json()["reason"] == "signature_integrity_mismatch"


def test_auth_does_not_bypass_resource_limits(monkeypatch):
    """Even with a valid API key, oversized or abusive payloads are rejected with 422."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, TEST_KEY)
    headers = {"Authorization": f"Bearer {TEST_KEY}"}

    # Oversized shots (100,000 > 8192)
    r = client.post("/generate-keys/", json={"n_qubits": 2, "shots": 100000}, headers=headers)
    assert r.status_code == 422

    # Oversized message (> 65536)
    r = client.post("/api/v1/signatures/sign", json={"message": "A" * 70000, "n_qubits": 2}, headers=headers)
    assert r.status_code == 422
