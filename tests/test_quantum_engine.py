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

    def test_simulate_validation_error(self, client: TestClient):
        payload = {
            "num_qubits": 500,
            "attack_type": "none"
        }
        response = client.post("/api/v1/simulate", json=payload)
        assert response.status_code == 422

    def test_detect_endpoint_valid_payload(self, client: TestClient):
        payload = {
            "measurement_data": {
                "measurement_counts": {"00": 512, "11": 512},
                "fidelity": 0.99,
                "sent_bits": [0, 1, 0, 1],
                "received_bits": [0, 1, 0, 1],
                "sent_bases": ["Z", "Z", "X", "X"],
                "received_bases": ["Z", "Z", "X", "X"],
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
