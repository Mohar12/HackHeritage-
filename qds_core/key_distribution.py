"""
key_distribution.py
===================
Purpose: Scalable Bell-pair generation and quantum public key distribution simulation.

This module implements the key-distribution phase of the teleportation-based
QDS protocol. It constructs EPR Bell pairs (|Φ⁺⟩) shared between Alice, Bob,
and Charlie using exact Qiskit circuits, executes them on the Qiskit Aer
simulator using a generic batched circuit execution engine, and packages the
resulting measurement statistics into a structured key-material dictionary.

Generic Batching Architecture
-----------------------------
- Dynamically derives backend capacity: `backend_qubit_capacity` (default 28 qubits).
- Calculates max pairs per circuit: `max_pairs_per_batch = backend_qubit_capacity // 2` (e.g. 14 pairs).
- For any positive integer N: splits N into batches of size at most `max_pairs_per_batch`.
- Processes batches incrementally to ensure memory efficiency:
  `create batch -> execute -> aggregate -> release batch -> next batch`.
- Preserves all quantum physics (exact H + CNOT on Aer, no classical approximation, 1% noise floor).
- Deterministic seed progression: `batch_seed = master_seed + batch_idx * 1000`.
"""

from __future__ import annotations

import logging
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

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

#: Hardware baseline QBER — 1% noise floor assumed for the physical channel.
HARDWARE_BASELINE_QBER: float = 0.01

#: Default number of Aer simulation shots per circuit execution.
DEFAULT_SHOTS: int = 1024

#: Number of qubits required per physical EPR Bell pair (|Φ⁺⟩ = (|00⟩ + |11⟩)/√2).
QUBITS_PER_EPR_PAIR: int = 2

#: Default configured backend circuit width limit (matches standard Aer coupling map limit).
DEFAULT_BACKEND_QUBIT_CAPACITY: int = 28

#: Aer backend instance — stateless singleton, safe to share across calls.
_AER_BACKEND: AerSimulator = AerSimulator()


def get_backend_qubit_capacity(backend: AerSimulator | None = None) -> int:
    """Programmatically query or derive the safe qubit capacity of the Aer backend."""
    b = backend or _AER_BACKEND
    try:
        # Check if backend exposes configuration / coupling map limits
        cfg = b.configuration()
        if hasattr(cfg, "n_qubits") and cfg.n_qubits:
            return min(int(cfg.n_qubits), DEFAULT_BACKEND_QUBIT_CAPACITY)
        if hasattr(cfg, "coupling_map") and cfg.coupling_map:
            qubits_in_map = len(set(q for edge in cfg.coupling_map for q in edge))
            if qubits_in_map > 0:
                return qubits_in_map
    except Exception as exc:
        logger.warning(
            "Failed to query backend qubit capacity (%s: %s); falling back to default %d.",
            type(exc).__name__,
            exc,
            DEFAULT_BACKEND_QUBIT_CAPACITY,
        )
    return DEFAULT_BACKEND_QUBIT_CAPACITY


def compute_max_pairs_per_batch(backend_qubit_capacity: int | None = None) -> int:
    """Calculate the maximum number of EPR pairs that can safely fit into a single circuit.

    Ensures the strict invariant:
        2 * max_pairs_per_batch <= backend_qubit_capacity
    """
    cap = backend_qubit_capacity or get_backend_qubit_capacity()
    max_pairs = cap // QUBITS_PER_EPR_PAIR
    return max(1, max_pairs)


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
    backend_qubit_capacity: int | None = None,
) -> dict[str, Any]:
    """Generate and distribute EPR-pair-based quantum key material using generic batching.

    For any positive integer ``num_keys``:
    1. Derives safe batch capacity: ``max_pairs_per_batch = backend_capacity // 2``.
    2. Partitions ``num_keys`` into batches such that every circuit satisfies
       ``2 * batch_size <= backend_capacity``.
    3. Incrementally constructs, executes on Aer, and aggregates pair statistics into
       the canonical key material dictionary.

    Parameters
    ----------
    num_keys : int
        Number of EPR pairs (= QDS key bits) to generate (must be >= 1).
    shots : int
        Number of simulation shots per circuit execution.
    seed : int | None
        Master RNG seed for deterministic execution.
    backend_qubit_capacity : int | None
        Optional override for backend qubit width (defaults to querying backend or 28).

    Returns
    -------
    dict[str, Any]
        Standard key-material dictionary matching the QDS API specification.
    """
    if not isinstance(num_keys, (int, np.integer)) or isinstance(num_keys, bool):
        raise TypeError(f"num_keys must be an integer. Got {type(num_keys).__name__}.")
    if num_keys < 1:
        raise ValueError(f"num_keys must be >= 1. Got {num_keys}.")

    session_id: str = (
        str(uuid.uuid5(uuid.NAMESPACE_DNS, f"qds-session-{seed}-{num_keys}"))
        if seed is not None
        else str(uuid.uuid4())
    )
    max_pairs_per_batch = compute_max_pairs_per_batch(backend_qubit_capacity)

    # 1. Deterministic basis assignments for each party
    alice_bases = generate_random_bases(num_keys, seed=seed)
    bob_bases   = generate_random_bases(num_keys, seed=(seed + 1) if seed is not None else None)
    charlie_bases = generate_random_bases(num_keys, seed=(seed + 2) if seed is not None else None)

    # 2. Generic partition of num_keys into safe batch sizes
    batch_sizes: list[int] = []
    remaining = int(num_keys)
    while remaining > 0:
        bsize = min(remaining, max_pairs_per_batch)
        batch_sizes.append(bsize)
        remaining -= bsize

    assert sum(batch_sizes) == num_keys, "Batch sizes must exactly sum to requested num_keys."

    # 3. Incremental execution and result aggregation
    total_error_shots = 0
    total_shots_evaluated = 0
    canonical_2bit_counts: dict[str, int] = {"00": 0, "01": 0, "10": 0, "11": 0}

    for batch_idx, bsize in enumerate(batch_sizes):
        # Strict invariant verification: 2 * bsize <= backend_qubit_capacity
        assert 2 * bsize <= (backend_qubit_capacity or DEFAULT_BACKEND_QUBIT_CAPACITY)

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

        # Release circuit references immediately to preserve memory on large N
        del qc
        del counts

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
