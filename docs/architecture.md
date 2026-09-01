# Architecture — QDS Threat Detection Framework

## Overview

This document describes the high-level architecture of the
**Quantum-Inspired Cyber Threat Detection Framework for Teleportation-Based
Quantum Digital Signatures (QDS)**.

The system is split into four logical layers:

```
┌─────────────────────────────────────────────────────┐
│                  React Dashboard                     │
│          (Vite · port 5173 · Docker)                 │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / REST (JSON)
┌───────────────────────▼─────────────────────────────┐
│               FastAPI Backend                        │
│          (Python 3.11 · port 8000 · Docker)         │
├──────────────┬──────────────┬────────────────────────┤
│  qds_core    │  attack_sim  │  detection_engine       │
│  (Qiskit)    │  (Qiskit)    │  (numpy / scipy)        │
└──────────────┴──────────────┴────────────────────────┘
```

## Component Descriptions

### `qds_core`
Implements the teleportation-based QDS protocol:
- **key_distribution**: Bell-pair generation, shared entanglement distribution
- **teleportation**: Alice-Bob-Charlie circuit (Qiskit + Aer)
- **signing**: Encode message → teleport → collect classical correction bits
- **verification**: Apply Pauli corrections → projective measurement → accept/reject
- **pauli_ops**: Shared Pauli matrices, Bell-state utilities, fidelity calculation

### `attack_sim`
Physics-based adversarial simulations:
- **forgery**: Eve guesses/reconstructs Alice's signing state
- **impersonation**: Eve generates a spoofed key pair
- **replay**: Captured valid signature re-submitted in a new session
- **channel_manipulation**: Depolarizing noise injection, intercept-resend

### `detection_engine`
Deterministic statistical anomaly detection:
- **statistics**: QBER, χ², excess-error analysis
- **thresholds**: BB84 and Holevo-bound-derived decision thresholds
- **detector**: `detect_threat()` → `(is_malicious: bool, confidence_score: float)`

### `backend`
FastAPI REST API exposing all simulation primitives as JSON endpoints.

### `dashboard`
React 18 + Vite single-page application for visualising QDS runs and
attack/detection results in real time.

## Data Flow (Protocol Run)

```
User → Dashboard
  → POST /generate-keys        → key_distribution.distribute_public_keys()
  → POST /signatures/sign      → signing.sign()
  → POST /signatures/verify    → verification.verify()
  → POST /detect               → detector.detect_threat()
  ← Dashboard renders charts
```

## Data Flow (Attack Simulation)

```
User → Dashboard
  → POST /simulate-attack {attack_type: "forgery", ...}
      → attack_sim.forgery.simulate_forgery()
  → POST /detect {measurement_data: <forged_data>}
      → detector.detect_threat()
  ← Dashboard renders threat assessment
```

## Deployment

Both services are containerised and orchestrated via `docker-compose.yml`
at the project root. See [README.md](../README.md) for setup instructions.

<!-- TODO: Add sequence diagrams (Mermaid) for signing and verification flows -->
<!-- TODO: Add deployment topology diagram for production -->
