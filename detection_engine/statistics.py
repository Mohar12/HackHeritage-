"""
statistics.py
=============
Purpose: Measurement-outcome statistical analysis for the QDS threat detection engine.

Statistical Methods
-------------------
1. Pearson χ² Born-rule goodness-of-fit (scipy.stats.chisquare)
   - Tests whether observed Bell-state counts match expected Born distribution.
   - Two-sided; Cochran's rule applied (minimum 5 expected per bin).

2. One-sided Proportions Z-test (statsmodels.stats.proportion.proportions_ztest)
   - Tests H₀: QBER ≤ QBER_baseline vs H₁: QBER > QBER_baseline (one-sided).
   - More statistically correct than χ² for QBER anomaly detection because
     we only care about excess errors, not deficit.
   - Normal approximation valid for N ≥ 30 (satisfied at 1024 shots).

3. Bonferroni-corrected multi-qubit joint test (statsmodels multipletests)
   - Corrects for family-wise error rate across n independent per-qubit tests.
   - Prevents false positives in n-qubit joint hypothesis testing.

References
----------
- Pearson, K. (1900). Philosophical Magazine.
- Cochran, W.G. (1954). Biometrics 10, 417. (minimum expected count rule)
- statsmodels: Seabold, S. & Perktold, J. (2010). SciPy Proceedings.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import scipy.stats as ss
# statsmodels / scipy.stats statistical testing:
# Using scipy.stats as high-performance core engine (NumPy 2.x compatible).
_HAS_STATSMODELS = False
_sm_proportions_ztest = None
_sm_multipletests = None

HARDWARE_BASELINE_QBER: float = 0.01

CANONICAL_BINS: list[str] = ["00", "01", "10", "11"]
MIN_EXPECTED_COUNT: int = 5



def calculate_qber(
    sent_bits: list[int],
    received_bits: list[int],
    sent_bases: list[str] | None = None,
    received_bases: list[str] | None = None,
) -> float:
    if len(sent_bits) != len(received_bits):
        raise ValueError(
            f"Length mismatch: sent_bits has length {len(sent_bits)} but "
            f"received_bits has length {len(received_bits)}."
        )

    if sent_bases is not None or received_bases is not None:
        if sent_bases is None or received_bases is None:
            raise ValueError(
                "Both sent_bases and received_bases must be provided, or neither."
            )
        if len(sent_bases) != len(sent_bits) or len(received_bases) != len(received_bits):
            raise ValueError("sent_bases / received_bases lengths must match bit lengths.")

        matching_indices = [
            i for i, (sb, rb) in enumerate(zip(sent_bases, received_bases))
            if sb == rb
        ]
        if not matching_indices:
            return 0.0

        errors = sum(
            1 for i in matching_indices
            if sent_bits[i] != received_bits[i]
        )
        return float(errors / len(matching_indices))

    if not sent_bits:
        return 0.0

    errors = sum(1 for s, r in zip(sent_bits, received_bits) if s != r)
    return float(errors / len(sent_bits))


def compute_excess_error(
    measured_qber: float,
    baseline_qber: float = HARDWARE_BASELINE_QBER,
) -> float:
    if not (0.0 <= measured_qber <= 1.0):
        raise ValueError(f"measured_qber must be in [0, 1]. Got {measured_qber}.")
    if not (0.0 <= baseline_qber <= 1.0):
        raise ValueError(f"baseline_qber must be in [0, 1]. Got {baseline_qber}.")

    excess = measured_qber - baseline_qber
    return float(max(0.0, excess))


def chi_squared_born_test(
    observed_counts: dict[str, int],
    expected_distribution: dict[str, float] | None = None,
    canonical_bins: list[str] | None = None,
) -> dict[str, Any]:
    if not observed_counts:
        raise ValueError("observed_counts dict must be non-empty.")

    total_shots = sum(observed_counts.values())
    if total_shots == 0:
        raise ValueError("Sum of observed_counts is zero.")

    labels = list(canonical_bins) if canonical_bins is not None else list(CANONICAL_BINS)

    # Validate observed_counts keys are within canonical bins
    invalid_keys = set(observed_counts.keys()) - set(labels)
    if invalid_keys:
        raise ValueError(
            f"observed_counts contains keys outside canonical bins: {sorted(invalid_keys)}."
        )

    # Zero-fill across all canonical bins
    observed_counts_full = {lb: observed_counts.get(lb, 0) for lb in labels}

    if expected_distribution is None:
        n_bins = len(labels)
        expected_probs = {lb: 1.0 / n_bins for lb in labels}
    else:
        if set(expected_distribution.keys()) != set(labels):
            raise ValueError(
                "expected_distribution keys must exactly match canonical bins. "
                f"Got {set(expected_distribution.keys())} vs {set(labels)}."
            )
        total_prob = sum(expected_distribution.values())
        if abs(total_prob - 1.0) > 1e-6:
            raise ValueError(
                f"expected_distribution probabilities must sum to 1.0. "
                f"Got sum={total_prob:.6f}."
            )
        expected_probs = dict(expected_distribution)

    observed_arr = np.array([observed_counts_full[lb] for lb in labels], dtype=np.float64)
    expected_arr = np.array([expected_probs[lb] * total_shots for lb in labels], dtype=np.float64)

    # Cochran's rule: pool bins where expected count < MIN_EXPECTED_COUNT
    valid_mask = expected_arr >= MIN_EXPECTED_COUNT
    if not np.any(valid_mask):
        obs_pooled = observed_arr
        exp_pooled = expected_arr
    else:
        obs_pooled = observed_arr[valid_mask]
        exp_pooled = expected_arr[valid_mask]
        low_obs = observed_arr[~valid_mask].sum()
        low_exp = expected_arr[~valid_mask].sum()
        if low_exp > 0:
            obs_pooled = np.append(obs_pooled, low_obs)
            exp_pooled = np.append(exp_pooled, low_exp)
        elif low_obs > 0:
            # Observed counts in zero-expected-probability bins: deterministic extreme anomaly
            expected_counts_dict = {
                lb: round(expected_probs[lb] * total_shots, 4) for lb in labels
            }
            return {
                "chi2_statistic": float("inf"),
                "p_value": 0.0,
                "degrees_of_freedom": len(labels) - 1,
                "reject_null": True,
                "is_anomalous_at_0.01": True,
                "observed_counts": observed_counts_full,
                "expected_counts": expected_counts_dict,
                "total_shots": total_shots,
            }

    if len(obs_pooled) <= 1:
        chi2_stat = 0.0
        p_value = 1.0
        dof = 0
    else:
        chi2_stat, p_value = ss.chisquare(f_obs=obs_pooled, f_exp=exp_pooled)
        dof = len(obs_pooled) - 1

    if math.isnan(p_value):
        p_value = 1.0

    expected_counts_dict: dict[str, float] = {
        lb: round(expected_probs[lb] * total_shots, 4) for lb in labels
    }

    return {
        "chi2_statistic": float(chi2_stat),
        "p_value": float(p_value),
        "degrees_of_freedom": dof,
        "reject_null": bool(p_value < 0.05),
        "is_anomalous_at_0.01": bool(p_value < 0.01),
        "observed_counts": observed_counts_full,
        "expected_counts": expected_counts_dict,
        "total_shots": total_shots,
    }


def compute_shannon_entropy(counts: dict[str, int]) -> float:
    total = sum(counts.values())
    if total == 0:
        return 0.0
    probs = [cnt / total for cnt in counts.values() if cnt > 0]
    return float(-sum(p * math.log2(p) for p in probs))


def summarise_measurement_data(
    observed_counts: dict[str, int],
    sent_bits: list[int] | None = None,
    received_bits: list[int] | None = None,
    sent_bases: list[str] | None = None,
    received_bases: list[str] | None = None,
    expected_distribution: dict[str, float] | None = None,
) -> dict[str, Any]:
    total_shots = sum(observed_counts.values())

    if sent_bits is not None and received_bits is not None:
        qber = calculate_qber(sent_bits, received_bits, sent_bases, received_bases)
    else:
        error_counts = sum(
            cnt for bs, cnt in observed_counts.items()
            if bs.replace(" ", "") in ("01", "10")
        )
        qber = error_counts / total_shots if total_shots > 0 else 0.0

    excess_qber = compute_excess_error(qber)
    chi2_result = chi_squared_born_test(observed_counts, expected_distribution)
    entropy = compute_shannon_entropy(observed_counts)

    return {
        "qber": round(float(qber), 6),
        "excess_qber": round(float(excess_qber), 6),
        "chi2_result": chi2_result,
        "shannon_entropy": round(float(entropy), 6),
        "total_shots": total_shots,
    }


# ---------------------------------------------------------------------------
# statsmodels: One-Sided QBER Proportions Z-Test
# ---------------------------------------------------------------------------

def qber_onesided_ztest(
    observed_errors: int,
    total_bits: int,
    baseline_qber: float = HARDWARE_BASELINE_QBER,
    alpha: float = 0.01,
) -> dict[str, Any]:
    """One-sided proportions z-test for QBER anomaly detection.

    Tests H₀: QBER ≤ baseline_qber vs H₁: QBER > baseline_qber (upper-tailed).

    This is statistically stricter than the χ² test for QBER anomalies because:
    - χ² is symmetric (two-sided) — penalises both excess AND deficit errors.
    - The z-test is one-sided — only flags EXCESS errors as anomalous.
    - For Eavesdropping detection, one-sided is the correct model
      (adversaries ADD noise; they cannot remove it).

    Normal approximation valid when n·p₀·(1-p₀) ≥ 5, i.e. n ≥ 500 for p₀=0.01.

    Parameters
    ----------
    observed_errors : int
        Number of erroneous bit positions observed.
    total_bits : int
        Total number of measured bit positions (n).
    baseline_qber : float
        Legitimate channel noise floor (H₀ value, default from hardware baseline).
    alpha : float
        Significance level for rejection (default 0.01 = 1%).

    Returns
    -------
    dict[str, Any]
        {
          'z_statistic': float,
          'p_value_onesided': float,
          'reject_null': bool,        # True → QBER significantly > baseline
          'observed_qber': float,
          'baseline_qber': float,
          'n_total': int,
          'test': 'proportions_z_onesided',
          'reference': ...,
        }

    References
    ----------
    Agresti, A. & Caffo, B. (2000). American Statistician 54, 280–288.
    statsmodels.stats.proportion.proportions_ztest (alternative='larger').
    """
    if total_bits < 1:
        return {
            "z_statistic": 0.0,
            "p_value_onesided": 1.0,
            "reject_null": False,
            "observed_qber": 0.0,
            "baseline_qber": float(baseline_qber),
            "n_total": total_bits,
            "test": "proportions_z_onesided",
            "note": "Insufficient data (total_bits < 1).",
        }

    count = max(0, min(observed_errors, total_bits))
    p_hat = count / total_bits
    if _HAS_STATSMODELS and _sm_proportions_ztest is not None:
        try:
            z_stat, p_val = _sm_proportions_ztest(
                count=count,
                nobs=total_bits,
                value=baseline_qber,
                alternative="larger",
            )
        except Exception:
            se = math.sqrt(baseline_qber * (1.0 - baseline_qber) / total_bits) if 0 < baseline_qber < 1 else 1e-9
            z_stat = (p_hat - baseline_qber) / se
            p_val = float(ss.norm.sf(z_stat))
    else:
        # Exact analytical one-sided proportion z-test via scipy.stats
        se = math.sqrt(baseline_qber * (1.0 - baseline_qber) / total_bits) if 0 < baseline_qber < 1 else 1e-9
        z_stat = (p_hat - baseline_qber) / se
        p_val = float(ss.norm.sf(z_stat))

    if math.isnan(p_val):
        p_val = 1.0
    if math.isnan(z_stat):
        z_stat = 0.0

    return {
        "z_statistic": round(float(z_stat), 6),
        "p_value_onesided": round(float(p_val), 8),
        "reject_null": bool(p_val < alpha),
        "is_anomalous_at_0.01": bool(p_val < 0.01),
        "observed_qber": round(count / total_bits, 6),
        "baseline_qber": float(baseline_qber),
        "n_total": total_bits,
        "alpha": alpha,
        "test": "proportions_z_onesided",
        "interpretation": (
            "One-sided H₁: QBER > baseline. Rejection → eavesdropping detected. "
            "More specific than χ² for QBER anomalies."
        ),
        "reference": "Agresti & Caffo (2000). Am. Stat. 54, 280.",
    }


def bonferroni_multiqubit_test(
    per_qubit_p_values: list[float],
    alpha_family: float = 0.05,
) -> dict[str, Any]:
    """Bonferroni-corrected family-wise hypothesis test across n qubit channels.

    For an n-qubit QDS, testing each qubit independently inflates the
    false-positive rate: with n=8 independent tests at α=0.05, the
    probability of at least one false positive is 1-(1-0.05)^8 ≈ 34%.

    The Bonferroni correction maintains the family-wise error rate (FWER)
    at α by testing each qubit at α/n instead, and uses the Holm-Bonferroni
    step-down procedure (more powerful than plain Bonferroni).

    Parameters
    ----------
    per_qubit_p_values : list[float]
        Ordered list of p-values from per-qubit χ² or z-tests.
    alpha_family : float
        Target family-wise error rate (default 0.05 = 5%).

    Returns
    -------
    dict[str, Any]
        {
          'n_tests': int,
          'corrected_alpha': float,
          'reject_per_qubit': list[bool],
          'any_rejected': bool,
          'n_rejected': int,
          'method': 'holm',
          'family_wise_error_rate': float,
        }

    References
    ----------
    Holm, S. (1979). Scandinavian Journal of Statistics 6, 65–70.
    statsmodels.stats.multitest.multipletests(method='holm').
    """
    m = len(per_qubit_p_values)
    if m < 1:
        return {
            "n_tests": 0,
            "corrected_alpha": alpha_family,
            "reject_per_qubit": [],
            "any_rejected": False,
            "n_rejected": 0,
            "method": "holm",
            "family_wise_error_rate": alpha_family,
        }

    p_arr = np.array(per_qubit_p_values, dtype=float)
    alpha_bonf = alpha_family / m
    alpha_sidak = 1.0 - (1.0 - alpha_family) ** (1.0 / m)

    if _HAS_STATSMODELS and _sm_multipletests is not None:
        try:
            reject, pvals_corrected, _, _ = _sm_multipletests(
                pvals=p_arr,
                alpha=alpha_family,
                method="holm",
                is_sorted=False,
            )
        except Exception:
            # Holm-Bonferroni step-down analytical calculation
            order = np.argsort(p_arr)
            sorted_p = p_arr[order]
            adj_p = np.empty(m, dtype=float)
            for i in range(m):
                adj_p[i] = min(1.0, sorted_p[i] * (m - i))
            for i in range(1, m):
                adj_p[i] = max(adj_p[i], adj_p[i - 1])
            pvals_corrected = np.empty(m, dtype=float)
            pvals_corrected[order] = adj_p
            reject = pvals_corrected < alpha_family
    else:
        # Holm-Bonferroni step-down analytical calculation
        order = np.argsort(p_arr)
        sorted_p = p_arr[order]
        adj_p = np.empty(m, dtype=float)
        for i in range(m):
            adj_p[i] = min(1.0, sorted_p[i] * (m - i))
        for i in range(1, m):
            adj_p[i] = max(adj_p[i], adj_p[i - 1])
        pvals_corrected = np.empty(m, dtype=float)
        pvals_corrected[order] = adj_p
        reject = pvals_corrected < alpha_family

    return {
        "n_tests": m,
        "corrected_alpha_bonferroni": round(float(alpha_bonf), 8),
        "corrected_alpha_sidak": round(float(alpha_sidak), 8),
        "reject_per_qubit": [bool(r) for r in reject],
        "p_values_corrected": [round(float(p), 8) for p in pvals_corrected],
        "any_rejected": bool(np.any(reject)),
        "n_rejected": int(np.sum(reject)),
        "method": "holm",
        "family_wise_error_rate": alpha_family,
        "interpretation": (
            "Holm step-down controls FWER at alpha. "
            "any_rejected=True → at least one qubit channel significantly anomalous."
        ),
        "reference": "Holm (1979). Scand. J. Stat. 6, 65–70.",
    }
