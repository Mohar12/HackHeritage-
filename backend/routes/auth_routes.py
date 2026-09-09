"""
auth_routes.py
==============
PostgreSQL-backed authentication endpoints for HyperQDS.
Provides production-grade registration, credential verification, bcrypt password hashing,
secure JWT sessions, and HTTP-only cookie management.
"""

from __future__ import annotations

import backend.env_loader

from datetime import datetime, timezone, timedelta
import base64
import hashlib

import json
import logging
import os
import re
import secrets
from typing import Any, Optional
from urllib.parse import urlencode

import bcrypt
import httpx
import jwt
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, Request, Response
from starlette.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr, Field

from backend.db import (
    create_user,
    get_or_create_oauth_user,
    get_user_by_email,
    get_user_by_id,
)

logger = logging.getLogger(__name__)

router = APIRouter()

JWT_SECRET: str = os.environ.get(
    "JWT_SECRET", "quantum_secure_jwt_secret_hyperqds_auth_environment_2026_key"
).strip()
JWT_ALGORITHM: str = "HS256"
SESSION_COOKIE_NAME: str = "hqds_session"
OAUTH_STATE_COOKIE_NAME: str = "hqds_oauth_state"
SESSION_EXPIRY_DAYS: int = 7

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def get_dashboard_url() -> str:
    return os.environ.get("DASHBOARD_URL", "http://localhost:5173").rstrip("/")


def _sanitize_local_redirect_uri(uri: str, default: str) -> str:
    """Ensure localhost/127.0.0.1 callback URLs do not inadvertently use https:// unless SSL is explicitly configured."""
    val = (uri or "").strip() or default
    is_ssl = os.environ.get("ENABLE_SSL", "").lower() in ("true", "1") or os.environ.get("HTTPS", "").lower() in ("true", "1")
    if not is_ssl:
        if val.startswith("https://localhost:") or val.startswith("https://127.0.0.1:"):
            val = "http://" + val[8:]
        elif val.startswith("https://localhost/") or val.startswith("https://127.0.0.1/"):
            val = "http://" + val[8:]
    return val


def get_google_config() -> tuple[str, str, str]:
    return (
        os.environ.get("GOOGLE_CLIENT_ID", "").strip(),
        os.environ.get("GOOGLE_CLIENT_SECRET", "").strip(),
        _sanitize_local_redirect_uri(
            os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback"),
            "http://localhost:8000/auth/google/callback"
        ),
    )


def get_github_config() -> tuple[str, str, str]:
    return (
        os.environ.get("GITHUB_CLIENT_ID", "").strip(),
        os.environ.get("GITHUB_CLIENT_SECRET", "").strip(),
        _sanitize_local_redirect_uri(
            os.environ.get("GITHUB_REDIRECT_URI", "http://localhost:8000/auth/github/callback"),
            "http://localhost:8000/auth/github/callback"
        ),
    )


def get_microsoft_config() -> tuple[str, str, str, str]:
    return (
        os.environ.get("MICROSOFT_CLIENT_ID", "").strip(),
        os.environ.get("MICROSOFT_CLIENT_SECRET", "").strip(),
        _sanitize_local_redirect_uri(
            os.environ.get("MICROSOFT_REDIRECT_URI", "http://localhost:8000/auth/microsoft/callback"),
            "http://localhost:8000/auth/microsoft/callback"
        ),
        os.environ.get("MICROSOFT_TENANT_ID", "common").strip() or "common",
    )



# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="Valid user email address")
    password: str = Field(..., min_length=8, description="User password, min 8 characters")
    full_name: Optional[str] = Field(None, max_length=150, description="Optional full name")


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    created_at: Optional[str] = None


class AuthSuccessResponse(BaseModel):
    status: str = "success"
    message: str
    user: UserProfileResponse
    token: str


class SimpleStatusResponse(BaseModel):
    status: str = "success"
    message: str


# ---------------------------------------------------------------------------
# Security Helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash password using bcrypt with a high work factor."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash in constant time."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_jwt_token(user_id: int, email: str, full_name: Optional[str] = None) -> str:
    """Generate a signed JWT token containing user identity and expiration."""
    exp = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "email": email,
        "full_name": full_name or "",
        "exp": exp,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt_token(token: str) -> dict:
    """Decode and validate a signed JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session token.")


def get_current_user_id(
    authorization: Optional[str] = Header(None),
    hqds_session: Optional[str] = Cookie(None),
) -> int:
    """Extract and authenticate the user ID from HTTP-only cookie or Authorization header."""
    token: Optional[str] = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif hqds_session:
        token = hqds_session.strip()

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")

    payload = decode_jwt_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")
    return int(user_id)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=AuthSuccessResponse, summary="Create a new HyperQDS user account")
async def register(req: UserRegisterRequest, response: Response):
    """Register a new user in PostgreSQL with salted bcrypt password hashing."""
    email = req.email.strip().lower()
    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    existing = get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    hashed = hash_password(req.password)
    user = create_user(email=email, password_hash=hashed, full_name=req.full_name)

    token = create_jwt_token(user_id=user["id"], email=user["email"], full_name=user.get("full_name"))

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_EXPIRY_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
        path="/",
    )

    return AuthSuccessResponse(
        status="success",
        message="Account registered successfully.",
        user=UserProfileResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=str(user.get("created_at")),
        ),
        token=token,
    )


@router.post("/login", response_model=AuthSuccessResponse, summary="Authenticate against PostgreSQL")
async def login(req: UserLoginRequest, response: Response):
    """Authenticate user with email and password, establishing an authenticated session."""
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user = get_user_by_email(email)
    if not user:
        # Constant-time dummy check prevents timing-based email enumeration
        verify_password("dummy_password", "$2b$12$e8Yd8w8q8e8r8t8y8u8i8o8p8a8s8d8f8g8h8j8k8l8z8x8c8v8b")
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_jwt_token(user_id=user["id"], email=user["email"], full_name=user.get("full_name"))

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_EXPIRY_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )

    return AuthSuccessResponse(
        status="success",
        message="Authentication successful.",
        user=UserProfileResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=str(user.get("created_at")),
        ),
        token=token,
    )


@router.get("/me", response_model=UserProfileResponse, summary="Get current authenticated user profile")
async def get_me(user_id: int = Depends(get_current_user_id)):
    """Fetch profile data for the currently authenticated session."""
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    return UserProfileResponse(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name"),
        created_at=str(user.get("created_at")),
    )


@router.post("/logout", response_model=SimpleStatusResponse, summary="Terminate session and clear cookie")
async def logout(response: Response):
    """Log out user by clearing the secure session cookie."""
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/", httponly=True, samesite="lax")
    return SimpleStatusResponse(status="success", message="Successfully signed out.")


# ---------------------------------------------------------------------------
# OAuth Security & Lifecycle Helpers
# ---------------------------------------------------------------------------

def generate_oauth_state(provider: str) -> tuple[str, str, str]:
    """Generate CSRF state token and optional PKCE verifier. Returns (state, code_challenge, state_jwt)."""
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    challenge_bytes = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(challenge_bytes).decode("ascii").rstrip("=")
    payload = {
        "provider": provider,
        "state": state,
        "verifier": code_verifier,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    state_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return state, code_challenge, state_jwt


def validate_oauth_state(state: str, state_jwt: Optional[str], expected_provider: str) -> dict[str, Any]:
    """Validate CSRF state against HTTP-only state cookie."""
    if not state or not state_jwt:
        raise ValueError("Missing OAuth state or validation token.")
    try:
        payload = jwt.decode(state_jwt, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception as e:
        raise ValueError(f"Invalid or expired OAuth state: {e}")
    if not secrets.compare_digest(payload.get("state", ""), state):
        raise ValueError("OAuth state token mismatch.")
    if payload.get("provider") != expected_provider:
        raise ValueError("OAuth provider mismatch.")
    return payload


def build_error_redirect(message: str) -> RedirectResponse:
    """Safely redirect to frontend sign-in page with clean user-facing error message."""
    dashboard = get_dashboard_url()
    params = urlencode({"error": message})
    resp = RedirectResponse(url=f"{dashboard}/sign-in?{params}", status_code=302)
    resp.delete_cookie(key=OAUTH_STATE_COOKIE_NAME, path="/", httponly=True, samesite="lax")
    return resp


def establish_authenticated_session(user: dict[str, Any], redirect_target: Optional[str] = None) -> RedirectResponse:
    """Establish the unified HyperQDS session cookie and redirect into the application."""
    token = create_jwt_token(user_id=user["id"], email=user["email"], full_name=user.get("full_name"))
    target = redirect_target or f"{get_dashboard_url()}/"
    response = RedirectResponse(url=target, status_code=302)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_EXPIRY_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    response.delete_cookie(key=OAUTH_STATE_COOKIE_NAME, path="/", httponly=True, samesite="lax")
    return response


# ---------------------------------------------------------------------------
# Google OAuth 2.0 / OpenID Connect Endpoints
# ---------------------------------------------------------------------------

@router.get("/google/login", summary="Initiate Google OAuth flow")
async def google_login(request: Request, response: Response, format: Optional[str] = Query(None)):
    """Generate state and redirect user to Google OpenID Connect consent screen."""
    client_id, _, redirect_uri = get_google_config()
    if not client_id:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured on the server.")

    state, code_challenge, state_jwt = generate_oauth_state("google")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "access_type": "online",
        "prompt": "select_account",
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    if format == "json" or "application/json" in request.headers.get("accept", ""):
        res = JSONResponse(content={"status": "success", "url": auth_url})
        res.set_cookie(key=OAUTH_STATE_COOKIE_NAME, value=state_jwt, max_age=600, httponly=True, samesite="lax", path="/")
        return res

    redirect = RedirectResponse(url=auth_url, status_code=302)
    redirect.set_cookie(key=OAUTH_STATE_COOKIE_NAME, value=state_jwt, max_age=600, httponly=True, samesite="lax", path="/")
    return redirect


@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    hqds_oauth_state: Optional[str] = Cookie(None),
):
    """Validate Google callback, exchange code, verify identity, and issue session."""
    if error:
        logger.info("Google OAuth login cancelled by user: %s", error)
        return build_error_redirect("Google authentication was cancelled.")

    if not code or not state:
        return build_error_redirect("Authentication could not be verified. Please try again.")

    try:
        payload = validate_oauth_state(state, hqds_oauth_state, "google")
    except ValueError as val_err:
        logger.warning("Google OAuth state validation failed: %s", val_err)
        return build_error_redirect("Authentication could not be verified. Please try again.")

    client_id, client_secret, redirect_uri = get_google_config()
    code_verifier = payload.get("verifier")

    try:
        async with httpx.AsyncClient(timeout=12.0) as http_client:
            token_res = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                    "code_verifier": code_verifier,
                },
            )
            if token_res.status_code != 200:
                logger.error("Google token exchange failed: %s", token_res.text)
                return build_error_redirect("Unable to complete authentication. Please try again.")

            token_data = token_res.json()
            access_token = token_data.get("access_token")

            userinfo_res = await http_client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_res.status_code != 200:
                logger.error("Google userinfo fetch failed: %s", userinfo_res.text)
                return build_error_redirect("Unable to complete authentication. Please try again.")

            userinfo = userinfo_res.json()
    except Exception as exc:
        logger.exception("Google OAuth network communication error: %s", exc)
        return build_error_redirect("Unable to complete authentication. Please try again.")

    sub = str(userinfo.get("sub", "")).strip()
    email = userinfo.get("email", "").strip().lower()
    email_verified = bool(userinfo.get("email_verified", False))
    full_name = userinfo.get("name") or userinfo.get("given_name")

    if not sub:
        return build_error_redirect("Unable to complete authentication. Please try again.")

    user = get_or_create_oauth_user(
        provider="google",
        provider_user_id=sub,
        email=email if email else None,
        email_verified=email_verified,
        full_name=full_name,
    )

    return establish_authenticated_session(user)


# ---------------------------------------------------------------------------
# GitHub OAuth Endpoints
# ---------------------------------------------------------------------------

@router.get("/github/login", summary="Initiate GitHub OAuth flow")
async def github_login(request: Request, response: Response, format: Optional[str] = Query(None)):
    """Generate state and redirect user to GitHub authorization page."""
    client_id, _, redirect_uri = get_github_config()
    if not client_id:
        raise HTTPException(status_code=500, detail="GitHub OAuth is not configured on the server.")

    state, _, state_jwt = generate_oauth_state("github")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state,
    }
    auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"

    if format == "json" or "application/json" in request.headers.get("accept", ""):
        res = JSONResponse(content={"status": "success", "url": auth_url})
        res.set_cookie(key=OAUTH_STATE_COOKIE_NAME, value=state_jwt, max_age=600, httponly=True, samesite="lax", path="/")
        return res

    redirect = RedirectResponse(url=auth_url, status_code=302)
    redirect.set_cookie(key=OAUTH_STATE_COOKIE_NAME, value=state_jwt, max_age=600, httponly=True, samesite="lax", path="/")
    return redirect


@router.get("/github/callback", summary="GitHub OAuth callback")
async def github_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    hqds_oauth_state: Optional[str] = Cookie(None),
):
    """Validate GitHub callback, exchange code, fetch profile + verified email, and issue session."""
    if error:
        logger.info("GitHub OAuth login cancelled by user: %s", error)
        return build_error_redirect("GitHub authentication was cancelled.")

    if not code or not state:
        return build_error_redirect("Authentication could not be verified. Please try again.")

    try:
        validate_oauth_state(state, hqds_oauth_state, "github")
    except ValueError as val_err:
        logger.warning("GitHub OAuth state validation failed: %s", val_err)
        return build_error_redirect("Authentication could not be verified. Please try again.")

    client_id, client_secret, redirect_uri = get_github_config()

    try:
        async with httpx.AsyncClient(timeout=12.0) as http_client:
            token_res = await http_client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            if token_res.status_code != 200:
                logger.error("GitHub token exchange failed: %s", token_res.text)
                return build_error_redirect("Unable to complete authentication. Please try again.")

            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("GitHub token response missing access_token: %s", token_data)
                return build_error_redirect("Unable to complete authentication. Please try again.")

            # Fetch user profile
            user_res = await http_client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                    "User-Agent": "HyperQDS-Auth",
                },
            )
            if user_res.status_code != 200:
                logger.error("GitHub user profile fetch failed: %s", user_res.text)
                return build_error_redirect("Unable to complete authentication. Please try again.")

            gh_user = user_res.json()
            gh_id = str(gh_user.get("id", "")).strip()
            gh_name = gh_user.get("name") or gh_user.get("login")
            gh_email = gh_user.get("email")
            email_verified = False

            # Safe email handling: query emails endpoint for private/hidden emails
            emails_res = await http_client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                    "User-Agent": "HyperQDS-Auth",
                },
            )
            if emails_res.status_code == 200:
                emails_list = emails_res.json()
                for em in emails_list:
                    if em.get("primary") and em.get("verified"):
                        gh_email = em.get("email")
                        email_verified = True
                        break
                if not email_verified:
                    for em in emails_list:
                        if em.get("verified"):
                            gh_email = em.get("email")
                            email_verified = True
                            break
            elif gh_email:
                email_verified = True
    except Exception as exc:
        logger.exception("GitHub OAuth network communication error: %s", exc)
        return build_error_redirect("Unable to complete authentication. Please try again.")

    if not gh_id:
        return build_error_redirect("Unable to complete authentication. Please try again.")

    user = get_or_create_oauth_user(
        provider="github",
        provider_user_id=gh_id,
        email=gh_email if gh_email else None,
        email_verified=email_verified,
        full_name=gh_name,
    )

    return establish_authenticated_session(user)


# ---------------------------------------------------------------------------
# Microsoft Entra ID / OpenID Connect Endpoints
# ---------------------------------------------------------------------------

@router.get("/microsoft/login", summary="Initiate Microsoft OAuth flow")
async def microsoft_login(request: Request, response: Response, format: Optional[str] = Query(None)):
    """Generate state and redirect user to Microsoft Entra ID login."""
    client_id, _, redirect_uri, tenant = get_microsoft_config()
    if not client_id:
        raise HTTPException(status_code=500, detail="Microsoft OAuth is not configured on the server.")

    state, code_challenge, state_jwt = generate_oauth_state("microsoft")

    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": "openid email profile User.Read",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    auth_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?{urlencode(params)}"

    if format == "json" or "application/json" in request.headers.get("accept", ""):
        res = JSONResponse(content={"status": "success", "url": auth_url})
        res.set_cookie(key=OAUTH_STATE_COOKIE_NAME, value=state_jwt, max_age=600, httponly=True, samesite="lax", path="/")
        return res

    redirect = RedirectResponse(url=auth_url, status_code=302)
    redirect.set_cookie(key=OAUTH_STATE_COOKIE_NAME, value=state_jwt, max_age=600, httponly=True, samesite="lax", path="/")
    return redirect


@router.get("/microsoft/callback", summary="Microsoft OAuth callback")
async def microsoft_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    hqds_oauth_state: Optional[str] = Cookie(None),
):
    """Validate Microsoft callback, exchange code with PKCE, retrieve profile, and issue session."""
    if error:
        logger.info("Microsoft OAuth login cancelled by user: %s", error)
        return build_error_redirect("Microsoft authentication was cancelled.")

    if not code or not state:
        return build_error_redirect("Authentication could not be verified. Please try again.")

    try:
        payload = validate_oauth_state(state, hqds_oauth_state, "microsoft")
    except ValueError as val_err:
        logger.warning("Microsoft OAuth state validation failed: %s", val_err)
        return build_error_redirect("Authentication could not be verified. Please try again.")

    client_id, client_secret, redirect_uri, tenant = get_microsoft_config()
    code_verifier = payload.get("verifier")

    data = {
        "client_id": client_id,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
        "code_verifier": code_verifier,
    }
    if client_secret:
        data["client_secret"] = client_secret

    try:
        async with httpx.AsyncClient(timeout=12.0) as http_client:
            token_res = await http_client.post(
                f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                data=data,
            )
            if token_res.status_code != 200:
                logger.error("Microsoft token exchange failed: %s", token_res.text)
                return build_error_redirect("Unable to complete authentication. Please try again.")

            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("Microsoft token response missing access_token: %s", token_data)
                return build_error_redirect("Unable to complete authentication. Please try again.")

            # Fetch profile from Microsoft Graph
            user_res = await http_client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_res.status_code != 200:
                logger.error("Microsoft Graph profile fetch failed: %s", user_res.text)
                return build_error_redirect("Unable to complete authentication. Please try again.")

            ms_user = user_res.json()
            ms_id = str(ms_user.get("id", "")).strip()
            ms_name = ms_user.get("displayName")
            ms_email = ms_user.get("mail") or ms_user.get("userPrincipalName")
            email_verified = True
    except Exception as exc:
        logger.exception("Microsoft OAuth network communication error: %s", exc)
        return build_error_redirect("Unable to complete authentication. Please try again.")

    if not ms_id:
        return build_error_redirect("Unable to complete authentication. Please try again.")

    user = get_or_create_oauth_user(
        provider="microsoft",
        provider_user_id=ms_id,
        email=ms_email if ms_email else None,
        email_verified=email_verified,
        full_name=ms_name,
    )

    return establish_authenticated_session(user)

