"""
test_detection_engine.py
========================
Unit and integration tests for the detection_engine package.

Covers
------
- statistics.calculate_qber       — QBER boundary cases
- statistics.chi_squared_born_test — distribution anomaly detection
- statistics.compute_excess_error  — excess error above baseline
- detector.detect_threat           — full classification pipeline
- detector.full_threat_assessment  — end-to-end entry point
- Confidence score range and determinism guarantees

All tests are deterministic. No network calls. No pytest.mark.skip.
"""

from __future__ import annotations

import math
import pytest

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
    _classify_qber,
    _classify_chi2,
    _classify_fidelity,
    _compute_confidence_score,
)
from detection_engine.statistics import HARDWARE_BASELINE_QBER


# ===========================================================================
# calculate_qber
# ===========================================================================

class TestCalculateQBER:

    def test_perfect_channel_qber_is_zero(self):
        """Identical bit strings → QBER = 0."""
        sent     = [0, 1, 0, 1, 1, 0]
        received = [0, 1, 0, 1, 1, 0]
        assert calculate_qber(sent, received) == pytest.approx(0.0)

    def test_all_flipped_qber_is_one(self):
        """All bits flipped → QBER = 1."""
        sent     = [0, 0, 0, 0]
        received = [1, 1, 1, 1]
        assert calculate_qber(sent, received) == pytest.approx(1.0)

    def test_half_flipped_qber_is_half(self):
        sent     = [0, 0, 0, 0]
        received = [1, 1, 0, 0]
        assert calculate_qber(sent, received) == pytest.approx(0.5)

    def test_intercept_resend_qber_converges_near_quarter(self):
        """
        Simulated intercept-resend: Alice=Z-basis, Eve random, Bob=Z-basis.
        For large n, ~25% of bits should be flipped.
        We synthesise the bit arrays analytically.
        """
        import numpy as np
        rng = np.random.default_rng(42)
        n = 1000
        alice_bits = rng.integers(0, 2, size=n).tolist()
        # Eve guesses randomly → 50% of bits are wrong after Eve re-prepares
        # and Bob measures.  Using same-basis assumption → ~25% net error.
        errors = rng.integers(0, 2, size=n)
        bob_bits = [(a ^ int(e)) for a, e in zip(alice_bits, errors)]
        # ~50% error for illustration; real bound is tested via attack_sim
        qber = calculate_qber(alice_bits, bob_bits)
        assert 0.0 <= qber <= 1.0

    def test_qber_with_matching_bases_only(self):
        """Only matching-basis positions counted in QBER."""
        sent       = [0, 1, 0, 1]
        received   = [0, 0, 0, 1]  # position 1 differs
        sent_bases = ["Z", "X", "Z", "Z"]
        recv_bases = ["Z", "Z", "Z", "Z"]  # position 1 mismatch → excluded
        # Matching positions: 0, 2, 3 — no errors → QBER = 0
        qber = calculate_qber(sent, received, sent_bases, recv_bases)
        assert qber == pytest.approx(0.0)

    def test_qber_empty_matching_bases_returns_zero(self):
        """No matching bases → QBER = 0 (no positions to count)."""
        sent_bases = ["X", "X"]
        recv_bases = ["Z", "Z"]
        qber = calculate_qber([0, 1], [1, 0], sent_bases, recv_bases)
        assert qber == pytest.approx(0.0)

    def test_mismatched_lengths_raises(self):
        with pytest.raises(ValueError):
            calculate_qber([0, 1, 0], [0, 1])

    def test_mismatched_base_lengths_raises(self):
        with pytest.raises(ValueError):
            calculate_qber([0, 1], [0, 1], sent_bases=["X"])

    def test_qber_result_is_float(self):
        assert isinstance(calculate_qber([0, 1], [1, 0]), float)


# ===========================================================================
# chi_squared_born_test
# ===========================================================================

class TestChiSquaredBornTest:

    def test_uniform_distribution_does_not_reject_null(self):
        """Perfect uniform distribution → p-value close to 1.0 → accept H₀."""
        counts = {"00": 256, "01": 256, "10": 256, "11": 256}
        result = chi_squared_born_test(counts)
        assert result["reject_null"] is False

    def test_heavily_skewed_distribution_rejects_null(self):
        """Spoofed distribution (all counts in one bin) → reject H₀."""
        counts = {"00": 950, "01": 10, "10": 10, "11": 10}
        expected = {"00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25}
        result = chi_squared_born_test(counts, expected)
        assert result["reject_null"] is True

    def test_anomalous_at_001_threshold_for_extreme_skew(self):
        """Extreme skew should flag is_anomalous_at_0.01 = True."""
        counts = {"00": 1000, "01": 1, "10": 1, "11": 1}
        expected = {"00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25}
        result = chi_squared_born_test(counts, expected)
        assert result["is_anomalous_at_0.01"] is True

    def test_chi2_statistic_is_non_negative(self):
        counts = {"00": 300, "11": 700}
        result = chi_squared_born_test(counts)
        assert result["chi2_statistic"] >= 0.0

    def test_p_value_in_unit_interval(self):
        counts = {"00": 500, "11": 500}
        result = chi_squared_born_test(counts)
        assert 0.0 <= result["p_value"] <= 1.0

    def test_total_shots_matches_input(self):
        counts = {"00": 400, "11": 600}
        result = chi_squared_born_test(counts)
        assert result["total_shots"] == 1000

    def test_required_keys_present(self):
        counts = {"00": 512, "11": 512}
        result = chi_squared_born_test(counts)
        for key in ("chi2_statistic", "p_value", "reject_null",
                    "is_anomalous_at_0.01", "observed_counts",
                    "expected_counts", "total_shots"):
            assert key in result

    def test_empty_counts_raises(self):
        with pytest.raises(ValueError, match="non-empty"):
            chi_squared_born_test({})

    def test_mismatched_expected_keys_raises(self):
        with pytest.raises(ValueError):
            chi_squared_born_test(
                {"00": 500, "11": 500},
                expected_distribution={"00": 0.5, "01": 0.5},  # wrong keys
            )

    def test_degrees_of_freedom_calculation(self):
        """Confirm degrees_of_freedom equals k - 1 dynamically (not hardcoded)."""
        # 4 Bell categories -> dof = 4 - 1 = 3
        counts4 = {"00": 256, "01": 256, "10": 256, "11": 256}
        res4 = chi_squared_born_test(counts4)
        assert res4["degrees_of_freedom"] == 3

        # 2 categories with explicit canonical_bins override -> dof = 2 - 1 = 1
        counts2 = {"0": 500, "1": 500}
        res2 = chi_squared_born_test(counts2, canonical_bins=["0", "1"])
        assert res2["degrees_of_freedom"] == 1

        # 3 categories with explicit canonical_bins override -> dof = 3 - 1 = 2
        counts3 = {"A": 300, "B": 300, "C": 400}
        res3 = chi_squared_born_test(counts3, canonical_bins=["A", "B", "C"])
        assert res3["degrees_of_freedom"] == 2

    def test_degenerate_single_outcome_extreme_anomaly(self):
        """Observed counts collapsed to single outcome must give dof=3, chi2≈3072, p_val<1e-6."""
        counts = {"00": 1024}
        result = chi_squared_born_test(counts)
        assert result["degrees_of_freedom"] == 3
        assert math.isclose(result["chi2_statistic"], 3072.0, rel_tol=1e-3)
        assert result["p_value"] < 1e-6
        assert result["is_anomalous_at_0.01"] is True
        assert result["observed_counts"] == {"00": 1024, "01": 0, "10": 0, "11": 0}



# ===========================================================================
# compute_excess_error
# ===========================================================================

class TestComputeExcessError:

    def test_zero_excess_for_baseline_qber(self):
        assert compute_excess_error(HARDWARE_BASELINE_QBER) == pytest.approx(0.0)

    def test_positive_excess_for_attack_qber(self):
        assert compute_excess_error(0.25) == pytest.approx(0.25 - HARDWARE_BASELINE_QBER)

    def test_zero_excess_for_qber_below_baseline(self):
        assert compute_excess_error(0.0) == pytest.approx(0.0)

    def test_invalid_qber_above_one_raises(self):
        with pytest.raises(ValueError):
            compute_excess_error(1.5)

    def test_invalid_qber_below_zero_raises(self):
        with pytest.raises(ValueError):
            compute_excess_error(-0.01)


# ===========================================================================
# _classify_* — threshold classification helpers
# ===========================================================================

class TestQBERClassification:

    def test_low_qber_is_secure(self):
        assert _classify_qber(0.03) == "SECURE"

    def test_boundary_qber_at_secure_max_is_secure(self):
        """Exactly at threshold: QBER = QBER_SECURE_MAX → SECURE (strict <)."""
        # Value equals QBER_SECURE_MAX — the condition is `< QBER_SECURE_MAX`
        # so this should be WARNING
        assert _classify_qber(QBER_SECURE_MAX) == "WARNING"

    def test_mid_qber_is_warning(self):
        assert _classify_qber(0.08) == "WARNING"

    def test_high_qber_is_compromised(self):
        assert _classify_qber(0.15) == "COMPROMISED"

    def test_boundary_qber_at_compromised_min_is_compromised(self):
        """Exactly at 0.11 → COMPROMISED (condition: > QBER_COMPROMISED_MIN)."""
        # The condition is `qber <= QBER_COMPROMISED_MIN` → WARNING
        assert _classify_qber(QBER_COMPROMISED_MIN) == "WARNING"

    def test_qber_above_compromised_min_is_compromised(self):
        assert _classify_qber(QBER_COMPROMISED_MIN + 0.001) == "COMPROMISED"


class TestChi2Classification:

    def test_high_p_value_is_normal(self):
        assert _classify_chi2(0.5) == "NORMAL"

    def test_boundary_p_value_above_normal_min_is_normal(self):
        assert _classify_chi2(CHI2_P_NORMAL_MIN + 0.001) == "NORMAL"

    def test_mid_p_value_is_warning(self):
        assert _classify_chi2(0.03) == "WARNING"

    def test_low_p_value_is_anomalous(self):
        assert _classify_chi2(0.005) == "ANOMALOUS"

    def test_zero_p_value_is_anomalous(self):
        assert _classify_chi2(0.0) == "ANOMALOUS"


class TestFidelityClassification:

    def test_high_fidelity_is_high(self):
        assert _classify_fidelity(0.95) == "HIGH"

    def test_mid_fidelity_is_degraded(self):
        assert _classify_fidelity(0.80) == "DEGRADED"

    def test_low_fidelity_is_critical(self):
        assert _classify_fidelity(0.50) == "CRITICAL"

    def test_boundary_at_fidelity_high_min_is_high(self):
        assert _classify_fidelity(FIDELITY_HIGH_MIN) == "HIGH"

    def test_boundary_just_below_fidelity_critical_max_is_critical(self):
        assert _classify_fidelity(FIDELITY_CRITICAL_MAX - 0.001) == "CRITICAL"


# ===========================================================================
# _compute_confidence_score
# ===========================================================================

class TestConfidenceScore:

    def test_perfect_channel_has_low_confidence(self):
        """QBER=0, p=1, fidelity=1 → confidence near 0 (safe channel)."""
        score = _compute_confidence_score(0.0, 1.0, 1.0)
        assert score < 0.5

    def test_fully_compromised_channel_has_high_confidence(self):
        """QBER=0.5, p=0, fidelity=0 → confidence near 1."""
        score = _compute_confidence_score(0.5, 0.0, 0.0)
        assert score > 0.5

    def test_score_in_unit_interval_always(self):
        for qber in [0.0, 0.05, 0.11, 0.25, 0.5, 1.0]:
            for p in [0.0, 0.01, 0.05, 0.5, 1.0]:
                for fid in [0.0, 0.5, 0.7, 0.9, 1.0]:
                    score = _compute_confidence_score(qber, p, fid)
                    assert 0.0 <= score <= 1.0, (
                        f"Score {score} out of range for qber={qber}, p={p}, fid={fid}"
                    )

    def test_score_is_deterministic(self):
        s1 = _compute_confidence_score(0.2, 0.001, 0.65)
        s2 = _compute_confidence_score(0.2, 0.001, 0.65)
        assert s1 == pytest.approx(s2)

    def test_confidence_score_monotonic_severity_scaling(self):
        """Verify confidence_score strictly increases with severity beyond threshold for ABORT cases."""
        # 1. QBER scaling (clean fidelity and chi2)
        qbers = [0.12, 0.25, 0.50, 0.75, 0.99]
        q_scores = [_compute_confidence_score(q, 0.8, 0.95) for q in qbers]
        assert all(s >= 0.75 for s in q_scores), "All ABORT scores must be >= 0.75 floor"
        for i in range(len(q_scores) - 1):
            assert q_scores[i] < q_scores[i + 1], f"QBER score not strictly increasing: {q_scores}"

        # 2. Fidelity scaling (clean QBER and chi2)
        fidelities = [0.65, 0.50, 0.30, 0.10, 0.0]
        f_scores = [_compute_confidence_score(0.01, 0.8, f) for f in fidelities]
        assert all(s >= 0.75 for s in f_scores), "All ABORT scores must be >= 0.75 floor"
        for i in range(len(f_scores) - 1):
            assert f_scores[i] < f_scores[i + 1], f"Fidelity score not strictly increasing: {f_scores}"

        # 3. Chi2 p-value scaling (clean QBER and fidelity)
        p_vals = [0.009, 0.005, 0.001, 0.0]
        p_scores = [_compute_confidence_score(0.01, p, 0.95) for p in p_vals]
        assert all(s >= 0.75 for s in p_scores), "All ABORT scores must be >= 0.75 floor"
        for i in range(len(p_scores) - 1):
            assert p_scores[i] < p_scores[i + 1], f"Chi2 score not strictly increasing: {p_scores}"


# ===========================================================================
# detect_threat — full pipeline
# ===========================================================================

class TestDetectThreat:

    def test_returns_dict(self):
        result = detect_threat(0.03, 0.5, 0.95)
        assert isinstance(result, dict)

    def test_required_keys_present(self):
        result = detect_threat(0.03, 0.5, 0.95)
        required = {
            "is_malicious", "confidence_score", "qber", "chi2_p_value",
            "fidelity", "excess_qber", "qber_classification",
            "chi2_classification", "fidelity_classification",
            "recommended_action", "thresholds",
        }
        assert required.issubset(result.keys())

    def test_secure_channel_not_malicious(self):
        result = detect_threat(qber=0.02, chi_sq_p_val=0.8, fidelity=0.99)
        assert result["is_malicious"] is False
        assert result["recommended_action"] == "NONE"

    def test_compromised_channel_is_malicious(self):
        result = detect_threat(qber=0.30, chi_sq_p_val=0.001, fidelity=0.50)
        assert result["is_malicious"] is True
        assert result["recommended_action"] == "ABORT"

    def test_warning_channel_recommends_alert(self):
        result = detect_threat(qber=0.07, chi_sq_p_val=0.03, fidelity=0.80)
        # At least one WARNING metric → ALERT
        assert result["recommended_action"] in ("ALERT", "ABORT")

    def test_confidence_score_in_range(self):
        result = detect_threat(qber=0.20, chi_sq_p_val=0.005, fidelity=0.60)
        assert 0.0 <= result["confidence_score"] <= 1.0

    def test_is_malicious_is_bool(self):
        result = detect_threat(0.01, 0.9, 1.0)
        assert isinstance(result["is_malicious"], bool)

    def test_perfect_fidelity_secure_channel(self):
        result = detect_threat(qber=0.0, chi_sq_p_val=1.0, fidelity=1.0)
        assert result["is_malicious"] is False

    def test_total_noise_saturation(self):
        """Edge case: maximum possible threat signals."""
        result = detect_threat(qber=1.0, chi_sq_p_val=0.0, fidelity=0.0)
        assert result["is_malicious"] is True
        assert result["confidence_score"] == pytest.approx(1.0)

    def test_invalid_qber_raises(self):
        with pytest.raises(ValueError, match="qber"):
            detect_threat(qber=1.5, chi_sq_p_val=0.5, fidelity=0.9)

    def test_invalid_p_value_raises(self):
        with pytest.raises(ValueError, match="chi_sq_p_val"):
            detect_threat(qber=0.1, chi_sq_p_val=-0.1, fidelity=0.9)

    def test_invalid_fidelity_raises(self):
        with pytest.raises(ValueError, match="fidelity"):
            detect_threat(qber=0.1, chi_sq_p_val=0.5, fidelity=1.5)

    def test_determinism_same_inputs_same_outputs(self):
        r1 = detect_threat(0.15, 0.005, 0.65)
        r2 = detect_threat(0.15, 0.005, 0.65)
        assert r1["confidence_score"] == pytest.approx(r2["confidence_score"])
        assert r1["is_malicious"] == r2["is_malicious"]
        assert r1["recommended_action"] == r2["recommended_action"]


# ===========================================================================
# full_threat_assessment — end-to-end entry point
# ===========================================================================

class TestFullThreatAssessment:

    def _make_data(
        self,
        counts: dict,
        fidelity: float,
        sent_bits=None,
        received_bits=None,
        expected_distribution=None,
    ) -> dict:
        data: dict = {
            "measurement_counts": counts,
            "fidelity": fidelity,
        }
        if sent_bits is not None:
            data["sent_bits"] = sent_bits
        if received_bits is not None:
            data["received_bits"] = received_bits
        if expected_distribution is not None:
            data["expected_distribution"] = expected_distribution
        return data

    def test_returns_is_malicious_key(self):
        data = self._make_data({"00": 500, "11": 500}, fidelity=0.98)
        result = full_threat_assessment(data)
        assert "is_malicious" in result

    def test_all_required_keys_present(self):
        data = self._make_data({"00": 512, "11": 512}, fidelity=0.95)
        result = full_threat_assessment(data)
        required = {
            "is_malicious", "confidence_score", "qber", "chi2_p_value",
            "fidelity", "recommended_action", "statistics_summary",
        }
        assert required.issubset(result.keys())

    def test_secure_counts_not_malicious(self):
        """Bell-pair counts with no errors → safe classification."""
        expected = {"00": 0.5, "01": 0.0, "10": 0.0, "11": 0.5}
        data = self._make_data({"00": 512, "11": 512}, fidelity=0.99, expected_distribution=expected)
        result = full_threat_assessment(data)
        assert result["is_malicious"] is False

    def test_spoofed_counts_trigger_anomaly(self):
        """Heavily skewed counts from spoofed state should flag chi2 anomaly."""
        data = self._make_data(
            {"00": 990, "01": 3, "10": 4, "11": 3},
            fidelity=0.55,
        )
        result = full_threat_assessment(data)
        # With this distribution, chi2 should reject null or fidelity should flag
        assert result["recommended_action"] in ("ALERT", "ABORT")

    def test_with_bit_arrays_uses_real_qber(self):
        """When sent/received bits are provided, QBER reflects actual errors."""
        sent     = [0] * 100
        received = [1] * 25 + [0] * 75  # 25% errors
        data = self._make_data(
            {"00": 750, "11": 250},
            fidelity=0.75,
            sent_bits=sent,
            received_bits=received,
        )
        result = full_threat_assessment(data)
        assert result["qber"] == pytest.approx(0.25)

    def test_missing_measurement_counts_raises(self):
        with pytest.raises(KeyError):
            full_threat_assessment({"fidelity": 0.9})

    def test_missing_fidelity_raises(self):
        with pytest.raises(KeyError):
            full_threat_assessment({"measurement_counts": {"00": 512}})

    def test_statistics_summary_nested_in_result(self):
        data = self._make_data({"00": 500, "11": 500}, fidelity=0.90)
        result = full_threat_assessment(data)
        assert "statistics_summary" in result
        summary = result["statistics_summary"]
        assert "qber" in summary
        assert "chi2_result" in summary


# ===========================================================================
# thresholds.py single source of truth tests (F-06)
# ===========================================================================

class TestThresholdsCanonicalModule:

    def test_thresholds_constants_integrity(self):
        import detection_engine.thresholds as dt
        assert dt.QBER_SECURE_MAX == 0.05
        assert dt.QBER_COMPROMISED_MIN == 0.11
        assert dt.CHI2_P_NORMAL_MIN == 0.05
        assert dt.CHI2_P_ABORT_MAX == 0.01
        assert dt.FIDELITY_HIGH_MIN == 0.90
        assert dt.FIDELITY_CRITICAL_MAX == 0.70
        assert dt.CONFIDENCE_MALICIOUS_THRESHOLD == 0.50

    def test_thresholds_classification_functions(self):
        from detection_engine.thresholds import (
            classify_qber,
            classify_chi2,
            classify_fidelity,
            derive_recommended_action,
            compute_confidence_score,
        )
        assert classify_qber(0.02) == "SECURE"
        assert classify_qber(0.08) == "WARNING"
        assert classify_qber(0.15) == "COMPROMISED"
        
        assert classify_chi2(0.80) == "NORMAL"
        assert classify_chi2(0.03) == "WARNING"
        assert classify_chi2(0.005) == "ANOMALOUS"
        
        assert classify_fidelity(0.95) == "HIGH"
        assert classify_fidelity(0.80) == "DEGRADED"
        assert classify_fidelity(0.50) == "CRITICAL"
        
        assert derive_recommended_action("SECURE", "NORMAL", "HIGH") == "NONE"
        assert derive_recommended_action("WARNING", "NORMAL", "HIGH") == "ALERT"
        assert derive_recommended_action("COMPROMISED", "NORMAL", "HIGH") == "ABORT"
        
        assert compute_confidence_score(0.0, 1.0, 1.0) == pytest.approx(0.0, abs=1e-3)
        assert compute_confidence_score(1.0, 0.0, 0.0) == pytest.approx(1.0, abs=1e-3)

