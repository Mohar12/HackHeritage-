"""
test_attack_sim.py
==================
Unit tests for the attack_sim package.

Covers:
  - Forgery: forged signature structure and success-rate bounds
  - Impersonation: fake packet structure and detectability metrics
  - Replay: capture/replay lifecycle and indicator detection
  - Channel Manipulation: noise injection and QBER estimation
"""

import pytest

# TODO: from attack_sim.forgery              import simulate_forgery, compute_forgery_success_rate
# TODO: from attack_sim.impersonation        import simulate_impersonation, measure_impersonation_detectability
# TODO: from attack_sim.replay               import capture_signature, simulate_replay, detect_replay_indicators
# TODO: from attack_sim.channel_manipulation import simulate_channel_manipulation, inject_depolarizing_noise

# ---------------------------------------------------------------------------
# forgery
# ---------------------------------------------------------------------------

def test_simulate_forgery_returns_tampered_signature():
    """simulate_forgery should return a dict with measurement_outcomes."""
    # TODO: result = simulate_forgery(public_key={}, target_message="hello")
    # TODO: assert "measurement_outcomes" in result
    pytest.skip("forgery not yet implemented")


def test_forgery_success_rate_bounded():
    """Forgery success rate for 8-qubit key should be ≤ 2^(-8) = ~0.0039."""
    # TODO: rate = compute_forgery_success_rate(n_trials=500, n_qubits=8)
    # TODO: assert rate <= 0.05  # generous bound for simulator shot noise
    pytest.skip("forgery not yet implemented")


# ---------------------------------------------------------------------------
# impersonation
# ---------------------------------------------------------------------------

def test_simulate_impersonation_returns_fake_packet():
    """simulate_impersonation should return a dict with impersonator key."""
    # TODO: result = simulate_impersonation(alice_public_key={}, n_qubits=4)
    # TODO: assert result.get("impersonator") == "Eve"
    pytest.skip("impersonation not yet implemented")


def test_impersonation_detectability_metrics():
    """measure_impersonation_detectability should return fraction and average_qber."""
    # TODO: result = measure_impersonation_detectability(n_trials=50)
    # TODO: assert "fraction_valid_looking" in result and "average_qber" in result
    pytest.skip("impersonation not yet implemented")


# ---------------------------------------------------------------------------
# replay
# ---------------------------------------------------------------------------

def test_capture_and_replay_lifecycle():
    """Captured signature should be replayable with a new session_id."""
    # TODO: sig = {"message_hash": "abc", "measurement_outcomes": [0, 1, 0]}
    # TODO: captured = capture_signature(sig)
    # TODO: replayed = simulate_replay(captured, new_session_id="session-XYZ")
    # TODO: assert replayed["session_id"] == "session-XYZ"
    pytest.skip("replay not yet implemented")


def test_detect_replay_indicators_flags_repeated_bits():
    """detect_replay_indicators should flag a replayed signature as suspicious."""
    # TODO: sig = {"measurement_outcomes": [0, 1, 0, 1, 0, 1, 0, 1], "session_id": "old"}
    # TODO: indicators = detect_replay_indicators(sig)
    # TODO: assert indicators.get("is_suspected_replay") is True
    pytest.skip("replay not yet implemented")


# ---------------------------------------------------------------------------
# channel_manipulation
# ---------------------------------------------------------------------------

def test_simulate_channel_manipulation_depolarizing():
    """Depolarizing attack should return a result with estimated_qber > 0."""
    # TODO: result = simulate_channel_manipulation("depolarizing", {"error_rate": 0.1})
    # TODO: assert result["estimated_qber"] > 0
    pytest.skip("channel_manipulation not yet implemented")


def test_simulate_intercept_resend_returns_intercepted_bits():
    """Intercept-resend attack should return intercepted_bits list."""
    # TODO: result = simulate_channel_manipulation("intercept_resend", {"intercept_qubits": [0, 1]})
    # TODO: assert "intercepted_bits" in result
    pytest.skip("channel_manipulation not yet implemented")
