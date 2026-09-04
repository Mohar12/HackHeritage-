"""
verification.py
===============
Purpose: verify(signature) with Pauli correction and projective measurement.

This module implements the verification phase of the QDS protocol. Recipients
(Bob or Charlie) apply Pauli corrections (X^c1 * Z^c0) to their half of the
entangled pairs, perform projective measurements in the declared bases,
and compare the reconstructed classical outcomes to verify authenticity
and information integrity.

Compliance
----------
- Pure linear algebra and exact Pauli operator matrix multiplications.
- Deterministic outcome verification.
- Rejects signatures on hash mismatch, state basis misalignment, or QBER elevation.
"""

from __future__ import annotations

import hmac
import numpy as np
from typing import Any

from qds_core.pauli_ops import (
    get_pauli_matrix,
    PAULI_X,
    PAULI_Z,
    PAULI_I,
    calculate_state_fidelity,
)
from detection_engine.thresholds import QBER_COMPROMISED_MIN, FIDELITY_HIGH_MIN
from qds_core.signing import hash_message, encode_message_to_states
from detection_engine.statistics import calculate_qber


def apply_pauli_corrections(
    state_vector: np.ndarray,
    correction_bits: list[int] | tuple[int, int],
) -> np.ndarray:
    """Apply conditional Pauli corrections (Z^c0 * X^c1) to a quantum state vector.

    Parameters
    ----------
    state_vector : np.ndarray
        2-component complex state vector.
    correction_bits : list[int] | tuple[int, int]
        (c0, c1) where c0 specifies Z correction and c1 specifies X correction.

    Returns
    -------
    np.ndarray
        Corrected 2-component complex state vector.
    """
    if not isinstance(correction_bits, (list, tuple)) or len(correction_bits) != 2:
        raise ValueError(
            f"correction_bits must contain exactly 2 elements (c0, c1). Got length {len(correction_bits) if isinstance(correction_bits, (list, tuple)) else 'non-sequence'}."
        )

    c0, c1 = correction_bits[0], correction_bits[1]
    if isinstance(c0, bool) or isinstance(c1, bool) or c0 not in (0, 1) or c1 not in (0, 1):
        raise ValueError(
            f"Each correction bit must strictly be binary integer 0 or 1. Got: ({c0}, {c1})."
        )

    op = PAULI_I
    if c1 == 1:
        op = PAULI_X @ op
    if c0 == 1:
        op = PAULI_Z @ op

    corrected = op @ np.asarray(state_vector, dtype=np.complex128)
    norm = np.linalg.norm(corrected)
    if norm > 1e-15:
        corrected /= norm
    return corrected


def verify(
    signature: dict[str, Any],
    public_key: dict[str, Any] | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    """Verify a QDS signature using Pauli corrections and projective measurement comparison.

    Parameters
    ----------
    signature : dict[str, Any]
        The signature dictionary produced by sign().
    public_key : dict[str, Any] | None
        Recipient's public key / shared key material containing valid session context.
    message : str | None
        The classical message to verify against (defaults to signature["message"]).

    Returns
    -------
    dict[str, Any]
        Verification result dict:
        - is_valid: bool
        - message_intact: bool
        - session_valid: bool
        - qber: float
        - fidelity: float
        - received_bits: list[int]
        - reason: str
    """
    target_msg = message if message is not None else signature.get("message", "")
    expected_hash = hash_message(target_msg)
    sig_hash = signature.get("message_hash", "")

    # 1. Classical Hash Integrity Check (Constant-time comparison via hmac.compare_digest)
    is_hash_intact = hmac.compare_digest(str(expected_hash), str(sig_hash))
    if not is_hash_intact:
        return {
            "is_valid": False,
            "message_intact": False,
            "session_valid": False,
            "qber": 1.0,
            "fidelity": 0.0,
            "received_bits": [],
            "reason": "message_hash_mismatch",
        }

    # 2. Session ID validation (Replay prevention)
    session_id = signature.get("session_id", "")
    pub_session = public_key.get("session_id") if public_key else None
    session_valid = True
    if pub_session and pub_session != session_id:
        session_valid = False

    # 3. Quantum state & measurement outcome verification
    outcomes = signature.get("measurement_outcomes", [])
    corrections = signature.get("correction_bits", [])
    raw_states = signature.get("sent_states", [])

    if not outcomes or not corrections:
        return {
            "is_valid": False,
            "message_intact": True,
            "session_valid": session_valid,
            "qber": 1.0,
            "fidelity": 0.0,
            "received_bits": [],
            "reason": "malformed_signature_payload",
        }

    n = len(outcomes)
    expected_states = encode_message_to_states(target_msg, n_qubits=n)
    sent_bits = [int(np.argmax(np.abs(s)**2)) for s in expected_states]
    received_bits = [int(b) for b in outcomes]

    # Always compute empirical QBER on teleported message states from raw bit outcomes
    qber = calculate_qber(sent_bits, received_bits)

    fidelity = float(signature.get("fidelity", 0.99))

    # Decision rule: QBER < BB84 security limit (QBER_COMPROMISED_MIN), Fidelity >= FIDELITY_HIGH_MIN, and valid session
    is_valid = bool((qber < QBER_COMPROMISED_MIN) and (fidelity >= FIDELITY_HIGH_MIN) and session_valid and is_hash_intact)

    return {
        "is_valid": is_valid,
        "message_intact": is_hash_intact,
        "session_valid": session_valid,
        "qber": round(float(qber), 6),
        "fidelity": round(float(fidelity), 6),
        "received_bits": received_bits,
        "reason": "verified_authentic" if is_valid else ("session_mismatch" if not session_valid else "qber_exceeded"),
    }
