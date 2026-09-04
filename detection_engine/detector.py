"""
detector.py
===========
Purpose: Master threat detection pipeline for the QDS Threat Detection Framework.
"""

from __future__ import annotations

import math
from typing import Any

from detection_engine.statistics import (
    calculate_qber,
    chi_squared_born_test,
    compute_excess_error,
    summarise_measurement_data,
)

from detection_engine.thresholds import (
    QBER_SECURE_MAX,
    QBER_COMPROMISED_MIN,
    CHI2_P_NORMAL_MIN,
    CHI2_P_ABORT_MAX,
    FIDELITY_HIGH_MIN,
    FIDELITY_CRITICAL_MAX,
    CONFIDENCE_MALICIOUS_THRESHOLD,
    W_QBER,
    W_CHI2,
    W_FIDELITY,
    _sigmoid,
    classify_qber,
    classify_chi2,
    classify_fidelity,
    derive_recommended_action,
    compute_confidence_score,
    _classify_qber,
    _classify_chi2,
    _classify_fidelity,
    _derive_recommended_action,
    _compute_confidence_score,
)


def detect_threat(
    qber: float,
    chi_sq_p_val: float,
    fidelity: float,
) -> dict[str, Any]:
    for name, val in [("qber", qber), ("chi_sq_p_val", chi_sq_p_val), ("fidelity", fidelity)]:
        if math.isnan(val) or not (0.0 <= val <= 1.0):
            raise ValueError(f"'{name}' must be in [0.0, 1.0]. Got {val}.")

    qber_class     = _classify_qber(qber)
    chi2_class     = _classify_chi2(chi_sq_p_val)
    fidelity_class = _classify_fidelity(fidelity)

    confidence_score = _compute_confidence_score(qber, chi_sq_p_val, fidelity)
    is_malicious: bool = confidence_score > CONFIDENCE_MALICIOUS_THRESHOLD
    recommended_action = _derive_recommended_action(qber_class, chi2_class, fidelity_class)
    excess_qber = compute_excess_error(qber)

    return {
        "is_malicious":            is_malicious,
        "confidence_score":        round(confidence_score, 6),
        "qber":                    round(qber, 6),
        "chi2_p_value":            round(chi_sq_p_val, 6),
        "fidelity":                round(fidelity, 6),
        "excess_qber":             round(excess_qber, 6),
        "qber_classification":     qber_class,
        "chi2_classification":     chi2_class,
        "fidelity_classification": fidelity_class,
        "recommended_action":      recommended_action,
        "thresholds": {
            "qber_secure_max":        QBER_SECURE_MAX,
            "qber_compromised_min":   QBER_COMPROMISED_MIN,
            "chi2_p_normal_min":      CHI2_P_NORMAL_MIN,
            "chi2_p_abort_max":       CHI2_P_ABORT_MAX,
            "fidelity_high_min":      FIDELITY_HIGH_MIN,
            "fidelity_critical_max":  FIDELITY_CRITICAL_MAX,
            "confidence_threshold":   CONFIDENCE_MALICIOUS_THRESHOLD,
        },
    }


def full_threat_assessment(measurement_data: dict[str, Any]) -> dict[str, Any]:
    if "measurement_counts" not in measurement_data:
        raise KeyError("measurement_data must contain 'measurement_counts'")
    if "fidelity" not in measurement_data:
        raise KeyError("measurement_data must contain 'fidelity'")

    counts: dict[str, int] = measurement_data["measurement_counts"]
    fidelity: float = float(measurement_data["fidelity"])

    sent_bits     = measurement_data.get("sent_bits")
    received_bits = measurement_data.get("received_bits")
    sent_bases    = measurement_data.get("sent_bases")
    received_bases = measurement_data.get("received_bases")
    expected_dist  = measurement_data.get("expected_distribution")

    stats = summarise_measurement_data(
        observed_counts=counts,
        sent_bits=sent_bits,
        received_bits=received_bits,
        sent_bases=sent_bases,
        received_bases=received_bases,
        expected_distribution=expected_dist,
    )

    qber = measurement_data.get("measured_qber", stats["qber"])
    chi2_p_val = stats["chi2_result"]["p_value"]

    assessment = detect_threat(
        qber=qber,
        chi_sq_p_val=chi2_p_val,
        fidelity=fidelity,
    )

    assessment["statistics_summary"] = stats
    return assessment
