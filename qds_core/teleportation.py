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
    """Construct the complete 3-qubit Alice-Bob-Charlie teleportation circuit.

    The circuit is built in five exact stages:

    Stage 1 — Message qubit initialisation
        Alice's message qubit Q0 is initialised to |ψ⟩ = α|0⟩ + β|1⟩.
        Default: |+⟩ = (|0⟩ + |1⟩) / √2 (demonstrating superposition transport).

    Stage 2 — EPR pair distribution
        A |Φ⁺⟩ Bell pair is created on (Q1, Q2):
        H(Q1) → CNOT(Q1, Q2)
        Q1 stays with Alice; Q2 is handed to the recipient.

    Stage 3 — Alice's Bell-State Measurement (BSM)
        CNOT(Q0, Q1) → H(Q0)
        Alice measures Q0 → classical bit c0
                       Q1 → classical bit c1
        These two bits are transmitted over the authenticated classical channel.

    Stage 4 — Classical bit transmission (structural setup)
        A barrier separates the quantum operations from the conditional
        correction stage, representing the classical communication boundary.

    Stage 5 — Conditional Pauli corrections on recipient's qubit
        The recipient applies:
          X(Q2) if c1 = 1   (corrects bit flip)
          Z(Q2) if c0 = 1   (corrects phase flip)
        After corrections Q2 is in state |ψ⟩ — teleportation complete.

    Parameters
    ----------
    message_state : list[complex] | NDArray | None
        Two-component complex state vector [α, β] for Alice's message qubit.
        If ``None``, the default |+⟩ = [1/√2, 1/√2] is used.
    recipient_label : str
        Human-readable label for the recipient party (e.g. ``"Bob"`` or
        ``"Charlie"``). Used only for circuit naming/metadata.

    Returns
    -------
    QuantumCircuit
        Full 3-qubit / 2-classical-bit teleportation circuit, including
        conditional Pauli corrections.  Ready for Aer execution.
    """
    # ---- Stage 0: default message state -----------------------------------
    if message_state is None:
        message_state = np.array([1.0 / math.sqrt(2), 1.0 / math.sqrt(2)],
                                  dtype=np.complex128)

    psi = np.asarray(message_state, dtype=np.complex128).flatten()
    norm = np.linalg.norm(psi)
    if norm < 1e-15:
        raise ValueError("message_state has near-zero norm.")
    psi = psi / norm

    # Derive Bloch-sphere angles for Qiskit's initialize / u gate
    theta, phi = _angles_from_statevector(psi)

    # ---- Circuit registers ------------------------------------------------
    qr = QuantumRegister(3, name="q")   # q[0]=msg, q[1]=alice, q[2]=recipient
    cr = ClassicalRegister(2, name="c") # c[0]=Q0 meas, c[1]=Q1 meas
    qc = QuantumCircuit(qr, cr,
                        name=f"teleport_alice_to_{recipient_label.lower()}")

    # Store metadata for downstream result parsing
    qc.metadata = {
        "message_state": psi.tolist(),
        "recipient": recipient_label,
        "qubit_map": {
            "Q0_msg": _MSG,
            "Q1_alice_epr": _ALICE,
            "Q2_recipient_epr": _BOB,
        },
    }

    # ---- Stage 1: Initialise Alice's message qubit Q0 to |ψ⟩ -------------
    # Use Qiskit's U gate: U(θ, φ, λ=0) maps |0⟩ → cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩
    qc.u(theta, phi, 0.0, qr[_MSG])
    qc.barrier(label="msg_init")

    # ---- Stage 2: EPR pair distribution on (Q1, Q2) ----------------------
    # Prepare |Φ⁺⟩ = (|00⟩ + |11⟩)/√2  between Alice's EPR qubit and recipient
    qc.h(qr[_ALICE])
    qc.cx(qr[_ALICE], qr[_BOB])
    qc.barrier(label="epr_ready")

    # ---- Stage 3: Alice's Bell-State Measurement (BSM) -------------------
    # Entangle message qubit with Alice's EPR qubit, then measure both
    qc.cx(qr[_MSG], qr[_ALICE])
    qc.h(qr[_MSG])
    qc.barrier(label="bsm")
    qc.measure(qr[_MSG],   cr[0])   # c[0] ← measurement of Q0 (msg qubit)
    qc.measure(qr[_ALICE], cr[1])   # c[1] ← measurement of Q1 (Alice's EPR)

    # ---- Stage 4: Classical channel boundary (structural) -----------------
    qc.barrier(label="classical_channel")

    # ---- Stage 5: Conditional Pauli corrections on recipient's qubit ------
    # Apply X(Q2) if c[1] = 1  (bit-flip correction)
    qc.x(qr[_BOB]).c_if(cr[1], 1)
    # Apply Z(Q2) if c[0] = 1  (phase-flip correction)
    qc.z(qr[_BOB]).c_if(cr[0], 1)

    return qc


# ---------------------------------------------------------------------------
# Execution and result extraction
# ---------------------------------------------------------------------------

def run_teleportation(
    message_state: list[complex] | NDArray | None = None,
    recipient_label: str = "Bob",
    shots: int = DEFAULT_SHOTS,
) -> dict[str, Any]:
    """Build, transpile, and execute the teleportation circuit on Aer.

    Parameters
    ----------
    message_state : list[complex] | NDArray | None
        Two-component state vector for Alice's message qubit.
        Defaults to |+⟩ = [1/√2, 1/√2].
    recipient_label : str
        Label for the recipient party (used for naming and metadata).
    shots : int
        Number of Aer simulation shots.

    Returns
    -------
    dict[str, Any]
        Result dictionary containing:

        ``circuit_name`` : str
        ``shots`` : int
        ``message_state`` : list[complex]  — normalised input state
        ``recipient`` : str
        ``counts`` : dict[str, int]        — raw Aer measurement histogram
        ``probabilities`` : dict[str, float] — normalised Born probabilities
        ``correction_bits`` : tuple[int, int]  — (c0, c1) of most-probable shot
        ``qubit_map`` : dict               — qubit role assignments
    """
    qc = build_teleportation_circuit(
        message_state=message_state,
        recipient_label=recipient_label,
    )

    transpiled = transpile(qc, _AER_BACKEND)
    job = _AER_BACKEND.run(transpiled, shots=shots)
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
    """Decode the classical correction bits from Aer measurement counts.

    The two classical bits recorded in the BSM result encode the required
    Pauli corrections on the recipient's qubit:

      c[0] (bit position 1 in the 2-bit string) — controls Z correction
      c[1] (bit position 0 in the 2-bit string) — controls X correction

    The most-probable bitstring is used (max-likelihood decoding).

    Qiskit classical register convention:
      The 2-bit string is ``"c[1] c[0]"`` reading left-to-right,
      i.e. the string ``"10"`` means c[1]=1, c[0]=0.

    Parameters
    ----------
    counts : dict[str, int]
        Raw Aer measurement count dictionary from a teleportation circuit.

    Returns
    -------
    tuple[int, int]
        ``(c0, c1)`` where:
          c0 ∈ {0, 1} — Z-correction required if 1
          c1 ∈ {0, 1} — X-correction required if 1

    Raises
    ------
    ValueError
        If ``counts`` is empty or bitstrings are not exactly 2 characters.
    """
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
    # For ClassicalRegister("c", 2): string is "c[1]c[0]"
    c1 = int(bits[0])   # leftmost  → c[1] (X correction)
    c0 = int(bits[1])   # rightmost → c[0] (Z correction)
    return (c0, c1)


# ---------------------------------------------------------------------------
# Verification helper
# ---------------------------------------------------------------------------

def compute_teleportation_fidelity(
    original_state: list[complex] | NDArray,
    counts: dict[str, int],
) -> float:
    """Estimate the teleportation fidelity from simulation counts.

    Under ideal (noise-free) conditions the teleported state should match
    the original |ψ⟩ with fidelity 1.0. This function computes the fidelity
    between the ideal target density matrix and the estimated output density
    matrix derived from the Born-rule probability of the correct correction.

    For the |Φ⁺⟩ EPR pair and an ideal measurement, each of the four
    correction outcomes (00, 01, 10, 11) is equally likely (~25% each).
    All outcomes, after their respective Pauli corrections, should yield the
    same final state — so the fidelity estimate uses the probability-weighted
    sum of correction-outcome densities.

    Parameters
    ----------
    original_state : array-like, shape (2,)
        Alice's original message state vector [α, β].
    counts : dict[str, int]
        Raw Aer counts from a teleportation circuit run.

    Returns
    -------
    float
        Estimated fidelity ∈ [0.0, 1.0]. Values ≥ 0.99 indicate
        noise-free teleportation (pauli-measurement-validator §Pauli
        correction validation).
    """
    psi = np.asarray(original_state, dtype=np.complex128).flatten()
    psi /= np.linalg.norm(psi)
    rho_ideal = density_matrix_from_statevector(psi)

    total_shots = sum(counts.values())
    if total_shots == 0:
        raise ValueError("counts dict is empty.")

    # Pauli correction matrices indexed by (c0, c1) — (Z, X) corrections
    _corrections: dict[tuple[int, int], NDArray] = {
        (0, 0): PAULI_I,
        (0, 1): PAULI_X,           # X correction only
        (1, 0): PAULI_Z,           # Z correction only
        (1, 1): PAULI_Z @ PAULI_X, # Both Z and X
    }

    rho_actual = np.zeros_like(rho_ideal, dtype=np.complex128)

    for bitstring, count in counts.items():
        bits = bitstring.replace(" ", "")
        if len(bits) != 2:
            continue
        c1, c0 = int(bits[0]), int(bits[1])
        weight = count / total_shots
        correction = _corrections[(c0, c1)]
        corrected_psi = correction @ psi
        corrected_psi /= np.linalg.norm(corrected_psi)
        rho_actual += weight * density_matrix_from_statevector(corrected_psi)

    return calculate_state_fidelity(rho_ideal, rho_actual)
