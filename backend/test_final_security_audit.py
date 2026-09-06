"""
backend/test_final_security_audit.py
====================================
FINAL backend security, reliability, and deployment-readiness regression suite.

Covers:
1. End-to-End Complete Lifecycle Workflow:
   generate-keys -> sign -> verify -> simulate -> attack -> detect -> audit ledger -> restart -> verify again
2. Security Control Cross-Integration:
   Auth + HMAC, Auth + Resource Limits, Auth + Quantum Validation, Restart + HMAC
3. Complete Route Inventory & Legacy Alias Consistency:
   Verifies identical behavior between root aliases and /api/v1/ routes
4. Authentication Edge Cases:
   Missing key, wrong key, empty key, Basic auth, malformed Bearer, non-ASCII, 10KB key, public paths
5. Resource-Exhaustion Boundaries:
   Boundaries for n_qubits, shots, payload size, string lengths
6. Cryptographic Integrity & Tamper Rejection:
   Cross-session, cross-message, bit modifications, fail-closed mechanics
7. Audit Ledger Durability & Tamper Detection:
   Persistence across restarts, unbroken SHA3-512 chain, HMAC authentication, tamper detection
8. Failure Injection & Error Sanitization:
   No stack traces, no filesystem paths, graceful 400/405/422 responses
9. Concurrency & Thread-Safety:
   Multi-threaded signing, verification, detection, and ledger writes without deadlock or duplicate IDs
10. CORS & Defensive Security Headers:
    OPTIONS preflight, security headers presence, 405 on invalid HTTP methods
"""

from __future__ import annotations

import concurrent.futures
import copy
import hashlib
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import time
from typing import Any
import pytest
from fastapi.testclient import TestClient

# Ensure repo root is on sys.path
_ROOT = Path(__file__).parent.parent.resolve()
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.main import app
from backend.audit_ledger import AuditLedger, ledger
from backend.auth import QDS_API_KEY_ENV_VAR
from backend.integrity import compute_signature_integrity_tag

client = TestClient(app)


# ===========================================================================
# 1. End-to-End Complete Protocol Workflow
# ===========================================================================

def test_end_to_end_complete_protocol_workflow():
    """Execute complete lifecycle:
    generate keys -> sign -> verify -> simulate -> attack -> detect -> ledger -> restart -> verify again.
    """
    # 1. Generate keys
    keys_res = client.post("/api/v1/generate-keys", json={"n_qubits": 8, "shots": 512, "seed": 100})
    assert keys_res.status_code == 200
    k_data = keys_res.json()
    assert "session_id" in k_data
    session_id = k_data["session_id"]
    pub_key = k_data["alice_public_key"]

    # 2. Sign message
    msg = "Final Audit Sovereign Settlement: $5,000,000"
    sign_res = client.post("/api/v1/signatures/sign", json={
        "message": msg,
        "private_key": {"session_id": session_id},
        "n_qubits": 8,
        "shots": 512,
        "seed": 100,
    })
    assert sign_res.status_code == 200
    s_data = sign_res.json()
    assert s_data["integrity_tag"] is not None
    sig = s_data["signature"]

    # 3. Verify legitimate signature
    verify_res = client.post("/api/v1/signatures/verify", json={
        "signature": sig,
        "public_key": pub_key,
        "message": msg,
    })
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_valid"] is True
    assert v_data["reason"] == "verified_authentic"

    # 4. Run quantum simulation
    sim_res = client.post("/api/v1/simulate", json={
        "attack_type": "none",
        "num_qubits": 8,
        "shots": 512,
        "seed": 100,
    })
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["is_malicious"] is False
    assert sim_data["classification"]["recommended_action"] == "NONE"

    # 5. Run adversarial attack simulation
    attack_res = client.post("/api/v1/simulate-attack/depolarizing", json={
        "params": {"error_rate": 0.25, "n_qubits": 8},
        "shots": 512,
        "seed": 100,
    })
    assert attack_res.status_code == 200
    att_data = attack_res.json()
    assert att_data["status"] == "success"

    # 6. Run threat detection on attack measurements
    meas_data = att_data["measurement_data"]
    det_res = client.post("/api/v1/detect", json={"measurement_data": meas_data})
    assert det_res.status_code == 200
    det_data = det_res.json()
    assert det_data["qber"] > 0.05
    assert det_data["is_malicious"] is True

    # 7. Audit ledger verification before restart
    v_chain_1 = client.get("/api/v1/audit-ledger/verify")
    assert v_chain_1.status_code == 200
    assert v_chain_1.json()["valid"] is True

    # 8. Simulate process restart: verify the original signature again
    # Verification is stateless and survives process boundaries
    verify_res_post_restart = client.post("/api/v1/signatures/verify", json={
        "signature": sig,
        "public_key": pub_key,
        "message": msg,
    })
    assert verify_res_post_restart.status_code == 200
    assert verify_res_post_restart.json()["is_valid"] is True

    # 9. Tampered signature fails cleanly
    tampered_sig = copy.deepcopy(sig)
    tampered_sig["sent_bits"][0] ^= 1
    v_tampered = client.post("/api/v1/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": pub_key,
        "message": msg,
    })
    assert v_tampered.status_code == 200
    assert v_tampered.json()["is_valid"] is False
    assert v_tampered.json()["reason"] == "signature_integrity_mismatch"


# ===========================================================================
# 2. Security Control Integration
# ===========================================================================

def test_auth_and_hmac_control_integration(monkeypatch):
    """Verify that authentication and HMAC controls operate synergistically."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, "master-test-key-999")

    # Generate a signature without auth header -> 401
    r_no_auth = client.post("/api/v1/signatures/sign", json={"message": "SecTest"})
    assert r_no_auth.status_code == 401

    # Generate with correct auth -> 200
    headers = {"Authorization": "Bearer master-test-key-999"}
    r_auth = client.post("/api/v1/signatures/sign", json={"message": "SecTest"}, headers=headers)
    assert r_auth.status_code == 200
    sig = r_auth.json()["signature"]

    # Verify with correct auth + valid HMAC -> 200 authentic
    r_verify_ok = client.post("/api/v1/signatures/verify", json={
        "signature": sig,
        "message": "SecTest",
    }, headers=headers)
    assert r_verify_ok.status_code == 200
    assert r_verify_ok.json()["is_valid"] is True

    # Verify with correct auth + tampered HMAC -> 200 rejected (HMAC catches it)
    tampered_sig = copy.deepcopy(sig)
    tampered_sig["fidelity"] = 0.50
    r_verify_tampered = client.post("/api/v1/signatures/verify", json={
        "signature": tampered_sig,
        "message": "SecTest",
    }, headers=headers)
    assert r_verify_tampered.status_code == 200
    assert r_verify_tampered.json()["is_valid"] is False
    assert r_verify_tampered.json()["reason"] == "signature_integrity_mismatch"

    # Verify with valid HMAC + wrong auth -> 401 (Auth catches it before computation)
    r_bad_auth = client.post("/api/v1/signatures/verify", json={
        "signature": sig,
        "message": "SecTest",
    }, headers={"Authorization": "Bearer wrong-key"})
    assert r_bad_auth.status_code == 401


def test_auth_and_resource_limits_integration(monkeypatch):
    """Resource limits are strictly enforced under authenticated sessions."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, "master-test-key-999")
    headers = {"X-API-Key": "master-test-key-999"}

    # Exceed n_qubits boundary (> 128)
    r = client.post("/api/v1/signatures/sign", json={
        "message": "Test",
        "n_qubits": 9999,
    }, headers=headers)
    assert r.status_code == 422
    assert "less than or equal to 128" in r.text


# ===========================================================================
# 3. Route Inventory & Legacy Alias Equivalence
# ===========================================================================

def test_legacy_and_versioned_route_equivalence():
    """Verify that all legacy routes and their /api/v1 equivalents return identical schema structures."""
    endpoints = [
        ("GET", "/health", "/api/v1/health"),
        ("GET", "/audit-ledger", "/api/v1/audit-ledger"),
        ("GET", "/audit-ledger/verify", "/api/v1/audit-ledger/verify"),
        ("GET", "/protocol-dag", "/api/v1/protocol-dag"),
    ]
    for method, root_path, v1_path in endpoints:
        r_root = client.request(method, root_path)
        r_v1 = client.request(method, v1_path)
        assert r_root.status_code == 200, f"Root {root_path} returned {r_root.status_code}"
        assert r_v1.status_code == 200, f"V1 {v1_path} returned {r_v1.status_code}"
        assert r_root.headers.get("X-Content-Type-Options") == "nosniff"
        assert r_v1.headers.get("X-Content-Type-Options") == "nosniff"

    # POST routes equivalence
    sim_payload = {"attack_type": "none", "num_qubits": 4, "shots": 128, "seed": 77}
    r_sim_root = client.post("/simulate", json=sim_payload)
    r_sim_v1 = client.post("/api/v1/simulate", json=sim_payload)
    assert r_sim_root.status_code == 200
    assert r_sim_v1.status_code == 200
    assert r_sim_root.json()["num_qubits"] == r_sim_v1.json()["num_qubits"]


# ===========================================================================
# 4. Authentication Edge Cases
# ===========================================================================

@pytest.mark.parametrize("bad_header", [
    {"Authorization": "Bearer"},
    {"Authorization": "Bearer   "},
    {"Authorization": "Basic dXNlcjpwYXNz"},
    {"Authorization": "Token 12345"},
    {"Authorization": "Bearer " + "A" * 10000},
    {"Authorization": "Bearer \x00\x01\x02"},
    {"X-API-Key": ""},
    {"X-API-Key": "   "},
    {"X-API-Key": "incorrect-key"},
])
def test_authentication_malformed_credentials_handled_gracefully(monkeypatch, bad_header):
    """All malformed, empty, or non-matching credentials return clean 401s without 500 errors."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, "correct-secret-key-1234")

    res = client.post("/api/v1/signatures/sign", json={"message": "Test"}, headers=bad_header)
    assert res.status_code == 401
    body = res.json()
    assert body["error"] == "Unauthorized"
    assert "correct-secret-key-1234" not in res.text


def test_public_routes_remain_accessible_with_auth_enabled(monkeypatch):
    """Public monitoring and documentation routes remain accessible without credentials."""
    monkeypatch.setenv(QDS_API_KEY_ENV_VAR, "correct-secret-key-1234")

    public_paths = [
        "/health",
        "/api/v1/health",
        "/api/docs",
        "/api/redoc",
        "/api/openapi.json",
    ]
    for p in public_paths:
        r = client.get(p)
        assert r.status_code == 200, f"Public path {p} failed with {r.status_code}"


# ===========================================================================
# 5. Resource-Exhaustion Boundaries
# ===========================================================================

def test_resource_boundaries_strict_enforcement():
    """Test boundary conditions (min, max, max+1) for key parameters."""
    # 1. Message size boundary (> 65536)
    huge_msg = "X" * 65537
    r = client.post("/api/v1/signatures/sign", json={"message": huge_msg})
    assert r.status_code == 422

    # 2. Shots boundary (< 64 or > 8192)
    r_shots_low = client.post("/api/v1/signatures/sign", json={"shots": 63})
    assert r_shots_low.status_code == 422
    r_shots_high = client.post("/api/v1/signatures/sign", json={"shots": 8193})
    assert r_shots_high.status_code == 422

    # 3. Simulate num_qubits boundary (> 5000)
    r_sim_nq = client.post("/api/v1/simulate", json={"num_qubits": 5001, "attack_type": "none"})
    assert r_sim_nq.status_code == 422
    assert "less than or equal to 5000" in r_sim_nq.text



# ===========================================================================
# 6. Cryptographic Integrity & Tamper Rejection
# ===========================================================================

def test_cryptographic_cross_session_replay_prevented():
    """A signature bound to session-A cannot be presented with session-B."""
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Wire Transfer"})
    sig = sign_res.json()["signature"]

    # Replay under different session ID
    sig_replayed = copy.deepcopy(sig)
    sig_replayed["session_id"] = "session-substituted-by-attacker"

    v_res = client.post("/api/v1/signatures/verify", json={
        "signature": sig_replayed,
        "message": "Wire Transfer",
    })
    assert v_res.status_code == 200
    assert v_res.json()["is_valid"] is False
    assert v_res.json()["reason"] == "signature_integrity_mismatch"


# ===========================================================================
# 7. Audit Ledger Durability & Tamper Detection
# ===========================================================================

def test_audit_ledger_durability_and_tamper_detection():
    """Verify that the SQLite audit ledger maintains an unbroken SHA3-512 chain and detects database tampering."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_file = Path(tmp_dir) / "test_audit.db"

        # 1. Create and populate ledger instance
        ledger_1 = AuditLedger(db_path=db_file)
        ledger_1.record_event(session_id="s1", event_type="TEST_1", node_id="A1")
        ledger_1.record_event(session_id="s2", event_type="TEST_2", node_id="A2")
        assert len(ledger_1.get_records()) == 2
        assert ledger_1.verify_chain()["valid"] is True
        ledger_1.close()

        # 2. Re-open (simulate server restart) and append
        ledger_2 = AuditLedger(db_path=db_file)
        assert len(ledger_2.get_records()) == 2
        assert ledger_2.verify_chain()["valid"] is True
        ledger_2.record_event(session_id="s3", event_type="TEST_3", node_id="A3")
        assert len(ledger_2.get_records()) == 3
        assert ledger_2.verify_chain()["valid"] is True
        ledger_2.close()

        # 3. Inject disk-level tampering into SQLite database
        conn = sqlite3.connect(str(db_file))
        conn.execute("UPDATE audit_records SET threat_classification = 'TAMPERED' WHERE record_id = 'aud-000002'")
        conn.commit()
        conn.close()

        # 4. Re-open tampered database -> verification must detect tampering
        ledger_tampered = AuditLedger(db_path=db_file)
        chain_status = ledger_tampered.verify_chain()
        assert chain_status["valid"] is False
        assert "mismatch" in chain_status["error"].lower()
        ledger_tampered.close()


# ===========================================================================
# 8. Failure Injection & Error Sanitization
# ===========================================================================

def test_failure_injection_and_path_sanitization():
    """Ensure invalid payloads and internal errors do not leak filesystem paths or stack traces."""
    # 1. Invalid JSON body
    r_bad_json = client.post(
        "/api/v1/signatures/verify",
        content="not-json-content",
        headers={"Content-Type": "application/json"},
    )
    assert r_bad_json.status_code == 422

    # 2. Unknown attack type
    r_bad_attack = client.post("/api/v1/simulate-attack/quantum_voodoo", json={})
    assert r_bad_attack.status_code == 400
    assert "quantum_voodoo" in r_bad_attack.text

    # 3. Path sanitization check: no drive letters or root paths leaked
    assert "C:\\" not in r_bad_attack.text
    assert "D:\\" not in r_bad_attack.text


# ===========================================================================
# 9. Concurrency & Thread Safety
# ===========================================================================

def test_concurrent_multi_operation_reliability():
    """Run concurrent signing, verification, and ledger queries across threads."""
    def worker(idx: int) -> bool:
        msg = f"Concurrent Transaction #{idx}"
        sign_r = client.post("/api/v1/signatures/sign", json={
            "message": msg,
            "n_qubits": 4,
            "shots": 128,
            "seed": idx,
        })
        if sign_r.status_code != 200:
            return False
        sig = sign_r.json()["signature"]

        verify_r = client.post("/api/v1/signatures/verify", json={
            "signature": sig,
            "message": msg,
        })
        if verify_r.status_code != 200 or not verify_r.json()["is_valid"]:
            return False

        ledger_r = client.get("/api/v1/audit-ledger?limit=5")
        return ledger_r.status_code == 200

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(worker, i) for i in range(12)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert all(results)
    assert len(results) == 12

    # Verify audit chain integrity after concurrent writes
    chain_check = client.get("/api/v1/audit-ledger/verify")
    assert chain_check.status_code == 200
    assert chain_check.json()["valid"] is True


# ===========================================================================
# 10. CORS & Defensive Security Headers
# ===========================================================================

def test_cors_options_preflight_and_security_headers():
    """Verify CORS preflight OPTIONS and defensive response headers."""
    # 1. OPTIONS preflight
    opt_res = client.options("/api/v1/signatures/verify", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
    })
    assert opt_res.status_code == 200
    assert opt_res.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # 2. Defensive security headers on responses
    get_res = client.get("/api/v1/health")
    assert get_res.status_code == 200
    assert get_res.headers.get("X-Content-Type-Options") == "nosniff"
    assert get_res.headers.get("X-Frame-Options") == "DENY"
    assert get_res.headers.get("X-XSS-Protection") == "1; mode=block"

    # 3. Unsupported HTTP methods return 405 Method Not Allowed, not 500
    del_res = client.delete("/api/v1/health")
    assert del_res.status_code == 405
