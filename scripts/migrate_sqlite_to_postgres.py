"""
migrate_sqlite_to_postgres.py
=============================
Utility script to migrate historical audit records and cryptographic metadata
from SQLite (backend/audit_ledger.db) into PostgreSQL (hyperqds).
Preserves original timestamps, sequential IDs, SHA3-512 hashes, and HMAC tags.
"""

from __future__ import annotations

import logging
from pathlib import Path
import sqlite3
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import backend.env_loader
from backend.db import get_connection, release_connection, init_db
import psycopg2

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SQLITE_DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "audit_ledger.db"


def migrate() -> bool:
    if not SQLITE_DB_PATH.exists():
        logger.error("SQLite audit database not found at %s", SQLITE_DB_PATH)
        return False

    logger.info("Initializing PostgreSQL schema...")
    init_db()

    logger.info("Reading SQLite audit ledger from %s...", SQLITE_DB_PATH)
    sqlite_conn = sqlite3.connect(str(SQLITE_DB_PATH))
    sqlite_cur = sqlite_conn.cursor()

    # 1. Migrate audit_metadata
    sqlite_cur.execute("SELECT key, value FROM audit_metadata;")
    meta_rows = sqlite_cur.fetchall()
    logger.info("Found %d metadata entries in SQLite.", len(meta_rows))

    pg_conn = get_connection()
    try:
        with pg_conn.cursor() as pg_cur:
            meta_insert_sql = """
                INSERT INTO audit_metadata (key, value)
                VALUES (%s, %s)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
            """
            for key, val in meta_rows:
                # val is bytes (BLOB)
                pg_cur.execute(meta_insert_sql, (key, psycopg2.Binary(val) if isinstance(val, (bytes, bytearray)) else val))
            pg_conn.commit()
            logger.info("Audit metadata migrated successfully to PostgreSQL.")

            # 2. Migrate audit_records
            pg_cur.execute("TRUNCATE TABLE audit_records RESTART IDENTITY;")
            sqlite_cur.execute("""
                SELECT record_id, timestamp, session_id, event_type, message_hash,
                       verification_outcome, attack_type, qber, chi2_p_value, fidelity,
                       confidence_score, threat_classification, recommended_action,
                       node_id_hash, prev_hash, record_hash, hmac_tag, hash_algorithm,
                       source_tab, target_entity
                FROM audit_records
                ORDER BY seq ASC;
            """)
            records = sqlite_cur.fetchall()
            logger.info("Found %d audit records in SQLite.", len(records))

            record_insert_sql = """
                INSERT INTO audit_records (
                    record_id, timestamp, session_id, event_type, message_hash,
                    verification_outcome, attack_type, qber, chi2_p_value, fidelity,
                    confidence_score, threat_classification, recommended_action,
                    node_id_hash, prev_hash, record_hash, hmac_tag, hash_algorithm,
                    source_tab, target_entity
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (record_id) DO NOTHING;
            """

            migrated_count = 0
            for r in records:
                pg_cur.execute(record_insert_sql, r)
                if pg_cur.rowcount > 0:
                    migrated_count += 1

            pg_conn.commit()
            logger.info("Successfully migrated %d new audit records to PostgreSQL.", migrated_count)

            # Check total count in PostgreSQL
            pg_cur.execute("SELECT COUNT(*) FROM audit_records;")
            total_pg = pg_cur.fetchone()[0]
            logger.info("Total audit records in PostgreSQL: %d", total_pg)

    finally:
        release_connection(pg_conn)
        sqlite_conn.close()

    return True


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
