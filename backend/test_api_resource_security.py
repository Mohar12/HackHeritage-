"""
backend/test_api_resource_security.py
======================================
Regression test suite for backend API resource-exhaustion and abuse-resilience audit.

Covers:
1. n_qubits boundaries across all endpoints
2. shots boundaries across all endpoints
3. Oversized messages (> 65536 characters)
4. Oversized arrays (> 5000 items)
5. Oversized measurement_counts and expected_distribution (> 256 states or keys > 64 chars)
6. Invalid numeric values (booleans, negative, zero, NaN/Inf strings)
7. Invalid enums and attack types
8. Concurrent safe requests (key-generation, signing, detection, attacks)
9. Repeated audit writes and rejection non-proliferation
10. HTTP error sanitization (no stack trace, no path leakage, no secret leakage)
11. Audit ledger integrity under abuse
12. Zero unhandled HTTP 500 responses on client input errors
"""

import concurrent.futures
import re
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
# 1. n_qubits Boundaries
# ===========================================================================

def test_generate_keys_n_qubits_boundaries():
    # Valid min (1)
    r = client.post("/generate-keys/", json={"n_qubits": 1, "shots": 128})
    assert r.status_code == 200

    # Valid normal (8)
    r = client.post("/generate-keys/", json={"n_qubits": 8, "shots": 128})
    assert r.status_code == 200

    # Valid max boundary (5000) - test schema validation without running expensive execution
    # (Schema validator test)
    from backend.routes.keys import GenerateKeysRequest
    req = GenerateKeysRequest(n_qubits=5000, shots=128)
    assert req.n_qubits == 5000

    # Max + 1 (5001) -> 422
    r = client.post("/generate-keys/", json={"n_qubits": 5001, "shots": 128})
    assert r.status_code == 422

    # Negative (-1) -> 422
    r = client.post("/generate-keys/", json={"n_qubits": -1, "shots": 128})
    assert r.status_code == 422

    # Zero (0) -> 422
    r = client.post("/generate-keys/", json={"n_qubits": 0, "shots": 128})
    assert r.status_code == 422

    # Boolean (True) -> 422
    r = client.post("/generate-keys/", json={"n_qubits": True, "shots": 128})
    assert r.status_code == 422

    # Non-numeric string -> 422
    r = client.post("/generate-keys/", json={"n_qubits": "unbounded", "shots": 128})
    assert r.status_code == 422


def test_sign_n_qubits_boundaries():
    # Valid min (1)
    r = client.post("/api/v1/signatures/sign", json={"n_qubits": 1, "shots": 128})
    assert r.status_code == 200

    # Normal (8)
    r = client.post("/api/v1/signatures/sign", json={"n_qubits": 8, "shots": 128})
    assert r.status_code == 200

    # Max (128) - schema test
    from backend.routes.signatures import SignRequest
    req = SignRequest(n_qubits=128, shots=128)
    assert req.n_qubits == 128

    # Max + 1 (129) -> 422
    r = client.post("/api/v1/signatures/sign", json={"n_qubits": 129, "shots": 128})
    assert r.status_code == 422

    # Very large (1000) -> 422
    r = client.post("/api/v1/signatures/sign", json={"n_qubits": 1000, "shots": 128})
    assert r.status_code == 422

    # Negative (-5) -> 422
    r = client.post("/api/v1/signatures/sign", json={"n_qubits": -5, "shots": 128})
    assert r.status_code == 422

    # Zero (0) -> 422
    r = client.post("/api/v1/signatures/sign", json={"n_qubits": 0, "shots": 128})
    assert r.status_code == 422

    # Boolean (True) -> 422
    r = client.post("/api/v1/signatures/sign", json={"n_qubits": True, "shots": 128})
    assert r.status_code == 422


def test_attack_sim_n_qubits_boundaries():
    # Valid min (1)
    r = client.post("/api/v1/attacks/intercept_resend", json={"params": {"n_qubits": 1}, "shots": 128})
    assert r.status_code == 200

    # Valid normal (8)
    r = client.post("/api/v1/attacks/intercept_resend", json={"params": {"n_qubits": 8}, "shots": 128})
    assert r.status_code == 200

    # Upper bound enforced (129) -> 422
    r = client.post("/api/v1/attacks/intercept_resend", json={"params": {"n_qubits": 129}, "shots": 128})
    assert r.status_code == 422

    # Massive value (50000) -> 422
    r = client.post("/api/v1/attacks/intercept_resend", json={"params": {"n_qubits": 50000}, "shots": 128})
    assert r.status_code == 422

    # Zero -> 422
    r = client.post("/api/v1/attacks/intercept_resend", json={"params": {"n_qubits": 0}, "shots": 128})
    assert r.status_code == 422

    # Negative -> 422
    r = client.post("/api/v1/attacks/intercept_resend", json={"params": {"n_qubits": -10}, "shots": 128})
    assert r.status_code == 422

    # Boolean -> 422
    r = client.post("/api/v1/attacks/intercept_resend", json={"params": {"n_qubits": False}, "shots": 128})
    assert r.status_code == 422


def test_simulate_num_qubits_boundaries():
    # Valid min (1)
    r = client.post("/api/v1/simulate", json={"num_qubits": 1, "shots": 128})
    assert r.status_code == 200

    # Max + 1 (5001) -> 422
    r = client.post("/api/v1/simulate", json={"num_qubits": 5001, "shots": 128})
    assert r.status_code == 422

    # Zero -> 422
    r = client.post("/api/v1/simulate", json={"num_qubits": 0, "shots": 128})
    assert r.status_code == 422

    # Negative -> 422
    r = client.post("/api/v1/simulate", json={"num_qubits": -2, "shots": 128})
    assert r.status_code == 422


# ===========================================================================
# 2. shots Boundaries
# ===========================================================================

def test_shots_boundaries_across_endpoints():
    endpoints = [
        ("/generate-keys/", {"n_qubits": 2}),
        ("/api/v1/signatures/sign", {"n_qubits": 2}),
        ("/api/v1/simulate", {"num_qubits": 2}),
        ("/api/v1/attacks/depolarizing", {"params": {"error_rate": 0.05}}),
    ]

    for path, base_payload in endpoints:
        # Below min (63) -> 422
        payload = {**base_payload, "shots": 63}
        r = client.post(path, json=payload)
        assert r.status_code == 422, f"Expected 422 for shots=63 on {path}"

        # Valid min (64)
        payload = {**base_payload, "shots": 64}
        r = client.post(path, json=payload)
        assert r.status_code == 200, f"Expected 200 for shots=64 on {path}"

        # Valid normal (1024)
        payload = {**base_payload, "shots": 1024}
        r = client.post(path, json=payload)
        assert r.status_code == 200, f"Expected 200 for shots=1024 on {path}"

        # Above max (8193) -> 422
        payload = {**base_payload, "shots": 8193}
        r = client.post(path, json=payload)
        assert r.status_code == 422, f"Expected 422 for shots=8193 on {path}"

        # Large (100000) -> 422
        payload = {**base_payload, "shots": 100000}
        r = client.post(path, json=payload)
        assert r.status_code == 422, f"Expected 422 for shots=100000 on {path}"

        # Negative (-100) -> 422
        payload = {**base_payload, "shots": -100}
        r = client.post(path, json=payload)
        assert r.status_code == 422, f"Expected 422 for shots=-100 on {path}"

        # Boolean (True) -> 422
        payload = {**base_payload, "shots": True}
        r = client.post(path, json=payload)
        assert r.status_code == 422, f"Expected 422 for shots=True on {path}"


# ===========================================================================
# 3. Oversized Messages
# ===========================================================================

def test_oversized_message_rejection():
    oversized_msg = "A" * 70000  # Exceeds max_length=65536

    # /signatures/sign
    r = client.post("/api/v1/signatures/sign", json={"message": oversized_msg, "n_qubits": 2})
    assert r.status_code == 422

    # /signatures/verify
    r = client.post("/api/v1/signatures/verify", json={
        "signature": {
            "message": oversized_msg,
            "message_hash": "a" * 64,
            "session_id": "test-session",
            "measurement_outcomes": [0, 1],
            "correction_bits": [[0, 0], [1, 1]],
        },
        "message": oversized_msg,
    })
    assert r.status_code == 422


# ===========================================================================
# 4. Oversized Arrays
# ===========================================================================

def test_oversized_arrays_in_signature_and_measurement():
    oversized_list = [0] * 5001  # Exceeds max_length=5000

    # /signatures/verify with oversized outcomes
    r = client.post("/api/v1/signatures/verify", json={
        "signature": {
            "message": "test",
            "message_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "session_id": "test-session",
            "measurement_outcomes": oversized_list,
            "correction_bits": [[0, 0]] * 5001,
        }
    })
    assert r.status_code == 422

    # /detect with oversized sent_bits
    r = client.post("/api/v1/detect", json={
        "measurement_data": {
            "measurement_counts": {"00": 500, "11": 500},
            "fidelity": 0.99,
            "sent_bits": oversized_list,
            "received_bits": oversized_list,
        }
    })
    assert r.status_code == 422


# ===========================================================================
# 5. Oversized Measurement Counts & Distributions
# ===========================================================================

def test_oversized_measurement_counts_and_keys():
    # Exceeding maximum state count (257 states > 256)
    bloated_counts = {f"state_{i:04d}": 1 for i in range(257)}
    r = client.post("/api/v1/detect", json={
        "measurement_data": {
            "measurement_counts": bloated_counts,
            "fidelity": 0.95,
        }
    })
    assert r.status_code == 422

    # Exceeding maximum key string length (> 64 chars)
    long_key = "0" * 65
    r = client.post("/api/v1/detect", json={
        "measurement_data": {
            "measurement_counts": {long_key: 100},
            "fidelity": 0.95,
        }
    })
    assert r.status_code == 422


# ===========================================================================
# 6. Invalid Numeric Values (NaN, Inf, Null, Booleans)
# ===========================================================================

def test_invalid_numeric_values():
    # Fidelity cannot be boolean
    r = client.post("/api/v1/detect", json={
        "measurement_data": {
            "measurement_counts": {"00": 500, "11": 500},
            "fidelity": True,
        }
    })
    assert r.status_code == 422

    # Fidelity cannot be negative or > 1.0
    r = client.post("/api/v1/detect", json={
        "measurement_data": {
            "measurement_counts": {"00": 500, "11": 500},
            "fidelity": -0.5,
        }
    })
    assert r.status_code == 422

    r = client.post("/api/v1/detect", json={
        "measurement_data": {
            "measurement_counts": {"00": 500, "11": 500},
            "fidelity": 1.5,
        }
    })
    assert r.status_code == 422


# ===========================================================================
# 7. Invalid Enums & Attack Types
# ===========================================================================

def test_invalid_enums_and_attack_types():
    # Unknown attack type in /attacks/{attack_type}
    r = client.post("/api/v1/attacks/unknown_quantum_hack", json={"shots": 128})
    assert r.status_code == 400
    assert "Unknown attack type" in r.json()["detail"]

    # "none" attack type in /attacks/none is rejected (NONE is for simulation baseline, not active attack endpoint)
    r = client.post("/api/v1/attacks/none", json={"shots": 128})
    assert r.status_code == 400

    # Invalid attack_type enum in /simulate
    r = client.post("/api/v1/simulate", json={"attack_type": "quantum_supremacy_exploit", "shots": 128})
    assert r.status_code == 422


# ===========================================================================
# 8. Concurrent Safe Requests
# ===========================================================================

def test_concurrent_safe_requests():
    """Verify that multiple concurrent requests do not cause SQLite locking,
    corrupted ledger state, thread starvation, or HTTP 500 errors."""
    def run_key_gen():
        return client.post("/generate-keys/", json={"n_qubits": 2, "shots": 128})

    def run_signing():
        return client.post("/api/v1/signatures/sign", json={"message": "Concurrent Test", "n_qubits": 2, "shots": 128})

    def run_detection():
        return client.post("/api/v1/detect", json={
            "measurement_data": {
                "measurement_counts": {"00": 64, "11": 64},
                "fidelity": 0.99,
            }
        })

    def run_attack():
        return client.post("/api/v1/attacks/intercept_resend", json={"params": {"n_qubits": 2}, "shots": 128})

    tasks = (
        [run_key_gen] * 5 +
        [run_signing] * 5 +
        [run_detection] * 5 +
        [run_attack] * 5
    )

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(t) for t in tasks]
        results = [f.result() for f in futures]

    for resp in results:
        assert resp.status_code == 200, f"Concurrent request failed: {resp.status_code} {resp.text}"

    # Verify audit ledger is intact
    v = ledger.verify_chain()
    assert v["valid"] is True, f"Ledger corrupted after concurrent writes: {v}"


# ===========================================================================
# 9. Audit Writes & Rejection Non-Proliferation
# ===========================================================================

def test_rejected_requests_do_not_bloat_audit_ledger():
    """Verify that invalid/malformed requests that are rejected (400/422)
    do not write records to the persistent SQLite audit ledger."""
    initial_count = len(ledger.get_records())

    # Send 10 malformed requests
    for i in range(10):
        client.post("/generate-keys/", json={"n_qubits": -1})
        client.post("/api/v1/signatures/sign", json={"n_qubits": 9999})
        client.post("/api/v1/attacks/invalid_attack", json={})
        client.post("/api/v1/detect", json={"measurement_data": {"measurement_counts": {}}})

    final_count = len(ledger.get_records())
    assert final_count == initial_count, "Rejected requests must not create audit ledger entries."


# ===========================================================================
# 10. HTTP Error Sanitization
# ===========================================================================

def test_error_response_sanitization():
    """Verify that error messages do not leak internal filesystem paths,
    stack traces, or internal secrets."""
    # Test path traversal / malformed path in attacks
    r = client.post("/api/v1/attacks/../../etc/passwd", json={})
    assert r.status_code in (400, 404)
    resp_text = r.text
    assert "Traceback" not in resp_text
    assert "C:\\" not in resp_text
    assert "secret" not in resp_text.lower() or "qds_integrity_secret" not in resp_text.lower()


# ===========================================================================
# 11. No Ledger Corruption
# ===========================================================================

def test_audit_ledger_integrity_endpoint():
    r = client.get("/api/v1/audit-ledger/verify")
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is True
    assert data["records_checked"] >= 0
    assert data["error"] is None


# ===========================================================================
# 12. No 500 Responses on Abusive Requests
# ===========================================================================

def test_no_500_on_abusive_edge_cases():
    """Test boundary and abusive payloads across all endpoints to ensure
    graceful 400/422 handling with zero unhandled 500 errors."""
    abusive_payloads = [
        ("/generate-keys/", {"n_qubits": 0}),
        ("/generate-keys/", {"shots": 100000000}),
        ("/api/v1/signatures/sign", {"n_qubits": -10}),
        ("/api/v1/signatures/sign", {"message": "A" * 70000}),
        ("/api/v1/simulate", {"num_qubits": -5}),
        ("/api/v1/simulate", {"attack_type": "invalid"}),
        ("/api/v1/attacks/intercept_resend", {"params": {"n_qubits": 500}}),
        ("/api/v1/attacks/depolarizing", {"params": {"error_rate": -1.0}}),
        ("/api/v1/detect", {"measurement_data": {"measurement_counts": {}, "fidelity": 0.5}}),
        ("/api/v1/detect", {"measurement_data": {"measurement_counts": {"00": 10}, "fidelity": 2.0}}),
    ]

    for path, payload in abusive_payloads:
        r = client.post(path, json=payload)
        assert r.status_code in (400, 422), (
            f"Endpoint {path} returned {r.status_code} instead of 400/422 on payload {payload}"
        )
        assert r.status_code != 500, f"Endpoint {path} crashed with HTTP 500 on payload {payload}"
