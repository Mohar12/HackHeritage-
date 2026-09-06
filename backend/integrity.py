"""
integrity.py
============
Purpose: Backend-only cryptographic integrity binding for Quantum Digital Signatures (QDS).
Binds all signature fields together (message_hash, session_id, sent_bits, measurement_outcomes,
correction_bits, bases, fidelity, measurement_counts, execution_mode) using HMAC-SHA256
over a canonical deterministic JSON representation.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
from typing import Any

logger = logging.getLogger(__name__)

# Server-side secret key: loaded from environment variable if provided,
# otherwise generates a cryptographically secure CSPRNG ephemeral secret at startup.
_DEFAULT_SERVER_SECRET = secrets.token_bytes(32)


def get_server_integrity_secret() -> bytes:
    """Retrieve the server-side integrity key.

    Uses QDS_INTEGRITY_SECRET or SECRET_KEY from the environment if configured.
    Otherwise falls back to an in-memory cryptographically secure CSPRNG secret
    generated at process startup. The secret is never transmitted to clients.
    """
    env_secret = os.environ.get("QDS_INTEGRITY_SECRET") or os.environ.get("SECRET_KEY")
    if env_secret:
        return env_secret.encode("utf-8")
    return _DEFAULT_SERVER_SECRET


def canonicalize_signature_data(sig_dict: dict[str, Any]) -> bytes:
    """Construct a strictly deterministic canonical JSON byte representation of protected signature fields.

    Bound fields:
    - bases: list of uppercase basis strings
    - correction_bits: list of 2-element integer bit pairs
    - execution_mode: string ('quantum' or 'compatibility_fallback')
    - fidelity: fixed 6-decimal float string representation
    - measurement_counts: dictionary of bitstring counts with sorted keys
    - measurement_outcomes: list of integer outcome bits
    - message_hash: string SHA-256 digest
    - sent_bits: list of integer sent bits
    - session_id: string session identifier
    """
    raw_fidelity = sig_dict.get("fidelity", 0.99)
    try:
        fidelity_str = f"{float(raw_fidelity):.6f}"
    except (ValueError, TypeError):
        fidelity_str = "0.000000"

    raw_counts = sig_dict.get("measurement_counts")
    if isinstance(raw_counts, dict):
        canonical_counts = {
            str(k): int(v)
            for k, v in sorted(raw_counts.items())
        }
    else:
        canonical_counts = {}

    canonical_dict = {
        "bases": [str(b).upper() for b in sig_dict.get("bases") or []],
        "correction_bits": [
            [int(c[0]), int(c[1])]
            for c in sig_dict.get("correction_bits") or []
            if isinstance(c, (list, tuple)) and len(c) == 2
        ],
        "execution_mode": str(sig_dict.get("execution_mode") or "quantum"),
        "fidelity": fidelity_str,
        "measurement_counts": canonical_counts,
        "measurement_outcomes": [int(b) for b in sig_dict.get("measurement_outcomes") or []],
        "message_hash": str(sig_dict.get("message_hash") or ""),
        "sent_bits": [int(b) for b in sig_dict.get("sent_bits") or []],
        "session_id": str(sig_dict.get("session_id") or ""),
    }

    return json.dumps(canonical_dict, sort_keys=True, separators=(",", ":")).encode("utf-8")


def compute_signature_integrity_tag(
    sig_dict: dict[str, Any],
    secret_key: bytes | None = None,
) -> str:
    """Compute a cryptographic HMAC-SHA256 integrity tag over the canonical signature fields.

    Derives a session-bound subkey via HKDF-style domain separation to prevent cross-session replay.
    """
    master_key = secret_key or get_server_integrity_secret()
    session_id = str(sig_dict.get("session_id") or "")
    
    # Domain-separated session-bound key derivation
    session_key = hmac.new(
        master_key,
        f"qds-sig-integrity-v1:{session_id}".encode("utf-8"),
        hashlib.sha256,
    ).digest()

    canonical_bytes = canonicalize_signature_data(sig_dict)
    return hmac.new(session_key, canonical_bytes, hashlib.sha256).hexdigest()


def verify_signature_integrity(
    sig_dict: dict[str, Any],
    secret_key: bytes | None = None,
) -> tuple[bool, str]:
    """Verify cryptographic integrity tag on signature payload using constant-time comparison.

    Returns:
        (is_valid: bool, reason: str)
    """
    provided_tag = sig_dict.get("integrity_tag")
    if not provided_tag or not isinstance(provided_tag, str):
        return False, "missing_integrity_tag"

    provided_str = provided_tag.strip().lower()
    # Hexadecimal HMAC tags must strictly be ASCII-encoded hex strings
    if not provided_str.isascii():
        return False, "signature_integrity_mismatch"

    expected_tag = compute_signature_integrity_tag(sig_dict, secret_key=secret_key)
    # Perform constant-time digest comparison using byte arrays to prevent algorithm/encoding confusion
    if not hmac.compare_digest(provided_str.encode("ascii"), expected_tag.lower().encode("ascii")):
        return False, "signature_integrity_mismatch"

    return True, "integrity_verified"


def validate_quantum_evidence(
    sig_dict: dict[str, Any],
    target_message: str | None = None,
) -> tuple[bool, str]:
    """Validate quantum evidence consistency in a QDS signature payload.

    Verifies:
    1. Presence of measurement_outcomes and correction_bits with equal positive length n.
    2. Correction bits format: each element must be a 2-integer bit pair [c0, c1] in {0, 1}.
    3. Measurement outcomes format: each element must be binary integer 0 or 1.
    4. Sent bits (if present): length must equal n, each element binary integer 0 or 1.
    5. Sent bits vs message consistency: if target_message or message in sig_dict is provided
       and sent_bits is present, sent_bits must match get_message_bits(message, n).
    6. Bases (if present): length must equal n, each basis in {'X', 'Y', 'Z'}.
    7. Measurement counts (if present): keys must be valid Bell basis states {'00', '01', '10', '11'},
       counts non-negative integers, and total shots > 0.
    8. Execution mode: must be 'quantum' or 'compatibility_fallback'.
    9. Fidelity: must be a numeric float in [0.0, 1.0].
    10. Session ID: non-empty string.

    Returns:
        (is_valid: bool, reason: str)
    """
    outcomes = sig_dict.get("measurement_outcomes")
    corrections = sig_dict.get("correction_bits")

    if not outcomes or not corrections:
        return False, "malformed_signature_payload"

    if not isinstance(outcomes, (list, tuple)) or not isinstance(corrections, (list, tuple)):
        return False, "quantum_evidence_mismatch"

    n = len(outcomes)
    if n == 0 or len(corrections) != n:
        return False, "quantum_evidence_mismatch"

    # Validate correction bit pairs
    for pair in corrections:
        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
            return False, "quantum_evidence_mismatch"
        c0, c1 = pair[0], pair[1]
        if isinstance(c0, bool) or isinstance(c1, bool) or c0 not in (0, 1) or c1 not in (0, 1):
            return False, "quantum_evidence_mismatch"

    # Validate measurement outcome bits
    for b in outcomes:
        if isinstance(b, bool) or b not in (0, 1):
            return False, "quantum_evidence_mismatch"

    # Validate sent_bits if present
    sent_bits = sig_dict.get("sent_bits")
    if sent_bits is not None:
        if not isinstance(sent_bits, (list, tuple)) or len(sent_bits) != n:
            return False, "quantum_evidence_mismatch"
        for b in sent_bits:
            if isinstance(b, bool) or b not in (0, 1):
                return False, "quantum_evidence_mismatch"

        # Validate sent_bits derivation from message
        msg = target_message if target_message is not None else sig_dict.get("message")
        if msg is not None and isinstance(msg, str):
            from qds_core.signing import get_message_bits
            expected_bits = get_message_bits(msg, n_qubits=n)
            if list(sent_bits) != expected_bits:
                return False, "quantum_evidence_mismatch"

    # Validate bases if present
    bases = sig_dict.get("bases")
    if bases is not None:
        if not isinstance(bases, (list, tuple)) or len(bases) != n:
            return False, "quantum_evidence_mismatch"
        for b in bases:
            if not isinstance(b, str) or b.upper() not in ("X", "Y", "Z"):
                return False, "quantum_evidence_mismatch"

    # Validate measurement counts if present
    counts = sig_dict.get("measurement_counts")
    if counts is not None:
        if not isinstance(counts, dict) or len(counts) == 0:
            return False, "quantum_evidence_mismatch"
        valid_states = {"00", "01", "10", "11"}
        total_shots = 0
        for k, v in counts.items():
            if str(k).replace(" ", "") not in valid_states:
                return False, "quantum_evidence_mismatch"
            if isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0:
                return False, "quantum_evidence_mismatch"
            total_shots += int(v)
        if total_shots <= 0:
            return False, "quantum_evidence_mismatch"

    # Validate execution mode
    mode = sig_dict.get("execution_mode", "quantum")
    if mode not in ("quantum", "compatibility_fallback"):
        return False, "quantum_evidence_mismatch"

    # Validate fidelity if present
    fidelity = sig_dict.get("fidelity")
    if fidelity is not None:
        try:
            f = float(fidelity)
            import math
            if math.isnan(f) or math.isinf(f) or not (0.0 <= f <= 1.0):
                return False, "quantum_evidence_mismatch"
            # Cross-field consistency: if measurement_counts are present, fidelity must not be completely contradictory
            if counts is not None and isinstance(counts, dict) and sum(counts.values()) > 0:
                tot = sum(counts.values())
                diag = sum(cnt for bs, cnt in counts.items() if str(bs).replace(" ", "") in ("00", "11"))
                diag_ratio = diag / tot
                # If observed diagonal ratio is extremely high (>0.90) but fidelity is reported as <=0.20, or vice-versa
                if (diag_ratio >= 0.90 and f <= 0.20) or (diag_ratio <= 0.20 and f >= 0.90):
                    return False, "quantum_evidence_mismatch"
        except (ValueError, TypeError):
            return False, "quantum_evidence_mismatch"

    # Validate session_id
    session_id = sig_dict.get("session_id")
    if not session_id or not isinstance(session_id, str) or not session_id.strip():
        return False, "quantum_evidence_mismatch"

    return True, "quantum_evidence_valid"

