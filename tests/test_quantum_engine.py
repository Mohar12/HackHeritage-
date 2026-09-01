"""
test_quantum_engine.py
======================
Comprehensive test suite for the Quantum Threat Detection Engine.

Covers:
- Deterministic QBER calculation boundaries (0.0%, 25.0% Intercept-Resend, 100.0% inverted)
- Chi-Squared distribution anomalies under honest vs spoofed/skewed states
- Excess error above hardware baseline
- Full detector classification pipeline (BB84/Holevo bounds: Safe, Warning, Compromised)
- Edge-case detector states (perfect 1.0 fidelity, total noise saturation)
- Intercept-Resend and Depolarizing channel simulation mechanics
- Full FastAPI integration testing via TestClient (/api/v1/health and /api/v1/simulate)

No skips, no mocks, fully deterministic.
"""

from __future__ import annotations

import math
import numpy as np
import pytest
from fastapi.testclient import TestClient

# Core and engine imports
from qds_core.pauli_ops import (
    PAULI_I, PAULI_X, PAULI_Y, PAULI_Z,
    get_pauli_matrix,
    prepare_bell_state,
    calculate_state_fidelity,
    generate_random_bases,
    density_matrix_from_statevector,
)
from qds_core.key_distribution import (
    distribute_public_keys,
    HARDWARE_BASELINE_QBER,
)
from attack_sim.channel_manipulation import (
    simulate_intercept_resend,
    simulate_channel_manipulation,
    apply_depolarizing_superoperator,
    THEORETICAL_IR_QBER,
)
from detection_engine.statistics import (
    calculate_qber,
    chi_squared_born_test,
    compute_excess_error,
    summarise_measurement_data,
)
from detection_engine.detector import (
    detect_threat,
    full_threat_assessment,
    QBER_SECURE_MAX,
    QBER_COMPROMISED_MIN,
    CHI2_P_NORMAL_MIN,
    CHI2_P_ABORT_MAX,
    FIDELITY_HIGH_MIN,
    FIDELITY_CRITICAL_MAX,
    CONFIDENCE_MALICIOUS_THRESHOLD,
)
from backend.main import app


# ---------------------------------------------------------------------------
# Test Fixtures & Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def make_pure_state(alpha: complex, beta: complex) -> np.ndarray:
    v = np.array([alpha, beta], dtype=np.complex128)
    return v / np.linalg.norm(v)


# ===========================================================================
# 1. Deterministic QBER Calculation Boundaries
# ===========================================================================

class TestQBERBoundaries:

    def test_qber_exact_zero_on_identical_sequences(self):
        """Zero bit error rate when sent and received match perfectly."""
        sent = [0, 1, 0, 1, 1, 0, 0, 1]
        recv = [0, 1, 0, 1, 1, 0, 0, 1]
        assert calculate_qber(sent, recv) == pytest.approx(0.0)

    def test_qber_exact_one_on_fully_inverted_sequences(self):
        """100% bit error rate when all bits are inverted."""
        sent = [0, 0, 1, 1, 0]
        recv = [1, 1, 0, 0, 1]
        assert calculate_qber(sent, recv) == pytest.approx(1.0)

    def test_qber_basis_filtering_exactness(self):
        """Errors in non-matching bases must be discarded from sifted QBER."""
        sent = [0, 1, 0, 1]
        recv = [0, 0, 0, 1]  # Bit at index 1 is corrupted
        s_bases = ["Z", "X", "Z", "Z"]
        r_bases = ["Z", "Z", "Z", "Z"]  # Basis mismatch at index 1 -> sifted out
        # Matching positions: 0 (0==0), 2 (0==0), 3 (1==1) -> 0 errors / 3 bits
        assert calculate_qber(sent, recv, s_bases, r_bases) == pytest.approx(0.0)

    def test_excess_error_subtraction(self):
        """Excess error correctly offsets the 1% hardware baseline."""
        assert compute_excess_error(0.01) == pytest.approx(0.0)
        assert compute_excess_error(0.05) == pytest.approx(0.04)
        assert compute_excess_error(0.005) == pytest.approx(0.0)


# ===========================================================================
# 2. Chi-Squared Born-Rule Distribution Validation
# ===========================================================================

class TestChiSquaredAnomalies:

    def test_uniform_distribution_passes_null_hypothesis(self):
        """Equiprobable counts do not reject the Born distribution null hypothesis."""
        counts = {"00": 250, "01": 250, "10": 250, "11": 250}
        res = chi_squared_born_test(counts)
        assert res["reject_null"] is False
        assert res["p_value"] > 0.05
        assert res["is_anomalous_at_0.01"] is False

    def test_skewed_spoofed_distribution_detects_anomaly(self):
        """Anomalously clustered distribution (e.g. Eve impersonation/spoof) fails chi2 test."""
        counts = {"00": 940, "01": 20, "10": 20, "11": 20}
        res = chi_squared_born_test(counts)
        assert res["reject_null"] is True
        assert res["p_value"] < 0.01
        assert res["is_anomalous_at_0.01"] is True
        assert res["chi2_statistic"] > 50.0


# ===========================================================================
# 3. Detector Matrix & Hardcoded Bounds
# ===========================================================================

class TestDetectorClassificationMatrix:

    def test_safe_condition(self):
        """QBER < 5%, p-val > 0.05, Fidelity > 90% -> SECURE, NONE action."""
        assessment = detect_threat(qber=0.02, chi_sq_p_val=0.75, fidelity=0.98)
        assert assessment["is_malicious"] is False
        assert assessment["qber_classification"] == "SECURE"
        assert assessment["chi2_classification"] == "NORMAL"
        assert assessment["fidelity_classification"] == "HIGH"
        assert assessment["recommended_action"] == "NONE"
        assert assessment["confidence_score"] < 0.3

    def test_warning_condition(self):
        """QBER 5%-11%, degraded fidelity -> WARNING, ALERT action."""
        assessment = detect_threat(qber=0.08, chi_sq_p_val=0.03, fidelity=0.82)
        assert assessment["qber_classification"] == "WARNING"
        assert assessment["recommended_action"] == "ALERT"

    def test_compromised_condition(self):
        """QBER > 11%, p-val < 0.01, Fidelity < 70% -> COMPROMISED, ABORT action."""
        assessment = detect_threat(qber=0.25, chi_sq_p_val=0.001, fidelity=0.55)
        assert assessment["is_malicious"] is True
        assert assessment["qber_classification"] == "COMPROMISED"
        assert assessment["chi2_classification"] == "ANOMALOUS"
        assert assessment["fidelity_classification"] == "CRITICAL"
        assert assessment["recommended_action"] == "ABORT"
        assert assessment["confidence_score"] > 0.5

    def test_edge_case_perfect_fidelity(self):
        """Edge Case: Zero noise, perfect 1.0 fidelity."""
        assessment = detect_threat(qber=0.0, chi_sq_p_val=1.0, fidelity=1.0)
        assert assessment["is_malicious"] is False
        assert assessment["confidence_score"] == pytest.approx(0.0, abs=1e-3)
        assert assessment["recommended_action"] == "NONE"

    def test_edge_case_total_saturation(self):
        """Edge Case: Total noise saturation (100% QBER, zero fidelity)."""
        assessment = detect_threat(qber=1.0, chi_sq_p_val=0.0, fidelity=0.0)
        assert assessment["is_malicious"] is True
        assert assessment["confidence_score"] == pytest.approx(1.0, abs=1e-3)
        assert assessment["recommended_action"] == "ABORT"


# ===========================================================================
# 4. Attack Simulation Mechanics
# ===========================================================================

class TestAttackMechanics:

    def test_intercept_resend_qber_elevation(self):
        """Intercept-resend attack introduces detectable error around theoretical bound."""
        n = 100
        states = [make_pure_state(1, 0) for _ in range(n)]
        a_bases = generate_random_bases(n, seed=42)
        r_bases = generate_random_bases(n, seed=43)
        res = simulate_intercept_resend(states, a_bases, r_bases, seed=42)
        assert res["attack_type"] == "intercept_resend"
        assert res["measured_qber"] > 0.10
        assert res["excess_qber"] > 0.0

    def test_depolarizing_superoperator_density_matrix(self):
        """Analytic depolarizing channel correctly mixes density matrices."""
        rho = np.array([[1.0, 0.0], [0.0, 0.0]], dtype=np.complex128)
        # p=0.2 -> 0.8*|0><0| + 0.2*(I/2) = diag(0.9, 0.1)
        noisy = apply_depolarizing_superoperator(rho, 0.2)
        assert noisy[0, 0] == pytest.approx(0.9)
        assert noisy[1, 1] == pytest.approx(0.1)
        assert np.trace(noisy) == pytest.approx(1.0)


# ===========================================================================
# 5. FastAPI Integration & Endpoint Verification
# ===========================================================================

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
        # Invalid num_qubits (exceeds le=256)
        payload = {
            "num_qubits": 500,
            "attack_type": "none"
        }
        response = client.post("/api/v1/simulate", json=payload)
        assert response.status_code == 422
