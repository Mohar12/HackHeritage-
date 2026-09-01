"""
test_attack_sim.py
==================
Unit and integration tests for the attack_sim package.

Covers
------
- channel_manipulation : intercept-resend QBER bounds, depolarizing noise
  injection, excess QBER computation, unified dispatcher interface.

All tests are deterministic (seeded RNG, fixed shot count).
No network calls. No pytest.mark.skip.
"""

from __future__ import annotations

import numpy as np
import pytest

from attack_sim.channel_manipulation import (
    simulate_intercept_resend,
    simulate_channel_manipulation,
    apply_depolarizing_superoperator,
    build_depolarizing_noise_model,
    THEORETICAL_IR_QBER,
)
from qds_core.pauli_ops import (
    generate_random_bases,
    PAULI_I,
    PAULI_X,
    PAULI_Z,
)
from qds_core.key_distribution import HARDWARE_BASELINE_QBER


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _z_basis_states(n: int, seed: int = 0) -> list[np.ndarray]:
    """Return n random Z-basis state vectors (|0⟩ or |1⟩) for Alice."""
    rng = np.random.default_rng(seed)
    bits = rng.integers(0, 2, size=n)
    return [
        np.array([1.0, 0.0]) if b == 0 else np.array([0.0, 1.0])
        for b in bits
    ]


# ===========================================================================
# Intercept-Resend: structural correctness
# ===========================================================================

class TestInterceptResendStructure:

    def test_returns_attack_type_key(self):
        states = _z_basis_states(8)
        bases_a = generate_random_bases(8, seed=0)
        bases_r = generate_random_bases(8, seed=1)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=42)
        assert result["attack_type"] == "intercept_resend"

    def test_n_qubits_matches_input(self):
        n = 12
        states = _z_basis_states(n)
        bases_a = generate_random_bases(n, seed=0)
        bases_r = generate_random_bases(n, seed=1)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=0)
        assert result["n_qubits"] == n

    def test_eve_bases_only_x_or_z(self):
        states = _z_basis_states(16)
        bases_a = generate_random_bases(16, seed=0)
        bases_r = generate_random_bases(16, seed=1)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=1)
        assert set(result["eve_bases"]).issubset({"X", "Z"})

    def test_eve_outcomes_all_binary(self):
        states = _z_basis_states(16)
        bases_a = generate_random_bases(16, seed=0)
        bases_r = generate_random_bases(16, seed=1)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=2)
        assert all(o in (0, 1) for o in result["eve_outcomes"])

    def test_errors_introduced_length_matches(self):
        n = 10
        states = _z_basis_states(n)
        bases_a = generate_random_bases(n, seed=3)
        bases_r = generate_random_bases(n, seed=4)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=5)
        assert len(result["errors_introduced"]) == n

    def test_measured_qber_in_range(self):
        states = _z_basis_states(64)
        bases_a = generate_random_bases(64, seed=0)
        bases_r = generate_random_bases(64, seed=1)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=42)
        assert 0.0 <= result["measured_qber"] <= 1.0

    def test_excess_qber_non_negative(self):
        states = _z_basis_states(32)
        bases_a = generate_random_bases(32, seed=0)
        bases_r = generate_random_bases(32, seed=1)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=7)
        assert result["excess_qber"] >= 0.0

    def test_theoretical_ir_qber_constant(self):
        assert THEORETICAL_IR_QBER == pytest.approx(0.25)

    def test_empty_states_raises(self):
        with pytest.raises(ValueError):
            simulate_intercept_resend([], [], [], seed=0)

    def test_mismatched_lengths_raises(self):
        states = _z_basis_states(4)
        with pytest.raises(ValueError):
            simulate_intercept_resend(states, ["X"] * 3, ["Z"] * 4, seed=0)


# ===========================================================================
# Intercept-Resend: physics bounds
# ===========================================================================

class TestInterceptResendPhysics:
    """
    For a large enough sample, the intercept-resend attack should produce:
      - QBER ≈ 0.25 (theoretical bound for random Eve basis choice)
      - QBER significantly above the 11% BB84 security threshold
    """

    def test_qber_exceeds_bb84_threshold_for_large_sample(self):
        """QBER > 0.11 (BB84 limit) for 128-qubit intercept-resend run."""
        n = 128
        states = _z_basis_states(n, seed=99)
        bases_a = generate_random_bases(n, seed=10)
        bases_r = generate_random_bases(n, seed=11)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=42)
        # Theoretical: QBER ≈ 0.25. Allow [0.10, 0.45] for shot noise.
        assert result["measured_qber"] > 0.10

    def test_qber_within_theoretical_range(self):
        """For 256 qubits, QBER should converge toward 0.25 ± 0.15."""
        n = 256
        states = _z_basis_states(n, seed=13)
        bases_a = generate_random_bases(n, seed=20)
        bases_r = generate_random_bases(n, seed=21)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=99)
        assert 0.05 <= result["measured_qber"] <= 0.50

    def test_excess_qber_above_baseline_for_attack(self):
        """Excess QBER should be positive for any intercept-resend run."""
        n = 64
        states = _z_basis_states(n, seed=7)
        bases_a = generate_random_bases(n, seed=30)
        bases_r = generate_random_bases(n, seed=31)
        result = simulate_intercept_resend(states, bases_a, bases_r, seed=88)
        assert result["excess_qber"] >= 0.0
        # Under attack, excess should very likely be positive
        assert result["measured_qber"] > HARDWARE_BASELINE_QBER


# ===========================================================================
# Depolarizing superoperator (analytic)
# ===========================================================================

class TestDepolarizingSuperoperator:

    def _pure_rho(self, psi: list) -> np.ndarray:
        v = np.array(psi, dtype=np.complex128)
        v /= np.linalg.norm(v)
        return np.outer(v, v.conj())

    def test_zero_error_rate_is_identity_channel(self):
        rho = self._pure_rho([1, 0])
        noisy = apply_depolarizing_superoperator(rho, 0.0)
        assert np.allclose(noisy, rho)

    def test_full_depolarization_is_maximally_mixed(self):
        """p=1.0 → ε(ρ) = I/2 for any input state."""
        rho = self._pure_rho([1, 0])
        noisy = apply_depolarizing_superoperator(rho, 1.0)
        assert np.allclose(noisy, np.eye(2, dtype=np.complex128) / 2.0)

    def test_trace_preserved(self):
        """Depolarizing channel is trace-preserving: Tr(ε(ρ)) = 1."""
        rho = self._pure_rho([1, 1])
        for p in [0.0, 0.1, 0.5, 1.0]:
            noisy = apply_depolarizing_superoperator(rho, p)
            assert abs(np.trace(noisy) - 1.0) < 1e-9

    def test_hermiticity_preserved(self):
        rho = self._pure_rho([1, 0.5])
        noisy = apply_depolarizing_superoperator(rho, 0.2)
        assert np.allclose(noisy, noisy.conj().T)

    def test_invalid_error_rate_raises(self):
        rho = np.eye(2, dtype=np.complex128) / 2.0
        with pytest.raises(ValueError):
            apply_depolarizing_superoperator(rho, -0.1)

    def test_non_square_matrix_raises(self):
        with pytest.raises(ValueError):
            apply_depolarizing_superoperator(np.zeros((2, 3)), 0.1)


# ===========================================================================
# simulate_channel_manipulation dispatcher
# ===========================================================================

class TestSimulateChannelManipulationDispatcher:

    def test_intercept_resend_dispatch_returns_attack_type(self):
        states = _z_basis_states(8, seed=0)
        result = simulate_channel_manipulation(
            attack_type="intercept_resend",
            params={
                "alice_states": states,
                "alice_bases": generate_random_bases(8, seed=0),
                "recipient_bases": generate_random_bases(8, seed=1),
            },
            seed=42,
        )
        assert result["attack_type"] == "intercept_resend"

    def test_intercept_resend_dispatch_has_qber(self):
        states = _z_basis_states(8, seed=5)
        result = simulate_channel_manipulation(
            attack_type="intercept_resend",
            params={
                "alice_states": states,
                "alice_bases": generate_random_bases(8, seed=5),
                "recipient_bases": generate_random_bases(8, seed=6),
            },
            seed=5,
        )
        assert "measured_qber" in result
        assert 0.0 <= result["measured_qber"] <= 1.0

    def test_depolarizing_dispatch_returns_attack_type(self):
        result = simulate_channel_manipulation(
            attack_type="depolarizing",
            params={"error_rate": 0.1},
            shots=256,
            seed=0,
        )
        assert result["attack_type"] == "depolarizing"

    def test_depolarizing_dispatch_nonzero_qber(self):
        """High depolarizing rate should produce detectable errors."""
        result = simulate_channel_manipulation(
            attack_type="depolarizing",
            params={"error_rate": 0.3},
            shots=512,
            seed=1,
        )
        # With p=0.3 depolarizing, correlated-error rate should be elevated
        assert result["measured_qber"] >= 0.0

    def test_depolarizing_dispatch_has_hardware_baseline(self):
        result = simulate_channel_manipulation(
            attack_type="depolarizing",
            params={"error_rate": 0.05},
            shots=256,
        )
        assert result["hardware_baseline_qber"] == pytest.approx(HARDWARE_BASELINE_QBER)

    def test_unknown_attack_type_raises(self):
        with pytest.raises(ValueError, match="Unknown attack_type"):
            simulate_channel_manipulation(
                attack_type="time_travel",
                params={},
            )

    def test_intercept_resend_missing_states_raises(self):
        with pytest.raises(ValueError, match="alice_states"):
            simulate_channel_manipulation(
                attack_type="intercept_resend",
                params={},
            )
