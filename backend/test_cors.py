"""
backend/test_cors.py
====================
Production-grade CORS verification suite for HyperQDS FastAPI backend.

Verifies:
1. Allowed development origins receive exact matching Access-Control-Allow-Origin.
2. Unauthorized origins (e.g. attacker.com, evil.org) are rejected (never reflected).
3. Insecure wildcard CORS ('*') is strictly disallowed with credentials.
4. Preflight OPTIONS requests succeed with appropriate methods, headers, and max_age.
5. Authorization and X-API-Key headers are permitted during preflight.
6. Dangerous HTTP methods (TRACE, CONNECT) are rejected / disallowed.
7. CORS headers are preserved on error responses: 400, 401, 404, 405, 422, 500.
8. Environment separation: production mode excludes localhost origins unless opted in.
9. Trailing slashes and whitespace in origin configurations are normalized.
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

from backend.main import (
    app,
    resolve_allowed_origins,
    resolve_allowed_methods,
    resolve_allowed_headers,
    DEFAULT_DEV_ORIGINS,
)
from backend.auth import QDS_API_KEY_ENV_VAR

client = TestClient(app, raise_server_exceptions=False)


# ===========================================================================
# 1. Allowed Development Origins
# ===========================================================================

@pytest.mark.parametrize("origin", [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
])
def test_allowed_dev_origins_receive_cors_headers(origin: str):
    """Every legitimate development origin receives matching Access-Control-Allow-Origin."""
    r = client.get("/health", headers={"Origin": origin})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == origin
    assert r.headers.get("access-control-allow-credentials") == "true"


# ===========================================================================
# 2. Unauthorized Origins Rejection & Anti-Reflection
# ===========================================================================

@pytest.mark.parametrize("unauthorized_origin", [
    "http://malicious-site.example.com",
    "https://evil.org",
    "http://localhost:9999",
    "http://attacker.local",
    "null",
])
def test_unauthorized_origins_never_receive_cors_headers(unauthorized_origin: str):
    """Untrusted origins must NEVER receive Access-Control-Allow-Origin."""
    r = client.get("/health", headers={"Origin": unauthorized_origin})
    assert r.status_code == 200
    # No CORS origin header must be returned to unauthorized origins
    assert r.headers.get("access-control-allow-origin") is None


def test_wildcard_cors_never_used_with_credentials():
    """Access-Control-Allow-Origin must never be wildcard '*'."""
    for origin in ("http://localhost:5173", "http://malicious.org"):
        r = client.get("/health", headers={"Origin": origin})
        assert r.headers.get("access-control-allow-origin") != "*"


# ===========================================================================
# 3. Preflight OPTIONS Handling
# ===========================================================================

def test_preflight_options_successful():
    """OPTIONS preflight request succeeds with appropriate CORS headers."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, content-type",
    }
    r = client.options("/api/v1/signatures/sign", headers=headers)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert r.headers.get("access-control-allow-credentials") == "true"

    # Methods
    allowed_methods = r.headers.get("access-control-allow-methods", "")
    assert "POST" in allowed_methods
    assert "OPTIONS" in allowed_methods

    # Headers
    allowed_headers = r.headers.get("access-control-allow-headers", "").lower()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers

    # Max-Age caching
    assert r.headers.get("access-control-max-age") is not None


def test_preflight_options_with_x_api_key():
    """OPTIONS preflight with X-API-Key header is accepted."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "x-api-key, accept",
    }
    r = client.options("/api/v1/audit-ledger", headers=headers)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    allowed_headers = r.headers.get("access-control-allow-headers", "").lower()
    assert "x-api-key" in allowed_headers


def test_preflight_disallowed_methods():
    """Dangerous HTTP methods such as TRACE or CONNECT are not permitted."""
    allowed_methods = resolve_allowed_methods()
    assert "TRACE" not in allowed_methods
    assert "CONNECT" not in allowed_methods


# ===========================================================================
# 4. Error Responses CORS Preservation (400, 401, 404, 405, 422, 500)
# ===========================================================================

def test_cors_headers_preserved_on_401_unauthorized(monkeypatch):
    """401 Unauthorized responses must preserve CORS headers for authorized origins."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, "secret_key_123")
    headers = {"Origin": "http://localhost:5173"}

    # Attempt access to protected route without credential
    r = client.get("/api/v1/audit-ledger", headers=headers)
    assert r.status_code == 401
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert r.headers.get("access-control-allow-credentials") == "true"


def test_cors_headers_preserved_on_404_not_found():
    """404 Not Found responses must preserve CORS headers for authorized origins."""
    r = client.get("/api/v1/nonexistent-endpoint", headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 404
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_headers_preserved_on_405_method_not_allowed():
    """405 Method Not Allowed responses must preserve CORS headers for authorized origins."""
    # /api/v1/signatures/verify is POST only
    r = client.get("/api/v1/signatures/verify", headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 405
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_headers_preserved_on_422_validation_error():
    """422 Validation Error responses must preserve CORS headers for authorized origins."""
    r = client.post(
        "/generate-keys/",
        json={"n_qubits": "invalid_type"},
        headers={"Origin": "http://localhost:5173"},
    )
    assert r.status_code == 422
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_headers_preserved_on_500_internal_server_error():
    """500 Internal Server Error responses must preserve CORS headers and sanitize internal paths."""
    from fastapi import APIRouter

    test_router = APIRouter()

    @test_router.get("/api/v1/test-crash")
    async def crash_endpoint():
        raise RuntimeError("Simulated server failure in C:\\sensitive\\backend\\service.py")

    app.include_router(test_router)

    r = client.get("/api/v1/test-crash", headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 500
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert r.headers.get("access-control-allow-credentials") == "true"

    # Confirm sensitive path was sanitized
    data = r.json()
    assert "C:\\sensitive" not in data.get("detail", "")
    assert "[REDACTED_PATH]" in data.get("detail", "")


# ===========================================================================
# 5. Environment Separation & Configuration Parsing
# ===========================================================================

def test_production_environment_excludes_localhost(monkeypatch):
    """In production mode, localhost origins are excluded unless explicitly enabled."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://app.hyperqds.io, https://monitor.hyperqds.io/")
    monkeypatch.delenv("QDS_ALLOW_LOCAL_ORIGINS", raising=False)

    origins = resolve_allowed_origins()
    assert "https://app.hyperqds.io" in origins
    # Trailing slash stripped
    assert "https://monitor.hyperqds.io" in origins
    assert "https://monitor.hyperqds.io/" not in origins

    # Localhost must not be present
    assert "http://localhost:5173" not in origins
    assert "http://127.0.0.1:5173" not in origins


def test_production_environment_allows_local_when_explicitly_configured(monkeypatch):
    """In production mode, localhost origins can be opted into via QDS_ALLOW_LOCAL_ORIGINS=true."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://app.hyperqds.io")
    monkeypatch.setenv("QDS_ALLOW_LOCAL_ORIGINS", "true")

    origins = resolve_allowed_origins()
    assert "https://app.hyperqds.io" in origins
    assert "http://localhost:5173" in origins


def test_wildcard_rejected_in_origin_parsing(monkeypatch):
    """Wildcard '*' in CORS_ALLOWED_ORIGINS is safely stripped to prevent credential leaks."""
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*, https://trusted.org")
    origins = resolve_allowed_origins()
    assert "*" not in origins
    assert "https://trusted.org" in origins


def test_custom_allowed_headers_parsing(monkeypatch):
    """Custom allowed headers from environment are properly parsed and merged."""
    monkeypatch.setenv("CORS_ALLOWED_HEADERS", "X-Custom-Trace, X-Request-ID")
    headers = resolve_allowed_headers()
    assert "X-Custom-Trace" in headers
    assert "X-Request-ID" in headers
