"""
test_quantum_engine.py
======================
Comprehensive integration and boundary tests for the QDS quantum engine.
"""

from __future__ import annotations

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from detection_engine.detector import detect_threat
from detection_engine.statistics import (
    calculate_qber,
    compute_excess_error,
    chi_squared_born_test,
)
from qds_core.key_distribution import HARDWARE_BASELINE_QBER


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


class TestQBERBoundaries:

    def test_qber_exact_zero_on_identical_sequences(self):
        sent = [0, 1, 0, 1, 1, 0]
        recv = [0, 1, 0, 1, 1, 0]
        assert calculate_qber(sent, recv) == 0.0

    def test_qber_exact_one_on_fully_inverted_sequences(self):
        sent = [0, 0, 0, 0]
        recv = [1, 1, 1, 1]
        assert calculate_qber(sent, recv) == 1.0

    def test_qber_basis_filtering_exactness(self):
        sent = [0, 1, 0, 1]
        recv = [0, 0, 0, 1]
        s_bases = ["X", "Z", "X", "Z"]
        r_bases = ["X", "X", "X", "Z"]  # Matches at indices 0, 2, 3
        assert calculate_qber(sent, recv, s_bases, r_bases) == 0.0

    def test_excess_error_subtraction(self):
        assert compute_excess_error(0.05, 0.01) == pytest.approx(0.04)
        assert compute_excess_error(0.005, 0.01) == 0.0


class TestChiSquaredAnomalies:

    def test_uniform_distribution_passes_null_hypothesis(self):
        counts = {"00": 512, "01": 500, "10": 524, "11": 510}
        res = chi_squared_born_test(counts)
        assert res["p_value"] > 0.05
        assert res["reject_null"] is False

    def test_skewed_spoofed_distribution_detects_anomaly(self):
        counts = {"00": 2048, "01": 0, "10": 0, "11": 0}
        res = chi_squared_born_test(counts)
        assert res["p_value"] < 0.01
        assert res["is_anomalous_at_0.01"] is True


class TestDetectorClassificationMatrix:

    def test_safe_condition(self):
        res = detect_threat(qber=0.01, chi_sq_p_val=0.50, fidelity=0.99)
        assert res["qber_classification"] == "SECURE"
        assert res["chi2_classification"] == "NORMAL"
        assert res["fidelity_classification"] == "HIGH"
        assert res["recommended_action"] == "NONE"
        assert res["is_malicious"] is False

    def test_warning_condition(self):
        res = detect_threat(qber=0.08, chi_sq_p_val=0.03, fidelity=0.85)
        assert res["qber_classification"] == "WARNING"
        assert res["recommended_action"] == "ALERT"

    def test_compromised_condition(self):
        res = detect_threat(qber=0.25, chi_sq_p_val=0.001, fidelity=0.60)
        assert res["qber_classification"] == "COMPROMISED"
        assert res["recommended_action"] == "ABORT"
        assert res["is_malicious"] is True

    def test_edge_case_perfect_fidelity(self):
        res = detect_threat(qber=0.0, chi_sq_p_val=1.0, fidelity=1.0)
        assert res["confidence_score"] == pytest.approx(0.0, abs=1e-3)

    def test_edge_case_total_saturation(self):
        res = detect_threat(qber=1.0, chi_sq_p_val=0.0, fidelity=0.0)
        assert res["confidence_score"] == pytest.approx(1.0, abs=1e-3)


class TestAttackMechanics:

    def test_intercept_resend_qber_elevation(self):
        from attack_sim.channel_manipulation import simulate_intercept_resend
        from qds_core.pauli_ops import generate_random_bases
        n = 128
        states = [np.array([1.0, 0.0]) for _ in range(n)]
        bases_a = generate_random_bases(n, seed=42)
        bases_r = generate_random_bases(n, seed=43)
        res = simulate_intercept_resend(states, bases_a, bases_r, seed=99)
        assert res["measured_qber"] > 0.10

    def test_depolarizing_superoperator_density_matrix(self):
        from attack_sim.channel_manipulation import apply_depolarizing_superoperator
        rho = np.array([[1.0, 0.0], [0.0, 0.0]], dtype=np.complex128)
        rho_noisy = apply_depolarizing_superoperator(rho, error_rate=0.2)
        assert np.isclose(np.trace(rho_noisy), 1.0)


class TestFastAPIEndpoints:

    def test_health_check_operational(self, client: TestClient):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["engine_status"] == "operational"
        assert "thresholds" in data

    def test_simulate_no_attack(self, client: TestClient):
        payload = {
            "num_qubits": 8,
            "attack_type": "none",
            "shots": 256,
            "seed": 42
        }
        response = client.post("/api/v1/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["attack_type"] == "none"
        assert data["is_malicious"] is False
        assert data["classification"]["recommended_action"] == "NONE"
        assert data["fidelity"] >= 0.90
        assert "batches_executed" in data
        assert "execution_time_ms" in data

    def test_simulate_large_scale_workload(self, client: TestClient):
        payload = {
            "num_qubits": 100,
            "attack_type": "none",
            "shots": 256,
            "seed": 42
        }
        response = client.post("/api/v1/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["num_qubits"] == 100
        assert data["batches_executed"] == 8
        assert data["physical_qubits_per_circuit"] <= 28

    def test_simulate_intercept_resend_attack(self, client: TestClient):
        payload = {
            "num_qubits": 16,
            "attack_type": "intercept_resend",
            "shots": 256,
            "seed": 42
        }
        response = client.post("/api/v1/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["attack_type"] == "intercept_resend"
        assert "statistics" in data
        assert "classification" in data
        assert data["statistics"]["qber"] >= 0.0

    def test_simulate_all_attack_modes(self, client: TestClient):
        for atype in ["forgery", "impersonation", "replay", "depolarizing"]:
            payload = {
                "num_qubits": 8,
                "attack_type": atype,
                "shots": 256,
                "seed": 42
            }
            response = client.post("/api/v1/simulate", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["attack_type"] == atype
            assert "classification" in data

    def test_detect_endpoint_valid_payload(self, client: TestClient):
        payload = {
            "measurement_data": {
                "measurement_counts": {"00": 512, "11": 512},
                "fidelity": 0.99,
                "sent_bits": [0, 1, 0, 1],
                "received_bits": [0, 1, 0, 1],
                "sent_bases": ["Z", "Z", "X", "X"],
                "received_bases": ["Z", "Z", "X", "X"],
                "expected_distribution": {"00": 0.5, "01": 0.0, "10": 0.0, "11": 0.5},
            }
        }
        response = client.post("/detect/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["qber"] == 0.0
        assert data["qber_classification"] == "SECURE"
        assert data["is_malicious"] is False

    def test_detect_endpoint_rejects_integer_scalar_with_422(self, client: TestClient):
        payload = {
            "measurement_data": {
                "measurement_counts": {"00": 512, "11": 512},
                "fidelity": 0.99,
                "sent_bits": 5,
                "received_bits": [0, 1, 0, 1]
            }
        }
        response = client.post("/detect/", json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize("attack_type", ["intercept_resend", "depolarizing", "forgery", "impersonation", "replay"])
    def test_simulate_attack_all_endpoints(self, client: TestClient, attack_type: str):
        payload = {
            "params": {"n_qubits": 8},
            "shots": 256,
            "seed": 42
        }
        response = client.post(f"/simulate-attack/{attack_type}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["attack_type"] == attack_type
        assert "measurement_data" in data
        assert "fidelity" in data["measurement_data"]
        assert "measured_qber" in data["measurement_data"]

    @pytest.mark.parametrize("invalid_attack", [
        "invalid_attack_type",
        "none",
        "drop_table",
        "forgery_unknown",
        "evil_attack",
    ])
    def test_simulate_attack_invalid_type_rejected_with_400(self, client: TestClient, invalid_attack: str):
        payload = {
            "params": {"n_qubits": 8},
            "shots": 256,
            "seed": 42
        }
        response = client.post(f"/simulate-attack/{invalid_attack}", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_cors_headers_and_no_wildcard_with_credentials(self, client: TestClient):
        from backend.main import ALLOWED_ORIGINS
        assert "*" not in ALLOWED_ORIGINS
        assert "http://localhost:5173" in ALLOWED_ORIGINS
        
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            }
        )
        assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
        assert response.headers.get("access-control-allow-credentials") == "true"

    def test_verify_endpoint_rejects_malformed_signature_schema(self, client: TestClient):
        # 1. Missing required fields
        resp = client.post("/signatures/verify", json={"signature": {"bad_field": 123}})
        assert resp.status_code == 422

        # 2. Invalid measurement outcome bits (non-binary)
        resp = client.post("/signatures/verify", json={
            "signature": {
                "message_hash": "a" * 64,
                "session_id": "test-sess",
                "measurement_outcomes": [0, 5, 1],
                "correction_bits": [[0, 1], [1, 0]],
            }
        })
        assert resp.status_code == 422

        # 3. Invalid correction bits (wrong shape / non-pair)
        resp = client.post("/signatures/verify", json={
            "signature": {
                "message_hash": "a" * 64,
                "session_id": "test-sess",
                "measurement_outcomes": [0, 1],
                "correction_bits": [[0, 1, 0]],
            }
        })
        assert resp.status_code == 422

    def test_signatures_sign_and_verify_e2e_flow(self, client: TestClient):
        sign_resp = client.post("/signatures/sign", json={
            "message": "Verify Protocol Integrity",
            "n_qubits": 4,
            "shots": 256,
            "seed": 42
        })
        assert sign_resp.status_code == 200
        sign_data = sign_resp.json()
        assert "signature" in sign_data

        verify_resp = client.post("/signatures/verify", json={
            "signature": sign_data["signature"],
            "message": "Verify Protocol Integrity"
        })
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert verify_data["is_valid"] is True
        assert verify_data["message_intact"] is True

    def test_generate_keys_endpoint_success_and_error_handling(self, client: TestClient):
        resp = client.post("/generate-keys/", json={"n_qubits": 4, "shots": 256, "seed": 42})
        assert resp.status_code == 200
        data = resp.json()
        assert data["num_keys"] == 4
        assert "alice_public_key" in data


class TestAuditLedgerConcurrency:

    @pytest.mark.anyio
    async def test_concurrent_ledger_recording_integrity(self):
        import asyncio
        from backend.audit_ledger import AuditLedger
        
        test_ledger = AuditLedger()
        n_concurrent = 50

        async def worker(worker_id: int):
            return test_ledger.record_event(
                session_id=f"concurrent-sess-{worker_id}",
                event_type="VERIFICATION",
                node_id=f"Node-{worker_id}",
                qber=0.01 * (worker_id % 5),
            )

        # Launch 50 concurrent records
        records = await asyncio.gather(*(worker(i) for i in range(n_concurrent)))
        
        assert test_ledger.count() == n_concurrent
        record_ids = [r.record_id for r in test_ledger.get_records(limit=100)]
        # All IDs must be unique
        assert len(record_ids) == len(set(record_ids))
        # Complete hash chain must be verified
        assert test_ledger.verify_integrity() is True

    def test_simulation_num_qubits_bound_enforced(self, client: TestClient):
        # Above safe upper limit (>5000) must return 422 Unprocessable Entity
        payload = {
            "num_qubits": 5001,
            "attack_type": "none",
            "shots": 256,
            "seed": 42
        }
        resp = client.post("/api/v1/simulate", json=payload)
        assert resp.status_code == 422


class TestNoiseRateParameterValidation:
    """Validate noise_rate parameter scope and sensitivity."""

    def test_depolarizing_noise_rate_sensitivity(self, client: TestClient):
        """Confirm depolarizing + noise_rate=0.05 vs noise_rate=0.50 produce measurably different output."""
        res_low = client.post("/api/v1/simulate", json={
            "num_qubits": 16,
            "attack_type": "depolarizing",
            "noise_rate": 0.05,
            "shots": 256,
            "seed": 42,
        })
        assert res_low.status_code == 200
        data_low = res_low.json()

        res_high = client.post("/api/v1/simulate", json={
            "num_qubits": 16,
            "attack_type": "depolarizing",
            "noise_rate": 0.50,
            "shots": 256,
            "seed": 42,
        })
        assert res_high.status_code == 200
        data_high = res_high.json()

        assert data_low["statistics"]["qber"] != data_high["statistics"]["qber"]
        assert data_low["fidelity"] != data_high["fidelity"]
        assert data_low["statistics"]["qber"] < data_high["statistics"]["qber"]
        assert data_low["fidelity"] > data_high["fidelity"]

    @pytest.mark.parametrize("non_depol_attack", [
        "forgery",
        "impersonation",
        "intercept_resend",
        "replay",
        "none",
    ])
    def test_noise_rate_rejected_on_non_depolarizing_attacks(self, client: TestClient, non_depol_attack: str):
        """Confirm noise_rate present on non-depolarizing attacks is rejected with HTTP 422."""
        payload = {
            "num_qubits": 8,
            "attack_type": non_depol_attack,
            "noise_rate": 0.10,
            "shots": 256,
            "seed": 42,
        }
        resp = client.post("/api/v1/simulate", json=payload)
        assert resp.status_code == 422, f"Expected 422 for {non_depol_attack} with noise_rate, got {resp.status_code}"
        err_msg = resp.text
        assert "noise_rate is only a valid field when attack_type is 'depolarizing'" in err_msg





