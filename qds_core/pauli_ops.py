"""
pauli_ops.py
============
Purpose: Shared Pauli operator and Bell-state utilities for the QDS framework.

Provides:
  - Exact 2×2 complex128 Pauli matrices (I, X, Y, Z)
  - Bell-state preparation circuits for all four maximally entangled states
  - Bell-basis measurement circuit helper
  - Exact quantum state fidelity via density-matrix trace / Uhlmann formula
  - Deterministic random basis generation (seeded numpy RNG)

Compliance
----------
- All matrices use numpy complex128 dtype (pauli-measurement-validator skill).
- Fidelity uses the exact Uhlmann formula via eigenvalue decomposition —
  no heuristic approximations (pauli-measurement-validator skill §Fidelity).
- Basis arrays are generated from a seeded deterministic source
  (pauli-measurement-validator skill §Deterministic basis arrays).
- No ML/AI components anywhere in this module
  (qds-system-architect skill §No ML/AI components).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray
from qiskit import QuantumCircuit

# ---------------------------------------------------------------------------
# Type alias
# ---------------------------------------------------------------------------
ComplexMatrix = NDArray[np.complexfloating]

# ---------------------------------------------------------------------------
# Pauli Matrices — exact 2×2 complex128 representations
# (pauli-measurement-validator skill: "All matrix operations must use
#  numpy complex128 dtype.")
# ---------------------------------------------------------------------------

PAULI_I: ComplexMatrix = np.array(
    [[1, 0],
     [0, 1]],
    dtype=np.complex128,
)
"""Identity operator I₂."""

PAULI_X: ComplexMatrix = np.array(
    [[0, 1],
     [1, 0]],
    dtype=np.complex128,
)
"""Pauli-X (σₓ) — bit-flip operator."""

PAULI_Y: ComplexMatrix = np.array(
    [[0, -1j],
     [1j,  0]],
    dtype=np.complex128,
)
"""Pauli-Y (σᵧ) — combined bit-and-phase flip operator."""

PAULI_Z: ComplexMatrix = np.array(
    [[ 1,  0],
     [ 0, -1]],
    dtype=np.complex128,
)
"""Pauli-Z (σ_z) — phase-flip operator."""

_PAULI_MAP: dict[str, ComplexMatrix] = {
    "I": PAULI_I,
    "X": PAULI_X,
    "Y": PAULI_Y,
    "Z": PAULI_Z,
}

# ---------------------------------------------------------------------------
# Bell-state index → preparation parameters
# (quantum-teleportation-simulator skill §All four Bell states)
# ---------------------------------------------------------------------------
#  Index  State   Circuit preparation
#  0      |Φ⁺⟩   H(q0) ; CNOT(q0,q1)
#  1      |Φ⁻⟩   X(q0) ; H(q0) ; CNOT(q0,q1)
#  2      |Ψ⁺⟩   H(q0) ; CNOT(q0,q1) ; X(q1)
#  3      |Ψ⁻⟩   X(q0) ; H(q0) ; CNOT(q0,q1) ; X(q1)

_BELL_STATE_LABELS: dict[int, str] = {
    0: "|Φ⁺⟩",
    1: "|Φ⁻⟩",
    2: "|Ψ⁺⟩",
    3: "|Ψ⁻⟩",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_pauli_matrix(basis: str) -> ComplexMatrix:
    """Return the 2×2 complex128 matrix for the named Pauli operator.

    Parameters
    ----------
    basis : str
        One of ``'I'``, ``'X'``, ``'Y'``, ``'Z'``.

    Returns
    -------
    ComplexMatrix
        Exact 2×2 numpy array with dtype complex128.

    Raises
    ------
    ValueError
        If ``basis`` is not one of the four recognised labels.
    """
    key = basis.upper().strip()
    if key not in _PAULI_MAP:
        raise ValueError(
            f"Unknown Pauli basis '{basis}'. "
            f"Valid options: {list(_PAULI_MAP.keys())}"
        )
    return _PAULI_MAP[key].copy()


def prepare_bell_state(state_index: int = 0) -> QuantumCircuit:
    """Construct a 2-qubit Qiskit circuit that prepares a Bell state.

    All four maximally entangled Bell states are supported via exact
    Hadamard + CNOT gate constructions — no approximations.

    Parameters
    ----------
    state_index : int
        Selects the target Bell state:
        - 0 → |Φ⁺⟩ = (|00⟩ + |11⟩) / √2
        - 1 → |Φ⁻⟩ = (|00⟩ − |11⟩) / √2
        - 2 → |Ψ⁺⟩ = (|01⟩ + |10⟩) / √2
        - 3 → |Ψ⁻⟩ = (|01⟩ − |10⟩) / √2

    Returns
    -------
    QuantumCircuit
        2-qubit circuit in the chosen Bell state (no measurements attached).

    Raises
    ------
    ValueError
        If ``state_index`` is not in {0, 1, 2, 3}.
    """
    if state_index not in _BELL_STATE_LABELS:
        raise ValueError(
            f"state_index must be 0–3. Got {state_index}. "
            f"Valid states: {_BELL_STATE_LABELS}"
        )

    qc = QuantumCircuit(2, name=f"bell_{_BELL_STATE_LABELS[state_index]}")

    # Pre-flips that distinguish the four Bell states
    if state_index in (1, 3):   # |Φ⁻⟩ or |Ψ⁻⟩ — flip q0 before Hadamard
        qc.x(0)

    # Core EPR entanglement: H on q0 → CNOT(q0 → q1)
    qc.h(0)
    qc.cx(0, 1)

    # Post-flip on q1 distinguishes Ψ states from Φ states
    if state_index in (2, 3):   # |Ψ⁺⟩ or |Ψ⁻⟩
        qc.x(1)

    return qc


def bell_measure(qc: QuantumCircuit, q0: int, q1: int,
                 c0: int, c1: int) -> QuantumCircuit:
    """Append a Bell-basis measurement to an existing circuit in-place.

    Implements the standard Bell-basis measurement sequence:
    CNOT(q0→q1) → H(q0) → measure q0→c0, q1→c1.

    Parameters
    ----------
    qc : QuantumCircuit
        Circuit to modify in-place.
    q0, q1 : int
        Qubit indices for the Bell measurement (q0 is the sender qubit).
    c0, c1 : int
        Classical bit indices to store the two measurement results.

    Returns
    -------
    QuantumCircuit
        The same circuit (mutated), returned for chaining convenience.
    """
    qc.cx(q0, q1)
    qc.h(q0)
    qc.measure(q0, c0)
    qc.measure(q1, c1)
    return qc


def apply_pauli_gate(qc: QuantumCircuit, qubit: int, pauli: str) -> QuantumCircuit:
    """Append a named Pauli gate to a qubit in an existing circuit.

    Parameters
    ----------
    qc : QuantumCircuit
        Circuit to modify in-place.
    qubit : int
        Index of the target qubit.
    pauli : str
        Gate to apply: ``'I'``, ``'X'``, ``'Y'``, or ``'Z'``.

    Returns
    -------
    QuantumCircuit
        The same circuit (mutated), returned for chaining convenience.

    Raises
    ------
    ValueError
        If ``pauli`` is not a recognised Pauli gate label.
    """
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


def calculate_state_fidelity(
    rho: ComplexMatrix,
    sigma: ComplexMatrix,
) -> float:
    """Compute the quantum fidelity F(ρ, σ) between two density matrices.

    Uses the exact Uhlmann fidelity formula for mixed states:

        F(ρ, σ) = ( Tr( √( √ρ · σ · √ρ ) ) )²

    Implementation strategy
    -----------------------
    1. Compute √ρ via eigenvalue decomposition (numpy, exact linear algebra).
    2. Form the product M = √ρ · σ · √ρ.
    3. Compute the eigenvalues of M (Hermitian semi-definite).
    4. Sum √(max(λᵢ, 0)) to handle floating-point rounding near zero.
    5. Square the result and clamp to [0.0, 1.0].

    For pure states |ψ⟩ and |φ⟩ this reduces to F = |⟨ψ|φ⟩|²,
    consistent with the Born-rule transition probability.

    Parameters
    ----------
    rho, sigma : ComplexMatrix
        Square numpy arrays (dtype complex128) representing density matrices.
        Must satisfy: Hermitian, positive semi-definite, Tr = 1.

    Returns
    -------
    float
        Fidelity value clamped to [0.0, 1.0].

    Raises
    ------
    ValueError
        If shapes are incompatible or matrices are not square.
    """
    rho = np.asarray(rho, dtype=np.complex128)
    sigma = np.asarray(sigma, dtype=np.complex128)

    if rho.ndim != 2 or rho.shape[0] != rho.shape[1]:
        raise ValueError(f"rho must be a square 2-D array. Got shape {rho.shape}.")
    if sigma.shape != rho.shape:
        raise ValueError(
            f"sigma shape {sigma.shape} does not match rho shape {rho.shape}."
        )

    # Compute matrix square root of rho via eigendecomposition.
    # rho is Hermitian → eigenvalues are real.
    eigvals_rho, eigvecs_rho = np.linalg.eigh(rho)

    # Clamp small negatives introduced by floating-point arithmetic.
    sqrt_eigvals_rho = np.sqrt(np.maximum(eigvals_rho, 0.0))

    # √ρ = V · diag(√λ) · V†
    sqrt_rho: ComplexMatrix = (
        eigvecs_rho * sqrt_eigvals_rho
    ) @ eigvecs_rho.conj().T

    # M = √ρ · σ · √ρ  (Hermitian positive semi-definite)
    M: ComplexMatrix = sqrt_rho @ sigma @ sqrt_rho

    # Eigenvalues of M — should all be non-negative
    eigvals_M = np.linalg.eigvalsh(M)

    # Fidelity = ( Σ √(max(λᵢ, 0)) )²
    fidelity_raw: float = float(np.sum(np.sqrt(np.maximum(eigvals_M, 0.0))) ** 2)

    # Clamp strictly to [0.0, 1.0] to absorb numerical drift
    return float(np.clip(fidelity_raw, 0.0, 1.0))


def generate_random_bases(num_qubits: int, seed: int | None = None) -> list[str]:
    """Generate a deterministic list of random measurement bases per qubit.

    Each qubit is independently assigned either the X-basis (σₓ) or the
    Z-basis (σ_z) with equal probability 0.5 using a seeded numpy Generator.

    Parameters
    ----------
    num_qubits : int
        Number of qubits requiring a basis assignment.
    seed : int | None
        Seed for ``numpy.random.default_rng``. When provided, the output is
        fully deterministic across runs (required for reproducible QDS sessions).
        Pass ``None`` only when genuine randomness is required (e.g. live key
        exchange — NOT in core simulation paths).

    Returns
    -------
    list[str]
        List of length ``num_qubits`` where each element is ``'X'`` or ``'Z'``.

    Raises
    ------
    ValueError
        If ``num_qubits < 1``.
    """
    if num_qubits < 1:
        raise ValueError(f"num_qubits must be ≥ 1. Got {num_qubits}.")

    rng = np.random.default_rng(seed)
    choices = rng.integers(0, 2, size=num_qubits)   # 0 → 'X', 1 → 'Z'
    return ["X" if c == 0 else "Z" for c in choices]


def density_matrix_from_statevector(psi: NDArray) -> ComplexMatrix:
    """Compute the density matrix ρ = |ψ⟩⟨ψ| from a pure state vector.

    Parameters
    ----------
    psi : array-like
        1-D complex state vector of dimension 2^n. Need not be normalised;
        this function normalises it before computing the outer product.

    Returns
    -------
    ComplexMatrix
        Density matrix of shape (len(psi), len(psi)), dtype complex128.
    """
    psi = np.asarray(psi, dtype=np.complex128).flatten()
    norm = np.linalg.norm(psi)
    if norm < 1e-15:
        raise ValueError("State vector has near-zero norm — cannot normalise.")
    psi = psi / norm
    return np.outer(psi, psi.conj())
