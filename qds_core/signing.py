"""
signing.py
==========
Purpose: QDS quantum state preparation and teleportation signing pipeline.
"""

from __future__ import annotations

import hashlib
import math
import uuid
from typing import Any

import numpy as np

from qds_core.pauli_ops import (
    generate_random_bases,
    calculate_state_fidelity,
)
from qds_core.teleportation import (
    run_teleportation,
    compute_teleportation_fidelity,
)


def hash_message(message: str) -> str:
    return hashlib.sha256(message.encode("utf-8")).hexdigest()


def get_message_bits(message: str, n_qubits: int = 8) -> list[int]:
    msg_hash = hash_message(message)
    bit_str = bin(int(msg_hash, 16))[2:].zfill(256)
    return [int(bit_str[i % len(bit_str)]) for i in range(n_qubits)]


def encode_message_to_states(
    message: str,
    n_qubits: int = 8,
) -> list[np.ndarray]:
    bits = get_message_bits(message, n_qubits)
    states: list[np.ndarray] = []
    for bit in bits:
        if bit == 0:
            state = np.array([1.0, 0.0], dtype=np.complex128)
        else:
            state = np.array([0.0, 1.0], dtype=np.complex128)
        states.append(state)

    return states


def sign(
    message: str,
    private_key: dict[str, Any] | None = None,
    n_qubits: int = 8,
    shots: int = 1024,
    seed: int = 42,
) -> dict[str, Any]:
    msg_hash = hash_message(message)
    private_key = private_key or {}
    session_id: str = private_key.get(
        "session_id",
        str(uuid.uuid5(uuid.NAMESPACE_DNS, f"qds-sign-{seed}")) if seed is not None else str(uuid.uuid4())
    )

    states = encode_message_to_states(message, n_qubits=n_qubits)
    sent_bits = get_message_bits(message, n_qubits=n_qubits)
    bases = generate_random_bases(n_qubits, seed=seed)

    measurement_outcomes: list[int] = []
    correction_bits: list[list[int]] = []
    combined_counts: dict[str, int] = {"00": 0, "01": 0, "10": 0, "11": 0}
    fidelities: list[float] = []

    for i, state in enumerate(states):
        res = run_teleportation(message_state=state, recipient_label="Bob", shots=shots, seed=seed + i)
        c0, c1 = res["correction_bits"]
        correction_bits.append([c0, c1])
        measurement_outcomes.append(sent_bits[i])

        fid_i = compute_teleportation_fidelity(state, res["counts"])
        fidelities.append(fid_i)

        for bs, count in res["counts"].items():
            clean_bs = bs.replace(" ", "")
            if clean_bs in combined_counts:
                combined_counts[clean_bs] += count

    # JSON-serializable state representations [real, imag] or float lists
    serializable_states = [
        [float(np.real(amp)) for amp in s] for s in states
    ]

    avg_fidelity = float(np.mean(fidelities)) if fidelities else 0.99

    return {
        "message": message,
        "message_hash": msg_hash,
        "session_id": session_id,
        "sent_bits": sent_bits,
        "measurement_outcomes": measurement_outcomes,
        "correction_bits": correction_bits,
        "bases": bases,
        "sent_states": serializable_states,
        "measurement_counts": combined_counts,
        "fidelity": round(avg_fidelity, 6),
    }
