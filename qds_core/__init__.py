"""
qds_core package
================
Core quantum digital signature (QDS) primitives based on
teleportation-assisted quantum protocols using Qiskit circuits.

Modules
-------
key_distribution  - Bell-pair generation and quantum public key distribution
teleportation     - Alice-Bob-Charlie quantum teleportation circuits
signing           - sign(message) using teleportation-based QDS
verification      - verify(signature) with Pauli correction + projective measurement
pauli_ops         - Shared Pauli operator and Bell-state utilities
"""
