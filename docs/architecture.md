# Architecture — QDS Threat Detection Framework

## Overview

This document describes the production architecture of the
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

---

## 1. Signing Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Signer (Alice)
    participant Core as qds_core (Teleportation)
    participant Aer as Qiskit Aer Simulator
    actor Bob as Verifier (Bob)
    
    Alice->>Core: encode_message_to_states(message, n_qubits)
    Core->>Aer: Execute Bell-State Measurement (BSM) on (|ψ⟩, EPR_Alice)
    Aer-->>Core: Classical correction bits (c0, c1) & outcomes
    Core-->>Alice: Signature packet {hash, outcomes, correction_bits, session_id}
    Alice->>Bob: Transmit Signature + Classical Message over Authenticated Channel
```

---

## 2. Verification Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Bob as Verifier (Bob)
    participant Verify as qds_core/verification.py
    participant Stats as detection_engine/statistics.py
    
    Bob->>Verify: verify(signature, public_key, message)
    Verify->>Verify: Check SHA-256 Message Hash & Session ID Binding
    Verify->>Verify: Apply Pauli Corrections: σ_z^(c0) · σ_x^(c1) to Bob's EPR Half
    Verify->>Stats: calculate_qber(sent_bits, received_bits)
    Stats-->>Verify: Sifted QBER & State Fidelity
    Verify-->>Bob: Verdict {is_valid: bool, qber: float, reason: str}
```

---

## 3. Attack & Detection Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Eve as Adversary (Eve)
    participant Attack as attack_sim/channel_manipulation.py
    participant Engine as detection_engine/detector.py
    participant Stats as detection_engine/statistics.py
    
    Eve->>Attack: Intercept-Resend / Forgery / Impersonation / Replay
    Attack->>Attack: Projective collapse in random basis / Spoofed state injection
    Attack-->>Engine: Raw Measurement Counts & Collapsed Bitstrings
    Engine->>Stats: chi_squared_born_test() & calculate_qber()
    Stats-->>Engine: χ² p-value, QBER, Excess Error, Entropy
    Engine->>Engine: Evaluate BB84/Holevo Matrix & Sigmoid Confidence Score
    Engine-->>Eve: Threat Assessment {is_malicious: bool, action: "ABORT", confidence: float}
```

---

## 4. Production Deployment Topology

```mermaid
graph TD
    subgraph Host ["Host Environment / User Browser"]
        Browser["React 18 + Vite Dashboard (Port 5173)"]
    end

    subgraph DockerBridge ["Docker Bridge Network (quantum-network)"]
        subgraph FrontendContainer ["quantum-frontend (node:20-alpine)"]
            ViteDev["Vite Dev Server (Port 5173)"]
        end

        subgraph BackendContainer ["quantum-backend (python:3.11-slim)"]
            Uvicorn["Uvicorn ASGI Server (Port 8000)"]
            FastAPI["FastAPI REST Application"]
            UserSec["Isolated Non-Root User (quantum_runner, UID 1001)"]
            
            subgraph QuantumCore ["Python Scientific Engine"]
                Qiskit["Qiskit 1.2.4 & Aer Simulator 0.15.0"]
                SciPy["SciPy 1.14.1 (Linear Stats & χ²)"]
                NumPy["NumPy 2.1.1 (Complex128 Linear Algebra)"]
            end
        end
    end

    Browser -->|HTTP localhost:5173| ViteDev
    ViteDev -->|REST API HTTP localhost:8000| Uvicorn
    Uvicorn --> FastAPI
    FastAPI --> QuantumCore
```

---

## 5. Security & Boundary Classification

| Metric | Safe Condition | Warning Condition | Compromised Condition |
|---|---|---|---|
| **QBER** | $< 5.0\%$ | $5.0\% - 11.0\%$ | $> 11.0\%$ (BB84 Limit) |
| **χ² $p$-value** | $> 0.05$ | $0.01 - 0.05$ | $< 0.01$ (Distribution Skew) |
| **State Fidelity** | $> 90.0\%$ | $70.0\% - 90.0\%$ | $< 70.0\%$ |
| **Confidence** | $< 0.30$ | $0.30 - 0.50$ | $> 0.50$ (`is_malicious = True`) |
| **Action** | `NONE` | `ALERT` | `ABORT` (Channel Tear-Down) |
