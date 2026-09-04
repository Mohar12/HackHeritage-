"""
pauli_ops.py
============
Purpose: Core linear algebra, Pauli matrices, Bell-state definitions, state fidelity,
and mutually unbiased basis (MUB) eigenstate encoding for QDS.

MUB Eigenstate Encoding
-----------------------
Information-theoretic QDS security (Gottesman & Chuang 2001; Dunjko et al. 2014)
requires message qubits to be encoded as non-orthogonal Pauli eigenstates drawn
from the three mutually unbiased bases {X, Y, Z}, i.e.:

  Z-basis: |0⟩ = [1, 0],          |1⟩ = [0, 1]
  X-basis: |+⟩ = [1,  1]/√2,      |−⟩ = [1, −1]/√2
  Y-basis: |+i⟩ = [1,  i]/√2,     |−i⟩ = [1, −i]/√2

Using only Z-basis states {|0⟩, |1⟩} (as in a classical encoding) allows an
eavesdropper to measure in the Z-basis without inducing detectable disturbance.
MUB encoding removes this loophole: Eve cannot choose a measurement basis that
avoids introducing at least 25% average error across all encoded qubits.

Protocol flow:
  - Key distribution still uses two-basis (X/Z) BB84-style Pauli eigenstates.
  - Signing payload uses MUB eigenstates: basis per qubit is randomly drawn from
    {X, Y, Z} using a seeded PRNG; only the authenticated sender (Alice) knows
    the encoding basis string.
  - Verification: Bob projects received states onto the declared basis; QBER
    is evaluated over matching-basis positions only (sifted key post-selection).
  - The Y basis is implemented in the MUB table and general measurement machinery;
    exercise in the signing/verification pipeline now uses all three bases.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from numpy.typing import NDArray
from qiskit import QuantumCircuit

ComplexMatrix = NDArray[np.complex128]

PAULI_I: ComplexMatrix = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.complex128)
PAULI_X: ComplexMatrix = np.array([[0.0, 1.0], [1.0, 0.0]], dtype=np.complex128)
PAULI_Y: ComplexMatrix = np.array([[0.0, -1j], [1j, 0.0]], dtype=np.complex128)
PAULI_Z: ComplexMatrix = np.array([[1.0, 0.0], [0.0, -1.0]], dtype=np.complex128)

_PAULI_MAP: dict[str, ComplexMatrix] = {
    "I": PAULI_I,
    "X": PAULI_X,
    "Y": PAULI_Y,
    "Z": PAULI_Z,
}

_BELL_STATE_LABELS: dict[int, str] = {
    0: "phi_plus",
    1: "phi_minus",
    2: "psi_plus",
    3: "psi_minus",
}



# ---------------------------------------------------------------------------
# Mutually Unbiased Basis (MUB) Eigenstates
# ---------------------------------------------------------------------------
# Six Pauli eigenstates spanning the three MUBs: {Z, X, Y}
# These are the canonical non-orthogonal states required for
# information-theoretically secure QDS encoding (Gottesman & Chuang 2001).
# Format: MUB_EIGENSTATES[basis][bit] → (label, state_vector)

MUB_EIGENSTATES: dict[str, list[tuple[str, ComplexMatrix]]] = {
    "Z": [
        ("|0⟩", np.array([1.0, 0.0], dtype=np.complex128)),           # bit=0
        ("|1⟩", np.array([0.0, 1.0], dtype=np.complex128)),           # bit=1
    ],
    "X": [
        ("|+⟩", np.array([1.0, 1.0], dtype=np.complex128) / math.sqrt(2)),    # bit=0
        ("|−⟩", np.array([1.0, -1.0], dtype=np.complex128) / math.sqrt(2)),   # bit=1
    ],
    "Y": [
        ("|+i⟩", np.array([1.0, 1j], dtype=np.complex128) / math.sqrt(2)),    # bit=0
        ("|−i⟩", np.array([1.0, -1j], dtype=np.complex128) / math.sqrt(2)),   # bit=1
    ],
}

_MUB_BASES: list[str] = ["X", "Y", "Z"]


def encode_pauli_eigenstate(basis: str, bit: int) -> ComplexMatrix:
    """Encode a classical bit as a Pauli eigenstate in the given MUB basis.

    This is the core building block for information-theoretically secure QDS
    message encoding. Using states from three mutually unbiased bases prevents
    an eavesdropper from choosing a measurement basis that avoids error
    introduction: any non-basis-matched measurement collapses the state with
    50% error probability for the wrong basis outcomes.

    Parameters
    ----------
    basis : str
        One of 'X', 'Y', 'Z' (case-insensitive).
    bit : int
        Classical bit value: 0 or 1.

    Returns
    -------
    ComplexMatrix
        Normalised 2-component complex state vector (|0⟩, |1⟩, |+⟩, etc.)

    Raises
    ------
    ValueError
        If basis is not in {X, Y, Z} or bit is not in {0, 1}.
    """
    b = basis.upper().strip()
    if b not in MUB_EIGENSTATES:
        raise ValueError(
            f"Basis must be one of 'X', 'Y', 'Z'. Got '{basis}'."
        )
    if bit not in (0, 1):
        raise ValueError(f"bit must be 0 or 1. Got {bit}.")
    _label, state = MUB_EIGENSTATES[b][bit]
    return state.copy()


def generate_mub_bases(num_qubits: int, seed: int | None = None) -> list[str]:
    """Generate a random sequence of MUB basis labels for QDS encoding.

    Draws uniformly from {X, Y, Z} for each qubit position using a seeded
    deterministic PRNG. Only the sender (Alice) retains this basis string;
    the receiver must receive it over the authenticated classical channel.

    Parameters
    ----------
    num_qubits : int
        Number of basis labels to generate (≥ 1).
    seed : int | None
        PRNG seed for reproducibility. None → non-deterministic.

    Returns
    -------
    list[str]
        List of basis labels, e.g. ['X', 'Z', 'Y', 'X', ...].
    """
    if num_qubits < 1:
        raise ValueError(f"num_qubits must be ≥ 1. Got {num_qubits}.")
    rng = np.random.default_rng(seed)
    indices = rng.integers(0, 3, size=num_qubits)
    return [_MUB_BASES[i] for i in indices]


def get_pauli_matrix(label: str) -> ComplexMatrix:
    l_upper = label.upper().strip()
    if l_upper not in _PAULI_MAP:
        raise ValueError(f"Unknown Pauli matrix '{label}'. Valid: I, X, Y, Z.")
    return _PAULI_MAP[l_upper].copy()


def prepare_bell_state(
    state_index: int = 0,
    attach_measurement: bool = False,
) -> QuantumCircuit:
    if state_index not in _BELL_STATE_LABELS:
        raise ValueError(
            f"state_index must be 0–3. Got {state_index}. Valid states: {_BELL_STATE_LABELS}"
        )

    qc = QuantumCircuit(2, 2 if attach_measurement else 0, name=f"bell_{_BELL_STATE_LABELS[state_index]}")

    if state_index in (1, 3):
        qc.x(0)

    qc.h(0)
    qc.cx(0, 1)

    if state_index in (2, 3):
        qc.x(1)

    if attach_measurement:
        qc.measure(0, 0)
        qc.measure(1, 1)

    return qc


def bell_measure(qc: QuantumCircuit, q0: int, q1: int,
                 c0: int, c1: int) -> QuantumCircuit:
    qc.cx(q0, q1)
    qc.h(q0)
    qc.measure(q0, c0)
    qc.measure(q1, c1)
    return qc


def apply_pauli_gate(qc: QuantumCircuit, qubit: int, pauli: str) -> QuantumCircuit:
    p = pauli.upper().strip()
    if p not in _PAULI_MAP:
        raise ValueError(f"Unknown Pauli gate '{pauli}'.")
    if p == "I":
        qc.id(qubit)
    elif p == "X":
        qc.x(qubit)
    elif p == "Y":
        qc.y(qubit)
    elif p == "Z":
        qc.z(qubit)
    return qc


def density_matrix_from_statevector(psi: list[complex] | NDArray) -> ComplexMatrix:
    psi_arr = np.asarray(psi, dtype=np.complex128).flatten()
    norm = np.linalg.norm(psi_arr)
    if norm < 1e-15:
        raise ValueError("Cannot form density matrix from near-zero vector.")
    psi_norm = psi_arr / norm
    return np.outer(psi_norm, psi_norm.conj())


def calculate_state_fidelity(
    rho: list[complex] | NDArray,
    sigma: list[complex] | NDArray,
) -> float:
    """Compute the quantum fidelity F(ρ, σ) between two density matrices or state vectors.

    Supports both 1-D pure state vectors (|ψ⟩, |φ⟩) and 2-D density matrices (ρ, σ).
    """
    rho_arr = np.asarray(rho, dtype=np.complex128)
    sigma_arr = np.asarray(sigma, dtype=np.complex128)

    # If 1-D state vectors are provided, convert to density matrices
    if rho_arr.ndim == 1:
        rho_mat = density_matrix_from_statevector(rho_arr)
    elif rho_arr.ndim == 2:
        if rho_arr.shape[0] != rho_arr.shape[1]:
            raise ValueError(f"rho must be square. Got {rho_arr.shape}")
        rho_mat = rho_arr
    else:
        raise ValueError(f"Invalid rho dimensions: {rho_arr.ndim}")

    if sigma_arr.ndim == 1:
        sigma_mat = density_matrix_from_statevector(sigma_arr)
    elif sigma_arr.ndim == 2:
        if sigma_arr.shape[0] != sigma_arr.shape[1]:
            raise ValueError(f"sigma must be square. Got {sigma_arr.shape}")
        sigma_mat = sigma_arr
    else:
        raise ValueError(f"Invalid sigma dimensions: {sigma_arr.ndim}")

    if rho_mat.shape != sigma_mat.shape:
        raise ValueError(f"Shape mismatch: {rho_mat.shape} vs {sigma_mat.shape}")

    # Uhlmann fidelity for density matrices: F(ρ, σ) = (Tr √(√ρ σ √ρ))²
    eigvals_rho, eigvecs_rho = np.linalg.eigh(rho_mat)
    sqrt_eigvals_rho = np.sqrt(np.maximum(eigvals_rho, 0.0))
    sqrt_rho = (eigvecs_rho * sqrt_eigvals_rho) @ eigvecs_rho.conj().T

    m = sqrt_rho @ sigma_mat @ sqrt_rho
    eigvals_m = np.linalg.eigvalsh(m)
    sqrt_eigvals_m = np.sqrt(np.maximum(eigvals_m, 0.0))

    fidelity = float(np.sum(sqrt_eigvals_m) ** 2)
    return float(np.clip(fidelity, 0.0, 1.0))


def generate_random_bases(num_qubits: int, seed: int | None = None) -> list[str]:
    if num_qubits < 1:
        raise ValueError(f"num_qubits must be ≥ 1. Got {num_qubits}.")
    rng = np.random.default_rng(seed)
    choices = rng.integers(0, 2, size=num_qubits)
    return ["X" if c == 0 else "Z" for c in choices]


def get_measurement_basis_matrix(basis: str) -> ComplexMatrix:
    b = basis.upper().strip()
    if b == "Z":
        return PAULI_Z.copy()
    elif b == "X":
        return PAULI_X.copy()
    elif b == "Y":
        return PAULI_Y.copy()
    else:
        raise ValueError(f"Unknown measurement basis '{basis}'. Valid: 'Z', 'X', 'Y'.")
