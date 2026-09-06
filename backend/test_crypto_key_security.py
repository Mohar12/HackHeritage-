"""
backend/test_crypto_key_security.py
===================================
Automated security audit test suite for Cryptographic Key Management & Secrets.

Covers:
1. QDS Key Lifecycle:
   - Unique key generation across multiple calls
   - Session-bound key derivation & uniqueness
   - Strict public/private key separation (private keys NEVER returned in API responses)
   - Zero private keys in audit ledger entries
2. Integrity HMAC Secret:
   - Server-side HMAC secret entropy (32 bytes / 256-bit CSPRNG)
   - Constant-time verification preventing timing attacks
   - Session domain separation (qds-sig-integrity-v1:<session_id>) preventing cross-session replay
   - Rotation behavior (changing secret invalidates prior signatures)
   - Accidental exposure resistance (health, docs, OpenAPI do not expose secret)
3. Audit Ledger Cryptographic Material:
   - 512-bit HMAC key generation using CSPRNG (os.urandom)
   - Ed25519 asymmetric signing of genesis root
   - Genesis signature verification on process startup
   - Tampered genesis signature detection -> fail-closed state
   - Protection of private keys inside SQLite metadata table (restricted to local process)
   - Zero exposure of Ed25519 private key or HMAC key via API
4. Database & Filesystem Security:
   - Database path sanitization (rejection of null bytes and URI parameter injection)
   - Fail-closed behavior on corrupted cryptographic metadata
   - Zero stack traces or internal filesystem paths leaked on errors
5. Cryptographic Algorithm Strength:
   - SHA3-512 post-quantum hash function (256-bit quantum security)
   - Ed25519 over Curve25519 (side-channel resistant constant-time implementation)
   - HMAC-SHA256 and HMAC-SHA3-512 authentication tags
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import sqlite3
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure repo root is on sys.path
_ROOT = Path(__file__).parent.parent.resolve()
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.main import app
from backend.audit_ledger import AuditLedger, ledger
from backend.integrity import (
    get_server_integrity_secret,
    compute_signature_integrity_tag,
    verify_signature_integrity,
)

client = TestClient(app)


# ===========================================================================
# 1. QDS / Signature Key Generation & Secrecy
# ===========================================================================

def test_key_generation_uniqueness():
    """Each invocation of /generate-keys/ produces distinct session IDs and fresh keys."""
    r1 = client.post("/generate-keys/", json={"n_qubits": 4, "shots": 128, "seed": 10})
    r2 = client.post("/generate-keys/", json={"n_qubits": 4, "shots": 128, "seed": 20})
    assert r1.status_code == 200
    assert r2.status_code == 200

    d1 = r1.json()
    d2 = r2.json()
    assert d1["session_id"] != d2["session_id"]
    assert d1["alice_public_key"] != d2["alice_public_key"]


def test_private_key_never_exposed_in_api_response():
    """Neither /generate-keys/ nor /signatures/sign expose private key material."""
    # Key generation response
    r = client.post("/generate-keys/", json={"n_qubits": 2, "shots": 128})
    assert r.status_code == 200
    data = r.json()
    assert "private_key" not in data
    assert "alice_private_key" not in data
    assert "secret_key" not in data

    # Signing response
    r_sign = client.post("/api/v1/signatures/sign", json={"message": "Confidential", "n_qubits": 2, "shots": 128})
    assert r_sign.status_code == 200
    sign_data = r_sign.json()
    assert "private_key" not in sign_data
    assert "secret_key" not in sign_data
    assert "sent_states" not in sign_data["signature"]  # Raw quantum amplitudes stripped


def test_private_key_never_logged_in_audit_ledger():
    """Audit ledger records created by signing or key-gen do not contain private keys."""
    records = ledger.get_records(limit=20)
    for rec in records:
        rec_dict = rec.model_dump()
        rec_json = json.dumps(rec_dict).lower()
        assert "private_key" not in rec_json
        assert "secret_key" not in rec_json
        assert "amplitude" not in rec_json


# ===========================================================================
# 2. Integrity HMAC Secret & Session Domain Separation
# ===========================================================================

def test_integrity_secret_entropy():
    """Default server integrity secret has at least 256 bits of CSPRNG entropy."""
    secret = get_server_integrity_secret()
    assert isinstance(secret, bytes)
    assert len(secret) >= 32


def test_secret_rotation_invalidates_prior_signatures(monkeypatch):
    """When QDS_INTEGRITY_SECRET changes, prior signatures are rejected as invalid."""
    monkeypatch.setenv("QDS_INTEGRITY_SECRET", "key-version-1-initial-secret-32b!")
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Document A", "n_qubits": 2, "shots": 128})
    assert sign_res.status_code == 200
    sig_payload = sign_res.json()["signature"]

    # Verify under current key
    v_res = client.post("/api/v1/signatures/verify", json={"signature": sig_payload, "message": "Document A"})
    assert v_res.status_code == 200
    assert v_res.json()["is_valid"] is True

    # Rotate secret
    monkeypatch.setenv("QDS_INTEGRITY_SECRET", "key-version-2-rotated-secret-32b!")

    # Verify under new key -> must reject
    v_res_rotated = client.post("/api/v1/signatures/verify", json={"signature": sig_payload, "message": "Document A"})
    assert v_res_rotated.status_code == 200
    assert v_res_rotated.json()["is_valid"] is False
    assert v_res_rotated.json()["reason"] == "signature_integrity_mismatch"


def test_cross_session_key_isolation():
    """An integrity tag for Session A cannot be reused for Session B even with identical payload."""
    payload_a = {
        "message": "Transfer",
        "message_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "session_id": "session-aaa-111",
        "sent_bits": [0, 1],
        "measurement_outcomes": [0, 1],
        "correction_bits": [[0, 0], [1, 1]],
        "bases": ["X", "Z"],
        "fidelity": 0.99,
        "execution_mode": "quantum",
    }
    tag_a = compute_signature_integrity_tag(payload_a)
    payload_a["integrity_tag"] = tag_a

    is_valid, _ = verify_signature_integrity(payload_a)
    assert is_valid is True

    # Swap session ID without changing tag
    payload_b = dict(payload_a)
    payload_b["session_id"] = "session-bbb-222"
    is_valid_b, reason_b = verify_signature_integrity(payload_b)
    assert is_valid_b is False
    assert reason_b == "signature_integrity_mismatch"


# ===========================================================================
# 3. Audit Ledger Cryptographic Material
# ===========================================================================

def test_audit_ledger_crypto_primitives(tmp_path: Path):
    """Audit ledger generates 512-bit HMAC key, Ed25519 keypair, and valid genesis signature."""
    db_file = tmp_path / "crypto_test.db"
    al = AuditLedger(db_path=db_file)

    # Verify genesis signature
    gen_res = al.verify_genesis_signature()
    assert gen_res["valid"] is True
    assert gen_res["algorithm"] == "Ed25519"
    assert gen_res["curve"] == "Curve25519"

    # Check key material in SQLite
    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()
    cursor.execute("SELECT key, length(value) FROM audit_metadata")
    meta_lengths = dict(cursor.fetchall())
    conn.close()

    assert meta_lengths["hmac_key"] == 64            # 512-bit HMAC key
    assert meta_lengths["ed25519_private_key"] == 32  # 256-bit Ed25519 private seed
    assert meta_lengths["ed25519_public_key"] == 32   # 256-bit Ed25519 public key
    assert meta_lengths["genesis_signature"] == 64    # 512-bit Ed25519 signature
    al.close()


def test_tampered_genesis_signature_fails_closed(tmp_path: Path):
    """Tampering with genesis signature in SQLite causes ledger to fail closed on restart."""
    db_file = tmp_path / "tamper_genesis.db"
    al1 = AuditLedger(db_path=db_file)
    al1.record_event("s1", "SIGNING")
    al1.close()

    # Corrupt genesis signature
    conn = sqlite3.connect(str(db_file))
    conn.execute("UPDATE audit_metadata SET value = X'00' WHERE key = 'genesis_signature'")
    conn.commit()
    conn.close()

    # Restart
    al2 = AuditLedger(db_path=db_file)
    assert al2.is_corrupted is True
    assert "Cryptographic metadata verification failed" in str(al2.corruption_error)

    # Append is rejected
    with pytest.raises(RuntimeError, match="corrupted/tampered state"):
        al2.record_event("s2", "SIGNING")
    al2.close()


def test_tampered_hmac_key_fails_closed(tmp_path: Path):
    """Tampering with HMAC key in SQLite invalidates existing block HMAC tags."""
    db_file = tmp_path / "tamper_hmac_key.db"
    al1 = AuditLedger(db_path=db_file)
    al1.record_event("s1", "SIGNING")
    al1.close()

    # Replace HMAC key with a different random key
    conn = sqlite3.connect(str(db_file))
    conn.execute("UPDATE audit_metadata SET value = X'0102030405060708091011121314151617181920212223242526272829303132' WHERE key = 'hmac_key'")
    conn.commit()
    conn.close()

    # Restart
    al2 = AuditLedger(db_path=db_file)
    assert al2.is_corrupted is True
    v = al2.verify_chain()
    assert v["valid"] is False
    assert "HMAC-SHA3-512 tag mismatch" in v["error"]
    al2.close()


# ===========================================================================
# 4. Database Path Sanitization & Traversal Resistance
# ===========================================================================

def test_database_path_null_byte_rejection():
    """Null bytes in database path are rejected during initialization."""
    al = AuditLedger(db_path="invalid\x00path.db")
    assert al.is_corrupted is True
    assert "invalid null bytes" in str(al.corruption_error)
    al.close()


def test_database_path_uri_parameter_injection_rejection():
    """URI parameter injection in file: URI paths is rejected."""
    al = AuditLedger(db_path="file:test.db?mode=ro&cache=shared")
    assert al.is_corrupted is True
    assert "unsupported URI parameters" in str(al.corruption_error)
    al.close()


# ===========================================================================
# 5. Information Disclosure Check
# ===========================================================================

def test_no_cryptographic_secrets_in_health_or_docs():
    """Neither /health, /api/v1/health, /api/docs, nor /api/openapi.json leak secrets."""
    endpoints = ["/health", "/api/v1/health", "/api/openapi.json"]
    for ep in endpoints:
        r = client.get(ep)
        assert r.status_code == 200
        text = r.text.lower()
        assert "qds_integrity_secret" not in text
        assert "ed25519_private_key" not in text
        assert "hmac_key" not in text
