"""
db.py
=====
PostgreSQL database connection management and schema initialization for HyperQDS.
Handles connection pooling, automatic database creation, and secure parameterized queries.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional
from urllib.parse import urlparse

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

logger = logging.getLogger(__name__)

DEFAULT_DATABASE_URL = "postgresql://postgres:12345678@127.0.0.1:5432/hyperqds"
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
    """Initialize the PostgreSQL connection pool and create the users schema."""
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

    # 3. Create users schema
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    full_name VARCHAR(255),
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            """)
            conn.commit()
            logger.info("Database schema verified: 'users' table is ready.")
    finally:
        release_connection(conn)


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


def create_user(email: str, password_hash: str, full_name: Optional[str] = None) -> dict[str, Any]:
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
