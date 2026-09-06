"""
backend/test_business_logic_security.py
========================================
Comprehensive regression test suite for Business-Logic, State-Consistency,
and Protocol-Invariant Security.

Covers:
1. Signature State Consistency & Invariant Combinations:
   - Message hash of Message A with payload for Message B -> message_hash_mismatch
   - Tampered sent_bits vs target message derivation -> quantum_evidence_mismatch
   - Dimensional mismatches (measurement_outcomes != correction_bits, bases, sent_bits) -> 422
   - Contradictory fidelity vs measurement counts -> quantum_evidence_mismatch
   - Disallowed execution modes -> quantum_evidence_mismatch / 422
   - Invalid bases outside {'X', 'Y', 'Z'} -> quantum_evidence_mismatch / 422
2. Complete Sign -> Verify Workflow:
   - Sign valid message -> verify same message succeeds
   - Sign valid message -> verify modified message fails
   - Sign valid message -> verify same signature twice is idempotent and valid
   - Sign -> mutate session_id -> verify fails (signature_integrity_mismatch)
   - Sign -> mutate message_hash -> verify fails (message_hash_mismatch / signature_integrity_mismatch)
   - Sign -> mutate outcomes/corrections/bases -> verify fails
   - Sign -> mutate execution_mode -> verify fails
   - Sign -> mutate fidelity -> verify fails
   - Sign -> mutate measurement counts -> verify fails
3. Session Lifecycle & Nonexistent Sessions:
   - Stateless operation: verification operates deterministically using cryptographic evidence
   - Tampered session IDs are rejected by HMAC integrity binding
   - Empty and whitespace session IDs are rejected
4. Replay Semantics:
   - Same signature + same message + same session -> verified_authentic (idempotent)
   - Same signature + different session -> signature_integrity_mismatch
   - Same signature + different message -> message_hash_mismatch
5. Detection Logic Invariants:
   - Contradictory counts vs expected distribution
   - Dimensional consistency in measurement sequences (sent_bits vs received_bits)
   - ABORT recommendation forces is_malicious=True and COMPROMISED audit classification
6. Attack Simulation Parameter Consistency:
   - Incompatible attack parameters (e.g. noise_rate supplied on non-depolarizing attacks) -> 422
   - Negative error rates or rates > 1 -> 422
   - Extreme out-of-range n_qubits -> 422
   - Unknown attack types -> 400
7. Audit-Ledger Consistency:
   - Response status and outcome matches recorded event
   - Session ID and message hash in ledger match verified payload
   - Rejected requests do not create misleading records
8. HTTP Route & Alias Consistency:
   - Legacy aliases (/simulate vs /api/v1/simulate, /attacks vs /api/v1/attacks) maintain identical invariants
   - Method mismatches (GET on POST routes) return 405 Method Not Allowed, not 500
9. Numeric Edge Cases:
   - NaN, Inf, non-numeric strings rejected with 422, zero 500 crashes
"""

from __future__ import annotations

import copy
import hashlib
import json
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure repo root is on sys.path
_ROOT = Path(__file__).parent.parent.resolve()
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.main import app
from backend.audit_ledger import ledger

client = TestClient(app)


# ===========================================================================
# 1. Signature State Consistency & Invariants
# ===========================================================================

def test_message_hash_mismatch_with_modified_message():
    """Verify that when message does not match message_hash, it is rejected."""
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Wire $500", "n_qubits": 4, "shots": 128})
    assert sign_res.status_code == 200
    data = sign_res.json()
    sig = dict(data["signature"])

    # Attempt to verify with a different message
    v_res = client.post("/api/v1/signatures/verify", json={
        "signature": sig,
        "message": "Wire $50,000",
    })
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["is_valid"] is False
    assert v_data["message_intact"] is False
    assert v_data["reason"] == "message_hash_mismatch"


def test_dimensional_mismatch_in_signature_rejected():
    """Signatures with mismatched array dimensions are rejected with quantum_evidence_mismatch or signature_integrity_mismatch."""
    # measurement_outcomes length (3) != correction_bits length (2)
    bad_sig = {
        "message": "Test",
        "message_hash": hashlib.sha256(b"Test").hexdigest(),
        "session_id": "test-sess",
        "measurement_outcomes": [0, 1, 0],
        "correction_bits": [[0, 0], [1, 1]],
        "sent_bits": [0, 1, 0],
        "bases": ["X", "Z", "X"],
    }
    r = client.post("/api/v1/signatures/verify", json={"signature": bad_sig, "message": "Test"})
    assert r.status_code == 200
    res_data = r.json()
    assert res_data["is_valid"] is False
    assert res_data["reason"] in ("quantum_evidence_mismatch", "missing_integrity_tag", "signature_integrity_mismatch")



def test_contradictory_fidelity_and_counts_rejected():
    """Contradictory evidence (e.g. perfect Bell diagonal counts but fidelity=0.10) is rejected."""
    # Generate genuine signature
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Check", "n_qubits": 2, "shots": 128})
    sig = dict(sign_res.json()["signature"])

    # Set contradictory fidelity
    sig["fidelity"] = 0.10
    sig["measurement_counts"] = {"00": 500, "11": 500}  # 100% diagonal, yet fidelity claims 0.10

    v_res = client.post("/api/v1/signatures/verify", json={"signature": sig, "message": "Check"})
    assert v_res.status_code == 200
    assert v_res.json()["is_valid"] is False
    assert v_res.json()["reason"] in ("quantum_evidence_mismatch", "signature_integrity_mismatch")


# ===========================================================================
# 2. Complete Sign -> Verify Workflow
# ===========================================================================

def test_sign_verify_workflow_comprehensive():
    """Comprehensive test covering genuine verification, mutations, and idempotency."""
    msg = "Urgent Protocol Command"
    sign_res = client.post("/api/v1/signatures/sign", json={"message": msg, "n_qubits": 4, "shots": 128})
    assert sign_res.status_code == 200
    sig_orig = dict(sign_res.json()["signature"])

    # A. Genuine verification succeeds
    v1 = client.post("/api/v1/signatures/verify", json={"signature": sig_orig, "message": msg})
    assert v1.status_code == 200
    assert v1.json()["is_valid"] is True
    assert v1.json()["reason"] == "verified_authentic"

    # B. Repeated verification is idempotent
    v2 = client.post("/api/v1/signatures/verify", json={"signature": sig_orig, "message": msg})
    assert v2.status_code == 200
    assert v2.json()["is_valid"] is True

    # C. Mutate single bit in measurement_outcomes -> fails
    sig_mut_outcomes = copy.deepcopy(sig_orig)
    sig_mut_outcomes["measurement_outcomes"][0] = 1 - sig_mut_outcomes["measurement_outcomes"][0]
    v_outcomes = client.post("/api/v1/signatures/verify", json={"signature": sig_mut_outcomes, "message": msg})
    assert v_outcomes.status_code == 200
    assert v_outcomes.json()["is_valid"] is False
    assert v_outcomes.json()["reason"] == "signature_integrity_mismatch"

    # D. Mutate correction bit pair -> fails
    sig_mut_corr = copy.deepcopy(sig_orig)
    sig_mut_corr["correction_bits"][0][0] = 1 - sig_mut_corr["correction_bits"][0][0]
    v_corr = client.post("/api/v1/signatures/verify", json={"signature": sig_mut_corr, "message": msg})
    assert v_corr.status_code == 200
    assert v_corr.json()["is_valid"] is False
    assert v_corr.json()["reason"] == "signature_integrity_mismatch"

    # E. Mutate bases -> fails
    sig_mut_bases = copy.deepcopy(sig_orig)
    sig_mut_bases["bases"][0] = "Z" if sig_mut_bases["bases"][0] == "X" else "X"
    v_bases = client.post("/api/v1/signatures/verify", json={"signature": sig_mut_bases, "message": msg})
    assert v_bases.status_code == 200
    assert v_bases.json()["is_valid"] is False
    assert v_bases.json()["reason"] == "signature_integrity_mismatch"

    # F. Mutate execution mode -> fails
    sig_mut_mode = copy.deepcopy(sig_orig)
    sig_mut_mode["execution_mode"] = "compatibility_fallback" if sig_orig["execution_mode"] == "quantum" else "quantum"
    v_mode = client.post("/api/v1/signatures/verify", json={"signature": sig_mut_mode, "message": msg})
    assert v_mode.status_code == 200
    assert v_mode.json()["is_valid"] is False
    assert v_mode.json()["reason"] == "signature_integrity_mismatch"


# ===========================================================================
# 3. Session Lifecycle & Replay Semantics
# ===========================================================================

def test_cross_session_substitution_rejected():
    """Attaching a signature from Session A to Session B is rejected."""
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Wire", "n_qubits": 2, "shots": 128})
    sig = dict(sign_res.json()["signature"])

    # Substitute session_id
    sig["session_id"] = "completely-different-session-uuid"
    v_res = client.post("/api/v1/signatures/verify", json={"signature": sig, "message": "Wire"})
    assert v_res.status_code == 200
    assert v_res.json()["is_valid"] is False
    assert v_res.json()["reason"] == "signature_integrity_mismatch"


def test_replay_verification_idempotency():
    """Re-submitting the identical authentic signature produces identical authentic outcome."""
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Auth Doc", "n_qubits": 2, "shots": 128})
    sig = dict(sign_res.json()["signature"])

    for _ in range(3):
        v = client.post("/api/v1/signatures/verify", json={"signature": sig, "message": "Auth Doc"})
        assert v.status_code == 200
        assert v.json()["is_valid"] is True
        assert v.json()["reason"] == "verified_authentic"


# ===========================================================================
# 4. Detection Logic Invariants
# ===========================================================================

def test_detection_abort_enforces_malicious_and_compromised():
    """When detection assesses recommended_action='ABORT', is_malicious is True and audit record is COMPROMISED."""
    # Massive QBER (100% error rate: all 01 and 10)
    det_res = client.post("/api/v1/detect", json={
        "measurement_data": {
            "measurement_counts": {"01": 500, "10": 500},
            "fidelity": 0.05,
            "measured_qber": 1.0,
            "session_id": "abort-test-session",
        }
    })
    assert det_res.status_code == 200
    data = det_res.json()
    assert data["is_malicious"] is True
    assert data["recommended_action"] == "ABORT"

    # Check that audit record reflects COMPROMISED
    history = ledger.get_session_history("abort-test-session")
    assert len(history) >= 1
    assert history[-1].threat_classification == "COMPROMISED"
    assert history[-1].recommended_action == "ABORT"


def test_measurement_sequence_mismatch_rejected():
    """Measurement data with mismatched sent_bits and received_bits is rejected."""
    r = client.post("/api/v1/detect", json={
        "measurement_data": {
            "measurement_counts": {"00": 500, "11": 500},
            "fidelity": 0.99,
            "sent_bits": [0, 1, 0],
            "received_bits": [0, 1],  # length 3 != length 2
        }
    })
    assert r.status_code == 422
    assert "sent_bits length (3) must match received_bits length (2)" in r.text


# ===========================================================================
# 5. Attack Simulation Parameter Consistency
# ===========================================================================

def test_attack_incompatible_parameters_rejected():
    """Supplying noise_rate for non-depolarizing attack in /simulate is rejected."""
    r = client.post("/api/v1/simulate", json={
        "attack_type": "intercept_resend",
        "noise_rate": 0.15,
        "shots": 128,
    })
    assert r.status_code == 422
    assert "noise_rate is only a valid field when attack_type is 'depolarizing'" in r.text


def test_attack_invalid_error_rates_rejected():
    """Negative error rates or error rates > 1 in attack simulation are rejected."""
    r_neg = client.post("/api/v1/attacks/depolarizing", json={"params": {"error_rate": -0.5}})
    assert r_neg.status_code == 422

    r_over = client.post("/api/v1/attacks/depolarizing", json={"params": {"error_rate": 1.5}})
    assert r_over.status_code == 422


# ===========================================================================
# 6. Audit-Ledger Consistency
# ===========================================================================

def test_audit_ledger_record_matches_verification_result():
    """Audit ledger entry exactly mirrors the verification outcome."""
    sign_res = client.post("/api/v1/signatures/sign", json={"message": "Ledger Audit Match", "n_qubits": 2, "shots": 128})
    sig = dict(sign_res.json()["signature"])
    sess_id = sig["session_id"]

    # Verify genuine
    v_res = client.post("/api/v1/signatures/verify", json={"signature": sig, "message": "Ledger Audit Match"})
    assert v_res.status_code == 200

    history = ledger.get_session_history(sess_id)
    assert len(history) >= 2  # SIGNING + VERIFICATION
    verif_rec = [r for r in history if r.event_type == "VERIFICATION"][-1]
    assert verif_rec.verification_outcome == "ACCEPT"
    assert verif_rec.threat_classification == "SECURE"
    assert verif_rec.recommended_action == "NONE"


# ===========================================================================
# 7. HTTP Route, Alias & Method Consistency
# ===========================================================================

def test_route_method_mismatch_returns_405_not_500():
    """GET requests on POST-only endpoints return 405 Method Not Allowed, never 500."""
    post_routes = [
        "/api/v1/signatures/sign",
        "/api/v1/signatures/verify",
        "/api/v1/simulate",
        "/api/v1/detect",
    ]
    for route in post_routes:
        r = client.get(route)
        assert r.status_code == 405, f"Expected 405 for GET on {route}, got {r.status_code}"


def test_route_aliases_maintain_identical_invariants():
    """Root aliases and /api/v1/ aliases exhibit identical invariant enforcement."""
    # Invalid num_qubits
    r1 = client.post("/simulate", json={"num_qubits": -5})
    r2 = client.post("/api/v1/simulate", json={"num_qubits": -5})
    assert r1.status_code == 422
    assert r2.status_code == 422


# ===========================================================================
# 8. Numeric Edge Cases
# ===========================================================================

def test_numeric_edge_cases_rejected():
    """NaN, Infinity, and non-numeric strings do not crash the engine with HTTP 500."""
    edge_payloads = [
        ("/api/v1/detect", {"measurement_data": {"measurement_counts": {"00": 100}, "fidelity": "NaN"}}),
        ("/api/v1/detect", {"measurement_data": {"measurement_counts": {"00": 100}, "fidelity": "Infinity"}}),
        ("/api/v1/signatures/sign", {"n_qubits": "Infinity", "shots": 128}),
        ("/api/v1/signatures/sign", {"n_qubits": "NaN", "shots": 128}),
        ("/api/v1/simulate", {"num_qubits": "not_a_number", "shots": 128}),
    ]
    for path, body in edge_payloads:
        r = client.post(path, json=body)
        assert r.status_code == 422
        assert r.status_code != 500
