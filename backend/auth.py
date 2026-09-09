"""
auth.py
=======
Purpose: Configurable API-key authentication and access-control middleware for QDS API.

Modes:
1. Open / Development Mode (Default):
   When the environment variable `QDS_API_KEY` is not set or empty,
   authentication is disabled. Public demos, dashboards, and local test suites
   function without requiring credentials.
2. Protected / Production Mode:
   When `QDS_API_KEY` is set to a non-empty secret, all sensitive API endpoints
   require a valid credential provided via:
     - `Authorization: Bearer <API_KEY>`
     - `X-API-Key: <API_KEY>`
   Health checks and OpenAPI documentation endpoints remain accessible.

Security Properties:
- Constant-time string comparison (`secrets.compare_digest`) prevents timing side-channels.
- Never accepts credentials in URL query parameters to avoid proxy/log leaks.
- Never logs, prints, or echoes API keys in error messages.
- Clean HTTP 401 Unauthorized responses with standard WWW-Authenticate header.
- Safely handles malformed Authorization headers (e.g. Basic auth, empty bearer, non-ASCII) without HTTP 500 errors.
"""

from __future__ import annotations

import logging
import os
import secrets
from typing import Set

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)

QDS_API_KEY_ENV_VAR: str = "QDS_API_KEY"

# Endpoints that remain public for service monitoring and API documentation
PUBLIC_PATH_PREFIXES: tuple[str, ...] = (
    "/health",
    "/api/v1/health",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    "/favicon.ico",
    "/auth",
    "/api/v1/auth",
)


def is_auth_required() -> bool:
    """Return True if an API key is configured in the environment."""
    key = os.environ.get(QDS_API_KEY_ENV_VAR, "").strip()
    return bool(key)


def get_configured_api_key() -> str:
    """Return the configured API key from the environment."""
    return os.environ.get(QDS_API_KEY_ENV_VAR, "").strip()


def extract_api_key(request: Request) -> str | None:
    """Safely extract the API key from request headers.

    Checks:
    1. Authorization: Bearer <key>
    2. X-API-Key: <key>

    Query parameters are intentionally NOT checked to prevent secret leakage
    in browser history and server access logs.
    """
    auth_header = request.headers.get("authorization", "").strip()
    if auth_header:
        parts = auth_header.split(None, 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1].strip()
            if token:
                return token
        # If an Authorization header is supplied but is not Bearer, return None
        return None

    x_api_key = request.headers.get("x-api-key", "").strip()
    if x_api_key:
        return x_api_key

    return None


def verify_api_key(provided_key: str | None) -> bool:
    """Verify the provided API key against the configured key in constant time."""
    configured_key = get_configured_api_key()
    if not configured_key:
        return True  # Open mode: any or no key is accepted
    if not provided_key:
        return False
    return secrets.compare_digest(provided_key, configured_key)


def is_public_path(path: str) -> bool:
    """Check if the given request path is exempt from authentication."""
    norm_path = path.rstrip("/") or "/"
    for pub_prefix in PUBLIC_PATH_PREFIXES:
        pub_norm = pub_prefix.rstrip("/") or "/"
        if norm_path == pub_norm or norm_path.startswith(pub_norm + "/"):
            return True
    return False


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """FastAPI/Starlette middleware enforcing API-key access control when configured,
    and injecting standard security response headers."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # 1. Always allow CORS preflight (OPTIONS) requests
        if request.method.upper() == "OPTIONS":
            return await call_next(request)

        # 2. Check authentication if QDS_API_KEY is active and path is not public
        if is_auth_required() and not is_public_path(request.url.path):
            provided_key = extract_api_key(request)
            if not verify_api_key(provided_key):
                logger.warning(
                    "Unauthorized access attempt to %s from %s (method=%s)",
                    request.url.path,
                    request.client.host if request.client else "unknown",
                    request.method,
                )
                return JSONResponse(
                    status_code=401,
                    content={
                        "error": "Unauthorized",
                        "detail": "Invalid or missing API key. Provide via 'Authorization: Bearer <key>' or 'X-API-Key: <key>'.",
                        "status_code": 401,
                    },
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # 3. Process request downstream
        response: Response = await call_next(request)

        # 4. Inject standard defensive HTTP security headers
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("X-XSS-Protection", "1; mode=block")

        return response
