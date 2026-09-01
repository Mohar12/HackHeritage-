"""
key_distribution.py
===================
Purpose: Bell-pair generation and quantum public key distribution simulation.

This module implements the key-distribution phase of the teleportation-based
QDS protocol. It constructs EPR Bell pairs (|Φ⁺⟩) shared between Alice, Bob,
and Charlie using exact Qiskit circuits, executes them on the Qiskit Aer
simulator, and packages the resulting measurement statistics into a structured
key-material dictionary.

Compliance
----------
- All Bell-pair circuits use exact H + CNOT constructions — no approximations
  (quantum-teleportation-simulator skill §All four Bell states).
- All Aer runs use a fixed, configurable shot count (default 1024)
  (quantum-teleportation-simulator skill §Shot count consistency).
- A static hardware baseline QBER of 0.01 (1%) is tracked throughout
  to enable excess-error detection downstream.
- No ML/AI components (qds-system-architect skill §No ML/AI components).
- Cross-package imports: this module only uses qds_core.pauli_ops
  (qds-system-architect skill §Package boundaries).
"""

from __future__ import annotations

import uuid
from typing import Any

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

from qds_core.pauli_ops import (
    generate_random_bases,
    prepare_bell_state,
    density_matrix_from_statevector,
    calculate_state_fidelity,
)

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

#: Hardware baseline QBER — 1% noise floor assumed for the physical channel.
#: Used by the detection engine to compute excess error above this baseline.
HARDWARE_BASELINE_QBER: float = 0.01

#: Default number of Aer simulation shots per circuit execution.
DEFAULT_SHOTS: int = 1024

#: Aer backend instance — stateless singleton, safe to share across calls.
_AER_BACKEND: AerSimulator = AerSimulator()


# ---------------------------------------------------------------------------
# Low-level circuit construction
# ---------------------------------------------------------------------------

def create_bell_pair_circuit() -> QuantumCircuit:
    """Construct a 2-qubit circuit that generates the |Φ⁺⟩ EPR Bell state.

    The circuit applies:
      1. Hadamard on qubit 0 → creates (|0⟩ + |1⟩) / √2
      2. CNOT (control=0, target=1) → entangles the pair

    Resulting state: |Φ⁺⟩ = (|00⟩ + |11⟩) / √2

    Returns
    -------
    QuantumCircuit
        2-qubit circuit in the |Φ⁺⟩ Bell state.  No measurement gates
        are appended — callers attach measurements as required.
    """
    return prepare_bell_state(state_index=0)


def _build_distribution_circuit(num_keys: int, shots: int) -> QuantumCircuit:
    """Build a composite circuit that generates ``num_keys`` independent EPR pairs.

    Each pair i occupies qubits (2i, 2i+1).  All pairs are prepared in |Φ⁺⟩.
    Measurement gates are appended to all qubits into a matching classical
    register.

    Parameters
    ----------
    num_keys : int
        Number of EPR pairs (= number of QDS key bits) to generate.
    shots : int
        Shot count used when this circuit is subsequently executed
        (recorded as a circuit metadata attribute).

    Returns
    -------
    QuantumCircuit
        2 * num_keys qubit circuit ready for Aer execution.
    """
    total_qubits = 2 * num_keys
    qc = QuantumCircuit(total_qubits, total_qubits,
                        name=f"qkd_distribute_{num_keys}_pairs")

    for i in range(num_keys):
        q0, q1 = 2 * i, 2 * i + 1
        qc.h(q0)      # Hadamard on Alice's qubit
        qc.cx(q0, q1) # CNOT: entangle Alice–Bob/Charlie qubit

    # Measure all qubits
    qc.measure(range(total_qubits), range(total_qubits))
    qc.metadata = {"num_keys": num_keys, "target_shots": shots}
    return qc


def _execute_circuit(qc: QuantumCircuit, shots: int) -> dict[str, int]:
    """Transpile and run a circuit on the AerSimulator.

    Parameters
    ----------
    qc : QuantumCircuit
        The circuit to execute.
    shots : int
        Number of simulation shots.

    Returns
    -------
    dict[str, int]
        Raw measurement counts from the Aer sampler.
    """
    transpiled = transpile(qc, _AER_BACKEND)
    job = _AER_BACKEND.run(transpiled, shots=shots)
    result = job.result()
    return dict(result.get_counts(qc))


def _compute_qber_from_counts(counts: dict[str, int], num_keys: int) -> float:
    """Estimate the QBER from EPR-pair measurement counts.

    For an ideal |Φ⁺⟩ pair, both qubits should always agree
    (both 0 or both 1). A correlated error rate is computed as
    the fraction of shots where the two qubits in a pair disagree.

    Parameters
    ----------
    counts : dict[str, int]
        Raw Aer measurement count dictionary.
    num_keys : int
        Number of EPR pairs in the circuit.

    Returns
    -------
    float
        Estimated QBER across all pairs ∈ [0.0, 1.0].
    """
    total_shots: int = sum(counts.values())
    if total_shots == 0:
        return 0.0

    error_shots: int = 0
    for bitstring, count in counts.items():
        # Qiskit returns bitstrings with qubit 0 at the rightmost position.
        bits = bitstring.replace(" ", "")
        for i in range(num_keys):
            q0_idx = len(bits) - 1 - (2 * i)
            q1_idx = len(bits) - 1 - (2 * i + 1)
            if q0_idx >= 0 and q1_idx >= 0:
                if bits[q0_idx] != bits[q1_idx]:
                    error_shots += count

    return float(error_shots) / float(total_shots * num_keys)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def distribute_public_keys(
    num_keys: int = 8,
    shots: int = DEFAULT_SHOTS,
    seed: int | None = 42,
) -> dict[str, Any]:
    """Generate and distribute EPR-pair-based quantum key material.

    Constructs ``num_keys`` Bell pairs, executes the circuit on the
    Qiskit Aer simulator, and packages the raw measurement statistics into
    a structured key-material dictionary covering Alice, Bob, and Charlie.

    The ``session_id`` field uniquely identifies this key exchange round.
    The ``hardware_baseline_qber`` field records the static noise floor
    used by the detection engine for excess-error analysis.

    Parameters
    ----------
    num_keys : int
        Number of QDS key bits (= EPR pairs) to generate.
        Defaults to 8; higher values increase security but also runtime.
    shots : int
        Number of Aer simulation shots. Defaults to 1024.
    seed : int | None
        Seed for basis generation (pauli-measurement-validator §Deterministic
        basis arrays). Defaults to 42 for reproducible simulation sessions.

    Returns
    -------
    dict[str, Any]
        Structured key-material dictionary with the following top-level keys:

        ``session_id`` : str
            UUID4 identifier for this key exchange session.
        ``num_keys`` : int
            Number of EPR pairs generated.
        ``shots`` : int
            Number of simulation shots used.
        ``hardware_baseline_qber`` : float
            Static 1% noise floor tracking limit.
        ``measured_qber`` : float
            Estimated QBER from the simulation run.
        ``measurement_counts`` : dict[str, int]
            Raw Aer measurement count histogram.
        ``alice_public_key`` : dict
            Alice's key metadata (bases, bit count, session ID).
        ``bob_shared_material`` : dict
            Bob's key share (bases, half of EPR pair indices).
        ``charlie_shared_material`` : dict
            Charlie's key share (bases, half of EPR pair indices).
    """
    if num_keys < 1:
        raise ValueError(f"num_keys must be ≥ 1. Got {num_keys}.")

    session_id: str = str(uuid.uuid4())

    # Generate a deterministic basis assignment for each party
    alice_bases = generate_random_bases(num_keys, seed=seed)
    bob_bases   = generate_random_bases(num_keys, seed=(seed + 1) if seed is not None else None)
    charlie_bases = generate_random_bases(num_keys, seed=(seed + 2) if seed is not None else None)

    # Build and execute the EPR distribution circuit
    qc = _build_distribution_circuit(num_keys, shots)
    counts = _execute_circuit(qc, shots)

    # Compute the measured QBER from the distribution run
    measured_qber = _compute_qber_from_counts(counts, num_keys)

    # EPR pair index map: Alice holds qubit 0 of each pair,
    # recipients (Bob/Charlie) share qubit 1.
    alice_qubit_indices  = list(range(0, 2 * num_keys, 2))  # [0, 2, 4, ...]
    recipient_qubit_indices = list(range(1, 2 * num_keys, 2))  # [1, 3, 5, ...]

    # Bit probabilities from the measurement counts
    total_shots = sum(counts.values())
    bit_probabilities: dict[str, float] = {
        bs: count / total_shots for bs, count in counts.items()
    }

    return {
        "session_id": session_id,
        "num_keys": num_keys,
        "shots": shots,
        "hardware_baseline_qber": HARDWARE_BASELINE_QBER,
        "measured_qber": round(measured_qber, 6),
        "measurement_counts": counts,
        "bit_probabilities": bit_probabilities,
        # ---- Alice's key material ----------------------------------------
        "alice_public_key": {
            "party": "Alice",
            "session_id": session_id,
            "num_keys": num_keys,
            "bases": alice_bases,
            "qubit_indices": alice_qubit_indices,
            "role": "signer",
        },
        # ---- Bob's shared material ----------------------------------------
        "bob_shared_material": {
            "party": "Bob",
            "session_id": session_id,
            "num_keys": num_keys,
            "bases": bob_bases,
            "qubit_indices": recipient_qubit_indices,
            "role": "verifier",
        },
        # ---- Charlie's shared material ------------------------------------
        "charlie_shared_material": {
            "party": "Charlie",
            "session_id": session_id,
            "num_keys": num_keys,
            "bases": charlie_bases,
            "qubit_indices": recipient_qubit_indices,
            "role": "verifier",
        },
    }


def measure_key_register(
    circuit: QuantumCircuit,
    qubit_indices: list[int],
    shots: int = DEFAULT_SHOTS,
) -> list[int]:
    """Execute a circuit and extract measurement outcomes for specific qubits.

    Runs the circuit on the Aer simulator and returns the most-probable
    bit assignment for the specified qubit indices, derived from the raw
    count histogram using Born-rule probabilities.

    Parameters
    ----------
    circuit : QuantumCircuit
        A circuit containing measurement gates on all ``qubit_indices``.
    qubit_indices : list[int]
        Which qubit positions to read out from the measurement bitstring.
    shots : int
        Simulation shot count.

    Returns
    -------
    list[int]
        List of 0/1 integer outcomes, one per element in ``qubit_indices``,
        chosen as the most-probable outcome across all shots.
    """
    counts = _execute_circuit(circuit, shots)
    if not counts:
        raise RuntimeError("Aer simulation returned empty counts.")

    # Find the most-probable bitstring (max-likelihood readout)
    most_probable_bs: str = max(counts, key=counts.__getitem__)
    bits = most_probable_bs.replace(" ", "")

    # Qiskit bitstring convention: qubit 0 is the rightmost character.
    n_bits = len(bits)
    outcomes: list[int] = []
    for qi in qubit_indices:
        char_idx = n_bits - 1 - qi
        if char_idx < 0 or char_idx >= n_bits:
            raise IndexError(
                f"Qubit index {qi} out of range for bitstring of length {n_bits}."
            )
        outcomes.append(int(bits[char_idx]))

    return outcomes
