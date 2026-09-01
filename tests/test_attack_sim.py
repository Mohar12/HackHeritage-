"""
test_attack_sim.py
==================
Unit and integration tests for all 4 adversarial models in the attack_sim package:
1. Intercept-Resend (Eavesdropping on flying qubits)
2. Quantum Signature Forgery (Blind guessing & state reconstruction)
3. Alice Impersonation (Spoofed identity with unentangled states)
4. Signature Replay (Session desynchronization & timestamp anomaly)
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
from attack_sim.forgery import (
    simulate_forgery,
    compute_forgery_success_rate,
)
from attack_sim.impersonation import (
    simulate_impersonation,
    measure_impersonation_detectability,
)
from attack_sim.replay import (
    capture_signature,
    simulate_replay,
    detect_replay_indicators,
)
from qds_core.pauli_ops import (
    generate_random_bases,
    PAULI_I,
    PAULI_X,
    PAULI_Z,
)
from qds_core.key_distribution import HARDWARE_BASELINE_QBER
from qds_core.signing import sign
from qds_core.verification import verify


def _z_basis_states(n: int, seed: int = 0) -> list[np.ndarray]:
    rng = np.random.default_rng(seed)
    bits = rng.integers(0, 2, size=n)
    return [
        np.array([1.0, 0.0]) if b == 0 else np.array([0.0, 1.0])
        for b in bits
    ]


# ===========================================================================
# 1. Intercept-Resend Tests
# ===========================================================================

class TestInterceptResend:

    def test_intercept_resend_structure(self):
        states = _z_basis_states(8)
        bases_a = generate_random_bases(8, seed=0)
        bases_r = generate_random_bases(8, seed=1)
        res = simulate_intercept_resend(states, bases_a, bases_r, seed=42)
        assert res["attack_type"] == "intercept_resend"
        assert len(res["eve_outcomes"]) == 8
        assert res["measured_qber"] >= 0.0

    def test_intercept_resend_physics_elevation(self):
        n = 128
        states = _z_basis_states(n, seed=99)
        bases_a = generate_random_bases(n, seed=10)
        bases_r = generate_random_bases(n, seed=11)
        res = simulate_intercept_resend(states, bases_a, bases_r, seed=42)
        assert res["measured_qber"] > 0.10
        assert res["excess_qber"] > 0.0


# ===========================================================================
# 2. Forgery Tests
# ===========================================================================

class TestForgery:

    def test_simulate_forgery_returns_tampered_signature(self):
        res = simulate_forgery(target_message="Unauthorized Wire Transfer", n_qubits=8, seed=42)
        assert res["attack_type"] == "forgery"
        assert res["attacker"] == "Eve"
        assert len(res["measurement_outcomes"]) == 8
        # Blind guessing yields high QBER (approx 0.50)
        assert res["measured_qber"] >= 0.20
        assert res["fidelity"] <= 0.60

    def test_forgery_fails_verification(self):
        forged_sig = simulate_forgery(target_message="Fake Message", n_qubits=8, seed=42)
        verdict = verify(forged_sig, message="Fake Message")
        assert verdict["is_valid"] is False

    def test_forgery_success_rate_bounded(self):
        rate = compute_forgery_success_rate(n_trials=500, n_qubits=8)
        # 2^(-8) = 0.0039 -> empirical should be <= 0.02
        assert rate <= 0.05


# ===========================================================================
# 3. Impersonation Tests
# ===========================================================================

class TestImpersonation:

    def test_simulate_impersonation_structure(self):
        res = simulate_impersonation(target_message="Spoofed Admin Delegation", n_qubits=8, seed=77)
        assert res["attack_type"] == "impersonation"
        assert res["impersonator"] == "Eve"
        assert res["measured_qber"] > 0.11
        assert res["fidelity"] < 0.70

    def test_impersonation_detectability_metrics(self):
        res = measure_impersonation_detectability(n_trials=20)
        assert res["average_qber"] > 0.11
        assert res["fraction_valid_looking"] == 0.0


# ===========================================================================
# 4. Replay Tests
# ===========================================================================

class TestReplay:

    def test_capture_and_replay_lifecycle(self):
        sig = sign("Original Legitimate Message", n_qubits=8, seed=42)
        captured = capture_signature(sig)
        assert "captured_at_timestamp" in captured
        assert captured["original_session_id"] == sig["session_id"]

        replayed = simulate_replay(captured, new_session_id="new-session-target-999")
        assert replayed["attack_type"] == "replay"
        assert replayed["session_id"] == "new-session-target-999"

    def test_replayed_signature_fails_session_verification(self):
        sig = sign("Original Legitimate Message", n_qubits=8, seed=42)
        captured = capture_signature(sig)
        replayed = simulate_replay(captured, new_session_id="new-session-target-999")
        
        # Verifying replayed packet in new session context must fail
        pub_key = {"session_id": "new-session-target-999"}
        verdict = verify(replayed["replayed_signature"], public_key=pub_key, message="Original Legitimate Message")
        assert verdict["session_valid"] is False
        assert verdict["is_valid"] is False

    def test_detect_replay_indicators(self):
        sig = {"session_id": "session-A", "replayed": True}
        indicators = detect_replay_indicators(sig)
        assert indicators["is_suspected_replay"] is True
