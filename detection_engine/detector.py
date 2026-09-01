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

# ---------------------------------------------------------------------------
# Hardcoded BB84 / Holevo-bound threshold constants
# ---------------------------------------------------------------------------

QBER_SECURE_MAX: float = 0.05
QBER_COMPROMISED_MIN: float = 0.11

CHI2_P_NORMAL_MIN: float = 0.05
CHI2_P_ABORT_MAX: float = 0.01

FIDELITY_HIGH_MIN: float = 0.90
FIDELITY_CRITICAL_MAX: float = 0.70

CONFIDENCE_MALICIOUS_THRESHOLD: float = 0.50

# Confidence score weighting
W_QBER: float = 0.45
W_CHI2: float = 0.30
W_FIDELITY: float = 0.25

_QBER_SCALE: float = 0.03
_CHI2_SCALE: float = 0.02
_FID_SCALE: float  = 0.08


def _sigmoid(x: float) -> float:
    x_clamped = max(-500.0, min(500.0, x))
    return 1.0 / (1.0 + math.exp(-x_clamped))


def _classify_qber(qber: float) -> str:
    if qber < QBER_SECURE_MAX:
        return "SECURE"
    elif qber <= QBER_COMPROMISED_MIN:
        return "WARNING"
    else:
        return "COMPROMISED"


def _classify_chi2(p_value: float) -> str:
    if p_value > CHI2_P_NORMAL_MIN:
        return "NORMAL"
    elif p_value >= CHI2_P_ABORT_MAX:
        return "WARNING"
    else:
        return "ANOMALOUS"


def _classify_fidelity(fidelity: float) -> str:
    if fidelity >= FIDELITY_HIGH_MIN:
        return "HIGH"
    elif fidelity >= FIDELITY_CRITICAL_MAX:
        return "DEGRADED"
    else:
        return "CRITICAL"


def _derive_recommended_action(
    qber_class: str,
    chi2_class: str,
    fidelity_class: str,
) -> str:
    abort_signals = {"COMPROMISED", "ANOMALOUS", "CRITICAL"}
    warn_signals  = {"WARNING"}
    all_classes = {qber_class, chi2_class, fidelity_class}

    if all_classes & abort_signals:
        return "ABORT"
    if all_classes & warn_signals:
        return "ALERT"
    return "NONE"


def _compute_confidence_score(
    qber: float,
    p_value: float,
    fidelity: float,
) -> float:
    # Individual sigmoid scores
    s_qber     = _sigmoid((qber - QBER_SECURE_MAX) / _QBER_SCALE)
    s_chi2     = _sigmoid((CHI2_P_NORMAL_MIN - p_value) / _CHI2_SCALE)
    s_fidelity = _sigmoid((FIDELITY_HIGH_MIN - fidelity) / _FID_SCALE)

    # Edge cases
    if qber >= 0.99 and p_value <= 0.001 and fidelity <= 0.01:
        return 1.0
    if qber <= 0.001 and p_value >= 0.99 and fidelity >= 0.99:
        return 0.0

    # Weighted composite ∈ (0, 1)
    composite = W_QBER * s_qber + W_CHI2 * s_chi2 + W_FIDELITY * s_fidelity
    confidence_raw = (composite - 0.5) * 2.0
    return float(max(0.0, min(1.0, confidence_raw)))


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
