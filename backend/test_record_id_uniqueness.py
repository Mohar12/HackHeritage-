"""
backend/test_record_id_uniqueness.py
=====================================
Regression test suite for the audit_records.record_id UNIQUE constraint fix.
"""

from __future__ import annotations

import threading
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.audit_ledger import AuditLedger, ledger


@pytest.fixture()
def fresh_ledger(tmp_path):
    al = AuditLedger(db_path=tmp_path / "test_unique.db")
    yield al
    al.close()


@pytest.fixture()
def client():
    return TestClient(app)


def test_two_consecutive_writes_unique_ids(fresh_ledger):
    r1 = fresh_ledger.record_event("sess-A", "VERIFICATION")
    r2 = fresh_ledger.record_event("sess-A", "VERIFICATION")
    assert r1.record_id != r2.record_id
    assert r1.record_id == "aud-000001"
    assert r2.record_id == "aud-000002"


def test_repeated_identical_params_no_collision(fresh_ledger):
    ids = set()
    for _ in range(10):
        r = fresh_ledger.record_event(
            session_id="sim-intercept_resend-42",
            event_type="SIMULATION_RUN",
            node_id="SimulationEngine",
            attack_type="intercept_resend",
            qber=0.376,
            fidelity=0.5,
        )
        ids.add(r.record_id)
    assert len(ids) == 10


def test_same_seed_no_duplicate_ids(fresh_ledger):
    for trial in range(5):
        r = fresh_ledger.record_event(session_id="sim-none-42", event_type="SIMULATION_RUN", qber=0.01)
        assert r.record_id == "aud-{:06d}".format(trial + 1)
    assert fresh_ledger.verify_chain()["valid"] is True


def test_10_concurrent_writes_unique_ids(tmp_path):
    al = AuditLedger(db_path=tmp_path / "conc10.db")
    n = 10
    barrier = threading.Barrier(n)
    collected = []
    errors = []
    lock = threading.Lock()

    def worker(i):
        try:
            barrier.wait()
            r = al.record_event(session_id="concurrent-sess-{}".format(i), event_type="VERIFICATION", node_id="Node-{}".format(i), qber=0.01 * (i % 5))
            with lock:
                collected.append(r.record_id)
        except Exception as exc:
            with lock:
                errors.append(exc)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
    for t in threads: t.start()
    for t in threads: t.join()
    assert not errors, "Concurrent write errors: {}".format(errors)
    assert len(collected) == n
    assert len(set(collected)) == n
    assert al.verify_chain()["valid"] is True
    al.close()


def test_25_concurrent_writes_unique_ids(tmp_path):
    al = AuditLedger(db_path=tmp_path / "conc25.db")
    n = 25
    barrier = threading.Barrier(n)
    collected = []
    errors = []
    lock = threading.Lock()

    def worker(i):
        try:
            barrier.wait()
            r = al.record_event(session_id="concurrent-sess-{}".format(i), event_type="SIMULATION_RUN", node_id="Node-{}".format(i), qber=float(i) / 100.0)
            with lock:
                collected.append(r.record_id)
        except Exception as exc:
            with lock:
                errors.append(exc)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
    for t in threads: t.start()
    for t in threads: t.join()
    assert not errors, "Concurrent write errors: {}".format(errors)
    assert len(collected) == n
    assert len(set(collected)) == n
    assert al.verify_chain()["valid"] is True
    al.close()


def test_db_restart_no_record_id_reuse(tmp_path):
    db_file = tmp_path / "restart_unique.db"
    l1 = AuditLedger(db_path=db_file)
    r1 = l1.record_event("s1", "SIGNING")
    r2 = l1.record_event("s1", "VERIFICATION")
    r3 = l1.record_event("s1", "THREAT_DETECTION")
    assert r1.record_id == "aud-000001"
    assert r2.record_id == "aud-000002"
    assert r3.record_id == "aud-000003"
    l1.close()

    l2 = AuditLedger(db_path=db_file)
    assert l2.is_corrupted is False
    r4 = l2.record_event("s2", "SIMULATION_RUN")
    assert r4.record_id == "aud-000004", "Expected aud-000004 after restart, got {}".format(r4.record_id)
    all_ids = set(r.record_id for r in l2.get_records(limit=10))
    assert len(all_ids) == 4
    assert l2.verify_chain()["valid"] is True
    l2.close()


def test_hash_chain_valid_after_multiple_writes(fresh_ledger):
    for i in range(20):
        fresh_ledger.record_event(session_id="sess-{}".format(i), event_type="SIMULATION_RUN", qber=float(i) / 100.0)
    v = fresh_ledger.verify_chain()
    assert v["valid"] is True
    assert v["records_checked"] == 20


def test_hmac_valid_after_multiple_writes(fresh_ledger):
    for i in range(15):
        fresh_ledger.record_event(session_id="hmac-sess-{}".format(i), event_type="VERIFICATION")
    v = fresh_ledger.verify_chain()
    assert v["valid"] is True
    assert v.get("hmac_verified", True) is True


def test_existing_records_untouched(fresh_ledger):
    r1 = fresh_ledger.record_event("sess-x", "SIGNING", qber=0.011)
    r2 = fresh_ledger.record_event("sess-x", "VERIFICATION", qber=0.022)
    for _ in range(5):
        fresh_ledger.record_event("sess-y", "SIMULATION_RUN")
    records = fresh_ledger.get_records(limit=100)
    assert records[0].record_id == r1.record_id
    assert records[0].record_hash == r1.record_hash
    assert records[0].hmac_tag == r1.hmac_tag
    assert records[1].record_id == r2.record_id
    assert records[1].record_hash == r2.record_hash


def test_audit_verify_returns_valid(client):
    res = client.get("/api/v1/audit-ledger/verify")
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["error"] is None


def test_scalable_engine_no_http_500(client):
    """POST /api/v1/simulate with seed=42 must return HTTP 200, not 500."""
    payload = {"num_qubits": 100, "shots": 1024, "attack_type": "intercept_resend", "seed": 42}
    res = client.post("/api/v1/simulate", json=payload)
    assert res.status_code == 200, "Expected HTTP 200, got {}: {}".format(res.status_code, res.text)
    data = res.json()
    assert "is_malicious" in data
    assert "statistics" in data


def test_scalable_engine_repeated_same_seed_no_collision(client):
    """Sending identical /simulate requests 5 times must never produce record_id collision."""
    payload = {"num_qubits": 100, "shots": 1024, "attack_type": "intercept_resend", "seed": 42}
    for attempt in range(5):
        res = client.post("/api/v1/simulate", json=payload)
        assert res.status_code == 200, "Attempt {}: HTTP {}: {}".format(attempt+1, res.status_code, res.text)


def test_scalable_engine_baseline_no_collision(client):
    payload = {"num_qubits": 100, "shots": 1024, "attack_type": "none", "seed": 42}
    res = client.post("/api/v1/simulate", json=payload)
    assert res.status_code == 200, "Expected HTTP 200, got {}: {}".format(res.status_code, res.text)


def test_audit_chain_valid_after_scalable_engine_batch(client):
    payload = {"num_qubits": 50, "shots": 512, "attack_type": "none", "seed": 99}
    for _ in range(3):
        r = client.post("/api/v1/simulate", json=payload)
        assert r.status_code == 200
    verify = client.get("/api/v1/audit-ledger/verify")
    assert verify.status_code == 200
    assert verify.json()["valid"] is True


def test_global_ledger_record_ids_all_unique(client):
    res = client.get("/api/v1/audit-ledger?limit=1000")
    assert res.status_code == 200
    records = res.json()
    ids = [r["record_id"] for r in records]
    assert len(ids) == len(set(ids))
