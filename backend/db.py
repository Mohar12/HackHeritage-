"""
db.py
=====
PostgreSQL database connection management and schema initialization for HyperQDS.
Handles connection pooling, automatic database creation, and secure parameterized queries.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Optional
from urllib.parse import urlparse

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

logger = logging.getLogger(__name__)

DEFAULT_DATABASE_URL = "postgresql://postgres:ANANYA2006@127.0.0.1:5432/hyperqds"
_pool: Optional[ThreadedConnectionPool] = None


def get_database_url() -> str:
    """Retrieve database URL from environment or use local default."""
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL).strip()


def parse_db_url(url: str) -> dict[str, Any]:
    """Parse a PostgreSQL connection URL into component parameters."""
    parsed = urlparse(url)
    return {
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
        "host": parsed.hostname or "127.0.0.1",
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/") or "hyperqds",
    }


def ensure_database_exists(db_params: dict[str, Any]) -> None:
    """Ensure target PostgreSQL database exists; if not, connect to default 'postgres' db and create it."""
    dbname = db_params["dbname"]
    if dbname == "postgres":
        return

    admin_params = db_params.copy()
    admin_params["dbname"] = "postgres"

    try:
        conn = psycopg2.connect(**admin_params, connect_timeout=3)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (dbname,))
            if not cur.fetchone():
                logger.info("Database '%s' does not exist. Creating database...", dbname)
                cur.execute(f'CREATE DATABASE "{dbname}";')
                logger.info("Database '%s' created successfully.", dbname)
            else:
                logger.debug("Database '%s' exists.", dbname)
        conn.close()
    except Exception as exc:
        logger.warning("Could not auto-create database '%s' via admin connection: %s", dbname, exc)


def init_db() -> None:
    """Initialize the PostgreSQL connection pool and create schemas for users, oauth, and audit ledger."""
    global _pool
    db_url = get_database_url()
    db_params = parse_db_url(db_url)

    # 1. Ensure target database exists
    ensure_database_exists(db_params)

    # 2. Initialize connection pool
    try:
        _pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            **db_params,
            connect_timeout=5,
        )
        logger.info("PostgreSQL connection pool initialized for '%s'.", db_params["dbname"])
    except Exception as exc:
        logger.error("Failed to initialize PostgreSQL connection pool: %s", exc)
        raise exc

    # 3. Create users, oauth_accounts, and audit ledger schemas
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    full_name VARCHAR(255),
                    password_hash VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

                -- Ensure password_hash is nullable for OAuth users
                ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

                CREATE TABLE IF NOT EXISTS oauth_accounts (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    provider VARCHAR(50) NOT NULL,
                    provider_user_id VARCHAR(255) NOT NULL,
                    provider_email VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_oauth_provider_user UNIQUE (provider, provider_user_id)
                );
                CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
                CREATE INDEX IF NOT EXISTS idx_oauth_accounts_lookup ON oauth_accounts(provider, provider_user_id);

                -- Audit Ledger tables
                CREATE TABLE IF NOT EXISTS audit_metadata (
                    key VARCHAR(255) PRIMARY KEY,
                    value BYTEA NOT NULL
                );

                CREATE TABLE IF NOT EXISTS audit_records (
                    seq SERIAL PRIMARY KEY,
                    record_id VARCHAR(128) UNIQUE NOT NULL,
                    timestamp DOUBLE PRECISION NOT NULL,
                    session_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    message_hash TEXT,
                    verification_outcome TEXT,
                    attack_type TEXT,
                    qber DOUBLE PRECISION,
                    chi2_p_value DOUBLE PRECISION,
                    fidelity DOUBLE PRECISION,
                    confidence_score DOUBLE PRECISION,
                    threat_classification TEXT,
                    recommended_action TEXT,
                    node_id_hash TEXT NOT NULL,
                    prev_hash TEXT NOT NULL,
                    record_hash TEXT NOT NULL,
                    hmac_tag TEXT NOT NULL,
                    hash_algorithm TEXT NOT NULL,
                    source_tab TEXT,
                    target_entity TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_audit_records_timestamp ON audit_records(timestamp);
                CREATE INDEX IF NOT EXISTS idx_audit_records_session_id ON audit_records(session_id);
                CREATE INDEX IF NOT EXISTS idx_audit_records_record_id ON audit_records(record_id);
            """)
            conn.commit()
            logger.info("Database schema verified: 'users', 'oauth_accounts', 'audit_metadata', and 'audit_records' tables are ready.")
    finally:
        release_connection(conn)


def check_db_connection() -> dict[str, Any]:
    """Verify live connectivity to PostgreSQL, calculate round-trip latency, and return table counts."""
    start = time.perf_counter()
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                ver_row = cur.fetchone()
                version_info = ver_row[0] if ver_row else "unknown"

                cur.execute("SELECT COUNT(*) FROM users;")
                users_count = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM audit_records;")
                audit_count = cur.fetchone()[0]

            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            db_params = parse_db_url(get_database_url())
            return {
                "status": "connected",
                "engine": "postgresql",
                "host": db_params.get("host", "127.0.0.1"),
                "port": db_params.get("port", 5432),
                "database": db_params.get("dbname", "hyperqds"),
                "latency_ms": latency_ms,
                "version": version_info.split(",")[0] if version_info else "PostgreSQL",
                "counts": {
                    "users": users_count,
                    "audit_records": audit_count,
                },
            }
        finally:
            release_connection(conn)
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "disconnected",
            "engine": "postgresql",
            "error": str(exc),
            "latency_ms": latency_ms,
        }


def get_connection():
    """Borrow a connection from the connection pool."""
    global _pool
    if _pool is None:
        init_db()
    return _pool.getconn()


def release_connection(conn) -> None:
    """Return a connection back to the pool."""
    global _pool
    if _pool and conn:
        _pool.putconn(conn)


def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    """Fetch user record by email (case-insensitive) using parameterized query."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, email, full_name, password_hash, created_at, updated_at FROM users WHERE LOWER(email) = LOWER(%s);",
                (email.strip(),),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        release_connection(conn)


def get_user_by_id(user_id: int) -> Optional[dict[str, Any]]:
    """Fetch user record by ID using parameterized query."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, email, full_name, created_at, updated_at FROM users WHERE id = %s;",
                (user_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        release_connection(conn)


def create_user(email: str, password_hash: Optional[str] = None, full_name: Optional[str] = None) -> dict[str, Any]:
    """Insert a new user record using parameterized query."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO users (email, password_hash, full_name, created_at, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, email, full_name, created_at;
                """,
                (email.strip().lower(), password_hash, (full_name or "").strip() or None),
            )
            new_user = dict(cur.fetchone())
            conn.commit()
            return new_user
    finally:
        release_connection(conn)


def update_user_full_name(user_id: int, full_name: str) -> None:
    """Update user's full name."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET full_name = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                ((full_name or "").strip(), user_id),
            )
            conn.commit()
    finally:
        release_connection(conn)


def get_oauth_account(provider: str, provider_user_id: str) -> Optional[dict[str, Any]]:
    """Fetch an OAuth account record by provider and provider_user_id."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, provider, provider_user_id, provider_email, created_at, updated_at
                FROM oauth_accounts
                WHERE LOWER(provider) = LOWER(%s) AND provider_user_id = %s;
                """,
                (provider.strip(), str(provider_user_id).strip()),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        release_connection(conn)


def link_oauth_account(
    user_id: int,
    provider: str,
    provider_user_id: str,
    provider_email: Optional[str] = None,
) -> dict[str, Any]:
    """Link an external OAuth identity to an existing HyperQDS user account."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, created_at, updated_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (provider, provider_user_id) DO UPDATE
                SET provider_email = EXCLUDED.provider_email,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, user_id, provider, provider_user_id, provider_email, created_at, updated_at;
                """,
                (
                    user_id,
                    provider.strip().lower(),
                    str(provider_user_id).strip(),
                    (provider_email or "").strip().lower() or None,
                ),
            )
            account = dict(cur.fetchone())
            conn.commit()
            return account
    finally:
        release_connection(conn)


def get_or_create_oauth_user(
    provider: str,
    provider_user_id: str,
    email: Optional[str],
    email_verified: bool,
    full_name: Optional[str] = None,
) -> dict[str, Any]:
    """Authenticate or register an OAuth identity according to HyperQDS security rules:
    1. Look up existing OAuth link (provider + provider_user_id).
    2. If not linked:
       - If verified email matches existing user: safely link to that user.
       - If verified email does not match existing user: create new user with verified email.
       - If unverified/missing email: NEVER link to existing account; create an isolated account.
    3. Ensure oauth_accounts link is recorded.
    """
    clean_provider = provider.strip().lower()
    clean_puid = str(provider_user_id).strip()
    clean_email = (email or "").strip().lower()

    # 1. Existing OAuth account lookup
    oauth_acc = get_oauth_account(clean_provider, clean_puid)
    if oauth_acc:
        user = get_user_by_id(oauth_acc["user_id"])
        if user:
            if full_name and not user.get("full_name"):
                update_user_full_name(user["id"], full_name)
                user["full_name"] = full_name
            return user

    # 2. Not previously linked. Check verified email
    if clean_email and email_verified:
        matched_user = get_user_by_email(clean_email)
        if matched_user:
            link_oauth_account(matched_user["id"], clean_provider, clean_puid, clean_email)
            if full_name and not matched_user.get("full_name"):
                update_user_full_name(matched_user["id"], full_name)
                matched_user["full_name"] = full_name
            return matched_user

    # 3. No existing user or unverified email: create a new isolated user record
    target_email = clean_email if (clean_email and email_verified) else f"{clean_provider}_{clean_puid}@oauth.hyperqds.internal"

    existing = get_user_by_email(target_email)
    if existing:
        link_oauth_account(existing["id"], clean_provider, clean_puid, target_email)
        return existing

    new_user = create_user(email=target_email, password_hash=None, full_name=full_name)
    link_oauth_account(new_user["id"], clean_provider, clean_puid, clean_email or target_email)
    return new_user


def check_db_health() -> dict[str, Any]:
    """Verify PostgreSQL database connectivity and return status details."""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()
            dbname = parse_db_url(get_database_url())["dbname"]
            return {"status": "connected", "database": dbname}
        finally:
            release_connection(conn)
    except Exception as exc:
        return {"status": "error", "error": str(exc)}

