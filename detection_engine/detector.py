"""
detector.py
===========
Purpose: Master threat detection pipeline for the QDS Threat Detection Framework.

This module is the single authoritative entry point for classifying quantum
measurement data as benign or adversarial. It orchestrates three statistical
signals — QBER, χ² p-value, and state fidelity — through a hardcoded
BB84/Holevo-bound classification matrix and produces a continuous confidence
score ∈ [0.0, 1.0] along with a structured threat assessment.

Classification matrix (from docs/security_analysis.md):
────────────────────────────────────────────────────────
 Condition   QBER        χ² p-value   Fidelity   Action
 SECURE      < 0.05      > 0.05       > 0.90      NONE
 WARNING     0.05–0.11   0.01–0.05    0.70–0.90   ALERT
 COMPROMISED > 0.11      < 0.01       < 0.70      ABORT
────────────────────────────────────────────────────────

Confidence Score Design
-----------------------
The confidence score is a probability-space mapping of cumulative metric
deviations from their safe thresholds:

    score_qber     = sigmoid( (qber   - QBER_SECURE_MAX)   / QBER_SCALE   )
    score_chi2     = sigmoid( (CHI2_P_WARN - p_value)       / CHI2_SCALE   )
    score_fidelity = sigmoid( (FIDELITY_SECURE_MIN - fidelity) / FID_SCALE )

    confidence_score = clip( w_q·score_q + w_c·score_c + w_f·score_f, 0, 1 )

Weights: QBER (0.45), χ² (0.30), Fidelity (0.25) — reflecting relative
         detectability power per docs/security_analysis.md attack profiles.

All logic is deterministic: identical inputs → identical outputs. No randomness.

Compliance
----------
- No ML/AI components (threat-detection-engine skill §No ML).
- Deterministic outputs (threat-detection-engine skill §Determinism).
- confidence_score ∈ [0.0, 1.0] always (threat-detection-engine skill §Confidence score).
- Imports only from detection_engine.statistics (qds-system-architect §Package boundaries).

References
----------
- Bennett & Brassard, BB84 security threshold ε = 0.11 (1984)
- Holevo, Bounds on the quantity of information (1973)
- Dunjko et al., QDS without Quantum Memory, PRL 112, 040502 (2014)
- Amiri & Andersson, Unconditionally Secure Quantum Signatures, Entropy 17 (2015)
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
# (threat-detection-engine skill §Key Metrics Reference)
# ---------------------------------------------------------------------------

#: QBER below this → SECURE channel
QBER_SECURE_MAX: float = 0.05

#: QBER above this → COMPROMISED channel (BB84 security limit)
QBER_COMPROMISED_MIN: float = 0.11

#: χ² p-value above this → distribution is NORMAL (fail to reject H₀)
CHI2_P_NORMAL_MIN: float = 0.05

#: χ² p-value below this → distribution is ANOMALOUS at ABORT threshold
CHI2_P_ABORT_MAX: float = 0.01

#: State fidelity above this → HIGH (trusted channel)
FIDELITY_HIGH_MIN: float = 0.90

#: State fidelity below this → CRITICAL (severe channel corruption)
FIDELITY_CRITICAL_MAX: float = 0.70

#: Overall confidence score above this sets is_malicious = True
CONFIDENCE_MALICIOUS_THRESHOLD: float = 0.50

# ---------------------------------------------------------------------------
# Confidence score weighting
# ---------------------------------------------------------------------------

#: Weight of QBER signal in the composite confidence score
W_QBER: float = 0.45

#: Weight of χ² signal in the composite confidence score
W_CHI2: float = 0.30

#: Weight of fidelity signal in the composite confidence score
W_FIDELITY: float = 0.25

# Sigmoid scaling parameters (controls slope of the transition region)
_QBER_SCALE: float = 0.03     # ±3% QBER drives the sigmoid
_CHI2_SCALE: float = 0.02     # ±2% p-value drives the sigmoid
_FID_SCALE: float  = 0.08     # ±8% fidelity drives the sigmoid


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sigmoid(x: float) -> float:
    """Standard logistic sigmoid: σ(x) = 1 / (1 + e^{-x}).

    Maps any real number to (0, 1).  Used to map metric deviations from
    their safe-zone boundaries into a smooth probability-space score.

    Parameters
    ----------
    x : float
        Input value (metric deviation / scale factor).

    Returns
    -------
    float
        Output ∈ (0.0, 1.0).
    """
    # Clamp to avoid overflow in exp for extreme x
    x_clamped = max(-500.0, min(500.0, x))
    return 1.0 / (1.0 + math.exp(-x_clamped))


def _classify_qber(qber: float) -> str:
    """Return the QBER classification label.

    Parameters
    ----------
    qber : float
        Measured QBER ∈ [0, 1].

    Returns
    -------
    str
        ``"SECURE"`` | ``"WARNING"`` | ``"COMPROMISED"``
    """
    if qber < QBER_SECURE_MAX:
        return "SECURE"
    elif qber <= QBER_COMPROMISED_MIN:
        return "WARNING"
    else:
        return "COMPROMISED"


def _classify_chi2(p_value: float) -> str:
    """Return the χ² classification label.

    Parameters
    ----------
    p_value : float
        χ² p-value from the Born-rule goodness-of-fit test.

    Returns
    -------
    str
        ``"NORMAL"`` | ``"WARNING"`` | ``"ANOMALOUS"``
    """
    if p_value > CHI2_P_NORMAL_MIN:
        return "NORMAL"
    elif p_value >= CHI2_P_ABORT_MAX:
        return "WARNING"
    else:
        return "ANOMALOUS"


def _classify_fidelity(fidelity: float) -> str:
    """Return the state fidelity classification label.

    Parameters
    ----------
    fidelity : float
        Quantum state fidelity ∈ [0, 1].

    Returns
    -------
    str
        ``"HIGH"`` | ``"DEGRADED"`` | ``"CRITICAL"``
    """
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
    """Derive the recommended protocol action from the three metric classifications.

    Decision hierarchy (strictest condition wins):
      - Any COMPROMISED / ANOMALOUS / CRITICAL signal → ``"ABORT"``
      - Any WARNING signal → ``"ALERT"``
      - All SECURE / NORMAL / HIGH → ``"NONE"``

    Parameters
    ----------
    qber_class : str
        Output of ``_classify_qber()``.
    chi2_class : str
        Output of ``_classify_chi2()``.
    fidelity_class : str
        Output of ``_classify_fidelity()``.

    Returns
    -------
    str
        ``"NONE"`` | ``"ALERT"`` | ``"ABORT"``
    """
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
    """Compute a continuous confidence score ∈ [0.0, 1.0] for threat certainty.

    Each metric is mapped through a sigmoid centred at its safe-zone boundary:

    QBER signal:
        - Deviation = (qber - QBER_SECURE_MAX) / _QBER_SCALE
        - When qber = QBER_SECURE_MAX: sigmoid(0) = 0.5 (boundary)
        - When qber >> threshold: sigmoid → 1.0 (high confidence of attack)

    χ² signal:
        - Deviation = (CHI2_P_NORMAL_MIN - p_value) / _CHI2_SCALE
        - When p_value = CHI2_P_NORMAL_MIN: sigmoid(0) = 0.5
        - When p_value → 0: sigmoid → 1.0 (distribution strongly anomalous)

    Fidelity signal:
        - Deviation = (FIDELITY_HIGH_MIN - fidelity) / _FID_SCALE
        - When fidelity = FIDELITY_HIGH_MIN: sigmoid(0) = 0.5
        - When fidelity << threshold: sigmoid → 1.0 (severe channel degradation)

    Composite score = weighted average, then re-mapped so that the all-safe
    baseline (all three metrics exactly at their thresholds → score = 0.5 each)
    maps to a composite of W_QBER·0.5 + W_CHI2·0.5 + W_FIDELITY·0.5 = 0.5.
    The output is linearly rescaled to [0, 1] so 0.5 composite → 0.0 confidence
    (boundary), and 1.0 composite → 1.0 confidence (certain attack).

    Parameters
    ----------
    qber : float
        Measured QBER ∈ [0, 1].
    p_value : float
        χ² p-value ∈ [0, 1].
    fidelity : float
        State fidelity ∈ [0, 1].

    Returns
    -------
    float
        Confidence score ∈ [0.0, 1.0].
    """
    # Individual sigmoid scores
    s_qber     = _sigmoid((qber - QBER_SECURE_MAX) / _QBER_SCALE)
    s_chi2     = _sigmoid((CHI2_P_NORMAL_MIN - p_value) / _CHI2_SCALE)
    s_fidelity = _sigmoid((FIDELITY_HIGH_MIN - fidelity) / _FID_SCALE)

    # Weighted composite ∈ (0, 1)
    composite = W_QBER * s_qber + W_CHI2 * s_chi2 + W_FIDELITY * s_fidelity

    # Linear rescaling: composite=0.5 (all-at-boundary) → confidence=0.0
    #                   composite=1.0 (all fully compromised) → confidence=1.0
    confidence_raw = (composite - 0.5) * 2.0

    # Clamp strictly to [0.0, 1.0]
    return float(max(0.0, min(1.0, confidence_raw)))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_threat(
    qber: float,
    chi_sq_p_val: float,
    fidelity: float,
) -> dict[str, Any]:
    """Master threat detection pipeline.

    Classifies a QDS measurement session as safe, warned, or compromised
    based on three physics-derived signals, and returns a complete structured
    threat assessment.

    Parameters
    ----------
    qber : float
        Quantum Bit Error Rate ∈ [0.0, 1.0].
        Compute via ``detection_engine.statistics.calculate_qber()``.
    chi_sq_p_val : float
        p-value from the Born-rule χ² goodness-of-fit test ∈ [0.0, 1.0].
        Compute via ``detection_engine.statistics.chi_squared_born_test()``.
    fidelity : float
        Quantum state fidelity ∈ [0.0, 1.0].
        Compute via ``qds_core.pauli_ops.calculate_state_fidelity()``.

    Returns
    -------
    dict[str, Any]
        Complete threat assessment with the following keys:

        ``is_malicious``           : bool  — True if confidence_score > 0.5
        ``confidence_score``       : float — threat certainty ∈ [0.0, 1.0]
        ``qber``                   : float — input QBER (rounded)
        ``chi2_p_value``           : float — input χ² p-value (rounded)
        ``fidelity``               : float — input fidelity (rounded)
        ``excess_qber``            : float — QBER above hardware baseline
        ``qber_classification``    : str   — "SECURE" | "WARNING" | "COMPROMISED"
        ``chi2_classification``    : str   — "NORMAL" | "WARNING" | "ANOMALOUS"
        ``fidelity_classification``: str   — "HIGH" | "DEGRADED" | "CRITICAL"
        ``recommended_action``     : str   — "NONE" | "ALERT" | "ABORT"
        ``thresholds``             : dict  — all threshold constants used

    Raises
    ------
    ValueError
        If any of qber, chi_sq_p_val, or fidelity is outside [0.0, 1.0].
    """
    # ---- Input validation -------------------------------------------------
    for name, val in [("qber", qber), ("chi_sq_p_val", chi_sq_p_val), ("fidelity", fidelity)]:
        if not (0.0 <= val <= 1.0):
            raise ValueError(
                f"'{name}' must be in [0.0, 1.0]. Got {val}."
            )

    # ---- Classification ---------------------------------------------------
    qber_class     = _classify_qber(qber)
    chi2_class     = _classify_chi2(chi_sq_p_val)
    fidelity_class = _classify_fidelity(fidelity)

    # ---- Confidence score ------------------------------------------------
    confidence_score = _compute_confidence_score(qber, chi_sq_p_val, fidelity)

    # ---- Threat verdict --------------------------------------------------
    is_malicious: bool = confidence_score > CONFIDENCE_MALICIOUS_THRESHOLD

    # ---- Recommended action ----------------------------------------------
    recommended_action = _derive_recommended_action(
        qber_class, chi2_class, fidelity_class
    )

    # ---- Excess QBER -----------------------------------------------------
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
    """End-to-end threat assessment from raw measurement data.

    Accepts a measurement data dict produced by the QDS protocol or attack
    simulation and runs the full statistical pipeline, then classifies.

    Expected keys in ``measurement_data``
    -------------------------------------
    ``measurement_counts`` : dict[str, int]  — Aer count histogram (required)
    ``fidelity``           : float           — state fidelity (required)
    ``sent_bits``          : list[int]       — Alice's bits (optional for QBER)
    ``received_bits``      : list[int]       — Recipient's bits (optional for QBER)
    ``sent_bases``         : list[str]       — Alice's bases (optional)
    ``received_bases``     : list[str]       — Recipient's bases (optional)
    ``expected_distribution`` : dict[str, float] — Born distribution (optional)

    Parameters
    ----------
    measurement_data : dict[str, Any]
        Raw measurement data from a QDS protocol run or attack simulation.

    Returns
    -------
    dict[str, Any]
        The full ``detect_threat()`` output dict, augmented with:
        ``statistics_summary`` : dict — output of summarise_measurement_data()

    Raises
    ------
    KeyError
        If ``measurement_counts`` or ``fidelity`` is missing.
    ValueError
        If any metric is out of range.
    """
    # Extract required fields
    counts: dict[str, int] = measurement_data["measurement_counts"]
    fidelity: float = float(measurement_data["fidelity"])

    # Optional fields for QBER computation
    sent_bits     = measurement_data.get("sent_bits")
    received_bits = measurement_data.get("received_bits")
    sent_bases    = measurement_data.get("sent_bases")
    received_bases = measurement_data.get("received_bases")
    expected_dist  = measurement_data.get("expected_distribution")

    # Run full statistical summary
    stats = summarise_measurement_data(
        observed_counts=counts,
        sent_bits=sent_bits,
        received_bits=received_bits,
        sent_bases=sent_bases,
        received_bases=received_bases,
        expected_distribution=expected_dist,
    )

    qber        = stats["qber"]
    chi2_p_val  = stats["chi2_result"]["p_value"]

    # Run the master detection pipeline
    assessment = detect_threat(
        qber=qber,
        chi_sq_p_val=chi2_p_val,
        fidelity=fidelity,
    )

    assessment["statistics_summary"] = stats
    return assessment
