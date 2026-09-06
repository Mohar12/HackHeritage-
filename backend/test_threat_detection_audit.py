"""
backend/test_threat_detection_audit.py
======================================
Comprehensive end-to-end threat detection API audit and hardening test suite.

Verifies:
1. Complete normal flow: Generate Keys -> Sign -> Verify -> Detect -> SECURE.
2. Complete attack flow: Generate Keys -> Attack Simulation -> Detect -> COMPROMISED / ABORT.
3. All 5 attack types exposed by backend/routes/attacks.py.
4. Threshold boundary evaluations for QBER, Chi2, Fidelity, and Confidence.
5. Adversarial malformed inputs (NaN, negatives, bounds, invalid types).
6. Classification consistency (no metric masking, abort floor guarantees).
7. Audit ledger immutability and SHA3-512 / Ed25519 cryptographic hash-chain verification.
"""

from __future__ import annotations

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


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


# ---------------------------------------------------------------------------
# STEP 8: END-TO-END HACKATHON DEMO FLOW TEST
# ---------------------------------------------------------------------------

def test_end_to_end_hackathon_demo_flow(client: TestClient):
    """Deterministic regression test representing the complete hackathon demonstration:
    NORMAL:
      Generate Keys -> Sign -> Verify -> Detect -> SECURE
    ATTACK:
      Generate Keys -> Apply Intercept-Resend -> Detect -> COMPROMISED / ABORT
    """
    # 1. NORMAL PROTOCOL FLOW
    # Step 1a: Key Generation
    key_res = client.post("/generate-keys/", json={"n_qubits": 4, "shots": 256, "seed": 42})
    assert key_res.status_code == 200
    km = key_res.json()
    assert "alice_public_key" in km
    assert "bob_shared_material" in km
    session_id = km["session_id"]

    # Step 1b: Quantum Digital Signature Creation
    message = "Authorized Interbank Settlement: $5,000,000 USD"
    sign_res = client.post("/signatures/sign", json={
        "message": message,
        "private_key": km["alice_public_key"],
        "n_qubits": 4,
        "shots": 256,
        "seed": 42,
    })
    assert sign_res.status_code == 200
    sign_data = sign_res.json()
    signature = sign_data["signature"]
    assert "integrity_tag" in signature

    # Step 1c: Signature Verification
    verify_res = client.post("/signatures/verify", json={
        "signature": signature,
        "public_key": km["bob_shared_material"],
        "message": message,
    })
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_valid"] is True
    assert v_data["reason"] == "verified_authentic"
    assert v_data["qber"] == 0.0
    assert v_data["fidelity"] >= 0.90

    # Step 1d: Normal Threat Detection on Distributed Key Channel
    meas_data_normal = {
        "measurement_counts": km["measurement_counts"],
        "fidelity": signature["fidelity"],
        "measured_qber": v_data["qber"],
        "session_id": session_id,
        "sent_bits": signature["sent_bits"],
        "received_bits": signature["measurement_outcomes"],
    }
    det_res_normal = client.post("/detect", json={"measurement_data": meas_data_normal})
    assert det_res_normal.status_code == 200
    det_normal = det_res_normal.json()
    assert det_normal["is_malicious"] is False
    assert det_normal["qber_classification"] == "SECURE"
    assert det_normal["recommended_action"] == "NONE"
    assert det_normal["confidence_score"] < 0.50

    # 2. ADVERSARIAL ATTACK FLOW (Intercept-Resend Eavesdropping)
    # Step 2a: Execute Intercept-Resend Channel Attack
    atk_res = client.post("/attacks/intercept_resend", json={
        "shots": 256,
        "seed": 42,
        "params": {
            "n_qubits": 4,
            "public_key": km["alice_public_key"],
        }
    })
    assert atk_res.status_code == 200
    atk_data = atk_res.json()
    assert atk_data["status"] == "success"
    assert "measurement_data" in atk_data
    atk_meas = atk_data["measurement_data"]
    assert atk_meas["measured_qber"] >= 0.20  # Significant BB84 QBER elevation

    # Step 2b: Adversarial Threat Detection Pipeline
    det_res_attack = client.post("/detect", json={"measurement_data": atk_meas})
    assert det_res_attack.status_code == 200
    det_attack = det_res_attack.json()
    assert det_attack["is_malicious"] is True
    assert det_attack["qber_classification"] == "COMPROMISED"
    assert det_attack["recommended_action"] == "ABORT"
    assert det_attack["confidence_score"] >= 0.75


# ---------------------------------------------------------------------------
# STEP 3: TEST ALL 5 ATTACK TYPES
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("attack_type,expected_malicious,min_qber,expected_action", [
    ("intercept_resend", True, 0.20, "ABORT"),
    ("depolarizing", True, 0.05, "ABORT"),  # with error_rate=0.20
    ("forgery", True, 0.40, "ABORT"),
    ("impersonation", True, 0.40, "ABORT"),
    ("replay", False, 0.0, "NONE"),  # replay channel counts are valid; caught at signature verification
])
def test_each_attack_type_detection(client: TestClient, attack_type: str, expected_malicious: bool, min_qber: float, expected_action: str):
    """Execute each attack type exposed by backend/routes/attacks.py and verify detection behavior."""
    params: dict = {"n_qubits": 4}
    if attack_type == "depolarizing":
        params["error_rate"] = 0.20  # Active channel corruption

    atk_res = client.post(f"/attacks/{attack_type}", json={
        "shots": 256,
        "seed": 42,
        "params": params,
    })
    assert atk_res.status_code == 200
    atk_data = atk_res.json()
    meas_data = atk_data["measurement_data"]

    det_res = client.post("/detect", json={"measurement_data": meas_data})
    assert det_res.status_code == 200
    det = det_res.json()

    assert det["qber"] >= min_qber
    assert det["is_malicious"] is expected_malicious
    assert det["recommended_action"] == expected_action


# ---------------------------------------------------------------------------
# STEP 4: THRESHOLD BOUNDARIES TESTS
# ---------------------------------------------------------------------------

def test_qber_threshold_boundaries(client: TestClient):
    """Verify QBER exact boundaries:
    - QBER < 0.05: SECURE
    - 0.05 <= QBER <= 0.11: WARNING
    - QBER > 0.11: COMPROMISED
    """
    # 1. Just below 0.05
    res1 = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.95, "measured_qber": 0.0499
    }})
    assert res1.status_code == 200
    assert res1.json()["qber_classification"] == "SECURE"

    # 2. Exactly 0.05
    res2 = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.95, "measured_qber": 0.05
    }})
    assert res2.status_code == 200
    assert res2.json()["qber_classification"] == "WARNING"

    # 3. Exactly 0.11
    res3 = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.95, "measured_qber": 0.11
    }})
    assert res3.status_code == 200
    assert res3.json()["qber_classification"] == "WARNING"

    # 4. Just above 0.11
    res4 = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.95, "measured_qber": 0.1101
    }})
    assert res4.status_code == 200
    assert res4.json()["qber_classification"] == "COMPROMISED"
    assert res4.json()["recommended_action"] == "ABORT"


def test_fidelity_threshold_boundaries(client: TestClient):
    """Verify Fidelity exact boundaries:
    - F >= 0.90: HIGH
    - 0.70 <= F < 0.90: DEGRADED
    - F < 0.70: CRITICAL (triggers ABORT)
    """
    # 1. F = 0.90 -> HIGH
    res1 = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.90, "measured_qber": 0.01
    }})
    assert res1.status_code == 200
    assert res1.json()["fidelity_classification"] == "HIGH"

    # 2. F = 0.8999 -> DEGRADED
    res2 = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.8999, "measured_qber": 0.01
    }})
    assert res2.status_code == 200
    assert res2.json()["fidelity_classification"] == "DEGRADED"

    # 3. F = 0.70 -> DEGRADED
    res3 = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.70, "measured_qber": 0.01
    }})
    assert res3.status_code == 200
    assert res3.json()["fidelity_classification"] == "DEGRADED"

    # 4. F = 0.6999 -> CRITICAL
    res4 = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.6999, "measured_qber": 0.01
    }})
    assert res4.status_code == 200
    assert res4.json()["fidelity_classification"] == "CRITICAL"
    assert res4.json()["recommended_action"] == "ABORT"
    assert res4.json()["is_malicious"] is True


def test_confidence_malicious_threshold(client: TestClient):
    """Verify Confidence boundary: is_malicious is True iff confidence_score > 0.50."""
    # Benign case: confidence << 0.50
    res_benign = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.99, "measured_qber": 0.005
    }})
    assert res_benign.status_code == 200
    assert res_benign.json()["confidence_score"] <= 0.50
    assert res_benign.json()["is_malicious"] is False

    # Corrupted case: confidence >= 0.75
    res_mal = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.50, "measured_qber": 0.25
    }})
    assert res_mal.status_code == 200
    assert res_mal.json()["confidence_score"] > 0.50
    assert res_mal.json()["is_malicious"] is True


# ---------------------------------------------------------------------------
# STEP 5: ADVERSARIAL INPUT TESTS
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("payload,expected_status", [
    ({"measurement_data": {"measurement_counts": {"00": 512, "11": 512}, "fidelity": -0.1}}, 422),
    ({"measurement_data": {"measurement_counts": {"00": 512, "11": 512}, "fidelity": 1.5}}, 422),
    ({"measurement_data": {"measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.95, "measured_qber": -0.1}}, 422),
    ({"measurement_data": {"measurement_counts": {"00": 512, "11": 512}, "fidelity": 0.95, "measured_qber": 1.5}}, 422),
    ({"measurement_data": {"measurement_counts": {}, "fidelity": 0.95}}, 422),
    ({"measurement_data": {"measurement_counts": {"00": "bad_count"}, "fidelity": 0.95}}, 422),
    ({"measurement_data": {"fidelity": 0.95}}, 422),
    ({"measurement_data": {"measurement_counts": {"00": 512, "11": 512}}}, 422),
])
def test_adversarial_malformed_inputs_return_422(client: TestClient, payload: dict, expected_status: int):
    """Verify that malformed inputs return controlled 422 errors and never crash with 500."""
    res = client.post("/detect", json=payload)
    assert res.status_code == expected_status


@pytest.mark.parametrize("bad_attack_type", ["invalid", "../escape", "DROP_TABLE", "12345"])
def test_invalid_attack_names_return_400(client: TestClient, bad_attack_type: str):
    """Verify invalid attack endpoints return controlled 400 or 404, never 500."""
    res = client.post(f"/attacks/{bad_attack_type}", json={})
    assert res.status_code in (400, 404)


# ---------------------------------------------------------------------------
# STEP 6: CLASSIFICATION CONSISTENCY & NO METRIC MASKING
# ---------------------------------------------------------------------------

def test_high_fidelity_cannot_mask_compromised_qber(client: TestClient):
    """Security invariance: perfect fidelity (1.0) must NEVER mask a compromised QBER (0.25)."""
    res = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512},
        "fidelity": 1.0,
        "measured_qber": 0.25,
    }})
    assert res.status_code == 200
    data = res.json()
    assert data["qber_classification"] == "COMPROMISED"
    assert data["fidelity_classification"] == "HIGH"
    assert data["recommended_action"] == "ABORT"
    assert data["is_malicious"] is True
    assert data["confidence_score"] >= 0.75


def test_low_qber_cannot_mask_critical_fidelity(client: TestClient):
    """Security invariance: zero QBER (0.0) must NEVER mask critical state degradation (F=0.40)."""
    res = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512},
        "fidelity": 0.40,
        "measured_qber": 0.0,
    }})
    assert res.status_code == 200
    data = res.json()
    assert data["qber_classification"] == "SECURE"
    assert data["fidelity_classification"] == "CRITICAL"
    assert data["recommended_action"] == "ABORT"
    assert data["is_malicious"] is True
    assert data["confidence_score"] >= 0.75


# ---------------------------------------------------------------------------
# STEP 7: AUDIT LEDGER LOGGING AND HASH-CHAIN VERIFICATION
# ---------------------------------------------------------------------------

def test_audit_ledger_recording_and_cryptographic_verification(client: TestClient):
    """Verify that detection events log accurate records and hash-chain remains cryptographically intact."""
    initial_count = ledger.count()

    # Trigger a detection event with a specific session ID
    test_session = "audit-verify-test-session-xyz"
    det_res = client.post("/detect", json={"measurement_data": {
        "measurement_counts": {"00": 512, "11": 512},
        "fidelity": 0.98,
        "measured_qber": 0.02,
        "session_id": test_session,
    }})
    assert det_res.status_code == 200

    # Verify new record appended
    records = ledger.get_records(limit=10)
    assert ledger.count() == initial_count + 1
    last_rec = records[-1]
    assert last_rec.session_id == test_session
    assert last_rec.event_type == "THREAT_DETECTION"
    assert last_rec.threat_classification == "SECURE"

    # Verify SHA3-512 + Ed25519 hash-chain cryptographic integrity
    chain_res = client.get("/api/v1/audit-ledger/verify")
    assert chain_res.status_code == 200
    chain_data = chain_res.json()
    assert chain_data["valid"] is True
    assert chain_data["records_checked"] >= 1
    assert chain_data["error"] is None
