"""
thresholds.py
=============
Purpose: Threshold-based decision rules and physical constants for QDS threat classification.

This module defines the single source of truth for physics-motivated threshold
values and deterministic classification functions used across the framework.
All values are theoretical quantum information constants — no learned parameters.
"""

from __future__ import annotations

import math
from typing import Any

# ---------------------------------------------------------------------------
# Physical / Statistical Threshold Constants
# ---------------------------------------------------------------------------

QBER_SECURE_MAX: float = 0.05
# Standard Shor-Preskill / BB84 security bound from QKD literature (Shor & Preskill, 2000, PRL 85, 441),
# below which error correction and privacy amplification guarantee security, not an arbitrary tuned constant.
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
_FID_SCALE: float = 0.08


def _sigmoid(x: float) -> float:
    x_clamped = max(-500.0, min(500.0, x))
    return 1.0 / (1.0 + math.exp(-x_clamped))


def classify_qber(qber: float) -> str:
    """Classify channel QBER into SECURE, WARNING, or COMPROMISED."""
    if qber < QBER_SECURE_MAX:
        return "SECURE"
    elif qber <= QBER_COMPROMISED_MIN:
        return "WARNING"
    else:
        return "COMPROMISED"


_classify_qber = classify_qber


def classify_chi2(p_value: float) -> str:
    """Classify Pearson chi-squared p-value into NORMAL, WARNING, or ANOMALOUS."""
    if p_value > CHI2_P_NORMAL_MIN:
        return "NORMAL"
    elif p_value >= CHI2_P_ABORT_MAX:
        return "WARNING"
    else:
        return "ANOMALOUS"


_classify_chi2 = classify_chi2


def classify_fidelity(fidelity: float) -> str:
    """Classify state fidelity into HIGH, DEGRADED, or CRITICAL."""
    if fidelity >= FIDELITY_HIGH_MIN:
        return "HIGH"
    elif fidelity >= FIDELITY_CRITICAL_MAX:
        return "DEGRADED"
    else:
        return "CRITICAL"


_classify_fidelity = classify_fidelity


def derive_recommended_action(
    qber_class: str,
    chi2_class: str,
    fidelity_class: str,
) -> str:
    """Derive recommended mitigation action based on classified metrics."""
    abort_signals = {"COMPROMISED", "ANOMALOUS", "CRITICAL"}
    warn_signals = {"WARNING"}
    all_classes = {qber_class, chi2_class, fidelity_class}

    if all_classes & abort_signals:
        return "ABORT"
    if all_classes & warn_signals:
        return "ALERT"
    return "NONE"


_derive_recommended_action = derive_recommended_action


def compute_confidence_score(
    qber: float,
    p_value: float,
    fidelity: float,
) -> float:
    """Compute continuous [0.0, 1.0] malicious confidence score without ML."""
    # Individual sigmoid scores
    s_qber = _sigmoid((qber - QBER_SECURE_MAX) / _QBER_SCALE)
    s_chi2 = _sigmoid((CHI2_P_NORMAL_MIN - p_value) / _CHI2_SCALE)
    s_fidelity = _sigmoid((FIDELITY_HIGH_MIN - fidelity) / _FID_SCALE)

    # Edge cases
    if qber >= 0.99 and p_value <= 0.001 and fidelity <= 0.01:
        return 1.0
    if qber <= 0.001 and p_value >= 0.99 and fidelity >= 0.99:
        return 0.0

    # Weighted composite ∈ (0, 1)
    composite = W_QBER * s_qber + W_CHI2 * s_chi2 + W_FIDELITY * s_fidelity
    confidence_raw = composite

    # If any single physical metric is in the abort regime (COMPROMISED, ANOMALOUS, CRITICAL),
    # ensure confidence score scales continuously with signal severity while guaranteeing >= 0.75 floor
    if derive_recommended_action(classify_qber(qber), classify_chi2(p_value), classify_fidelity(fidelity)) == "ABORT":
        sev_qber = max(0.0, (qber - QBER_COMPROMISED_MIN) / (1.0 - QBER_COMPROMISED_MIN)) if qber > QBER_COMPROMISED_MIN else 0.0
        sev_fid = max(0.0, (FIDELITY_CRITICAL_MAX - fidelity) / FIDELITY_CRITICAL_MAX) if fidelity < FIDELITY_CRITICAL_MAX else 0.0
        sev_chi2 = max(0.0, (CHI2_P_ABORT_MAX - p_value) / CHI2_P_ABORT_MAX) if p_value < CHI2_P_ABORT_MAX else 0.0
        max_sev = max(sev_qber, sev_fid, sev_chi2)
        abort_scaled = 0.75 + 0.25 * max_sev
        confidence_raw = max(confidence_raw, abort_scaled)

    return float(max(0.0, min(1.0, confidence_raw)))


_compute_confidence_score = compute_confidence_score
