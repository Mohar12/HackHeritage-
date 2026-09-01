"""
channel_manipulation.py
=======================
Purpose: Quantum channel manipulation attack simulations for the QDS threat
detection framework.

This module models two classes of active adversarial attacks on the quantum
channel between Alice and her recipients (Bob / Charlie):

  1. **Intercept-Resend Attack** — Eve intercepts each flying qubit, measures
     it in a randomly chosen basis (X or Z), collapses the quantum state, and
     forwards her re-prepared guess to the intended recipient. This introduces
     a predictable QBER ≈ 0.25 whenever Alice and Eve choose mismatched bases.

  2. **Depolarizing Noise Injection** — A controllable depolarizing channel is
     applied to the circuit, modelling non-malicious (or malicious) environmental
     noise. Implemented both as a Qiskit Aer NoiseModel (for circuit-level
     simulation) and as an explicit Kraus-operator superoperator on density
     matrices (for analytic cross-validation).

Compliance
----------
- No ML/AI components anywhere in this module.
- Only qiskit, qiskit-aer, numpy used (no QuTiP, PennyLane, etc.).
- All Aer runs use a fixed, configurable shot count (default 1024).
- Basis selection uses seeded numpy.random.default_rng for reproducibility.
- Import direction: attack_sim only imports from qds_core (never upward).

References
----------
- Gisin et al., Quantum Cryptography, Rev. Mod. Phys. 74, 145 (2002)
- Scarani et al., The Security of Practical QKD, Rev. Mod. Phys. 81, 1301 (2009)
- Nielsen & Chuang, QCQI (2000), §8.3 — Depolarizing channel Kraus operators
"""

from __future__ import annotations

from typing import Any

import numpy as np
from numpy.typing import NDArray
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit_aer.noise import (
    NoiseModel,
    depolarizing_error,
)

from qds_core.pauli_ops import (
    PAULI_I,
    PAULI_X,
    PAULI_Y,
    PAULI_Z,
    generate_random_bases,
    density_matrix_from_statevector,
    calculate_state_fidelity,
)
from qds_core.key_distribution import HARDWARE_BASELINE_QBER, DEFAULT_SHOTS

# ---------------------------------------------------------------------------
# Module constants
# ---------------------------------------------------------------------------

_AER_BACKEND: AerSimulator = AerSimulator()

#: Theoretical QBER introduced by a perfect intercept-resend attack on
#: BB84-encoded qubits (Eve and Alice disagree on basis 50% of the time;
#: a basis mismatch causes a 50% error → overall QBER = 0.25).
THEORETICAL_IR_QBER: float = 0.25

# ---------------------------------------------------------------------------
# Basis measurement helpers (Eve's projective measurement model)
# ---------------------------------------------------------------------------

#: Projectors for Z-basis: {|0⟩⟨0|, |1⟩⟨1|}
_Z_PROJECTORS: list[NDArray] = [
    np.array([[1, 0], [0, 0]], dtype=np.complex128),  # |0⟩⟨0|
    np.array([[0, 0], [0, 1]], dtype=np.complex128),  # |1⟩⟨1|
]

#: Projectors for X-basis: {|+⟩⟨+|, |−⟩⟨−|}
_X_PROJECTORS: list[NDArray] = [
    np.array([[0.5, 0.5], [0.5, 0.5]], dtype=np.complex128),   # |+⟩⟨+|
    np.array([[0.5, -0.5], [-0.5, 0.5]], dtype=np.complex128), # |−⟩⟨−|
]

_BASIS_PROJECTORS: dict[str, list[NDArray]] = {
    "Z": _Z_PROJECTORS,
    "X": _X_PROJECTORS,
}

#: Post-measurement states Eve forwards to the recipient (eigenstates)
_Z_EIGENSTATES: list[NDArray] = [
    np.array([1.0, 0.0], dtype=np.complex128),  # |0⟩
    np.array([0.0, 1.0], dtype=np.complex128),  # |1⟩
]
_X_EIGENSTATES: list[NDArray] = [
    np.array([1.0 / np.sqrt(2), 1.0 / np.sqrt(2)], dtype=np.complex128),   # |+⟩
    np.array([1.0 / np.sqrt(2), -1.0 / np.sqrt(2)], dtype=np.complex128),  # |−⟩
]
_BASIS_EIGENSTATES: dict[str, list[NDArray]] = {
    "Z": _Z_EIGENSTATES,
    "X": _X_EIGENSTATES,
}


def _measure_in_basis(
    state_vector: NDArray,
    basis: str,
    rng: np.random.Generator,
) -> tuple[int, NDArray]:
    """Project a qubit state vector onto a measurement basis using Born rule.

    This models Eve's projective (von Neumann) measurement — no POVM.
    The outcome is selected stochastically using ``rng`` (seeded).

    Parameters
    ----------
    state_vector : NDArray, shape (2,)
        Normalised complex qubit state to measure.
    basis : str
        ``'X'`` or ``'Z'``.
    rng : np.random.Generator
        Seeded generator for reproducible outcome selection.

    Returns
    -------
    (outcome, post_state) : tuple[int, NDArray]
        ``outcome`` ∈ {0, 1} — measurement result index.
        ``post_state`` — the eigenstate Eve forwards after collapse.
    """
    if basis not in _BASIS_PROJECTORS:
        raise ValueError(f"Basis must be 'X' or 'Z'. Got '{basis}'.")

    psi = np.asarray(state_vector, dtype=np.complex128).flatten()
    norm = np.linalg.norm(psi)
    if norm > 1e-15:
        psi = psi / norm

    projectors = _BASIS_PROJECTORS[basis]
    # Born-rule probabilities: P(k) = ⟨ψ|Πₖ|ψ⟩ = real(ψ† · Πₖ · ψ)
    probs = np.array(
        [float(np.real(psi.conj() @ P @ psi)) for P in projectors],
        dtype=np.float64,
    )
    # Numerical safety: clamp negatives and re-normalise
    probs = np.maximum(probs, 0.0)
    probs /= probs.sum()

    outcome: int = int(rng.choice([0, 1], p=probs))
    post_state: NDArray = _BASIS_EIGENSTATES[basis][outcome]
    return outcome, post_state


# ---------------------------------------------------------------------------
# 1. Intercept-Resend Attack
# ---------------------------------------------------------------------------

def simulate_intercept_resend(
    alice_states: list[NDArray],
    alice_bases: list[str],
    recipient_bases: list[str],
    seed: int = 42,
) -> dict[str, Any]:
    """Simulate Eve's intercept-resend attack on the QDS quantum channel.

    For each qubit in Alice's state sequence:
      1. Eve randomly chooses a measurement basis (X or Z).
      2. Eve measures the intercepted qubit — state collapses (Born rule).
      3. Eve re-prepares and forwards the post-measurement eigenstate.
      4. The recipient measures in their own basis.

    When Eve's basis matches Alice's basis, no error is introduced.
    When they differ, a 50% error rate is injected — yielding the
    theoretical QBER ≈ 0.25 for uniformly random Eve basis choices.

    Parameters
    ----------
    alice_states : list[NDArray]
        Alice's prepared qubit state vectors, each of shape (2,).
    alice_bases : list[str]
        Measurement bases Alice used to prepare each qubit ('X' or 'Z').
    recipient_bases : list[str]
        Measurement bases chosen by Bob/Charlie for each qubit position.
    seed : int
        Seed for Eve's basis RNG. Defaults to 42 for reproducibility.

    Returns
    -------
    dict[str, Any]
        ``attack_type`` : str — ``"intercept_resend"``
        ``n_qubits`` : int — number of intercepted qubits
        ``eve_bases`` : list[str] — Eve's randomly chosen bases
        ``eve_outcomes`` : list[int] — Eve's measurement results {0, 1}
        ``forwarded_states`` : list[NDArray] — states Eve sends to recipient
        ``recipient_outcomes`` : list[int] — recipient's measurement results
        ``basis_match_alice_eve`` : list[bool] — per-qubit basis match flags
        ``basis_match_eve_recipient`` : list[bool]
        ``errors_introduced`` : list[bool] — True where recipient got wrong bit
        ``measured_qber`` : float — empirical QBER from this attack run
        ``excess_qber`` : float — measured_qber minus HARDWARE_BASELINE_QBER
        ``theoretical_ir_qber`` : float — 0.25 (reference)
    """
    n = len(alice_states)
    if n == 0:
        raise ValueError("alice_states must be non-empty.")
    if len(alice_bases) != n or len(recipient_bases) != n:
        raise ValueError(
            "alice_states, alice_bases, and recipient_bases must all have the same length."
        )

    rng = np.random.default_rng(seed)

    # Eve selects a random basis for each qubit
    eve_choices = rng.integers(0, 2, size=n)
    eve_bases: list[str] = ["X" if c == 0 else "Z" for c in eve_choices]

    eve_outcomes: list[int] = []
    forwarded_states: list[NDArray] = []
    recipient_outcomes: list[int] = []
    errors_introduced: list[bool] = []
    basis_match_alice_eve: list[bool] = []
    basis_match_eve_recipient: list[bool] = []

    for i in range(n):
        psi = np.asarray(alice_states[i], dtype=np.complex128).flatten()

        # --- Eve intercepts and measures ---
        eve_outcome, post_state = _measure_in_basis(psi, eve_bases[i], rng)
        eve_outcomes.append(eve_outcome)
        forwarded_states.append(post_state)

        # --- Recipient measures Eve's forwarded state ---
        rec_outcome, _ = _measure_in_basis(post_state, recipient_bases[i], rng)
        recipient_outcomes.append(rec_outcome)

        # --- Determine the expected "correct" recipient outcome ---
        # The correct outcome is what the recipient would get measuring
        # Alice's original state in their own basis (no Eve present).
        correct_outcome, _ = _measure_in_basis(psi, recipient_bases[i], rng)

        errors_introduced.append(rec_outcome != correct_outcome)
        basis_match_alice_eve.append(alice_bases[i] == eve_bases[i])
        basis_match_eve_recipient.append(eve_bases[i] == recipient_bases[i])

    measured_qber = float(sum(errors_introduced)) / n
    excess_qber = max(0.0, measured_qber - HARDWARE_BASELINE_QBER)

    return {
        "attack_type": "intercept_resend",
        "n_qubits": n,
        "eve_bases": eve_bases,
        "eve_outcomes": eve_outcomes,
        "forwarded_states": [s.tolist() for s in forwarded_states],
        "recipient_outcomes": recipient_outcomes,
        "basis_match_alice_eve": basis_match_alice_eve,
        "basis_match_eve_recipient": basis_match_eve_recipient,
        "errors_introduced": errors_introduced,
        "measured_qber": round(measured_qber, 6),
        "excess_qber": round(excess_qber, 6),
        "theoretical_ir_qber": THEORETICAL_IR_QBER,
    }


# ---------------------------------------------------------------------------
# 2. Depolarizing Noise Injection
# ---------------------------------------------------------------------------

def build_depolarizing_noise_model(error_rate: float) -> NoiseModel:
    """Construct a Qiskit Aer depolarizing NoiseModel for circuit simulation.

    The depolarizing channel maps every single-qubit gate error to an equal
    mixture of I, X, Y, Z errors with probability p/4 each:

        ε(ρ) = (1 - p)ρ + (p/4)(IρI + XρX + YρY + ZρZ)

    For two-qubit gates a two-qubit depolarizing error is applied.

    Parameters
    ----------
    error_rate : float
        Depolarizing probability per gate ∈ (0.0, 1.0].

    Returns
    -------
    NoiseModel
        Aer NoiseModel with single- and two-qubit gate errors applied to all
        basis gates of the AerSimulator.

    Raises
    ------
    ValueError
        If ``error_rate`` is not in the range (0, 1].
    """
    if not (0.0 < error_rate <= 1.0):
        raise ValueError(
            f"error_rate must be in (0.0, 1.0]. Got {error_rate}."
        )

    noise_model = NoiseModel()

    # Single-qubit depolarizing error on all 1-qubit gates
    single_qubit_error = depolarizing_error(error_rate, 1)
    noise_model.add_all_qubit_quantum_error(
        single_qubit_error,
        ["u", "u1", "u2", "u3", "x", "y", "z", "h", "s", "sdg", "t", "tdg", "id"],
    )

    # Two-qubit depolarizing error — rate is squared for 2-qubit gates
    two_qubit_rate = min(error_rate ** 2 * 4, 1.0)  # scale to 2-qubit space
    two_qubit_error = depolarizing_error(two_qubit_rate, 2)
    noise_model.add_all_qubit_quantum_error(two_qubit_error, ["cx", "cz", "swap"])

    return noise_model


def apply_depolarizing_superoperator(
    rho: NDArray,
    error_rate: float,
) -> NDArray:
    """Apply the depolarizing channel to a density matrix analytically.

    Implements the Kraus operator sum representation:

        ε(ρ) = (1 - p) · ρ
               + (p/4) · I·ρ·I†
               + (p/4) · X·ρ·X†
               + (p/4) · Y·ρ·Y†
               + (p/4) · Z·ρ·Z†

    which simplifies to:

        ε(ρ) = (1 - 3p/4) · ρ  +  (p/4) · I·Tr(ρ)     [trace-preserving form]

    or equivalently:

        ε(ρ) = (1 - p) · ρ  +  p · (I₂/2)

    where I₂/2 is the maximally mixed state.

    Parameters
    ----------
    rho : NDArray, shape (2, 2)
        Input qubit density matrix (complex128, Hermitian, Tr=1).
    error_rate : float
        Depolarizing error probability per qubit ∈ [0.0, 1.0].

    Returns
    -------
    NDArray
        Output density matrix after depolarizing noise, shape (2, 2).

    Raises
    ------
    ValueError
        If ``error_rate`` is outside [0, 1] or ``rho`` is not (2, 2).
    """
    if not (0.0 <= error_rate <= 1.0):
        raise ValueError(f"error_rate must be in [0.0, 1.0]. Got {error_rate}.")

    rho = np.asarray(rho, dtype=np.complex128)
    if rho.shape != (2, 2):
        raise ValueError(f"rho must be a (2, 2) density matrix. Got shape {rho.shape}.")

    maximally_mixed = np.eye(2, dtype=np.complex128) / 2.0
    noisy_rho: NDArray = (1.0 - error_rate) * rho + error_rate * maximally_mixed
    return noisy_rho


def simulate_channel_manipulation(
    attack_type: str,
    params: dict[str, Any],
    shots: int = DEFAULT_SHOTS,
    seed: int = 42,
) -> dict[str, Any]:
    """Dispatcher: run the named channel attack and return a unified result dict.

    Parameters
    ----------
    attack_type : str
        One of ``"intercept_resend"`` or ``"depolarizing"``.
    params : dict
        Attack-specific parameters:

        For ``"intercept_resend"``:
          ``alice_states`` : list[list[complex]]  — Alice's qubit state vectors
          ``alice_bases``  : list[str]            — Alice's preparation bases
          ``recipient_bases`` : list[str]         — Recipient's measurement bases

        For ``"depolarizing"``:
          ``error_rate``   : float                — Depolarizing error probability
          ``circuit``      : QuantumCircuit (opt) — Circuit to corrupt
          If no circuit is provided, a default 2-qubit Bell circuit is used.

    shots : int
        Shot count for Aer simulation (depolarizing mode only).
    seed : int
        RNG seed for intercept-resend basis selection.

    Returns
    -------
    dict[str, Any]
        Unified result with ``attack_type``, ``measured_qber``, and
        attack-specific sub-results. Always includes ``excess_qber`` and
        ``hardware_baseline_qber``.

    Raises
    ------
    ValueError
        If ``attack_type`` is not recognised.
    """
    if attack_type == "intercept_resend":
        raw_states = params.get("alice_states", [])
        if not raw_states:
            raise ValueError(
                "params['alice_states'] is required for intercept_resend attack."
            )
        alice_states  = [np.asarray(s, dtype=np.complex128) for s in raw_states]
        alice_bases   = params.get("alice_bases",     generate_random_bases(len(alice_states), seed))
        recipient_bases = params.get("recipient_bases", generate_random_bases(len(alice_states), seed + 1))

        result = simulate_intercept_resend(
            alice_states=alice_states,
            alice_bases=alice_bases,
            recipient_bases=recipient_bases,
            seed=seed,
        )
        result["hardware_baseline_qber"] = HARDWARE_BASELINE_QBER
        return result

    elif attack_type == "depolarizing":
        error_rate: float = float(params.get("error_rate", 0.05))
        if not (0.0 < error_rate <= 1.0):
            raise ValueError(f"error_rate must be in (0, 1]. Got {error_rate}.")

        # Use provided circuit or fall back to a default 2-qubit Bell circuit
        circuit: QuantumCircuit = params.get("circuit", None)
        if circuit is None:
            from qds_core.key_distribution import create_bell_pair_circuit
            base_qc = create_bell_pair_circuit()
            circuit = QuantumCircuit(2, 2, name="depolarizing_test")
            circuit.compose(base_qc, inplace=True)
            circuit.measure([0, 1], [0, 1])

        noise_model = build_depolarizing_noise_model(error_rate)
        noisy_backend = AerSimulator(noise_model=noise_model)
        transpiled = transpile(circuit, noisy_backend)
        job = noisy_backend.run(transpiled, shots=shots)
        result = job.result()
        counts: dict[str, int] = dict(result.get_counts(circuit))

        # Estimate QBER from correlated errors in the count histogram.
        # For a Bell pair |Φ⁺⟩, correct outcomes are "00" and "11" only.
        total = sum(counts.values())
        error_shots = sum(
            cnt for bs, cnt in counts.items()
            if bs.replace(" ", "") not in ("00", "11")
        )
        measured_qber = float(error_shots) / total if total > 0 else 0.0
        excess_qber = max(0.0, measured_qber - HARDWARE_BASELINE_QBER)

        return {
            "attack_type": "depolarizing",
            "error_rate": error_rate,
            "shots": shots,
            "counts": counts,
            "measured_qber": round(measured_qber, 6),
            "excess_qber": round(excess_qber, 6),
            "hardware_baseline_qber": HARDWARE_BASELINE_QBER,
        }

    else:
        raise ValueError(
            f"Unknown attack_type '{attack_type}'. "
            f"Valid options: 'intercept_resend', 'depolarizing'."
        )
