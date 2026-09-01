"""
test_detection_engine.py
========================
Unit tests for the detection_engine package.

Covers:
  - QBER computation (statistics)
  - Chi-squared test (statistics)
  - Threshold classifications (thresholds)
  - Confidence score computation (thresholds)
  - Full threat assessment pipeline (detector)
"""

import pytest

# TODO: from detection_engine.statistics import (
#     compute_qber, chi_squared_test, compute_excess_error, summarise_measurement_data
# )
# TODO: from detection_engine.thresholds import (
#     classify_qber, classify_chi2, classify_fidelity, compute_confidence_score
# )
# TODO: from detection_engine.detector import detect_threat, full_threat_assessment

# ---------------------------------------------------------------------------
# statistics
# ---------------------------------------------------------------------------

def test_compute_qber_zero_for_perfect_channel():
    """QBER should be 0.0 when all measurement outcomes are correct."""
    # TODO: counts = {"00": 1024}
    # TODO: assert compute_qber(counts, n_shots=1024) == 0.0
    pytest.skip("statistics not yet implemented")


def test_compute_qber_intercept_resend_bound():
    """QBER for intercept-resend should converge to ~0.25."""
    # TODO: counts = {"00": 750, "11": 250}  # ~25% error
    # TODO: qber = compute_qber(counts, n_shots=1000)
    # TODO: assert 0.20 <= qber <= 0.30
    pytest.skip("statistics not yet implemented")


def test_chi_squared_uniform_distribution():
    """χ² test on a perfectly uniform distribution should not reject the null."""
    # TODO: observed  = {"00": 256, "01": 256, "10": 256, "11": 256}
    # TODO: expected  = {"00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25}
    # TODO: result = chi_squared_test(observed, expected)
    # TODO: assert result["reject_null"] is False
    pytest.skip("statistics not yet implemented")


def test_chi_squared_skewed_distribution():
    """χ² test on a heavily skewed distribution should reject the null."""
    # TODO: observed = {"00": 950, "01": 10, "10": 30, "11": 10}
    # TODO: expected = {"00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25}
    # TODO: result = chi_squared_test(observed, expected)
    # TODO: assert result["reject_null"] is True
    pytest.skip("statistics not yet implemented")


def test_compute_excess_error_positive_for_attack():
    """Excess error above baseline should be positive for attack QBER."""
    # TODO: assert compute_excess_error(qber=0.25, noise_baseline=0.01) > 0
    pytest.skip("statistics not yet implemented")


# ---------------------------------------------------------------------------
# thresholds
# ---------------------------------------------------------------------------

def test_classify_qber_secure():
    # TODO: assert classify_qber(0.03) == "SECURE"
    pytest.skip("thresholds not yet implemented")


def test_classify_qber_warning():
    # TODO: assert classify_qber(0.08) == "WARNING"
    pytest.skip("thresholds not yet implemented")


def test_classify_qber_compromised():
    # TODO: assert classify_qber(0.15) == "COMPROMISED"
    pytest.skip("thresholds not yet implemented")


def test_confidence_score_range():
    """Confidence score should always be in [0.0, 1.0]."""
    # TODO: score = compute_confidence_score(qber=0.2, p_value=0.01, fidelity=0.75)
    # TODO: assert 0.0 <= score <= 1.0
    pytest.skip("thresholds not yet implemented")


# ---------------------------------------------------------------------------
# detector
# ---------------------------------------------------------------------------

def test_detect_threat_returns_tuple():
    """detect_threat should return a (bool, float) tuple."""
    # TODO: measurement_data = {
    #     "measurement_counts": {"00": 900, "11": 100},
    #     "n_shots": 1000,
    #     "fidelity": 0.85,
    # }
    # TODO: is_malicious, confidence = detect_threat(measurement_data)
    # TODO: assert isinstance(is_malicious, bool)
    # TODO: assert 0.0 <= confidence <= 1.0
    pytest.skip("detector not yet implemented")


def test_full_threat_assessment_keys():
    """full_threat_assessment should return all required keys."""
    # TODO: expected_keys = {
    #     "is_malicious", "confidence_score", "qber", "chi2_stat", "p_value",
    #     "fidelity", "qber_classification", "chi2_classification",
    #     "fidelity_classification", "recommended_action",
    # }
    # TODO: result = full_threat_assessment({...})
    # TODO: assert expected_keys.issubset(result.keys())
    pytest.skip("detector not yet implemented")
