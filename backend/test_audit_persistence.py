"""
backend/test_audit_persistence.py
=================================
Comprehensive test suite verifying persistent backend audit ledger storage:
1. Fresh persistent ledger initialization
2. Record persistence to SQLite
3. Restart persistence across instance recreation
4. Hash-chain continuation from previous records
5. Tampered record detection
6. Tampered hash detection
7. Tampered prev_hash detection
8. Corrupted database handling (fail-closed)
9. Concurrent multi-threaded recording integrity
10. Existing API compatibility (/api/v1/audit-ledger)
11. Audit ledger verification endpoint (/api/v1/audit-ledger/verify)
12. Detection events still logged and persisted
13. Signature events still logged and persisted
14. No secret leakage in API or audit records
15. Multi-process restart regression test (separate OS processes)
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys

# Ensure repo root is on sys.path
_ROOT = Path(__file__).parent.parent.resolve()
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import threading
from typing import Any
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.audit_ledger import (
    AuditLedger,
    AuditRecord,
    AuditVerifyResponse,
    ledger,
    DEFAULT_DB_PATH,
)


@pytest.fixture
def client():
    return TestClient(app)


# ===========================================================================
# 1. Fresh persistent ledger
# ===========================================================================

def test_fresh_persistent_ledger(tmp_path: Path):
    """A new persistent ledger initializes cleanly with empty records and valid genesis."""
    db_file = tmp_path / "fresh.db"
    test_ledger = AuditLedger(db_path=db_file)

    assert test_ledger.count() == 0
    assert len(test_ledger.get_records(limit=50)) == 0
    assert test_ledger.is_corrupted is False
    assert test_ledger.corruption_error is None

    # Verify genesis signature and chain
    v_chain = test_ledger.verify_chain()
    assert v_chain["valid"] is True
    assert v_chain["records_checked"] == 0

    v_gen = test_ledger.verify_genesis_signature()
    assert v_gen["valid"] is True
    assert v_gen["algorithm"] == "Ed25519"

    # Verify underlying SQLite structure
    assert db_file.exists()
    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()
    tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    assert "audit_metadata" in tables
    assert "audit_records" in tables

    # Verify metadata keys stored securely
    meta = dict(cursor.execute("SELECT key, value FROM audit_metadata").fetchall())
    assert "hmac_key" in meta
    assert len(meta["hmac_key"]) == 64  # 512-bit key
    assert "ed25519_private_key" in meta
    assert len(meta["ed25519_private_key"]) == 32
    assert "ed25519_public_key" in meta
    assert len(meta["ed25519_public_key"]) == 32
    assert "genesis_signature" in meta
    assert len(meta["genesis_signature"]) == 64
    conn.close()
    test_ledger.close()


# ===========================================================================
# 2. Record persistence to SQLite
# ===========================================================================

def test_record_persistence(tmp_path: Path):
    """Events recorded to the ledger are immediately persisted to SQLite with all columns."""
    db_file = tmp_path / "record_persist.db"
    test_ledger = AuditLedger(db_path=db_file)

    rec = test_ledger.record_event(
        session_id="session-persist-01",
        event_type="KEY_DISTRIBUTION",
        node_id="Alice-QDS",
        message_hash="d" * 128,
        verification_outcome="ACCEPT",
        attack_type="NONE",
        qber=0.012,
        chi2_p_value=0.88,
        fidelity=0.995,
        confidence_score=0.98,
        threat_classification="SECURE",
        recommended_action="NONE",
        source_tab="Key Exchange",
        target_entity="doc-contract-001",
    )

    assert rec.record_id == "aud-000001"
    assert rec.prev_hash == "GENESIS_ROOT"
    assert len(rec.record_hash) == 128
    assert len(rec.hmac_tag) == 128

    # Query SQLite directly to verify parameterized persistence
    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM audit_records WHERE record_id = ?", ("aud-000001",)).fetchone()
    assert row is not None

    # Check columns
    # seq=1, record_id='aud-000001', session_id='session-persist-01'
    assert row[1] == "aud-000001"
    assert row[3] == "session-persist-01"
    assert row[4] == "KEY_DISTRIBUTION"
    assert row[5] == "d" * 128
    assert row[6] == "ACCEPT"
    assert row[7] == "NONE"
    assert abs(row[8] - 0.012) < 1e-6
    assert abs(row[9] - 0.88) < 1e-6
    assert abs(row[10] - 0.995) < 1e-6
    assert abs(row[11] - 0.98) < 1e-6
    assert row[12] == "SECURE"
    assert row[13] == "NONE"
    assert row[15] == "GENESIS_ROOT"
    assert row[16] == rec.record_hash
    assert row[17] == rec.hmac_tag
    assert row[18] == "sha3-512"
    assert row[19] == "Key Exchange"
    assert row[20] == "doc-contract-001"

    conn.close()
    test_ledger.close()


# ===========================================================================
# 3. Restart persistence
# ===========================================================================

def test_restart_persistence(tmp_path: Path):
    """A restarted ledger loads all prior records, keys, and genesis intact."""
    db_file = tmp_path / "restart.db"

    # Process 1 simulation: record events and close
    l1 = AuditLedger(db_path=db_file)
    r1 = l1.record_event("sess-1", "SIGNING", qber=0.01)
    r2 = l1.record_event("sess-1", "VERIFICATION", qber=0.02)
    r3 = l1.record_event("sess-2", "THREAT_DETECTION", qber=0.15)
    assert l1.verify_chain()["valid"] is True
    l1_keys = (l1._hmac_key, l1._genesis_signature, l1._genesis_message)
    l1.close()

    # Process 2 simulation: open same database
    l2 = AuditLedger(db_path=db_file)
    assert l2.is_corrupted is False
    assert l2.count() == 3

    # Cryptographic keys and genesis must match Process 1
    assert l2._hmac_key == l1_keys[0]
    assert l2._genesis_signature == l1_keys[1]
    assert l2._genesis_message == l1_keys[2]
    assert l2.verify_genesis_signature()["valid"] is True

    # Records must match exactly
    records = l2.get_records(limit=10)
    assert len(records) == 3
    assert records[0].record_id == r1.record_id
    assert records[0].record_hash == r1.record_hash
    assert records[0].hmac_tag == r1.hmac_tag
    assert records[1].record_id == r2.record_id
    assert records[1].record_hash == r2.record_hash
    assert records[2].record_id == r3.record_id
    assert records[2].record_hash == r3.record_hash

    # Full chain verification passes
    v_res = l2.verify_chain()
    assert v_res["valid"] is True
    assert v_res["records_checked"] == 3
    assert v_res["hmac_verified"] is True
    l2.close()


# ===========================================================================
# 4. Hash-chain continuation after restart
# ===========================================================================

def test_hash_chain_continuation(tmp_path: Path):
    """Appending a record after restart correctly links prev_hash to previous record."""
    db_file = tmp_path / "chain_continue.db"

    # Step 1: Initial ledger writes 2 records
    l1 = AuditLedger(db_path=db_file)
    l1.record_event("sess-1", "SIGNING")
    r2 = l1.record_event("sess-1", "VERIFICATION")
    l1.close()

    # Step 2: Restart ledger and append 3rd record
    l2 = AuditLedger(db_path=db_file)
    r3 = l2.record_event("sess-1", "THREAT_DETECTION", threat_classification="SECURE")

    assert r3.record_id == "aud-000003"
    assert r3.prev_hash == r2.record_hash
    assert l2.count() == 3

    # Full chain of 3 records verifies
    v_res = l2.verify_chain()
    assert v_res["valid"] is True
    assert v_res["records_checked"] == 3
    assert v_res["error"] is None
    l2.close()


# ===========================================================================
# 5. Tampered record detection
# ===========================================================================

def test_tampered_record_payload_detection(tmp_path: Path):
    """Modifying a payload field in SQLite is detected on startup and fails closed."""
    db_file = tmp_path / "tamper_payload.db"

    l1 = AuditLedger(db_path=db_file)
    l1.record_event("sess-1", "EVENT_1", qber=0.01)
    l1.record_event("sess-1", "EVENT_2", qber=0.02)
    l1.record_event("sess-1", "EVENT_3", qber=0.03)
    l1.close()

    # Tamper with record 2's qber directly in SQLite
    conn = sqlite3.connect(str(db_file))
    conn.execute("UPDATE audit_records SET qber = 0.999 WHERE record_id = 'aud-000002'")
    conn.commit()
    conn.close()

    # Restart: ledger must detect tampering
    l2 = AuditLedger(db_path=db_file)
    assert l2.is_corrupted is True
    assert "mismatch" in l2.corruption_error.lower() or "tampering" in l2.corruption_error.lower()

    # verify_chain fails
    v_res = l2.verify_chain()
    assert v_res["valid"] is False
    assert v_res["hmac_verified"] is False
    assert not l2.verify_integrity()

    # Fail closed: appending must raise RuntimeError
    with pytest.raises(RuntimeError) as exc_info:
        l2.record_event("sess-1", "EVENT_4")
    assert "corrupted" in str(exc_info.value).lower()

    # History is NOT discarded or overwritten
    assert l2.count() == 3
    l2.close()


# ===========================================================================
# 6. Tampered hash detection
# ===========================================================================

def test_tampered_record_hash_detection(tmp_path: Path):
    """Tampering with record_hash in SQLite is detected and fails closed."""
    db_file = tmp_path / "tamper_hash.db"

    l1 = AuditLedger(db_path=db_file)
    l1.record_event("sess-1", "EVENT_1")
    l1.record_event("sess-1", "EVENT_2")
    l1.close()

    # Tamper with record_hash
    fake_hash = "a" * 128
    conn = sqlite3.connect(str(db_file))
    conn.execute("UPDATE audit_records SET record_hash = ? WHERE record_id = 'aud-000002'", (fake_hash,))
    conn.commit()
    conn.close()

    l2 = AuditLedger(db_path=db_file)
    assert l2.is_corrupted is True
    assert l2.verify_chain()["valid"] is False
    l2.close()


# ===========================================================================
# 7. Tampered prev_hash detection
# ===========================================================================

def test_tampered_prev_hash_detection(tmp_path: Path):
    """Tampering with prev_hash link in SQLite is detected and fails closed."""
    db_file = tmp_path / "tamper_prev_hash.db"

    l1 = AuditLedger(db_path=db_file)
    l1.record_event("sess-1", "EVENT_1")
    l1.record_event("sess-1", "EVENT_2")
    l1.record_event("sess-1", "EVENT_3")
    l1.close()

    # Tamper with record 3's prev_hash
    fake_prev = "b" * 128
    conn = sqlite3.connect(str(db_file))
    conn.execute("UPDATE audit_records SET prev_hash = ? WHERE record_id = 'aud-000003'", (fake_prev,))
    conn.commit()
    conn.close()

    l2 = AuditLedger(db_path=db_file)
    assert l2.is_corrupted is True
    assert "Previous hash mismatch" in l2.corruption_error
    assert l2.verify_chain()["valid"] is False
    l2.close()


# ===========================================================================
# 8. Corrupted database handling (fail-closed)
# ===========================================================================

def test_corrupted_database_handling(tmp_path: Path):
    """A physically corrupted database file fails closed without silently overwriting history."""
    corrupted_file = tmp_path / "corrupted.db"
    corrupted_file.write_bytes(b"NON_SQLITE_GARBAGE_HEADER_DATA_FAIL_CLOSED_TEST_000")

    l = AuditLedger(db_path=corrupted_file)
    assert l.is_corrupted is True
    assert l.corruption_error is not None
    assert l.verify_chain()["valid"] is False

    with pytest.raises(RuntimeError):
        l.record_event("sess-1", "EVENT_1")

    # Ensure file was not overwritten with a fresh empty database
    assert corrupted_file.read_bytes().startswith(b"NON_SQLITE_GARBAGE")
    l.close()


# ===========================================================================
# 9. Concurrent multi-threaded recording
# ===========================================================================

def test_concurrent_recording_integrity(tmp_path: Path):
    """Multiple threads recording simultaneously to persistent ledger maintain strict monotonic order and valid chain."""
    db_file = tmp_path / "concurrent.db"
    test_ledger = AuditLedger(db_path=db_file)
    n_threads = 25
    barrier = threading.Barrier(n_threads)
    errors: list[Exception] = []

    def worker(worker_id: int):
        try:
            barrier.wait()
            test_ledger.record_event(
                session_id=f"concurrent-sess-{worker_id}",
                event_type="VERIFICATION",
                node_id=f"Node-{worker_id}",
                qber=0.01 * (worker_id % 5),
            )
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors, f"Thread errors occurred: {errors}"
    assert test_ledger.count() == n_threads

    # Verify unique monotonically increasing IDs
    records = test_ledger.get_records(limit=100)
    record_ids = [r.record_id for r in records]
    assert len(record_ids) == n_threads
    assert len(set(record_ids)) == n_threads
    assert record_ids == [f"aud-{i + 1:06d}" for i in range(n_threads)]

    # Verify cryptographic chain integrity
    v_res = test_ledger.verify_chain()
    assert v_res["valid"] is True
    assert v_res["records_checked"] == n_threads
    assert v_res["error"] is None

    # Verify SQLite row count
    conn = sqlite3.connect(str(db_file))
    count = conn.execute("SELECT COUNT(*) FROM audit_records").fetchone()[0]
    conn.close()
    assert count == n_threads

    test_ledger.close()


# ===========================================================================
# 10. Existing API compatibility (/api/v1/audit-ledger)
# ===========================================================================

def test_audit_ledger_api_endpoint(client: TestClient):
    """GET /api/v1/audit-ledger returns list of AuditRecord models with preserved schema."""
    res = client.get("/api/v1/audit-ledger?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        rec = data[0]
        assert "record_id" in rec
        assert "timestamp" in rec
        assert "session_id" in rec
        assert "event_type" in rec
        assert "node_id_hash" in rec
        assert "prev_hash" in rec
        assert "record_hash" in rec
        assert "hmac_tag" in rec
        assert "hash_algorithm" in rec
        assert rec["hash_algorithm"] == "sha3-512"


# ===========================================================================
# 11. Audit-ledger verification endpoint (/api/v1/audit-ledger/verify)
# ===========================================================================

def test_audit_ledger_verify_endpoint(client: TestClient):
    """GET /api/v1/audit-ledger/verify validates the persistent hash-chain."""
    res = client.get("/api/v1/audit-ledger/verify")
    assert res.status_code == 200
    data = res.json()
    assert "valid" in data
    assert "records_checked" in data
    assert data["valid"] is True
    assert data["error"] is None


# ===========================================================================
# 12. Detection events still logged
# ===========================================================================

def test_detection_events_logged(client: TestClient):
    """Calling /api/v1/detect records a THREAT_DETECTION audit entry into the persistent ledger."""
    init_count = ledger.count()
    test_session = "audit-persist-detect-sess"

    payload = {
        "measurement_data": {
            "session_id": test_session,
            "fidelity": 0.98,
            "measured_qber": 0.02,
            "measurement_counts": {"00": 490, "01": 10, "10": 10, "11": 490},
        }
    }
    res = client.post("/api/v1/detect", json=payload)
    assert res.status_code == 200

    assert ledger.count() == init_count + 1
    last_rec = ledger.get_records(limit=1)[0]
    assert last_rec.session_id == test_session
    assert last_rec.event_type == "THREAT_DETECTION"
    assert last_rec.threat_classification == "SECURE"


# ===========================================================================
# 13. Signature events still logged
# ===========================================================================

def test_signature_events_logged(client: TestClient):
    """Calling /signatures/sign and /signatures/verify records SIGNING and VERIFICATION audit entries."""
    init_count = ledger.count()
    session_id = "audit-persist-sig-sess"

    # Step 1: Sign
    sign_res = client.post("/api/v1/signatures/sign", json={
        "document_id": "doc-audit-test",
        "message": "Persistent audit ledger verification test",
        "signer_id": "Alice",
        "session_id": session_id,
        "use_entanglement": True,
    })
    assert sign_res.status_code == 200
    sign_data = sign_res.json()
    actual_session_id = sign_data["session_id"]

    # Step 2: Verify
    verify_res = client.post("/api/v1/signatures/verify", json={
        "signature": sign_data["signature"],
        "message": "Persistent audit ledger verification test",
    })
    assert verify_res.status_code == 200

    assert ledger.count() >= init_count + 2
    records = ledger.get_session_history(actual_session_id)
    event_types = [r.event_type for r in records]
    assert "SIGNING" in event_types
    assert "VERIFICATION" in event_types


# ===========================================================================
# 14. No secret leakage
# ===========================================================================

def test_no_secret_leakage(client: TestClient):
    """API responses and audit records never leak private keys, HMAC keys, or QDS_INTEGRITY_SECRET."""
    res = client.get("/api/v1/audit-ledger?limit=50")
    assert res.status_code == 200
    text = res.text

    # Verify no private key fragments or HMAC keys in JSON
    assert "BEGIN PRIVATE KEY" not in text
    assert "PRIVATE KEY" not in text
    assert "hmac_key" not in text
    assert "ed25519_private_key" not in text
    assert "QDS_INTEGRITY_SECRET" not in text

    # Verify verify endpoint doesn't leak secrets
    v_res = client.get("/api/v1/audit-ledger/verify")
    v_text = v_res.text
    assert "hmac_key" not in v_text
    assert "ed25519_private_key" not in v_text

    # Verify SQLite audit_records table schema contains no secrets
    conn = sqlite3.connect(str(DEFAULT_DB_PATH))
    columns = [col[1] for col in conn.execute("PRAGMA table_info(audit_records)").fetchall()]
    conn.close()
    assert "hmac_key" not in columns
    assert "private_key" not in columns
    assert "secret" not in columns


# ===========================================================================
# 15. Separate process restart regression test (Step 6)
# ===========================================================================

def test_multi_process_restart_regression(tmp_path: Path):
    """Simulate real multi-process lifecycle using independent Python interpreter processes:
    - Process 1: Start, record events, record IDs/hashes, verify ledger, terminate
    - Process 2: Start new process with SAME persistent DB, verify prior records, append new event, verify chain
    - Process 3: Start with corrupted DB copy, verify corruption is detected without silent reset
    """
    db_file = tmp_path / "proc_test.db"
    dump_file = tmp_path / "proc1_dump.json"

    # -------------------------------------------------------------
    # PROCESS 1
    # -------------------------------------------------------------
    proc1_code = f"""
import sys, json
from pathlib import Path
sys.path.insert(0, r"{_ROOT}")
from backend.audit_ledger import AuditLedger

al = AuditLedger(db_path=r"{db_file}")
r1 = al.record_event("sess-proc", "EVENT_P1_A", qber=0.01)
r2 = al.record_event("sess-proc", "EVENT_P1_B", qber=0.02)
v = al.verify_chain()
assert v["valid"] is True, f"P1 verify failed: {{v}}"

data = {{
    "r1_id": r1.record_id,
    "r1_hash": r1.record_hash,
    "r2_id": r2.record_id,
    "r2_hash": r2.record_hash,
    "count": al.count(),
}}
with open(r"{dump_file}", "w") as f:
    json.dump(data, f)
al.close()
sys.exit(0)
"""
    p1 = subprocess.run([sys.executable, "-c", proc1_code], capture_output=True, text=True)
    assert p1.returncode == 0, f"Process 1 failed: {p1.stderr}"

    with open(dump_file) as f:
        p1_data = json.load(f)

    assert p1_data["count"] == 2

    # -------------------------------------------------------------
    # PROCESS 2: Same database, verify records, append new event
    # -------------------------------------------------------------
    proc2_code = f"""
import sys, json
from pathlib import Path
sys.path.insert(0, r"{_ROOT}")
from backend.audit_ledger import AuditLedger

al = AuditLedger(db_path=r"{db_file}")
assert al.is_corrupted is False
assert al.count() == 2

recs = al.get_records(limit=10)
assert recs[0].record_id == "{p1_data['r1_id']}"
assert recs[0].record_hash == "{p1_data['r1_hash']}"
assert recs[1].record_id == "{p1_data['r2_id']}"
assert recs[1].record_hash == "{p1_data['r2_hash']}"

# Verify previous records
v1 = al.verify_chain()
assert v1["valid"] is True, f"P2 initial verify failed: {{v1}}"

# Append new event
r3 = al.record_event("sess-proc", "EVENT_P2_C", qber=0.03)
assert r3.record_id == "aud-000003"
assert r3.prev_hash == "{p1_data['r2_hash']}"

# Verify entire chain of 3 records
v2 = al.verify_chain()
assert v2["valid"] is True, f"P2 chained verify failed: {{v2}}"
assert v2["records_checked"] == 3
al.close()
sys.exit(0)
"""
    p2 = subprocess.run([sys.executable, "-c", proc2_code], capture_output=True, text=True)
    assert p2.returncode == 0, f"Process 2 failed: {p2.stderr}"

    # -------------------------------------------------------------
    # PROCESS 3: Tampered database copy, verify fail-closed
    # -------------------------------------------------------------
    tampered_db = tmp_path / "proc_tampered.db"
    import shutil
    shutil.copyfile(db_file, tampered_db)

    # Tamper with record in the copy
    conn = sqlite3.connect(str(tampered_db))
    conn.execute("UPDATE audit_records SET qber = 0.999 WHERE record_id = 'aud-000002'")
    conn.commit()
    conn.close()

    proc3_code = f"""
import sys
from pathlib import Path
sys.path.insert(0, r"{_ROOT}")
from backend.audit_ledger import AuditLedger

al = AuditLedger(db_path=r"{tampered_db}")
# Must detect corruption immediately on load
assert al.is_corrupted is True, "Corruption not flagged"
v = al.verify_chain()
assert v["valid"] is False, "Chain incorrectly reported valid"

# Must NOT silently reset or reinitialize
assert al.count() == 3, f"Expected 3 records preserved for forensics, got {{al.count()}}"

# Append must be rejected
try:
    al.record_event("sess-proc", "EVENT_TAMPERED")
    sys.exit(1) # should not reach
except RuntimeError:
    pass

al.close()
sys.exit(0)
"""
    p3 = subprocess.run([sys.executable, "-c", proc3_code], capture_output=True, text=True)
    assert p3.returncode == 0, f"Process 3 failed: {p3.stderr}"
