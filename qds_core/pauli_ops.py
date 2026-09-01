"""
pauli_ops.py
============
Purpose: Shared Pauli operator and Bell-state utilities.

This module provides a centralised library of Pauli gate operations (I, X, Y, Z),
Bell-state preparation circuits, and utility functions used across the QDS core
modules. All operations are Qiskit-native and simulator-compatible.

References
----------
- Nielsen & Chuang, Quantum Computation and Quantum Information (2000), Ch. 2
"""

from __future__ import annotations

# TODO: import qiskit (QuantumCircuit, QuantumRegister) and numpy
# TODO: define constants: PAULI_I, PAULI_X, PAULI_Y, PAULI_Z as numpy 2x2 matrices
# TODO: implement prepare_bell_state(circuit, q0, q1, state_index: int = 0) -> QuantumCircuit
#         Prepares one of the four Bell states (Φ+, Φ-, Ψ+, Ψ-) on qubits q0, q1.
#         state_index selects: 0->|Φ+⟩, 1->|Φ-⟩, 2->|Ψ+⟩, 3->|Ψ-⟩
# TODO: implement apply_pauli(circuit, qubit, pauli: str) -> QuantumCircuit
#         Applies the named Pauli gate ('I','X','Y','Z') to the specified qubit.
# TODO: implement bell_measure(circuit, q0, q1, c0, c1) -> QuantumCircuit
#         Performs a Bell-basis measurement on (q0, q1), storing results in (c0, c1).
# TODO: implement fidelity(rho_ideal: list, rho_actual: list) -> float
#         Computes state fidelity F = Tr(sqrt(sqrt(ρ_i)·ρ_a·sqrt(ρ_i)))^2
#         using numpy linear algebra — no ML libraries.
