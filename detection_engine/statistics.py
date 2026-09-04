"""
statistics.py
=============
Purpose: Measurement-outcome statistical analysis for the QDS threat detection engine.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import scipy.stats as ss

from qds_core.key_distribution import HARDWARE_BASELINE_QBER

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
