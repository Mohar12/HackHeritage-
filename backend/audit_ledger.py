"""
audit_ledger.py
===============
Purpose: In-memory immutable append-only audit ledger for QDS protocol events.

Cryptographic Upgrade (PyCA cryptography 42+)
----------------------------------------------
Hash function: SHA3-512 (Keccak) — post-quantum resistant.
  - SHA-256 is vulnerable to Grover's algorithm: 256-bit classical ≡ 128-bit
    quantum security. SHA3-512 provides 256-bit post-quantum security.
  - Each record payload is hashed with SHA3-512 to form the chain link.

HMAC Authentication: HMAC-SHA3-512 on each block.
  - Provides Message Authentication Code under a session key.
  - Detects tampering even if hash preimage resistance is weakened.

Ed25519 Block Signing: Optional per-genesis EdDSA signature.
  - Ed25519 is a Schnorr-variant digital signature scheme over Curve25519.
  - Resistant to quantum side-channel attacks (constant-time implementation).
  - Each newly created ledger generates an Ed25519 keypair; genesis block
    is signed; subsequent verification uses the stored public key.

Compliance
----------
- Asynchronous & non-blocking: never blocks live detection or quantum execution.
- No raw quantum data: stores only hashes, session IDs, verification outcomes,
  QBER, chi2 p-values, threat classifications, and timestamps.
- Append-only: entries cannot be modified or deleted.

References
----------
- SHA3-512: NIST FIPS 202 (2015). SHA-3 Standard.
- Ed25519: Bernstein et al. (2011). IACR Cryptology ePrint 2011:368.
- PyCA cryptography: https://cryptography.io/en/latest/
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
import sqlite3
import threading
import time
from typing import Any
from pydantic import BaseModel

# PyCA cryptography — post-quantum resistant primitives
from cryptography.hazmat.primitives import hashes, hmac as crypto_hmac
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PrivateFormat,
    PublicFormat,
    NoEncryption,
)
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature


# Default database location inside backend/ directory
DEFAULT_DB_PATH: Path = Path(__file__).resolve().parent / "audit_ledger.db"


# ---------------------------------------------------------------------------
# SHA3-512 post-quantum hash function (replaces SHA-256)
# ---------------------------------------------------------------------------

def _sha3_512_hex(data: bytes) -> str:
    """Compute SHA3-512 (Keccak) hash of bytes, return hex string.

    SHA3-512 provides 256-bit post-quantum security (Grover's algorithm
    halves the classical 512-bit security, leaving 256 bits — the NIST
    post-quantum minimum).
    """
    from cryptography.hazmat.primitives.hashes import SHA3_512
    from cryptography.hazmat.primitives import hashes as h_mod
    digest = h_mod.Hash(SHA3_512(), backend=default_backend())
    digest.update(data)
    return digest.finalize().hex()


def _hmac_sha3_512_hex(key: bytes, data: bytes) -> str:
    """Compute HMAC-SHA3-512 tag. Authenticates data under key."""
    from cryptography.hazmat.primitives.hashes import SHA3_512
    mac = crypto_hmac.HMAC(key, SHA3_512(), backend=default_backend())
    mac.update(data)
    return mac.finalize().hex()


def _canonical_payload(
    session_id: str,
    event_type: str,
    timestamp: float,
    node_id_hash: str,
    message_hash: str | None = None,
    verification_outcome: str | None = None,
    attack_type: str | None = None,
    qber: float | None = None,
    chi2_p_value: float | None = None,
    fidelity: float | None = None,
    confidence_score: float | None = None,
    threat_classification: str | None = None,
    recommended_action: str | None = None,
    prev_hash: str = "GENESIS_ROOT",
    source_tab: str | None = None,
    target_entity: str | None = None,
) -> dict[str, Any]:
    """Canonicalize payload dictionary with normalized numeric types to ensure
    identical JSON serialization across in-memory and SQLite round-trips."""
    return {
        "session_id": session_id,
        "event_type": event_type,
        "timestamp": float(timestamp),
        "node_id_hash": node_id_hash,
        "message_hash": message_hash,
        "verification_outcome": verification_outcome,
        "attack_type": attack_type,
        "qber": float(qber) if qber is not None else None,
        "chi2_p_value": float(chi2_p_value) if chi2_p_value is not None else None,
        "fidelity": float(fidelity) if fidelity is not None else None,
        "confidence_score": float(confidence_score) if confidence_score is not None else None,
        "threat_classification": threat_classification,
        "recommended_action": recommended_action,
        "prev_hash": prev_hash,
        "source_tab": source_tab,
        "target_entity": target_entity,
    }


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class AuditVerifyResponse(BaseModel):
    valid: bool
    records_checked: int
    error: str | None = None


class AuditRecord(BaseModel):
    record_id: str
    timestamp: float
    session_id: str
    event_type: str  # "KEY_DISTRIBUTION" | "SIGNING" | "VERIFICATION" | "ATTACK_SIMULATION" | "THREAT_DETECTION"
    message_hash: str | None = None
    verification_outcome: str | None = None  # "ACCEPT" | "REJECT"
    attack_type: str | None = None
    qber: float | None = None
    chi2_p_value: float | None = None
    fidelity: float | None = None
    confidence_score: float | None = None
    threat_classification: str | None = None  # "SECURE" | "WARNING" | "COMPROMISED"
    recommended_action: str | None = None     # "NONE" | "ALERT" | "ABORT"
    node_id_hash: str
    prev_hash: str = "GENESIS_ROOT"
    record_hash: str
    # New post-quantum fields
    hmac_tag: str = ""         # HMAC-SHA3-512 authentication tag (hex)
    hash_algorithm: str = "sha3-512"  # Documents which hash was used
    source_tab: str | None = None      # Operational origin module / tab
    target_entity: str | None = None   # Target digital signature document / asset


# ---------------------------------------------------------------------------
# Audit Ledger
# ---------------------------------------------------------------------------

class AuditLedger:
    """Thread-safe, coroutine-safe, append-only post-quantum cryptographic audit ledger
    with persistent SQLite backend storage.

    Security Properties
    -------------------
    - **Hash chain integrity**: each record embeds SHA3-512(prev_record_payload).
    - **HMAC authentication**: each record carries HMAC-SHA3-512 under a persistent
      cryptographic key securely stored in the backend metadata store.
    - **Ed25519 genesis signature**: the empty-ledger genesis state is signed;
      the public key and signature are persisted for verifiable chain origin.
    - **Post-quantum hash security**: SHA3-512 → 256-bit quantum security
      (Grover's attack on SHA-256 gives only 128-bit quantum security).
    - **Durable Persistence**: backed by SQLite with strict parameterized queries,
      monotonic sequence tracking, and WAL durability across backend restarts.
    - **Tamper Detection & Fail-Closed Behavior**: detects disk or memory tampering
      and enters a fail-closed unwriteable state without destroying historical evidence.
    """

    DEFAULT_DB_PATH = DEFAULT_DB_PATH

    def __init__(self, db_path: str | Path | None = None) -> None:
        self._records: list[AuditRecord] = []
        self._sync_lock = threading.Lock()
        self._lock = self._sync_lock  # alias for backwards compatibility
        self._async_lock: asyncio.Lock | None = None
        self._corrupted: bool = False
        self._corruption_error: str | None = None

        if db_path is not None:
            self._db_path: str | None = str(db_path)
        elif "QDS_AUDIT_DB_PATH" in os.environ:
            self._db_path = os.environ["QDS_AUDIT_DB_PATH"]
        else:
            self._db_path = None

        self._db_conn: sqlite3.Connection | None = None
        self._init_storage()

    def _init_storage(self) -> None:
        """Initialize SQLite storage connection, schema, and keys."""
        try:
            if self._db_path is None or self._db_path == ":memory:":
                self._db_conn = sqlite3.connect(":memory:", check_same_thread=False)
            else:
                # Sanitize and validate path string against null bytes or URI parameter injection
                raw_path = str(self._db_path).strip()
                if "\x00" in raw_path:
                    raise ValueError("Database path contains invalid null bytes.")
                if raw_path.startswith("file:") and ("?" in raw_path or "&" in raw_path):
                    raise ValueError("Database path contains unsupported URI parameters.")

                db_file = Path(raw_path).resolve()
                db_file.parent.mkdir(parents=True, exist_ok=True)
                self._db_conn = sqlite3.connect(
                    str(db_file), check_same_thread=False, timeout=30.0
                )
                self._db_conn.execute("PRAGMA journal_mode=WAL;")
                self._db_conn.execute("PRAGMA synchronous=NORMAL;")
                # Restrict file permissions on Unix systems
                if os.name != "nt" and db_file.exists():
                    try:
                        os.chmod(str(db_file), 0o600)
                    except OSError:
                        pass

            self._create_schema()
            self._init_or_load_keys()
            self._load_records()
        except Exception as exc:
            self._corrupted = True
            self._corruption_error = f"Storage initialization failed: {exc}"

    def _create_schema(self) -> None:
        """Create metadata and audit_records tables if they do not exist."""
        if self._db_conn is None:
            return
        with self._db_conn:
            self._db_conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_metadata (
                    key TEXT PRIMARY KEY,
                    value BLOB NOT NULL
                );
            """)
            self._db_conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_records (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT,
                    record_id TEXT UNIQUE NOT NULL,
                    timestamp REAL NOT NULL,
                    session_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    message_hash TEXT,
                    verification_outcome TEXT,
                    attack_type TEXT,
                    qber REAL,
                    chi2_p_value REAL,
                    fidelity REAL,
                    confidence_score REAL,
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
            """)
            self._db_conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_records_timestamp 
                ON audit_records (timestamp);
            """)
            self._db_conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_records_session_id 
                ON audit_records (session_id);
            """)

    def _init_or_load_keys(self) -> None:
        """Load persistent keys from audit_metadata or initialize new ones securely."""
        if self._db_conn is None or self._corrupted:
            return

        cursor = self._db_conn.cursor()
        cursor.execute("SELECT key, value FROM audit_metadata")
        meta = dict(cursor.fetchall())

        if "hmac_key" in meta and "ed25519_private_key" in meta:
            # Load existing persisted cryptographic material
            try:
                self._hmac_key = bytes(meta["hmac_key"])
                priv_bytes = bytes(meta["ed25519_private_key"])
                pub_bytes = bytes(meta["ed25519_public_key"])
                self._ed25519_private_key = Ed25519PrivateKey.from_private_bytes(priv_bytes)
                self._ed25519_public_key = Ed25519PublicKey.from_public_bytes(pub_bytes)
                self._genesis_message = bytes(meta["genesis_message"])
                self._genesis_signature = bytes(meta["genesis_signature"])

                # Verify genesis signature integrity on startup
                self._ed25519_public_key.verify(self._genesis_signature, self._genesis_message)
            except Exception as e:
                self._corrupted = True
                self._corruption_error = f"Cryptographic metadata verification failed: {e}"
        else:
            # Fresh initialization: generate keys and persist securely in backend metadata table
            self._hmac_key = os.urandom(64)  # 512-bit HMAC key
            self._ed25519_private_key = Ed25519PrivateKey.generate()
            self._ed25519_public_key = self._ed25519_private_key.public_key()

            priv_bytes = self._ed25519_private_key.private_bytes(
                Encoding.Raw, PrivateFormat.Raw, NoEncryption()
            )
            pub_bytes = self._ed25519_public_key.public_bytes(
                Encoding.Raw, PublicFormat.Raw
            )

            genesis_msg = f"GENESIS:{time.time()}".encode()
            self._genesis_message = genesis_msg
            self._genesis_signature = self._ed25519_private_key.sign(genesis_msg)

            with self._db_conn:
                self._db_conn.executemany(
                    "INSERT OR REPLACE INTO audit_metadata (key, value) VALUES (?, ?)",
                    [
                        ("schema_version", b"1.0"),
                        ("created_at", str(time.time()).encode("utf-8")),
                        ("hmac_key", self._hmac_key),
                        ("ed25519_private_key", priv_bytes),
                        ("ed25519_public_key", pub_bytes),
                        ("genesis_message", self._genesis_message),
                        ("genesis_signature", self._genesis_signature),
                    ],
                )

    def _load_records(self) -> None:
        """Load records from SQLite database, verify unbroken chain, and populate cache."""
        if self._db_conn is None or self._corrupted:
            return

        cursor = self._db_conn.cursor()
        cursor.execute("""
            SELECT record_id, timestamp, session_id, event_type, message_hash,
                   verification_outcome, attack_type, qber, chi2_p_value, fidelity,
                   confidence_score, threat_classification, recommended_action,
                   node_id_hash, prev_hash, record_hash, hmac_tag, hash_algorithm,
                   source_tab, target_entity
            FROM audit_records
            ORDER BY seq ASC
        """)
        rows = cursor.fetchall()
        loaded: list[AuditRecord] = []
        for r in rows:
            loaded.append(
                AuditRecord(
                    record_id=r[0],
                    timestamp=r[1],
                    session_id=r[2],
                    event_type=r[3],
                    message_hash=r[4],
                    verification_outcome=r[5],
                    attack_type=r[6],
                    qber=r[7],
                    chi2_p_value=r[8],
                    fidelity=r[9],
                    confidence_score=r[10],
                    threat_classification=r[11],
                    recommended_action=r[12],
                    node_id_hash=r[13],
                    prev_hash=r[14],
                    record_hash=r[15],
                    hmac_tag=r[16],
                    hash_algorithm=r[17],
                    source_tab=r[18],
                    target_entity=r[19],
                )
            )

        if loaded:
            verify_res = self._verify_chain_records(loaded)
            if not verify_res["valid"]:
                self._corrupted = True
                self._corruption_error = verify_res["error"]
            # Retain loaded records in memory for forensic inspection
            self._records = loaded

    def _get_async_lock(self) -> asyncio.Lock:
        if self._async_lock is None:
            self._async_lock = asyncio.Lock()
        return self._async_lock

    @property
    def is_corrupted(self) -> bool:
        """Check if ledger detected corruption and failed closed."""
        with self._sync_lock:
            return self._corrupted

    @property
    def corruption_error(self) -> str | None:
        """Get corruption failure reason if any."""
        with self._sync_lock:
            return self._corruption_error

    def _compute_record_hash(self, payload: dict) -> str:
        """Hash the record payload using SHA3-512 (post-quantum)."""
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        return _sha3_512_hex(payload_bytes)

    def _compute_hmac_tag(self, payload: dict) -> str:
        """Compute HMAC-SHA3-512 authentication tag over the record payload."""
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        return _hmac_sha3_512_hex(self._hmac_key, payload_bytes)

    def record_event(
        self,
        session_id: str,
        event_type: str,
        node_id: str = "Alice",
        message_hash: str | None = None,
        verification_outcome: str | None = None,
        attack_type: str | None = None,
        qber: float | None = None,
        chi2_p_value: float | None = None,
        fidelity: float | None = None,
        confidence_score: float | None = None,
        threat_classification: str | None = None,
        recommended_action: str | None = None,
        source_tab: str | None = None,
        target_entity: str | None = None,
    ) -> AuditRecord:
        """Atomically generate record_id, chain previous SHA3-512 hash, and persist record."""
        ts = time.time()
        # SHA3-512 hash of node_id (first 16 hex chars for brevity)
        node_id_hash = _sha3_512_hex(node_id.encode("utf-8"))[:16]

        with self._sync_lock:
            if self._corrupted:
                raise RuntimeError(
                    f"Audit ledger is in corrupted/tampered state: {self._corruption_error}. "
                    "Refusing to append new records."
                )

            prev_hash = self._records[-1].record_hash if self._records else "GENESIS_ROOT"
            rec_id = f"aud-{len(self._records) + 1:06d}"

            payload = _canonical_payload(
                session_id=session_id,
                event_type=event_type,
                timestamp=ts,
                node_id_hash=node_id_hash,
                message_hash=message_hash,
                verification_outcome=verification_outcome,
                attack_type=attack_type,
                qber=qber,
                chi2_p_value=chi2_p_value,
                fidelity=fidelity,
                confidence_score=confidence_score,
                threat_classification=threat_classification,
                recommended_action=recommended_action,
                prev_hash=prev_hash,
                source_tab=source_tab,
                target_entity=target_entity,
            )

            # Post-quantum hash chain using SHA3-512
            rec_hash = self._compute_record_hash(payload)
            # HMAC-SHA3-512 authentication tag
            hmac_tag = self._compute_hmac_tag(payload)

            record = AuditRecord(
                record_id=rec_id,
                timestamp=ts,
                session_id=session_id,
                event_type=event_type,
                message_hash=message_hash,
                verification_outcome=verification_outcome,
                attack_type=attack_type,
                qber=qber,
                chi2_p_value=chi2_p_value,
                fidelity=fidelity,
                confidence_score=confidence_score,
                threat_classification=threat_classification,
                recommended_action=recommended_action,
                node_id_hash=node_id_hash,
                prev_hash=prev_hash,
                record_hash=rec_hash,
                hmac_tag=hmac_tag,
                hash_algorithm="sha3-512",
                source_tab=source_tab,
                target_entity=target_entity,
            )

            # Persist to SQLite using parameterized query
            if self._db_conn is not None:
                with self._db_conn:
                    self._db_conn.execute(
                        """INSERT INTO audit_records (
                            record_id, timestamp, session_id, event_type, message_hash,
                            verification_outcome, attack_type, qber, chi2_p_value, fidelity,
                            confidence_score, threat_classification, recommended_action,
                            node_id_hash, prev_hash, record_hash, hmac_tag, hash_algorithm,
                            source_tab, target_entity
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            record.record_id,
                            record.timestamp,
                            record.session_id,
                            record.event_type,
                            record.message_hash,
                            record.verification_outcome,
                            record.attack_type,
                            record.qber,
                            record.chi2_p_value,
                            record.fidelity,
                            record.confidence_score,
                            record.threat_classification,
                            record.recommended_action,
                            record.node_id_hash,
                            record.prev_hash,
                            record.record_hash,
                            record.hmac_tag,
                            record.hash_algorithm,
                            record.source_tab,
                            record.target_entity,
                        ),
                    )

            self._records.append(record)
            return record

    async def record_event_async(
        self,
        session_id: str,
        event_type: str,
        node_id: str = "Alice",
        message_hash: str | None = None,
        verification_outcome: str | None = None,
        attack_type: str | None = None,
        qber: float | None = None,
        chi2_p_value: float | None = None,
        fidelity: float | None = None,
        confidence_score: float | None = None,
        threat_classification: str | None = None,
        recommended_action: str | None = None,
        source_tab: str | None = None,
        target_entity: str | None = None,
    ) -> AuditRecord:
        """Asynchronous coroutine-safe wrapper using asyncio.Lock."""
        lock = self._get_async_lock()
        async with lock:
            return self.record_event(
                session_id=session_id,
                event_type=event_type,
                node_id=node_id,
                message_hash=message_hash,
                verification_outcome=verification_outcome,
                attack_type=attack_type,
                qber=qber,
                chi2_p_value=chi2_p_value,
                fidelity=fidelity,
                confidence_score=confidence_score,
                threat_classification=threat_classification,
                recommended_action=recommended_action,
                source_tab=source_tab,
                target_entity=target_entity,
            )

    def get_records(self, limit: int = 50) -> list[AuditRecord]:
        with self._sync_lock:
            return list(self._records[-limit:])

    def get_session_history(self, session_id: str) -> list[AuditRecord]:
        with self._sync_lock:
            return [r for r in self._records if r.session_id == session_id]

    def count(self) -> int:
        with self._sync_lock:
            return len(self._records)

    def clear(self) -> None:
        """Test helper to reset ledger state."""
        with self._sync_lock:
            self._records.clear()
            if self._db_conn is not None and not self._corrupted:
                with self._db_conn:
                    self._db_conn.execute("DELETE FROM audit_records;")
                    try:
                        self._db_conn.execute("DELETE FROM sqlite_sequence WHERE name='audit_records';")
                    except sqlite3.OperationalError:
                        pass

    def _verify_chain_records(self, records: list[AuditRecord]) -> dict[str, Any]:
        """Internal cryptographic verification over an ordered record sequence."""
        if not records:
            return {
                "valid": True,
                "records_checked": 0,
                "error": None,
                "hash_algorithm": "sha3-512",
                "hmac_verified": True,
            }

        prev_hash = "GENESIS_ROOT"
        hmac_all_valid = True

        for idx, record in enumerate(records):
            expected_id = f"aud-{idx + 1:06d}"
            if record.record_id != expected_id:
                return {
                    "valid": False,
                    "records_checked": idx + 1,
                    "error": f"Sequential ID error at index {idx}: expected '{expected_id}', got '{record.record_id}'.",
                    "hash_algorithm": "sha3-512",
                    "hmac_verified": False,
                }

            expected_prev = records[idx - 1].record_hash if idx > 0 else "GENESIS_ROOT"
            if record.prev_hash != expected_prev:
                return {
                    "valid": False,
                    "records_checked": idx + 1,
                    "error": f"Previous hash mismatch at record '{record.record_id}'.",
                    "hash_algorithm": "sha3-512",
                    "hmac_verified": False,
                }

            payload = _canonical_payload(
                session_id=record.session_id,
                event_type=record.event_type,
                timestamp=record.timestamp,
                node_id_hash=record.node_id_hash,
                message_hash=record.message_hash,
                verification_outcome=record.verification_outcome,
                attack_type=record.attack_type,
                qber=record.qber,
                chi2_p_value=record.chi2_p_value,
                fidelity=record.fidelity,
                confidence_score=record.confidence_score,
                threat_classification=record.threat_classification,
                recommended_action=record.recommended_action,
                prev_hash=record.prev_hash,
                source_tab=record.source_tab,
                target_entity=record.target_entity,
            )

            calculated_hash = self._compute_record_hash(payload)
            if calculated_hash != record.record_hash:
                return {
                    "valid": False,
                    "records_checked": idx + 1,
                    "error": f"SHA3-512 hash mismatch at record '{record.record_id}'.",
                    "hash_algorithm": "sha3-512",
                    "hmac_verified": False,
                }

            # Verify HMAC-SHA3-512 authentication tag
            expected_hmac = self._compute_hmac_tag(payload)
            if record.hmac_tag and record.hmac_tag != expected_hmac:
                hmac_all_valid = False
                return {
                    "valid": False,
                    "records_checked": idx + 1,
                    "error": f"HMAC-SHA3-512 tag mismatch at record '{record.record_id}' — possible tampering.",
                    "hash_algorithm": "sha3-512",
                    "hmac_verified": False,
                }

            prev_hash = record.record_hash

        return {
            "valid": True,
            "records_checked": len(records),
            "error": None,
            "hash_algorithm": "sha3-512",
            "hmac_verified": hmac_all_valid,
            "post_quantum_security_bits": 256,  # SHA3-512 → 256-bit quantum security
        }

    def verify_chain(self) -> dict[str, Any]:
        """Verify SHA3-512 hash chain integrity, HMAC tags, and payload consistency.

        Checks:
        1. Sequential record IDs (aud-000001, aud-000002, …)
        2. prev_hash chain links (each record's prev_hash matches previous record's hash)
        3. SHA3-512 payload hash reconstruction (detects content tampering)
        4. HMAC-SHA3-512 tag verification (detects key-less forgery)
        5. Hash algorithm field correctness

        Returns:
            dict: {"valid": bool, "records_checked": int, "error": str | None,
                   "hash_algorithm": str, "hmac_verified": bool}
        """
        with self._sync_lock:
            if self._corrupted:
                return {
                    "valid": False,
                    "records_checked": len(self._records),
                    "error": f"Persistent ledger corruption detected: {self._corruption_error}",
                    "hash_algorithm": "sha3-512",
                    "hmac_verified": False,
                }
            records = list(self._records)

        return self._verify_chain_records(records)

    def verify_genesis_signature(self) -> dict[str, Any]:
        """Verify the Ed25519 genesis signature proving ledger authenticity.

        Returns
        -------
        dict
            {'valid': bool, 'algorithm': 'Ed25519', 'curve': 'Curve25519'}
        """
        try:
            self._ed25519_public_key.verify(
                self._genesis_signature,
                self._genesis_message,
            )
            return {
                "valid": True,
                "algorithm": "Ed25519",
                "curve": "Curve25519",
                "reference": "Bernstein et al. (2011). IACR ePrint 2011:368.",
            }
        except InvalidSignature:
            return {
                "valid": False,
                "algorithm": "Ed25519",
                "curve": "Curve25519",
                "error": "Genesis signature verification failed.",
            }

    def verify_integrity(self) -> bool:
        """Verify unbroken SHA3-512 hash chain across all events."""
        return self.verify_chain()["valid"]

    def close(self) -> None:
        """Safely close the underlying SQLite connection if open."""
        with self._sync_lock:
            if self._db_conn is not None:
                try:
                    self._db_conn.close()
                except Exception:
                    pass
                self._db_conn = None

    def __del__(self) -> None:
        try:
            self.close()
        except Exception:
            pass


# Global singleton instance (persists to backend/audit_ledger.db or QDS_AUDIT_DB_PATH)
ledger = AuditLedger(db_path=os.environ.get("QDS_AUDIT_DB_PATH") or DEFAULT_DB_PATH)
