"""
backend/test_signature_integrity.py
===================================
Automated regression tests for quantum digital signature integrity binding.

Verifies:
1. Genuine signature with valid integrity_tag is accepted.
2. Tampering sent_bits -> is_valid=False, reason="signature_integrity_mismatch".
3. Tampering correction_bits -> is_valid=False, reason="signature_integrity_mismatch".
4. Tampering bases -> is_valid=False, reason="signature_integrity_mismatch".
5. Tampering measurement_counts -> is_valid=False, reason="signature_integrity_mismatch".
6. Tampering message -> is_valid=False, message_intact=False, reason="message_hash_mismatch".
7. Tampering measurement_outcomes -> is_valid=False.
8. Tampering fidelity -> is_valid=False (integrity mismatch or qber/fidelity exceeded).
9. Missing integrity_tag -> is_valid=False, reason="missing_integrity_tag".
10. Tampering execution_mode -> is_valid=False, reason="signature_integrity_mismatch".
11. Compatibility fallback signature integrity works end-to-end.
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# Ensure repo root is on sys.path
_ROOT = Path(__file__).parent.parent.resolve()
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module")
def key_material(client: TestClient) -> dict:
    res = client.post("/generate-keys/", json={"n_qubits": 4, "shots": 256, "seed": 42})
    assert res.status_code == 200, f"Key generation failed: {res.text}"
    return res.json()


@pytest.fixture(scope="module")
def signed_payload(client: TestClient, key_material: dict) -> dict:
    message = "Authorized Sovereign Wire Settlement: $10,000,000"
    res = client.post("/signatures/sign", json={
        "message": message,
        "private_key": key_material["alice_public_key"],
        "n_qubits": 4,
        "shots": 256,
        "seed": 42,
    })
    assert res.status_code == 200, f"Signing failed: {res.text}"
    data = res.json()
    assert "integrity_tag" in data["signature"], "Signature missing integrity_tag"
    return {
        "message": message,
        "public_key": key_material["bob_shared_material"],
        "signature": data["signature"],
    }


def test_1_genuine_signature_accepted(client: TestClient, signed_payload: dict):
    """Requirement 1: A genuine signature with a valid integrity_tag is accepted."""
    res = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["message_intact"] is True
    assert data["session_valid"] is True
    assert data["reason"] == "verified_authentic"


def test_2_tampered_sent_bits_rejected(client: TestClient, signed_payload: dict):
    """Requirement 2: Changing sent_bits causes rejection with reason 'signature_integrity_mismatch'."""
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    tampered_sig["sent_bits"][0] = 1 - tampered_sig["sent_bits"][0]

    res = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_3_tampered_correction_bits_rejected(client: TestClient, signed_payload: dict):
    """Requirement 3: Changing correction_bits causes rejection with reason 'signature_integrity_mismatch'."""
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    first_pair = list(tampered_sig["correction_bits"][0])
    first_pair[0] = 1 - first_pair[0]
    tampered_sig["correction_bits"][0] = first_pair

    res = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_4_tampered_bases_rejected(client: TestClient, signed_payload: dict):
    """Requirement 4: Changing bases causes rejection with reason 'signature_integrity_mismatch'."""
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    tampered_sig["bases"][0] = "Z" if tampered_sig["bases"][0] == "X" else "X"

    res = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_5_tampered_measurement_counts_rejected(client: TestClient, signed_payload: dict):
    """Requirement 5: Changing measurement_counts causes rejection with reason 'signature_integrity_mismatch'."""
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    first_key = list(tampered_sig["measurement_counts"].keys())[0]
    tampered_sig["measurement_counts"][first_key] += 10

    res = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_6_tampered_message_rejected(client: TestClient, signed_payload: dict):
    """Requirement 6: Changing the message causes is_valid=False, message_intact=False, reason='message_hash_mismatch'."""
    res = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": signed_payload["public_key"],
        "message": "Forged Wire Settlement: $99,999,999",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["message_intact"] is False
    assert data["reason"] == "message_hash_mismatch"


def test_7_tampered_measurement_outcomes_rejected(client: TestClient, signed_payload: dict):
    """Requirement 7: Changing measurement_outcomes causes rejection."""
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    tampered_sig["measurement_outcomes"][0] = 1 - tampered_sig["measurement_outcomes"][0]

    res = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    # Will fail quantum qber check or integrity check
    assert data["reason"] in ("qber_exceeded", "signature_integrity_mismatch")


def test_8_tampered_fidelity_rejected(client: TestClient, signed_payload: dict):
    """Requirement 8: Changing fidelity while keeping original integrity_tag causes rejection."""
    # Case A: Fidelity tampered within quantum threshold (e.g., changed to 0.92)
    tampered_sig_within = copy.deepcopy(signed_payload["signature"])
    tampered_sig_within["fidelity"] = 0.92

    res_within = client.post("/signatures/verify", json={
        "signature": tampered_sig_within,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res_within.status_code == 200
    data_within = res_within.json()
    assert data_within["is_valid"] is False
    assert data_within["reason"] == "signature_integrity_mismatch"

    # Case B: Fidelity tampered below quantum threshold (e.g., changed to 0.50)
    tampered_sig_below = copy.deepcopy(signed_payload["signature"])
    tampered_sig_below["fidelity"] = 0.50

    res_below = client.post("/signatures/verify", json={
        "signature": tampered_sig_below,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res_below.status_code == 200
    data_below = res_below.json()
    assert data_below["is_valid"] is False


def test_9_missing_integrity_tag_rejected(client: TestClient, signed_payload: dict):
    """Requirement 9: Removing integrity_tag causes is_valid=False, reason='missing_integrity_tag'."""
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    del tampered_sig["integrity_tag"]

    res = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "missing_integrity_tag"


def test_10_tampered_execution_mode_rejected(client: TestClient, signed_payload: dict):
    """Bonus: Changing execution_mode causes reason='signature_integrity_mismatch'."""
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    tampered_sig["execution_mode"] = "spoofed_mode"

    res = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_11_compatibility_fallback_integrity(client: TestClient, key_material: dict):
    """Compatibility fallback signatures must also generate integrity tags and be protected against tampering."""
    with patch("backend.routes.signatures.sign", side_effect=RuntimeError("Quantum hardware simulated offline")):
        fallback_msg = "Fallback Wire Transfer Authorization"
        sign_res = client.post("/signatures/sign", json={
            "message": fallback_msg,
            "private_key": key_material["alice_public_key"],
            "n_qubits": 4,
            "shots": 256,
            "seed": 42,
        })
        assert sign_res.status_code == 200
        fb_data = sign_res.json()
        assert fb_data["execution_mode"] == "compatibility_fallback"
        assert "integrity_tag" in fb_data["signature"]

        # Genuine fallback verification
        verify_res = client.post("/signatures/verify", json={
            "signature": fb_data["signature"],
            "public_key": key_material["bob_shared_material"],
            "message": fallback_msg,
        })
        assert verify_res.status_code == 200
        assert verify_res.json()["is_valid"] is True

        # Tampered fallback verification (sent_bits)
        tampered_fb = copy.deepcopy(fb_data["signature"])
        tampered_fb["sent_bits"][0] = 1 - tampered_fb["sent_bits"][0]
        tamper_res = client.post("/signatures/verify", json={
            "signature": tampered_fb,
            "public_key": key_material["bob_shared_material"],
            "message": fallback_msg,
        })
        assert tamper_res.status_code == 200
        assert tamper_res.json()["is_valid"] is False
        assert tamper_res.json()["reason"] == "signature_integrity_mismatch"


def test_12_tampered_session_id_rejected(client: TestClient, signed_payload: dict):
    """Requirement B: Tampered session_id causes rejection with reason 'signature_integrity_mismatch'."""
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    tampered_sig["session_id"] = "tampered-session-id-forged"

    res = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_13_restart_persistence_same_and_different_secret(client: TestClient, key_material: dict):
    """Requirements D & E: Same secret succeeds after restart; different secret fails with 'signature_integrity_mismatch'."""
    import os
    orig_secret = os.environ.get("QDS_INTEGRITY_SECRET")
    test_msg = "Sovereign Settlement Authorization: $25,000,000"

    try:
        # Step 1: Sign with secret_fixed_A
        os.environ["QDS_INTEGRITY_SECRET"] = "secret_fixed_A"
        sign_res = client.post("/signatures/sign", json={
            "message": test_msg,
            "private_key": key_material["alice_public_key"],
            "n_qubits": 4,
            "shots": 256,
            "seed": 42,
        })
        assert sign_res.status_code == 200
        sig_data = sign_res.json()
        assert "integrity_tag" in sig_data["signature"]

        # Step 2: Verify with same secret (Server restart simulation with identical secret)
        os.environ["QDS_INTEGRITY_SECRET"] = "secret_fixed_A"
        verify_res_same = client.post("/signatures/verify", json={
            "signature": sig_data["signature"],
            "public_key": key_material["bob_shared_material"],
            "message": test_msg,
        })
        assert verify_res_same.status_code == 200
        same_data = verify_res_same.json()
        assert same_data["is_valid"] is True
        assert same_data["reason"] == "verified_authentic"

        # Step 3: Verify with different secret (Server restart with altered secret)
        os.environ["QDS_INTEGRITY_SECRET"] = "secret_rotated_B"
        verify_res_diff = client.post("/signatures/verify", json={
            "signature": sig_data["signature"],
            "public_key": key_material["bob_shared_material"],
            "message": test_msg,
        })
        assert verify_res_diff.status_code == 200
        diff_data = verify_res_diff.json()
        assert diff_data["is_valid"] is False
        assert diff_data["reason"] == "signature_integrity_mismatch"

    finally:
        if orig_secret is not None:
            os.environ["QDS_INTEGRITY_SECRET"] = orig_secret
        else:
            os.environ.pop("QDS_INTEGRITY_SECRET", None)


def test_14_quantum_evidence_correction_bits_length_mismatch(client: TestClient, signed_payload: dict):
    """Quantum evidence consistency: correction_bits length mismatch must be rejected with 'quantum_evidence_mismatch'."""
    from backend.integrity import compute_signature_integrity_tag

    inconsistent_sig = copy.deepcopy(signed_payload["signature"])
    # Append an extra correction bit pair so len(correction_bits) != len(measurement_outcomes)
    inconsistent_sig["correction_bits"].append([0, 1])
    # Compute valid HMAC tag for this payload so integrity check passes and quantum evidence check triggers
    inconsistent_sig["integrity_tag"] = compute_signature_integrity_tag(inconsistent_sig)

    res = client.post("/signatures/verify", json={
        "signature": inconsistent_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "quantum_evidence_mismatch"


def test_15_quantum_evidence_bases_length_mismatch(client: TestClient, signed_payload: dict):
    """Quantum evidence consistency: bases length mismatch must be rejected with 'quantum_evidence_mismatch'."""
    from backend.integrity import compute_signature_integrity_tag

    inconsistent_sig = copy.deepcopy(signed_payload["signature"])
    inconsistent_sig["bases"].append("X")
    inconsistent_sig["integrity_tag"] = compute_signature_integrity_tag(inconsistent_sig)

    res = client.post("/signatures/verify", json={
        "signature": inconsistent_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "quantum_evidence_mismatch"


def test_16_quantum_evidence_sent_bits_derivation_mismatch(client: TestClient, signed_payload: dict):
    """Quantum evidence consistency: sent_bits differing from message hash derivation rejected with 'quantum_evidence_mismatch'."""
    from backend.integrity import compute_signature_integrity_tag

    inconsistent_sig = copy.deepcopy(signed_payload["signature"])
    inconsistent_sig["sent_bits"][0] = 1 - inconsistent_sig["sent_bits"][0]
    inconsistent_sig["integrity_tag"] = compute_signature_integrity_tag(inconsistent_sig)

    res = client.post("/signatures/verify", json={
        "signature": inconsistent_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "quantum_evidence_mismatch"


def test_17_quantum_evidence_invalid_measurement_counts(client: TestClient, signed_payload: dict):
    """Quantum evidence consistency: measurement_counts with non-Bell keys rejected with 'quantum_evidence_mismatch'."""
    from backend.integrity import compute_signature_integrity_tag

    inconsistent_sig = copy.deepcopy(signed_payload["signature"])
    inconsistent_sig["measurement_counts"] = {"99": 256, "00": 256, "01": 256, "11": 256}
    inconsistent_sig["integrity_tag"] = compute_signature_integrity_tag(inconsistent_sig)

    res = client.post("/signatures/verify", json={
        "signature": inconsistent_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "quantum_evidence_mismatch"


def test_18_quantum_evidence_invalid_execution_mode(client: TestClient, signed_payload: dict):
    """Quantum evidence consistency: invalid execution_mode rejected with 'quantum_evidence_mismatch'."""
    from backend.integrity import compute_signature_integrity_tag

    inconsistent_sig = copy.deepcopy(signed_payload["signature"])
    inconsistent_sig["execution_mode"] = "untrusted_simulation_mode"
    inconsistent_sig["integrity_tag"] = compute_signature_integrity_tag(inconsistent_sig)

    res = client.post("/signatures/verify", json={
        "signature": inconsistent_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "quantum_evidence_mismatch"


def test_19_quantum_evidence_sent_bits_length_mismatch(client: TestClient, signed_payload: dict):
    """Quantum evidence consistency: sent_bits length mismatch rejected with 'quantum_evidence_mismatch'."""
    from backend.integrity import compute_signature_integrity_tag

    inconsistent_sig = copy.deepcopy(signed_payload["signature"])
    # Append an extra sent bit so len(sent_bits) != len(measurement_outcomes)
    inconsistent_sig["sent_bits"].append(1)
    inconsistent_sig["integrity_tag"] = compute_signature_integrity_tag(inconsistent_sig)

    res = client.post("/signatures/verify", json={
        "signature": inconsistent_sig,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "quantum_evidence_mismatch"


def test_20_direct_validate_quantum_evidence_unit_cases(signed_payload: dict):
    """Direct unit tests for validate_quantum_evidence helper."""
    from backend.integrity import validate_quantum_evidence

    base_sig = signed_payload["signature"]
    msg = signed_payload["message"]

    # 1. Genuine signature valid
    valid, reason = validate_quantum_evidence(base_sig, target_message=msg)
    assert valid is True
    assert reason == "quantum_evidence_valid"

    # 2. Empty outcomes -> malformed
    bad_sig = copy.deepcopy(base_sig)
    bad_sig["measurement_outcomes"] = []
    v, r = validate_quantum_evidence(bad_sig, target_message=msg)
    assert v is False
    assert r in ("malformed_signature_payload", "quantum_evidence_mismatch")

    # 3. Non-binary correction bit
    bad_sig = copy.deepcopy(base_sig)
    bad_sig["correction_bits"][0] = [2, 0]
    v, r = validate_quantum_evidence(bad_sig, target_message=msg)
    assert v is False
    assert r == "quantum_evidence_mismatch"

    # 4. Total shots = 0 in measurement_counts
    bad_sig = copy.deepcopy(base_sig)
    bad_sig["measurement_counts"] = {"00": 0, "01": 0, "10": 0, "11": 0}
    v, r = validate_quantum_evidence(bad_sig, target_message=msg)
    assert v is False
    assert r == "quantum_evidence_mismatch"

    # 5. Invalid basis
    bad_sig = copy.deepcopy(base_sig)
    bad_sig["bases"][0] = "W"
    v, r = validate_quantum_evidence(bad_sig, target_message=msg)
    assert v is False
    assert r == "quantum_evidence_mismatch"

    # 6. Invalid fidelity (> 1.0 or < 0.0)
    bad_sig = copy.deepcopy(base_sig)
    bad_sig["fidelity"] = 1.05
    v, r = validate_quantum_evidence(bad_sig, target_message=msg)
    assert v is False
    assert r == "quantum_evidence_mismatch"

    bad_sig["fidelity"] = -0.1
    v, r = validate_quantum_evidence(bad_sig, target_message=msg)
    assert v is False
    assert r == "quantum_evidence_mismatch"


# ===========================================================================
# AUDIT SUITE: 12 ATTACK CLASSES FORGERY RESISTANCE AUDIT
# ===========================================================================

import hashlib
import hmac
from qds_core.signing import hash_message, get_message_bits
from backend.integrity import compute_signature_integrity_tag


def test_21_attack_class_1_fabricated_signature_rejected(client: TestClient, key_material: dict):
    """Attack Class 1: Completely fabricated signature object.
    Attacker creates all fields manually with plausible quantum properties
    and a fake integrity tag, without knowing QDS_INTEGRITY_SECRET.
    Must be rejected with is_valid=False and reason='signature_integrity_mismatch'.
    """
    fake_msg = "Attacker Wire Authorization: $500,000"
    fake_hash = hash_message(fake_msg)
    fake_sig = {
        "message": fake_msg,
        "message_hash": fake_hash,
        "session_id": key_material["session_id"],
        "sent_bits": [0, 1, 0, 1],
        "measurement_outcomes": [0, 1, 0, 1],
        "correction_bits": [[0, 0], [0, 0], [0, 0], [0, 0]],
        "bases": ["Z", "X", "Z", "X"],
        "fidelity": 0.99,
        "measurement_counts": {"00": 512, "11": 512},
        "execution_mode": "quantum",
        "integrity_tag": "deadbeef" * 8,  # 64-char fake tag
    }
    res = client.post("/signatures/verify", json={
        "signature": fake_sig,
        "public_key": key_material["bob_shared_material"],
        "message": fake_msg,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_22_attack_class_2_integrity_tag_forgery_variants_rejected(client: TestClient, signed_payload: dict):
    """Attack Class 2: Integrity-tag forgery variants.
    Tests:
    - Guessed tag (random 64-char hex)
    - Truncated tag (32 chars)
    - Extended tag (128 chars)
    - All-zero tag ('00' * 32)
    - All-ff tag ('ff' * 32)
    - Wrong secret HMAC tag (attacker computes HMAC with their own secret)
    All must be rejected with reason='signature_integrity_mismatch'.
    """
    base_sig = copy.deepcopy(signed_payload["signature"])
    genuine_tag = base_sig["integrity_tag"]
    
    # Calculate a valid-looking HMAC using wrong attacker key
    wrong_key_hmac = hmac.new(b"attacker_unauthorized_key_material", b"canonical_bytes", hashlib.sha256).hexdigest()

    variants = [
        ("guessed_random_hex", "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"),
        ("truncated_32_chars", genuine_tag[:32]),
        ("extended_128_chars", genuine_tag + "00" * 32),
        ("all_zeros", "00" * 32),
        ("all_ffs", "ff" * 32),
        ("wrong_secret_hmac", wrong_key_hmac),
    ]

    for label, bad_tag in variants:
        tampered_sig = copy.deepcopy(base_sig)
        tampered_sig["integrity_tag"] = bad_tag
        res = client.post("/signatures/verify", json={
            "signature": tampered_sig,
            "public_key": signed_payload["public_key"],
            "message": signed_payload["message"],
        })
        assert res.status_code == 200, f"Variant {label} failed HTTP status"
        data = res.json()
        assert data["is_valid"] is False, f"Variant {label} was unexpectedly accepted"
        assert data["reason"] == "signature_integrity_mismatch", f"Variant {label} gave unexpected reason: {data['reason']}"


def test_23_attack_class_3_replay_attacks(client: TestClient, signed_payload: dict, key_material: dict):
    """Attack Class 3: Replay attack analysis.
    - 3a. Replaying authentic signature in same intended context -> legitimately verifies.
    - 3b. Replaying authentic signature against a different message -> rejected ('message_hash_mismatch').
    - 3c. Replaying authentic signature against a different public key -> rejected ('session_mismatch').
    - 3d. Replaying authentic signature with modified session context -> rejected ('signature_integrity_mismatch').
    """
    # 3a. Same message, same context: valid signature presentation
    res_same = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res_same.status_code == 200
    assert res_same.json()["is_valid"] is True
    assert res_same.json()["reason"] == "verified_authentic"

    # 3b. Different message
    res_diff_msg = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": signed_payload["public_key"],
        "message": "Fraudulent Settlement Message",
    })
    assert res_diff_msg.status_code == 200
    assert res_diff_msg.json()["is_valid"] is False
    assert res_diff_msg.json()["reason"] == "message_hash_mismatch"

    # 3c. Different public key (different session)
    gen_res = client.post("/generate-keys/", json={"n_qubits": 4, "shots": 256, "seed": 99})
    diff_key = gen_res.json()["bob_shared_material"]
    res_diff_key = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": diff_key,
        "message": signed_payload["message"],
    })
    assert res_diff_key.status_code == 200
    assert res_diff_key.json()["is_valid"] is False
    assert res_diff_key.json()["reason"] == "session_mismatch"

    # 3d. Tampering session_id in signature to match different public key
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    tampered_sig["session_id"] = diff_key["session_id"]
    res_tampered_session = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": diff_key,
        "message": signed_payload["message"],
    })
    assert res_tampered_session.status_code == 200
    assert res_tampered_session.json()["is_valid"] is False
    assert res_tampered_session.json()["reason"] == "signature_integrity_mismatch"


def test_24_attack_class_4_cross_signature_substitution_rejected(client: TestClient, key_material: dict):
    """Attack Class 4: Cross-signature substitution.
    Take quantum evidence from Signature A and combine with message/session/tag from Signature B.
    Must be rejected with reason='signature_integrity_mismatch'.
    """
    # Generate signature A
    sigA_res = client.post("/signatures/sign", json={
        "message": "Message Alpha: Payment of 100 QUBITS",
        "private_key": key_material["alice_public_key"],
        "n_qubits": 4,
        "shots": 256,
        "seed": 42,
    })
    sigA = sigA_res.json()["signature"]

    # Generate signature B
    sigB_res = client.post("/signatures/sign", json={
        "message": "Message Beta: Payment of 500 QUBITS",
        "private_key": key_material["alice_public_key"],
        "n_qubits": 4,
        "shots": 256,
        "seed": 43,
    })
    sigB = sigB_res.json()["signature"]

    # Substitute quantum evidence from A into B (with B's message, session, tag)
    hybrid_sig = copy.deepcopy(sigB)
    hybrid_sig["measurement_outcomes"] = sigA["measurement_outcomes"]
    hybrid_sig["correction_bits"] = sigA["correction_bits"]
    hybrid_sig["sent_bits"] = sigA["sent_bits"]
    hybrid_sig["bases"] = sigA["bases"]

    res = client.post("/signatures/verify", json={
        "signature": hybrid_sig,
        "public_key": key_material["bob_shared_material"],
        "message": "Message Beta: Payment of 500 QUBITS",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_25_attack_class_5_field_recombination_rejected(client: TestClient, key_material: dict):
    """Attack Class 5: Field recombination.
    Construct a hybrid payload using individually valid fields from multiple genuine signatures.
    No combination can pass without the correct HMAC integrity tag.
    """
    sig1_res = client.post("/signatures/sign", json={
        "message": "Contract 1: Alice to Bob",
        "private_key": key_material["alice_public_key"],
        "n_qubits": 4,
        "shots": 256,
        "seed": 101,
    })
    sig1 = sig1_res.json()["signature"]

    sig2_res = client.post("/signatures/sign", json={
        "message": "Contract 2: Charlie to Dave",
        "private_key": key_material["alice_public_key"],
        "n_qubits": 4,
        "shots": 256,
        "seed": 102,
    })
    sig2 = sig2_res.json()["signature"]

    # Recombine fields: message & hash from 1, outcomes from 2, correction from 1, bases from 2, tag from 1
    recomb_sig = {
        "message": sig1["message"],
        "message_hash": sig1["message_hash"],
        "session_id": sig1["session_id"],
        "sent_bits": sig1["sent_bits"],
        "measurement_outcomes": sig2["measurement_outcomes"],
        "correction_bits": sig1["correction_bits"],
        "bases": sig2["bases"],
        "fidelity": sig1["fidelity"],
        "measurement_counts": sig2["measurement_counts"],
        "execution_mode": sig1["execution_mode"],
        "integrity_tag": sig1["integrity_tag"],
    }

    res = client.post("/signatures/verify", json={
        "signature": recomb_sig,
        "public_key": key_material["bob_shared_material"],
        "message": sig1["message"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_26_attack_class_6_public_key_substitution_rejected(client: TestClient, signed_payload: dict):
    """Attack Class 6: Public-key substitution.
    - Genuine signature + unrelated legitimate public key -> rejected ('session_mismatch').
    - Genuine signature + generated attacker public key -> rejected ('session_mismatch').
    """
    # Unrelated legitimate key
    unrelated_res = client.post("/generate-keys/", json={"n_qubits": 4, "shots": 256, "seed": 777})
    unrelated_pub_key = unrelated_res.json()["bob_shared_material"]

    res1 = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": unrelated_pub_key,
        "message": signed_payload["message"],
    })
    assert res1.status_code == 200
    assert res1.json()["is_valid"] is False
    assert res1.json()["reason"] == "session_mismatch"

    # Generated attacker public key
    attacker_res = client.post("/generate-keys/", json={"n_qubits": 4, "shots": 256, "seed": 999})
    attacker_pub_key = attacker_res.json()["charlie_shared_material"]

    res2 = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": attacker_pub_key,
        "message": signed_payload["message"],
    })
    assert res2.status_code == 200
    assert res2.json()["is_valid"] is False
    assert res2.json()["reason"] == "session_mismatch"


def test_27_attack_class_7_session_substitution_rejected(client: TestClient, signed_payload: dict):
    """Attack Class 7: Session substitution.
    - Genuine signature with another legitimate session_id swapped in.
    - Genuine signature with random session_id swapped in.
    Verifies that integrity enforcement triggers and rejects before session acceptance.
    """
    # Legitimate session substitution
    tampered_sig1 = copy.deepcopy(signed_payload["signature"])
    tampered_sig1["session_id"] = "legitimate-session-uuid-substitution"

    res1 = client.post("/signatures/verify", json={
        "signature": tampered_sig1,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res1.status_code == 200
    assert res1.json()["is_valid"] is False
    # Integrity check fails before session match is accepted
    assert res1.json()["reason"] == "signature_integrity_mismatch"

    # Random session substitution
    tampered_sig2 = copy.deepcopy(signed_payload["signature"])
    tampered_sig2["session_id"] = "random-sess-987654321"

    res2 = client.post("/signatures/verify", json={
        "signature": tampered_sig2,
        "public_key": signed_payload["public_key"],
        "message": signed_payload["message"],
    })
    assert res2.status_code == 200
    assert res2.json()["is_valid"] is False
    assert res2.json()["reason"] == "signature_integrity_mismatch"


def test_28_attack_class_8_message_substitution_rejected(client: TestClient, signed_payload: dict):
    """Attack Class 8: Message substitution.
    - Genuine signature + completely different message -> rejected ('message_hash_mismatch').
    - Genuine signature + same-length different message -> rejected ('message_hash_mismatch').
    - Tampering message_hash to match the substitute message -> rejected ('signature_integrity_mismatch').
    """
    orig_msg = signed_payload["message"]

    # Completely different message
    res_diff = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": signed_payload["public_key"],
        "message": "Completely unrelated text payload here",
    })
    assert res_diff.status_code == 200
    assert res_diff.json()["is_valid"] is False
    assert res_diff.json()["reason"] == "message_hash_mismatch"

    # Same-length different message
    same_len_msg = "Authorized Sovereign Wire Settlement: $99,999,999"
    assert len(same_len_msg) == len(orig_msg)
    res_same_len = client.post("/signatures/verify", json={
        "signature": signed_payload["signature"],
        "public_key": signed_payload["public_key"],
        "message": same_len_msg,
    })
    assert res_same_len.status_code == 200
    assert res_same_len.json()["is_valid"] is False
    assert res_same_len.json()["reason"] == "message_hash_mismatch"

    # Tampering message_hash to match the substitute message
    tampered_sig = copy.deepcopy(signed_payload["signature"])
    tampered_sig["message_hash"] = hash_message(same_len_msg)
    res_tampered_hash = client.post("/signatures/verify", json={
        "signature": tampered_sig,
        "public_key": signed_payload["public_key"],
        "message": same_len_msg,
    })
    assert res_tampered_hash.status_code == 200
    assert res_tampered_hash.json()["is_valid"] is False
    assert res_tampered_hash.json()["reason"] == "signature_integrity_mismatch"


def test_29_attack_class_9_quantum_evidence_fabrication_rejected(client: TestClient, key_material: dict):
    """Attack Class 9: Quantum evidence fabrication.
    Attacker synthesizes mathematically plausible measurement_counts, plausible fidelity (0.99),
    valid dimensions (4 qubits), valid binary values, valid bases, valid correction bits,
    and valid message hash bits, but does not possess the server secret.
    Must be rejected with reason='signature_integrity_mismatch'.
    """
    target_msg = "Fabricated Quantum Target Message"
    sent_bits = get_message_bits(target_msg, n_qubits=4)

    fabricated_sig = {
        "message": target_msg,
        "message_hash": hash_message(target_msg),
        "session_id": key_material["session_id"],
        "sent_bits": sent_bits,
        "measurement_outcomes": list(sent_bits),  # Zero QBER
        "correction_bits": [[0, 0] for _ in range(4)],
        "bases": ["Z", "Z", "Z", "Z"],
        "fidelity": 0.995,
        "measurement_counts": {"00": 256},
        "execution_mode": "quantum",
        "integrity_tag": "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
    }

    res = client.post("/signatures/verify", json={
        "signature": fabricated_sig,
        "public_key": key_material["bob_shared_material"],
        "message": target_msg,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["reason"] == "signature_integrity_mismatch"


def test_30_attack_class_10_algorithm_confusion_malformed_input(client: TestClient, signed_payload: dict):
    """Attack Class 10: Algorithm confusion / malformed cryptographic input.
    Tests:
    - Unexpected integrity tag length (too short / too long)
    - Unicode strings in integrity tag
    - Null values in critical fields (missing_integrity_tag or 422)
    - Numeric/string type substitutions in measurement outcomes
    - Unusual JSON ordering (canonicalization normalizes correctly)
    - Extra JSON fields (does not bypass integrity validation)
    """
    base_sig = signed_payload["signature"]
    msg = signed_payload["message"]
    pub_key = signed_payload["public_key"]

    # 1. Unexpected tag length
    short_sig = copy.deepcopy(base_sig)
    short_sig["integrity_tag"] = "abcdef"
    res_short = client.post("/signatures/verify", json={"signature": short_sig, "public_key": pub_key, "message": msg})
    assert res_short.status_code == 200
    assert res_short.json()["is_valid"] is False
    assert res_short.json()["reason"] == "signature_integrity_mismatch"

    # 2. Unicode string tag
    unicode_sig = copy.deepcopy(base_sig)
    unicode_sig["integrity_tag"] = "tag_ñ_🚀_" + "a" * 50
    res_uni = client.post("/signatures/verify", json={"signature": unicode_sig, "public_key": pub_key, "message": msg})
    assert res_uni.status_code == 200
    assert res_uni.json()["is_valid"] is False
    assert res_uni.json()["reason"] == "signature_integrity_mismatch"

    # 3. Null integrity tag
    null_tag_sig = copy.deepcopy(base_sig)
    null_tag_sig["integrity_tag"] = None
    res_null = client.post("/signatures/verify", json={"signature": null_tag_sig, "public_key": pub_key, "message": msg})
    assert res_null.status_code == 200
    assert res_null.json()["is_valid"] is False
    assert res_null.json()["reason"] == "missing_integrity_tag"

    # 4. Numeric/string type substitution in measurement_outcomes
    bad_type_sig = copy.deepcopy(base_sig)
    bad_type_sig["measurement_outcomes"] = ["not_a_number"]
    res_bad_type = client.post("/signatures/verify", json={"signature": bad_type_sig, "public_key": pub_key, "message": msg})
    # Schema validation rejects malformed types with 422
    assert res_bad_type.status_code == 422

    # 5. Unusual JSON ordering: authentic signature with reversed key order verifies identically
    reversed_keys_sig = {k: base_sig[k] for k in reversed(list(base_sig.keys()))}
    res_order = client.post("/signatures/verify", json={"signature": reversed_keys_sig, "public_key": pub_key, "message": msg})
    assert res_order.status_code == 200
    assert res_order.json()["is_valid"] is True
    assert res_order.json()["reason"] == "verified_authentic"

    # 6. Extra JSON fields injected
    extra_field_sig = copy.deepcopy(base_sig)
    extra_field_sig["attacker_injected_nonce"] = "exploit_12345"
    res_extra = client.post("/signatures/verify", json={"signature": extra_field_sig, "public_key": pub_key, "message": msg})
    assert res_extra.status_code == 200
    # The genuine protected fields still match the integrity tag
    assert res_extra.json()["is_valid"] is True


def test_31_attack_class_11_fallback_mode_forgery_rejected(client: TestClient, key_material: dict):
    """Attack Class 11: Fallback-mode forgery.
    Attempt to fabricate a compatibility_fallback signature that passes all backend checks.
    Without QDS_INTEGRITY_SECRET, forged fallback signatures must be rejected.
    """
    fb_msg = "Emergency Fallback Wire Transfer: $2,000,000"
    sent_bits = get_message_bits(fb_msg, n_qubits=4)

    # 1. Attacker crafts a fallback signature with a forged tag
    forged_fb_sig = {
        "message": fb_msg,
        "message_hash": hash_message(fb_msg),
        "session_id": key_material["session_id"],
        "sent_bits": sent_bits,
        "measurement_outcomes": list(sent_bits),
        "correction_bits": [[0, 0] for _ in range(4)],
        "bases": ["Z", "Z", "Z", "Z"],
        "fidelity": 1.0,
        "measurement_counts": {"00": 1024},
        "execution_mode": "compatibility_fallback",
        "integrity_tag": "cafebabe" * 8,
    }

    res1 = client.post("/signatures/verify", json={
        "signature": forged_fb_sig,
        "public_key": key_material["bob_shared_material"],
        "message": fb_msg,
    })
    assert res1.status_code == 200
    assert res1.json()["is_valid"] is False
    assert res1.json()["reason"] == "signature_integrity_mismatch"

    # 2. Attacker crafts a fallback signature with no integrity_tag
    forged_fb_no_tag = copy.deepcopy(forged_fb_sig)
    del forged_fb_no_tag["integrity_tag"]
    res2 = client.post("/signatures/verify", json={
        "signature": forged_fb_no_tag,
        "public_key": key_material["bob_shared_material"],
        "message": fb_msg,
    })
    assert res2.status_code == 200
    assert res2.json()["is_valid"] is False
    assert res2.json()["reason"] == "missing_integrity_tag"


def test_32_attack_class_12_process_restart_replay(client: TestClient, key_material: dict):
    """Attack Class 12: Replay after process restart.
    - Genuine signature + same secret -> expected legitimate verification.
    - Genuine signature + different secret -> must reject.
    """
    secret_a = b"persistent-server-secret-epoch-A-key"
    secret_b = b"rotated-server-secret-epoch-B-key"

    with patch.dict("os.environ", {"QDS_INTEGRITY_SECRET": secret_a.decode()}):
        sign_res = client.post("/signatures/sign", json={
            "message": "Restart Resilience Test Message",
            "private_key": key_material["alice_public_key"],
            "n_qubits": 4,
            "shots": 256,
            "seed": 42,
        })
        assert sign_res.status_code == 200
        sig_data = sign_res.json()
        sig = sig_data["signature"]

        # 1. Verification with same secret succeeds
        verify_same = client.post("/signatures/verify", json={
            "signature": sig,
            "public_key": key_material["bob_shared_material"],
            "message": "Restart Resilience Test Message",
        })
        assert verify_same.status_code == 200
        assert verify_same.json()["is_valid"] is True
        assert verify_same.json()["reason"] == "verified_authentic"

    # 2. Verification after process restart with different secret fails
    with patch.dict("os.environ", {"QDS_INTEGRITY_SECRET": secret_b.decode()}):
        verify_diff = client.post("/signatures/verify", json={
            "signature": sig,
            "public_key": key_material["bob_shared_material"],
            "message": "Restart Resilience Test Message",
        })
        assert verify_diff.status_code == 200
        assert verify_diff.json()["is_valid"] is False
        assert verify_diff.json()["reason"] == "signature_integrity_mismatch"




