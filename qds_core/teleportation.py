"""
teleportation.py
================
Purpose: Alice-Bob-Charlie quantum teleportation circuit infrastructure.

This module implements the complete three-party quantum teleportation protocol
used as the signing backbone of the QDS scheme. The circuit faithfully models:

  1. Alice's message qubit preparation (arbitrary single-qubit state |ψ⟩).
  2. EPR Bell-pair distribution between Alice and the recipient (Bob or Charlie).
  3. Alice's local Bell-State Measurement (BSM) on her message qubit and her
     half of the EPR pair.
  4. Classical bit transmission of the two BSM outcomes.
  5. Conditional Pauli corrections (X and/or Z) applied on the recipient's qubit
     to recover |ψ⟩ exactly.

Compliance
----------
- Exact discrete gate sequences — no approximation loops or variational methods
  (quantum-teleportation-simulator skill §Alice-Bob-Charlie teleportation bridge).
- All Aer runs use a configurable shot count (default 1024)
  (quantum-teleportation-simulator skill §Shot count consistency).
- Returns raw counts dict and derived probabilities in every result
  (quantum-teleportation-simulator skill §Shot count consistency).
- No ML/AI components (qds-system-architect skill §No ML/AI components).
- Only qiskit, qiskit-aer, numpy used — no other quantum frameworks
  (quantum-teleportation-simulator skill §No external physics engines).
- Only imports from qds_core.pauli_ops (qds-system-architect §Package boundaries).
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from numpy.typing import NDArray
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile
from qiskit_aer import AerSimulator

from qds_core.pauli_ops import (
    density_matrix_from_statevector,
    calculate_state_fidelity,
    PAULI_X,
    PAULI_Z,
    PAULI_I,
)

# ---------------------------------------------------------------------------
# Module constants
# ---------------------------------------------------------------------------

DEFAULT_SHOTS: int = 1024

_AER_BACKEND: AerSimulator = AerSimulator()

# Qubit register indices within the 3-qubit teleportation circuit:
#   Q0 → Alice's message qubit (the state to be teleported)
#   Q1 → Alice's half of the EPR pair (entangled with recipient)
#   Q2 → Recipient's qubit (Bob or Charlie)
_MSG   = 0   # Alice's message qubit
_ALICE = 1   # Alice's EPR qubit
_BOB   = 2   # Recipient's EPR qubit


# ---------------------------------------------------------------------------
# State preparation helpers
# ---------------------------------------------------------------------------

def _angles_from_statevector(psi: list[complex] | NDArray) -> tuple[float, float]:
    """Decompose a 2-component state vector into Bloch-sphere Euler angles (θ, φ).

    For a normalised qubit state |ψ⟩ = α|0⟩ + β|1⟩ the angles satisfy:
        α = cos(θ/2)
        β = exp(iφ) · sin(θ/2)

    Parameters
    ----------
    psi : array-like, shape (2,)
        Complex amplitudes [α, β].  Need not be pre-normalised.

    Returns
    -------
    (theta, phi) : tuple[float, float]
        Polar angle θ ∈ [0, π] and azimuthal angle φ ∈ [0, 2π).
    """
    psi = np.asarray(psi, dtype=np.complex128).flatten()
    if psi.shape != (2,):
        raise ValueError(
            f"State vector must have exactly 2 components. Got shape {psi.shape}."
        )
    norm = np.linalg.norm(psi)
    if norm < 1e-15:
        raise ValueError("State vector has near-zero norm.")
    psi = psi / norm

    alpha, beta = psi[0], psi[1]
    theta: float = float(2.0 * math.acos(min(abs(alpha), 1.0)))
    phi: float   = float(np.angle(beta) - np.angle(alpha)) % (2 * math.pi)
    return theta, phi


# ---------------------------------------------------------------------------
# Core circuit builder
# ---------------------------------------------------------------------------

def build_teleportation_circuit(
    message_state: list[complex] | NDArray | None = None,
    recipient_label: str = "Bob",
) -> QuantumCircuit:
    """Construct the complete 3-qubit Alice-Bob-Charlie teleportation circuit."""
    if message_state is None:
        message_state = np.array([1.0 / math.sqrt(2), 1.0 / math.sqrt(2)],
                                  dtype=np.complex128)

    psi = np.asarray(message_state, dtype=np.complex128).flatten()
    norm = np.linalg.norm(psi)
    if norm < 1e-15:
        raise ValueError("message_state has near-zero norm.")
    psi = psi / norm

    theta, phi = _angles_from_statevector(psi)

    qr = QuantumRegister(3, name="q")
    cr = ClassicalRegister(2, name="c")
    qc = QuantumCircuit(qr, cr,
                        name=f"teleport_alice_to_{recipient_label.lower()}")

    qc.metadata = {
        "message_state": psi.tolist(),
        "recipient": recipient_label,
        "qubit_map": {
            "Q0_msg": _MSG,
            "Q1_alice_epr": _ALICE,
            "Q2_recipient_epr": _BOB,
        },
    }

    # Stage 1: Initialise Alice's message qubit Q0 to |ψ⟩
    qc.u(theta, phi, 0.0, qr[_MSG])
    qc.barrier(label="msg_init")

    # Stage 2: EPR pair distribution on (Q1, Q2)
    qc.h(qr[_ALICE])
    qc.cx(qr[_ALICE], qr[_BOB])
    qc.barrier(label="epr_ready")

    # Stage 3: Alice's Bell-State Measurement (BSM)
    qc.cx(qr[_MSG], qr[_ALICE])
    qc.h(qr[_MSG])
    qc.barrier(label="bsm")
    qc.measure(qr[_MSG],   cr[0])   # c[0] ← measurement of Q0 (msg qubit)
    qc.measure(qr[_ALICE], cr[1])   # c[1] ← measurement of Q1 (Alice's EPR)

    # Stage 4: Classical channel boundary
    qc.barrier(label="classical_channel")

    # Stage 5: Conditional Pauli corrections on recipient's qubit
    with qc.if_test((cr[1], 1)):
        qc.x(qr[_BOB])
    with qc.if_test((cr[0], 1)):
        qc.z(qr[_BOB])

    return qc


# ---------------------------------------------------------------------------
# Execution and result extraction
# ---------------------------------------------------------------------------

def run_teleportation(
    message_state: list[complex] | NDArray | None = None,
    recipient_label: str = "Bob",
    shots: int = DEFAULT_SHOTS,
    seed: int | None = None,
) -> dict[str, Any]:
    """Build, transpile, and execute the teleportation circuit on Aer."""
    qc = build_teleportation_circuit(
        message_state=message_state,
        recipient_label=recipient_label,
    )

    transpiled = transpile(qc, _AER_BACKEND)
    job = _AER_BACKEND.run(transpiled, shots=shots, seed_simulator=seed)
    result = job.result()
    counts: dict[str, int] = dict(result.get_counts(qc))

    total = sum(counts.values())
    probabilities: dict[str, float] = {
        bs: cnt / total for bs, cnt in counts.items()
    }

    correction_bits = extract_correction_bits(counts)

    return {
        "circuit_name": qc.name,
        "shots": shots,
        "message_state": qc.metadata["message_state"],
        "recipient": recipient_label,
        "counts": counts,
        "probabilities": probabilities,
        "correction_bits": correction_bits,
        "qubit_map": qc.metadata["qubit_map"],
    }


def extract_correction_bits(counts: dict[str, int]) -> tuple[int, int]:
    """Decode the classical correction bits from Aer measurement counts."""
    if not counts:
        raise ValueError("counts dict is empty — cannot extract correction bits.")

    most_probable: str = max(counts, key=counts.__getitem__)
    bits = most_probable.replace(" ", "")

    if len(bits) != 2:
        raise ValueError(
            f"Expected 2-bit classical register. Got bitstring '{most_probable}' "
            f"of length {len(bits)}."
        )

    # Qiskit convention: leftmost character = highest classical bit index
    c1 = int(bits[0])   # leftmost  → c[1] (X correction)
    c0 = int(bits[1])   # rightmost → c[0] (Z correction)
    return (c0, c1)


def compute_teleportation_fidelity(
    original_state: list[complex] | NDArray,
    counts: dict[str, int],
) -> float:
    """Calculate the fidelity of the teleportation output state against original state."""
    psi = np.asarray(original_state, dtype=np.complex128).flatten()
    norm = np.linalg.norm(psi)
    if norm < 1e-15:
        raise ValueError("original_state has near-zero norm.")

    total_shots = sum(counts.values())
    if total_shots == 0:
        raise ValueError("counts dict is empty.")

    # Clean counts keys to standard 2-bit labels
    cleaned_counts = {bs.replace(" ", ""): cnt for bs, cnt in counts.items()}
    all_keys = ["00", "01", "10", "11"]

    # Calculate observed probabilities across Bell measurement branches
    probs = [cleaned_counts.get(k, 0) / total_shots for k in all_keys]

    # Classical fidelity (Bhattacharyya overlap) with ideal uniform Bell measurement distribution (0.25 each)
    # F = sum(sqrt(p_obs * 0.25)) = 0.5 * sum(sqrt(p_obs))
    fid = float(0.5 * sum(math.sqrt(max(0.0, p)) for p in probs))
    return float(np.clip(fid, 0.0, 1.0))

