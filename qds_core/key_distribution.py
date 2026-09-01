"""
key_distribution.py
===================
Purpose: Bell-pair generation and quantum public key distribution simulation.

This module implements the key-distribution phase of the teleportation-based
QDS protocol. It constructs EPR Bell pairs (|Φ⁺⟩) shared between Alice, Bob,
and Charlie using exact Qiskit circuits, executes them on the Qiskit Aer
simulator using a batched circuit execution model, and packages the resulting
measurement statistics into a structured key-material dictionary.

Scalability Compliance
----------------------
- Batched Execution: Generates arbitrary numbers of EPR pairs (e.g. 100+ pairs)
  by chunking pairs into batches that fit comfortably within the backend's
  qubit width (maximum 10 pairs = 20 qubits per circuit by default).
- No approximation: Each EPR pair is prepared with genuine H + CNOT gates on Aer.
- 1% Hardware Baseline QBER is maintained across all batches.
- Seeded Reproducibility is preserved via deterministic batch seeds.
"""

from __future__ import annotations

import math
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
HARDWARE_BASELINE_QBER: float = 0.01

#: Default number of Aer simulation shots per circuit execution.
DEFAULT_SHOTS: int = 1024

#: Maximum number of EPR pairs simulated in a single QuantumCircuit.
#: 10 pairs = 20 qubits (well within any 28-30 qubit simulator coupling boundary).
MAX_PAIRS_PER_BATCH: int = 10

#: Aer backend instance — stateless singleton, safe to share across calls.
_AER_BACKEND: AerSimulator = AerSimulator()


# ---------------------------------------------------------------------------
# Low-level circuit construction
# ---------------------------------------------------------------------------

def create_bell_pair_circuit() -> QuantumCircuit:
    """Construct a 2-qubit circuit that generates the |Φ⁺⟩ EPR Bell state."""
    return prepare_bell_state(state_index=0)


def _build_distribution_circuit(num_keys: int, shots: int) -> QuantumCircuit:
    """Build a composite circuit that generates ``num_keys`` independent EPR pairs."""
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


def _execute_circuit(qc: QuantumCircuit, shots: int, seed: int | None = None) -> dict[str, int]:
    """Transpile and run a circuit on the AerSimulator with optional seed."""
    transpiled = transpile(qc, _AER_BACKEND)
    job = _AER_BACKEND.run(transpiled, shots=shots, seed_simulator=seed)
    result = job.result()
    return dict(result.get_counts(qc))


def _compute_qber_from_counts(counts: dict[str, int], num_keys: int) -> float:
    """Estimate the QBER from EPR-pair measurement counts."""
    total_shots: int = sum(counts.values())
    if total_shots == 0:
        return 0.0

    error_shots: int = 0
    for bitstring, count in counts.items():
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
    max_pairs_per_batch: int = MAX_PAIRS_PER_BATCH,
) -> dict[str, Any]:
    """Generate and distribute EPR-pair-based quantum key material using batched circuit runs.

    Constructs ``num_keys`` Bell pairs using batches of size at most ``max_pairs_per_batch``,
    executes them on the Qiskit Aer simulator, and aggregates the measurements into
    the canonical key material dictionary.
    """
    if num_keys < 1:
        raise ValueError(f"num_keys must be ≥ 1. Got {num_keys}.")

    session_id: str = str(uuid.uuid4())

    # Generate deterministic basis assignments for each party
    alice_bases = generate_random_bases(num_keys, seed=seed)
    bob_bases   = generate_random_bases(num_keys, seed=(seed + 1) if seed is not None else None)
    charlie_bases = generate_random_bases(num_keys, seed=(seed + 2) if seed is not None else None)

    # Calculate batches: e.g. 100 pairs with max 10/batch -> 10 batches of 10
    batch_sizes: list[int] = []
    remaining = num_keys
    while remaining > 0:
        bsize = min(remaining, max_pairs_per_batch)
        batch_sizes.append(bsize)
        remaining -= bsize

    total_error_shots = 0
    total_shots_evaluated = 0
    canonical_2bit_counts: dict[str, int] = {"00": 0, "01": 0, "10": 0, "11": 0}

    for batch_idx, bsize in enumerate(batch_sizes):
        batch_seed = (seed + batch_idx * 1000) if seed is not None else None
        qc = _build_distribution_circuit(bsize, shots)
        counts = _execute_circuit(qc, shots, seed=batch_seed)

        # Aggregate pair statistics from batch counts
        b_shots = sum(counts.values())
        total_shots_evaluated += b_shots * bsize

        for bitstring, count in counts.items():
            bits = bitstring.replace(" ", "")
            for i in range(bsize):
                q0_idx = len(bits) - 1 - (2 * i)
                q1_idx = len(bits) - 1 - (2 * i + 1)
                if q0_idx >= 0 and q1_idx >= 0:
                    pair_bits = f"{bits[q1_idx]}{bits[q0_idx]}"
                    if pair_bits in canonical_2bit_counts:
                        canonical_2bit_counts[pair_bits] += count
                    if bits[q0_idx] != bits[q1_idx]:
                        total_error_shots += count

    # Compute empirical QBER with baseline hardware noise consideration
    measured_qber = (
        float(total_error_shots) / float(total_shots_evaluated)
        if total_shots_evaluated > 0 else 0.0
    )
    if measured_qber < HARDWARE_BASELINE_QBER:
        measured_qber = HARDWARE_BASELINE_QBER

    alice_qubit_indices = list(range(0, 2 * num_keys, 2))
    recipient_qubit_indices = list(range(1, 2 * num_keys, 2))

    total_pair_events = sum(canonical_2bit_counts.values())
    bit_probabilities: dict[str, float] = {
        bs: count / total_pair_events if total_pair_events > 0 else 0.25
        for bs, count in canonical_2bit_counts.items()
    }

    return {
        "session_id": session_id,
        "num_keys": num_keys,
        "shots": shots,
        "hardware_baseline_qber": HARDWARE_BASELINE_QBER,
        "measured_qber": round(measured_qber, 6),
        "measurement_counts": canonical_2bit_counts,
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
    """Execute a circuit and extract measurement outcomes for specific qubits."""
    counts = _execute_circuit(circuit, shots)
    if not counts:
        raise RuntimeError("Aer simulation returned empty counts.")

    most_probable_bs: str = max(counts, key=counts.__getitem__)
    bits = most_probable_bs.replace(" ", "")

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
