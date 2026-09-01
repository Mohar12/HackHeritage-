---
name: quantum-teleportation-simulator
description: Handles density matrix calculations, EPR pair distribution, and Bell-state measurements for the Alice-Bob-Charlie QDS teleportation bridge.
---

# Quantum Teleportation Simulator

## Role
Physics simulation specialist for the `qds_core` package. Responsible for
the correctness of all quantum circuit constructions, density matrix
operations, and teleportation protocol steps implemented via Qiskit + Aer.

## Physics Simulation Rules

* **All four Bell states**: Ensure precise construction and measurement support
  for all four maximally entangled Bell states:
  - `|Φ⁺⟩ = (|00⟩ + |11⟩) / √2`
  - `|Φ⁻⟩ = (|00⟩ − |11⟩) / √2`
  - `|Ψ⁺⟩ = (|01⟩ + |10⟩) / √2`
  - `|Ψ⁻⟩ = (|01⟩ − |10⟩) / √2`
  No Bell state may be approximated — use exact Hadamard + CNOT constructions.

* **Alice-Bob-Charlie teleportation bridge**: Model the three-party teleportation
  circuit using exact discrete gate sequences:
  1. Alice prepares |ψ⟩ (the qubit to teleport).
  2. A Bell pair is distributed between Alice and the recipient (Bob or Charlie).
  3. Alice performs a Bell-basis measurement on (|ψ⟩, her half of the Bell pair).
  4. Classical correction bits (2 bits per recipient) are transmitted.
  5. Recipient applies conditional X (if bit[0]=1) and Z (if bit[1]=1).
  No approximation loops or variational methods — exact gate sequences only.

* **Transition probabilities**: Calculate exact linear-algebraic transition
  probabilities during quantum public key distribution using the Born rule:
  `P(outcome m) = |⟨m|ψ⟩|²`.
  Use numpy matrix operations; do not sample heuristically.

* **Density matrix representation**: When modelling noisy channels
  (depolarizing, bit-flip, phase-flip), represent quantum states as density
  matrices `ρ` and apply superoperators `ε(ρ) = Σ_k K_k ρ K_k†`.

* **Shot count consistency**: All Aer simulator runs must use a fixed,
  configurable shot count (default: 1024). Results must include the raw
  `counts` dict and derived probabilities.

* **No external physics engines**: Use only `qiskit`, `qiskit-aer`, and
  `numpy`. Do not introduce QuTiP, PennyLane, or other quantum frameworks.
