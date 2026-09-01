"""
statistics.py
=============
Purpose: Measurement-outcome statistical analysis for the QDS threat detection engine.

Provides deterministic, physics-based statistical tools to identify anomalous
quantum measurement data produced by adversarial attacks on the QDS protocol.

Functions
---------
calculate_qber            — Exact QBER fraction across matching measurement bases.
chi_squared_born_test     — χ² goodness-of-fit of observed counts vs Born-rule dist.
compute_excess_error      — Excess QBER above the hardware noise baseline.
summarise_measurement_data — One-call summary of all statistical metrics.

Compliance
----------
- No ML/AI components.
- scipy.stats.chisquare used for χ² computation (deterministic, closed-form).
- All computations are exact and deterministic for identical inputs.

References
----------
- Bennett & Brassard, BB84 (1984) — QBER security threshold ε = 0.11
- Pearson, K., On the criterion … (1900) — Chi-squared goodness-of-fit
- scipy.stats.chisquare documentation
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import scipy.stats as ss

from qds_core.key_distribution import HARDWARE_BASELINE_QBER

# ---------------------------------------------------------------------------
# Module constants
# ---------------------------------------------------------------------------

#: Minimum expected count per bin required before running χ² test.
#: Bins with expected count < 5 should be pooled (Cochran's rule).
MIN_EXPECTED_COUNT: int = 5


# ---------------------------------------------------------------------------
# 1. Quantum Bit Error Rate (QBER)
# ---------------------------------------------------------------------------

def calculate_qber(
    sent_bits: list[int],
    received_bits: list[int],
    sent_bases: list[str] | None = None,
    received_bases: list[str] | None = None,
) -> float:
    """Calculate the exact Quantum Bit Error Rate (QBER).

    QBER is defined as the fraction of bits that differ between sender and
    receiver across positions where their measurement bases agree.  If no
    basis arrays are supplied, all positions are assumed to be matching
    (equivalent to a sifted-key QBER calculation).

    Formula:
        QBER = (number of mismatched bits in matching-basis positions)
               / (total matching-basis positions)

    Parameters
    ----------
    sent_bits : list[int]
        Bit values prepared / sent by Alice.  Each element ∈ {0, 1}.
    received_bits : list[int]
        Bit values measured by the recipient.  Each element ∈ {0, 1}.
    sent_bases : list[str] | None
        Measurement bases used by the sender ('X' or 'Z').
        If ``None``, all positions are treated as matching.
    received_bases : list[str] | None
        Measurement bases used by the recipient ('X' or 'Z').
        If ``None``, all positions are treated as matching.

    Returns
    -------
    float
        QBER ∈ [0.0, 1.0].  Returns 0.0 if no matching-basis positions exist.

    Raises
    ------
    ValueError
        If ``sent_bits`` and ``received_bits`` have different lengths.
        If basis arrays are supplied but have incorrect lengths.
    """
    n = len(sent_bits)
    if len(received_bits) != n:
        raise ValueError(
            f"sent_bits (len={n}) and received_bits (len={len(received_bits)}) "
            f"must have the same length."
        )

    if sent_bases is not None and len(sent_bases) != n:
        raise ValueError(
            f"sent_bases must have the same length as sent_bits ({n}). "
            f"Got {len(sent_bases)}."
        )
    if received_bases is not None and len(received_bases) != n:
        raise ValueError(
            f"received_bases must have the same length as received_bits ({n}). "
            f"Got {len(received_bases)}."
        )

    matching_positions: list[int] = []
    for i in range(n):
        if sent_bases is None and received_bases is None:
            matching_positions.append(i)
        elif (sent_bases is not None
              and received_bases is not None
              and sent_bases[i] == received_bases[i]):
            matching_positions.append(i)

    if not matching_positions:
        return 0.0

    error_count = sum(
        1 for i in matching_positions
        if int(sent_bits[i]) != int(received_bits[i])
    )

    return float(error_count) / float(len(matching_positions))


# ---------------------------------------------------------------------------
# 2. Chi-Squared Goodness-of-Fit Test (Born Rule)
# ---------------------------------------------------------------------------

def chi_squared_born_test(
    observed_counts: dict[str, int],
    expected_distribution: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Test whether observed measurement counts match the expected Born distribution.

    For an unmanipulated quantum channel, the measurement outcome distribution
    should follow the theoretical Born-rule probabilities.  This function
    applies Pearson's χ² goodness-of-fit test comparing observed frequencies
    to the expected theoretical distribution.

    If no ``expected_distribution`` is supplied, a uniform distribution over
    all observed outcome labels is assumed (appropriate for maximally entangled
    Bell states where all 2^n outcomes are equiprobable).

    The null hypothesis H₀ is that the observed counts were drawn from the
    expected distribution.  A low p-value (< 0.05) indicates the observed
    distribution is significantly anomalous.

    Parameters
    ----------
    observed_counts : dict[str, int]
        Aer-style measurement count histogram, e.g. ``{"00": 512, "11": 512}``.
    expected_distribution : dict[str, float] | None
        Expected probabilities for each outcome label.  Values must sum to 1.0.
        If ``None``, a uniform distribution over the keys of
        ``observed_counts`` is assumed.

    Returns
    -------
    dict[str, Any]
        ``chi2_statistic``  : float  — Pearson's χ² statistic
        ``p_value``         : float  — p-value under the χ²(dof) distribution
        ``degrees_of_freedom`` : int — number of bins minus 1
        ``reject_null``     : bool  — True if p_value < 0.05
        ``is_anomalous_at_0.01`` : bool — True if p_value < 0.01 (ABORT threshold)
        ``observed_counts`` : dict  — original input counts
        ``expected_counts`` : dict  — expected counts derived from probabilities
        ``total_shots``     : int   — sum of all observed counts

    Raises
    ------
    ValueError
        If ``observed_counts`` is empty.
        If ``expected_distribution`` keys do not match ``observed_counts`` keys.
    """
    if not observed_counts:
        raise ValueError("observed_counts must be non-empty.")

    labels: list[str] = sorted(observed_counts.keys())
    total_shots: int = sum(observed_counts.values())

    if total_shots == 0:
        raise ValueError("Total shot count is zero — cannot perform χ² test.")

    # Build expected distribution
    if expected_distribution is None:
        n_bins = len(labels)
        expected_probs: dict[str, float] = {lb: 1.0 / n_bins for lb in labels}
    else:
        if set(expected_distribution.keys()) != set(labels):
            raise ValueError(
                "expected_distribution keys must exactly match observed_counts keys. "
                f"Got {set(expected_distribution.keys())} vs {set(labels)}."
            )
        total_prob = sum(expected_distribution.values())
        if abs(total_prob - 1.0) > 1e-6:
            raise ValueError(
                f"expected_distribution probabilities must sum to 1.0. "
                f"Got sum={total_prob:.6f}."
            )
        expected_probs = dict(expected_distribution)

    # Compute expected counts
    observed_arr = np.array([observed_counts[lb] for lb in labels], dtype=np.float64)
    expected_arr = np.array([expected_probs[lb] * total_shots for lb in labels],
                            dtype=np.float64)

    # Cochran's rule: pool bins where expected count < MIN_EXPECTED_COUNT
    # (prevents inflation of χ² from near-empty bins)
    valid_mask = expected_arr >= MIN_EXPECTED_COUNT
    if not np.any(valid_mask):
        # All bins below threshold — merge everything into two bins
        obs_pooled = np.array([observed_arr.sum()])
        exp_pooled = np.array([expected_arr.sum()])
    else:
        obs_pooled = observed_arr[valid_mask]
        exp_pooled = expected_arr[valid_mask]
        # Pool remaining low-count bins into a single "other" bin
        low_obs = observed_arr[~valid_mask].sum()
        low_exp = expected_arr[~valid_mask].sum()
        if low_exp > 0:
            obs_pooled = np.append(obs_pooled, low_obs)
            exp_pooled = np.append(exp_pooled, low_exp)

    # Pearson's χ² test via scipy (exact, deterministic)
    chi2_stat, p_value = ss.chisquare(f_obs=obs_pooled, f_exp=exp_pooled)
    dof: int = len(obs_pooled) - 1

    expected_counts_dict: dict[str, float] = {
        lb: round(expected_probs[lb] * total_shots, 4) for lb in labels
    }

    return {
        "chi2_statistic": float(chi2_stat),
        "p_value": float(p_value),
        "degrees_of_freedom": dof,
        "reject_null": bool(p_value < 0.05),
        "is_anomalous_at_0.01": bool(p_value < 0.01),
        "observed_counts": dict(observed_counts),
        "expected_counts": expected_counts_dict,
        "total_shots": total_shots,
    }


# ---------------------------------------------------------------------------
# 3. Excess Error
# ---------------------------------------------------------------------------

def compute_excess_error(qber: float) -> float:
    """Compute the QBER in excess of the hardware noise baseline.

    Any QBER elevation above HARDWARE_BASELINE_QBER (1%) indicates a
    potential adversarial signal beyond the known physical noise floor.

    Parameters
    ----------
    qber : float
        Observed QBER ∈ [0.0, 1.0].

    Returns
    -------
    float
        Excess QBER = max(0, qber - HARDWARE_BASELINE_QBER).
        Always non-negative.

    Raises
    ------
    ValueError
        If ``qber`` is outside [0.0, 1.0].
    """
    if not (0.0 <= qber <= 1.0):
        raise ValueError(f"qber must be in [0.0, 1.0]. Got {qber}.")
    return float(max(0.0, qber - HARDWARE_BASELINE_QBER))


# ---------------------------------------------------------------------------
# 4. Shannon Entropy of measurement distribution
# ---------------------------------------------------------------------------

def _shannon_entropy(counts: dict[str, int]) -> float:
    """Compute the Shannon entropy H of a measurement count distribution.

    H = -Σ p_i · log₂(p_i)

    For a uniform distribution over n outcomes: H = log₂(n) (maximum entropy).
    For a deterministic distribution: H = 0 (minimum entropy).

    Parameters
    ----------
    counts : dict[str, int]
        Measurement count histogram.

    Returns
    -------
    float
        Shannon entropy in bits.  Returns 0.0 for empty or zero-total counts.
    """
    total = sum(counts.values())
    if total == 0:
        return 0.0
    entropy = 0.0
    for cnt in counts.values():
        if cnt > 0:
            p = cnt / total
            entropy -= p * math.log2(p)
    return float(entropy)


# ---------------------------------------------------------------------------
# 5. One-call summary
# ---------------------------------------------------------------------------

def summarise_measurement_data(
    observed_counts: dict[str, int],
    sent_bits: list[int] | None = None,
    received_bits: list[int] | None = None,
    sent_bases: list[str] | None = None,
    received_bases: list[str] | None = None,
    expected_distribution: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Compute all statistical metrics for a set of measurement data.

    Convenience wrapper that runs QBER, χ² test, excess error, and
    entropy in a single call, returning a unified summary dict.

    Parameters
    ----------
    observed_counts : dict[str, int]
        Raw Aer measurement count histogram.
    sent_bits : list[int] | None
        Alice's bit values.  Required for QBER calculation.
    received_bits : list[int] | None
        Recipient's bit values.  Required for QBER calculation.
    sent_bases : list[str] | None
        Alice's preparation bases.  Optional — see calculate_qber().
    received_bases : list[str] | None
        Recipient's measurement bases.  Optional — see calculate_qber().
    expected_distribution : dict[str, float] | None
        Expected Born-rule probabilities.  Uniform if None.

    Returns
    -------
    dict[str, Any]
        ``qber``              : float  — QBER (0.0 if bits not provided)
        ``excess_qber``       : float  — QBER above hardware baseline
        ``chi2_result``       : dict   — full χ² test output
        ``shannon_entropy``   : float  — entropy in bits
        ``total_shots``       : int    — total measurement shots
        ``hardware_baseline_qber`` : float — module constant (0.01)
    """
    qber: float = 0.0
    if sent_bits is not None and received_bits is not None:
        qber = calculate_qber(
            sent_bits=sent_bits,
            received_bits=received_bits,
            sent_bases=sent_bases,
            received_bases=received_bases,
        )

    chi2_result = chi_squared_born_test(
        observed_counts=observed_counts,
        expected_distribution=expected_distribution,
    )

    return {
        "qber": round(qber, 6),
        "excess_qber": round(compute_excess_error(qber), 6),
        "chi2_result": chi2_result,
        "shannon_entropy": round(_shannon_entropy(observed_counts), 6),
        "total_shots": chi2_result["total_shots"],
        "hardware_baseline_qber": HARDWARE_BASELINE_QBER,
    }
