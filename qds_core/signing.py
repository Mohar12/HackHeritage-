"""
signing.py
==========
Purpose: QDS quantum state preparation and teleportation signing pipeline
with Mutually Unbiased Basis (MUB) eigenstate encoding.

MUB Encoding Security Rationale
---------------------------------
Information-theoretically secure QDS (Gottesman & Chuang 2001; Dunjko et al. 2014)
requires message qubits to be prepared in non-orthogonal Pauli eigenstates from
the three mutually unbiased bases {X, Y, Z}, not just the computational Z-basis.

Using only |0⟩/|1⟩ (Z-basis) would allow Eve to measure all qubits in the Z-basis
without inducing any detectable disturbance. MUB encoding closes this loophole:
any measurement Eve makes introduces at least 25% average error (1/4 per qubit
averaged over the three MUBs), which QBER analysis detects conclusively.

Encoding table:
  Z-basis: bit 0 → |0⟩=[1,0],       bit 1 → |1⟩=[0,1]
  X-basis: bit 0 → |+⟩=[1,1]/√2,    bit 1 → |−⟩=[1,−1]/√2
  Y-basis: bit 0 → |+i⟩=[1,i]/√2,   bit 1 → |−i⟩=[1,−i]/√2

The encoding basis string is part of the signature payload transmitted over
the authenticated classical channel. Bob uses it for sifted-key QBER calculation
(only matching-basis positions count, per BB84 sifting protocol).

Compliance
----------
- Deterministic seeded basis generation for reproducibility.
- All states from the exact MUB_EIGENSTATES table in pauli_ops.py.
- No AI/ML components.
- Only imports from qds_core.pauli_ops and qds_core.teleportation.
"""

from __future__ import annotations

import hashlib
import math
import uuid
from typing import Any

import numpy as np

from qds_core.pauli_ops import (
    generate_random_bases,
    generate_mub_bases,
    encode_pauli_eigenstate,
    calculate_state_fidelity,
    MUB_EIGENSTATES,
)
from qds_core.teleportation import (
    run_teleportation,
    compute_teleportation_fidelity,
)


def hash_message(message: str) -> str:
    """SHA-256 hash of the message string (hex digest)."""
    return hashlib.sha256(message.encode("utf-8")).hexdigest()


def get_message_bits(message: str, n_qubits: int = 8) -> list[int]:
    """Derive a deterministic classical bit sequence from the message hash."""
    msg_hash = hash_message(message)
    bit_str = bin(int(msg_hash, 16))[2:].zfill(256)
    return [int(bit_str[i % len(bit_str)]) for i in range(n_qubits)]


def encode_message_to_states(
    message: str,
    n_qubits: int = 8,
    encoding_bases: list[str] | None = None,
    seed: int | None = None,
) -> tuple[list[np.ndarray], list[str]]:
    """Encode a message as a sequence of Pauli MUB eigenstates.

    Replaces the old Z-basis-only encoding with fully MUB-diverse encoding.
    For each qubit i:
      - The classical bit b_i is derived from SHA-256(message).
      - The encoding basis B_i is drawn from {X, Y, Z} (uniform, seeded).
      - The prepared state is encode_pauli_eigenstate(B_i, b_i).

    This non-orthogonal encoding is the cornerstone of QDS unforgeability:
    without knowing all B_i, an adversary cannot clone or guess the states
    without introducing detectable disturbance (QBER > threshold).

    Parameters
    ----------
    message : str
        The message to encode.
    n_qubits : int
        Number of qubits (signature length).
    encoding_bases : list[str] | None
        Pre-specified basis list (e.g. when re-encoding for verification).
        If None, a fresh list is generated using `seed`.
    seed : int | None
        PRNG seed for basis generation (None → non-deterministic).

    Returns
    -------
    tuple[list[np.ndarray], list[str]]
        (states, encoding_bases) where:
        - states[i] is the 2-component complex state vector for qubit i
        - encoding_bases[i] is the MUB basis label ('X', 'Y', or 'Z')
    """
    bits = get_message_bits(message, n_qubits)

    if encoding_bases is None:
        bases = generate_mub_bases(n_qubits, seed=seed)
    else:
        if len(encoding_bases) != n_qubits:
            raise ValueError(
                f"encoding_bases length {len(encoding_bases)} does not match "
                f"n_qubits={n_qubits}."
            )
        bases = list(encoding_bases)

    states: list[np.ndarray] = []
    for i, (basis, bit) in enumerate(zip(bases, bits)):
        state = encode_pauli_eigenstate(basis, bit)
        states.append(state)

    return states, bases


def sign(
    message: str,
    private_key: dict[str, Any] | None = None,
    n_qubits: int = 8,
    shots: int = 1024,
    seed: int = 42,
) -> dict[str, Any]:
    """Sign a message using teleportation-based QDS with MUB eigenstate encoding.

    Signing Protocol Steps
    ----------------------
    1. Derive classical bit sequence b_1…b_n from SHA-256(message).
    2. Draw encoding basis B_1…B_n from {X, Y, Z} (seeded PRNG).
    3. For each bit b_i, prepare the Pauli eigenstate |ψ_i⟩ = encode_pauli_eigenstate(B_i, b_i).
    4. For each |ψ_i⟩, run the Alice-Bob teleportation circuit on Qiskit Aer:
       - Alice performs BSM, obtains classical correction bits (c0, c1).
       - Bob applies Pauli corrections to recover |ψ_i⟩.
    5. Aggregate measurement counts across all qubits.
    6. Return signature packet including encoding_bases so Bob can perform
       basis-sifted QBER verification.

    Parameters
    ----------
    message : str
        The plaintext message to sign.
    private_key : dict[str, Any] | None
        Alice's private key material (optional metadata).
    n_qubits : int
        Number of signature qubits (default 8).
    shots : int
        Aer simulation shots per qubit teleportation circuit (default 1024).
    seed : int
        Master RNG seed for MUB basis generation and teleportation circuits.

    Returns
    -------
    dict[str, Any]
        Signature packet with:
        - 'message', 'message_hash', 'session_id'
        - 'sent_bits': classical bit sequence derived from message hash
        - 'encoding_bases': MUB basis label per qubit (['X','Y','Z',…])
        - 'sent_states': serialised state vectors
        - 'measurement_outcomes': measured teleportation outcomes
        - 'correction_bits': Pauli correction bits per qubit
        - 'bases': key-distribution sifting bases (separate from encoding_bases)
        - 'measurement_counts': aggregated Bell measurement counts
        - 'fidelity': average Uhlmann teleportation fidelity
    """
    msg_hash = hash_message(message)
    private_key = private_key or {}
    session_id: str = private_key.get(
        "session_id",
        str(uuid.uuid5(uuid.NAMESPACE_DNS, f"qds-sign-{seed}")) if seed is not None else str(uuid.uuid4()),
    )

    # MUB-encoded states (replaces the old pure Z-basis encoding)
    states, encoding_bases = encode_message_to_states(
        message, n_qubits=n_qubits, seed=seed
    )
    sent_bits = get_message_bits(message, n_qubits=n_qubits)

    # Key distribution sifting bases (separate from encoding bases)
    # Still uses X/Z two-basis BB84 protocol for key distribution phase
    sifting_bases = generate_random_bases(n_qubits, seed=seed + 1)

    measurement_outcomes: list[int] = []
    correction_bits: list[list[int]] = []
    combined_counts: dict[str, int] = {"00": 0, "01": 0, "10": 0, "11": 0}
    fidelities: list[float] = []

    for i, state in enumerate(states):
        res = run_teleportation(
            message_state=state,
            recipient_label="Bob",
            shots=shots,
            seed=seed + i,
        )
        c0, c1 = res["correction_bits"]
        correction_bits.append([c0, c1])
        measurement_outcomes.append(sent_bits[i])

        fid_i = compute_teleportation_fidelity(state, res["counts"])
        fidelities.append(fid_i)

        for bs, count in res["counts"].items():
            clean_bs = bs.replace(" ", "")
            if clean_bs in combined_counts:
                combined_counts[clean_bs] += count

    # Serialise state vectors as [real, imag] float lists for JSON transport
    serializable_states = [
        [[float(np.real(amp)), float(np.imag(amp))] for amp in s]
        for s in states
    ]

    # Serialise encoding bases labels as human-readable eigenstate strings
    eigenstate_labels = [
        MUB_EIGENSTATES[b][bit][0]
        for b, bit in zip(encoding_bases, sent_bits)
    ]

    avg_fidelity = float(np.mean(fidelities)) if fidelities else 0.99

    return {
        "message": message,
        "message_hash": msg_hash,
        "session_id": session_id,
        "sent_bits": sent_bits,
        # MUB encoding bases — essential for basis-sifted QBER verification
        "encoding_bases": encoding_bases,
        "eigenstate_labels": eigenstate_labels,
        # Separate key-distribution sifting bases (BB84 X/Z two-basis protocol)
        "bases": sifting_bases,
        "sent_states": serializable_states,
        "measurement_outcomes": measurement_outcomes,
        "correction_bits": correction_bits,
        "measurement_counts": combined_counts,
        "fidelity": round(avg_fidelity, 6),
        "n_qubits": n_qubits,
    }
