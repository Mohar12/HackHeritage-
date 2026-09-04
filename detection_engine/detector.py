"""
detector.py
===========
Purpose: Master threat detection pipeline for the QDS Threat Detection Framework.

All classification logic uses physics-derived constants and quantum statistical
decision theory bounds — no ML, no learned parameters.
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
    _DEFAULT_N_SHOTS,
    _DUNJKO_S_AUTH,
    _DUNJKO_S_VERIFY,
    _sigmoid,
    classify_qber,
    classify_chi2,
    classify_fidelity,
    derive_recommended_action,
    compute_confidence_score,
    hoeffding_confidence,
    helstrom_trace_distance,
    helstrom_distinguishability,
    forgery_probability_bound,
    nonrepudiation_probability_bound,
    _classify_qber,
    _classify_chi2,
    _classify_fidelity,
    _derive_recommended_action,
    _compute_confidence_score,
)


def compute_quantum_security_bounds(
    qber: float,
    fidelity: float,
    n_qubits: int,
    n_samples: int = _DEFAULT_N_SHOTS,
    baseline_qber: float = 0.01,
    s_auth: float = _DUNJKO_S_AUTH,
    s_verify: float = _DUNJKO_S_VERIFY,
) -> dict[str, Any]:
    """Compute all quantum security bounds for a given measurement session.

    Returns a structured dict of information-theoretically derived bounds,
    ready for inclusion in API responses and dashboard visualisation.

    Computed Bounds
    ---------------
    1. Hoeffding confidence — probability that observed excess QBER is real.
    2. Forgery probability bound — Dunjko (2014) + Gottesman-Chuang (2001).
    3. Non-repudiation bound — Dunjko (2014) Theorem 1.
    4. Helstrom distinguishability — max probability of detecting the attack.
    5. Forgery probability for each signature length 1..n_qubits (curve data).

    Parameters
    ----------
    qber : float
        Observed QBER.
    fidelity : float
        Uhlmann state fidelity.
    n_qubits : int
        Signature length.
    n_samples : int
        Number of measurement samples (for Hoeffding bound).
    baseline_qber : float
        Hardware noise floor QBER.
    s_auth : float
        Dunjko authentication threshold.
    s_verify : float
        Dunjko verification threshold.

    Returns
    -------
    dict[str, Any]
        Structured quantum security bounds.
    """
    hoeffding = hoeffding_confidence(qber, baseline_qber=baseline_qber, n_samples=n_samples)
    p_forge = forgery_probability_bound(n_qubits, s_auth=s_auth, s_verify=s_verify)
    p_repudiate = nonrepudiation_probability_bound(n_qubits, s_auth=s_auth, s_verify=s_verify)

    # Gottesman-Chuang random-guessing bound for comparison
    p_forge_gc = float(2.0 ** (-n_qubits))

    # Helstrom distinguishability: model ρ_channel vs ρ_ideal as 2×2 matrices
    # For a single qubit: ρ_observed has diagonal (1-QBER, QBER); ρ_ideal = (1,0;0,0)
    import numpy as np
    rho_observed = np.diag([1.0 - qber, qber]).astype(complex)
    rho_ideal = np.diag([fidelity, 1.0 - fidelity]).astype(complex)
    helstrom_dist = helstrom_trace_distance(rho_observed, rho_ideal)
    helstrom_p_distinguish = helstrom_distinguishability(rho_observed, rho_ideal)

    # Forgery probability curve for display (n = 1..max(n_qubits, 16))
    max_n = max(n_qubits, 16)
    forgery_curve = {
        str(n): float(2.0 ** (-n))
        for n in range(1, max_n + 1)
    }

    # Hoeffding confidence curve vs number of shots (N = 64..n_samples)
    excess = max(0.0, qber - baseline_qber)
    hoeffding_curve = {}
    if excess > 1e-12:
        for exp_n in [64, 128, 256, 512, 1024, 2048, 4096]:
            h_conf = 1.0 - math.exp(-2.0 * exp_n * excess ** 2)
            hoeffding_curve[str(exp_n)] = round(float(h_conf), 6)

    return {
        "hoeffding_confidence": round(hoeffding, 6),
        "hoeffding_formula": f"1 - exp(-2·{n_samples}·{excess:.4f}²)",
        "forgery_probability_bound": round(p_forge, 10),
        "forgery_probability_bound_gc": round(p_forge_gc, 10),
        "forgery_formula_gc": f"2^(-{n_qubits}) = {p_forge_gc:.2e}",
        "nonrepudiation_probability_bound": round(p_repudiate, 10),
        "nonrepudiation_formula": f"exp(-({s_verify}-{s_auth})²·{n_qubits}/2)",
        "helstrom_trace_distance": round(helstrom_dist, 6),
        "helstrom_p_distinguish": round(helstrom_p_distinguish, 6),
        "helstrom_formula": "P = (1 + D(ρ,σ)) / 2",
        "forgery_probability_curve": forgery_curve,
        "hoeffding_confidence_curve": hoeffding_curve,
        "n_qubits": n_qubits,
        "n_samples": n_samples,
        "s_auth": s_auth,
        "s_verify": s_verify,
        "dunjko_reference": "Dunjko et al. (2014). PRL 112, 040502. Theorem 1.",
        "gottesman_chuang_reference": "Gottesman & Chuang (2001). arXiv:quant-ph/0105032. §2.",
        "hoeffding_reference": "Hoeffding (1963). JASA 58, 13–30. Theorem 1.",
        "helstrom_reference": "Helstrom (1976). Quantum Detection and Estimation Theory.",
    }


def detect_threat(
    qber: float,
    chi_sq_p_val: float,
    fidelity: float,
    n_qubits: int = 8,
    n_samples: int = _DEFAULT_N_SHOTS,
) -> dict[str, Any]:
    """Run the deterministic threat classification pipeline.

    All inputs must be in [0.0, 1.0]. The pipeline:
    1. Validates inputs.
    2. Classifies each metric (QBER, χ², fidelity) into status labels.
    3. Computes a Hoeffding-grounded confidence score (replaces ad-hoc sigmoid).
    4. Derives recommended action.
    5. Computes all quantum security bounds (forgery, Helstrom, Hoeffding curve).

    Parameters
    ----------
    qber : float
        Observed Quantum Bit Error Rate.
    chi_sq_p_val : float
        Pearson χ² Born-test p-value.
    fidelity : float
        Uhlmann state fidelity.
    n_qubits : int
        Signature length (for quantum security bound computation).
    n_samples : int
        Number of measured qubits (for Hoeffding bound; default 1024).

    Returns
    -------
    dict[str, Any]
        Full threat assessment including:
        - is_malicious, confidence_score, recommended_action
        - qber_classification, chi2_classification, fidelity_classification
        - thresholds dict
        - quantum_security_bounds dict (new — Hoeffding, Helstrom, Dunjko)
    """
    for name, val in [("qber", qber), ("chi_sq_p_val", chi_sq_p_val), ("fidelity", fidelity)]:
        if math.isnan(val) or not (0.0 <= val <= 1.0):
            raise ValueError(f"'{name}' must be in [0.0, 1.0]. Got {val}.")

    qber_class     = _classify_qber(qber)
    chi2_class     = _classify_chi2(chi_sq_p_val)
    fidelity_class = _classify_fidelity(fidelity)

    confidence_score = _compute_confidence_score(
        qber, chi_sq_p_val, fidelity,
        n_samples=n_samples,
    )
    is_malicious: bool = confidence_score > CONFIDENCE_MALICIOUS_THRESHOLD
    recommended_action = _derive_recommended_action(qber_class, chi2_class, fidelity_class)
    excess_qber = compute_excess_error(qber)

    # Quantum security bounds (Hoeffding, Helstrom, Dunjko, Gottesman-Chuang)
    security_bounds = compute_quantum_security_bounds(
        qber=qber,
        fidelity=fidelity,
        n_qubits=n_qubits,
        n_samples=n_samples,
    )

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
        # NEW: Quantum-mechanical security bounds from information theory
        "quantum_security_bounds": security_bounds,
    }


def full_threat_assessment(measurement_data: dict[str, Any]) -> dict[str, Any]:
    """End-to-end threat assessment from raw measurement data.

    Parameters
    ----------
    measurement_data : dict[str, Any]
        Must contain 'measurement_counts' and 'fidelity'.
        Optionally: 'sent_bits', 'received_bits', 'sent_bases',
        'received_bases', 'expected_distribution', 'n_qubits'.

    Returns
    -------
    dict[str, Any]
        Full threat assessment with statistics_summary and
        quantum_security_bounds.
    """
    if "measurement_counts" not in measurement_data:
        raise KeyError("measurement_data must contain 'measurement_counts'")
    if "fidelity" not in measurement_data:
        raise KeyError("measurement_data must contain 'fidelity'")

    counts: dict[str, int] = measurement_data["measurement_counts"]
    fidelity: float = float(measurement_data["fidelity"])
    n_qubits: int = int(measurement_data.get("n_qubits", 8))

    sent_bits      = measurement_data.get("sent_bits")
    received_bits  = measurement_data.get("received_bits")
    sent_bases     = measurement_data.get("sent_bases")
    received_bases = measurement_data.get("received_bases")
    expected_dist  = measurement_data.get("expected_distribution")

    n_samples = int(sum(counts.values())) if counts else _DEFAULT_N_SHOTS

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
        n_qubits=n_qubits,
        n_samples=n_samples,
    )

    assessment["statistics_summary"] = stats
    return assessment
