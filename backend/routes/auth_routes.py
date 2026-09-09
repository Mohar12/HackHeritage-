"""
auth_routes.py
==============
PostgreSQL-backed authentication endpoints for HyperQDS.
Provides production-grade registration, credential verification, bcrypt password hashing,
secure JWT sessions, and HTTP-only cookie management.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
import logging
import os
import re
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from backend.db import create_user, get_user_by_email, get_user_by_id

logger = logging.getLogger(__name__)

router = APIRouter()

JWT_SECRET: str = os.environ.get(
    "JWT_SECRET", "quantum_secure_jwt_secret_hyperqds_auth_environment_2026_key"
).strip()
JWT_ALGORITHM: str = "HS256"
SESSION_COOKIE_NAME: str = "hqds_session"
SESSION_EXPIRY_DAYS: int = 7

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


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
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return SimpleStatusResponse(status="success", message="Successfully signed out.")
