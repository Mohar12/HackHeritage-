# HyperQDS — Quantum-Inspired Cyber Threat Detection Framework
## Comprehensive Master Context & Architectural Knowledge Base

> **Target Audience / Purpose**: This document is an exhaustive, self-contained technical and architectural blueprint of the HyperQDS repository. It is specifically structured for large language models (such as Claude 3.5 / 3.7 Sonnet, Claude Opus, and Gemini) and security researchers to enable deep analysis, verification, explanation, and code generation across any subsystem of this project without ambiguity.

---

## Table of Contents

1. [Executive Summary & Core Objectives](#1-executive-summary--core-objectives)
2. [High-Level Architecture & Entity Topology](#2-high-level-architecture--entity-topology)
3. [Formal Mathematical Model & Quantum Physics Foundations](#3-formal-mathematical-model--quantum-physics-foundations)
   - [3.1 Hilbert Space & State Encodings](#31-hilbert-space--state-encodings)
   - [3.2 Bell State (EPR Pair) Formulations](#32-bell-state-epr-pair-formulations)
   - [3.3 Pauli Operators & MUB Encodings](#33-pauli-operators--mub-encodings)
   - [3.4 3-Party Quantum Teleportation Signing Primitive](#34-3-party-quantum-teleportation-signing-primitive)
   - [3.5 Bell-State Measurement (BSM) & Feed-Forward Pauli Corrections](#35-bell-state-measurement-bsm--feed-forward-pauli-corrections)
   - [3.6 Born Rule, Transition Probabilities & Fidelity](#36-born-rule-transition-probabilities--fidelity)
   - [3.7 Statistical Hypothesis Testing: QBER, Excess-Error, Chi-Squared ($\chi^2$)](#37-statistical-hypothesis-testing-qber-excess-error-chi-squared-chi2)
   - [3.8 Information-Theoretic Security Bounds (Holevo, BB84, Helstrom, Dunjko)](#38-information-theoretic-security-bounds-holevo-bb84-helstrom-dunjko)
4. [Adversarial Threat Models & Attack Simulation Mechanics](#4-adversarial-threat-models--attack-simulation-mechanics)
   - [4.1 Attack Class 1: Quantum Forgery (`attack_sim/forgery.py`)](#41-attack-class-1-quantum-forgery-attack_simforgerypy)
   - [4.2 Attack Class 2: Impersonation (`attack_sim/impersonation.py`)](#42-attack-class-2-impersonation-attack_simimpersonationpy)
   - [4.3 Attack Class 3: Replay Attacks (`attack_sim/replay.py`)](#43-attack-class-3-replay-attacks-attack_simreplaypy)
   - [4.4 Attack Class 4: Quantum Channel Manipulation (`attack_sim/channel_manipulation.py`)](#44-attack-class-4-quantum-channel-manipulation-attack_simchannel_manipulationpy)
5. [Physics-Based Anomaly Detection Engine (`detection_engine/`)](#5-physics-based-anomaly-detection-engine-detection_engine)
   - [5.1 Pipeline Workflow (`detector.py`)](#51-pipeline-workflow-detectorpy)
   - [5.2 Continuous Confidence Scoring Algorithm](#52-continuous-confidence-scoring-algorithm)
   - [5.3 Calibrated Physical Thresholds & Actions](#53-calibrated-physical-thresholds--actions)
6. [Post-Quantum Cryptographic Audit Ledger (`backend/audit_ledger.py`)](#6-post-quantum-cryptographic-audit-ledger-backendaudit_ledgerpy)
   - [6.1 Cryptographic Primitives: SHA3-512, HMAC-SHA3-512, Ed25519](#61-cryptographic-primitives-sha3-512-hmac-sha3-512-ed25519)
   - [6.2 Blockchain-Style Hash Chaining & Merkle Integrity](#62-blockchain-style-hash-chaining--merkle-integrity)
   - [6.3 SQLite Persistence, Concurrency & Thread-Safety](#63-sqlite-persistence-concurrency--thread-safety)
   - [6.4 Verification APIs & Anti-Tampering Self-Audit](#64-verification-apis--anti-tampering-self-audit)
7. [FastAPI Backend REST API Reference & Data Contracts](#7-fastapi-backend-rest-api-reference--data-contracts)
   - [7.1 Endpoints Catalogue & HTTP Methods](#71-endpoints-catalogue--http-methods)
   - [7.2 Pydantic V2 Request & Response Schemas](#72-pydantic-v2-request--response-schemas)
   - [7.3 Security Architecture: CORS, Token Auth, API Key Enforcement](#73-security-architecture-cors-token-auth-api-key-enforcement)
   - [7.4 Qiskit 1.x / 0.x Compatibility Layer (`qiskit_compat.py`)](#74-qiskit-1x--0x-compatibility-layer-qiskit_compatpy)
8. [Frontend Dashboard Architecture (React 18 + Vite + Three.js)](#8-frontend-dashboard-architecture-react-18--vite--threejs)
   - [8.1 UI Component Tree & Workflow Hierarchy](#81-ui-component-tree--workflow-hierarchy)
   - [8.2 3D Quantum Visualizers (Three.js WebGL Engines)](#82-3d-quantum-visualizers-threejs-webgl-engines)
   - [8.3 Real-Time Statistical Analytics (Recharts)](#83-real-time-statistical-analytics-recharts)
   - [8.4 Quantum Dark-Mode Glassmorphism Design System](#84-quantum-dark-mode-glassmorphism-design-system)
9. [Verification, Benchmarks & Validation Results](#9-verification-benchmarks--validation-results)
   - [9.1 1,000-Run Accuracy Study Findings](#91-1000-run-accuracy-study-findings)
   - [9.2 Latency & Performance Benchmarking](#92-latency--performance-benchmarking)
   - [9.3 Test Suite Catalog & Coverage](#93-test-suite-catalog--coverage)
10. [Deployment, Infrastructure & Orchestration](#10-deployment-infrastructure--orchestration)
    - [10.1 Docker & Multi-Container Setup](#101-docker--multi-container-setup)
    - [10.2 Native Scripts (`start.py`, `start.bat`, `stop.bat`)](#102-native-scripts-startpy-startbat-stopbat)
    - [10.3 Environment Variables & Configuration](#103-environment-variables--configuration)
11. [Comprehensive Repository File-by-File Index](#11-comprehensive-repository-file-by-file-index)

---

## 1. Executive Summary & Core Objectives

### The Problem
Traditional digital signatures (RSA, DSA, ECDSA) rely on computational hardness assumptions (e.g., integer factorization, discrete logarithms, elliptic curve discrete logarithms). These assumptions collapse under Shor's polynomial-time quantum algorithm on fault-tolerant quantum computers. While Post-Quantum Cryptography (PQC) lattice and hash-based standards (e.g., ML-DSA, SLH-DSA) offer algorithmic resistance, they remain classical and cannot physically detect active eavesdropping or tampering in real-time.

### The Solution: HyperQDS
**HyperQDS** is a production-grade, deterministic, physics-based simulation and detection framework for **Teleportation-Based Quantum Digital Signatures (QDS)**, rooted in the foundational protocol of Gottesman & Chuang (2001) and generalized by Dunjko et al. (2014).

### Fundamental Differentiators
1. **Zero Machine Learning / Zero AI Dependencies**:
   Detection is 100% deterministic and physics-grounded. Classification decisions derive exclusively from quantum mechanical invariants: the Born rule, Quantum Bit Error Rate (QBER), Chi-Squared ($\chi^2$) goodness-of-fit hypothesis testing, Hoeffding inequalities, and Holevo information-theoretic bounds. No neural networks, black boxes, or heuristic ML algorithms are used.
2. **True Quantum Teleportation Primitive**:
   Messages are signed not through mathematical encryption, but by distributing entangled Einstein-Podolsky-Rosen (EPR) Bell pairs ($|\Phi^+\rangle$) between Alice (Signer), Bob (Verifier 1), and Charlie (Verifier 2), followed by a Bell-State Measurement (BSM) and classical Pauli feed-forward transmission.
3. **No-Cloning Protection**:
   The quantum no-cloning theorem ($\nexists U \text{ s.t. } U|\psi\rangle|0\rangle = |\psi\rangle|\psi\rangle$) guarantees that an adversary (Eve) cannot duplicate quantum signature states without introducing observable state collapse and disturbance.
4. **Post-Quantum Tamper-Proof Audit Trail**:
   All protocol transactions, verification states, and anomaly detections are cryptographically anchored to an immutable append-only ledger secured by SHA3-512 (256-bit Grover quantum resistance), HMAC-SHA3-512, and Ed25519 digital signatures.

---

## 2. High-Level Architecture & Entity Topology

The system comprises three physical/logical protocol participants and an active adversary:

```
                      +-----------------------------+
                      |     ALICE (Signer / QDS)    |
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              | Quantum EPR Channel                         | Quantum EPR Channel
              v                                             v
+-----------------------------+             +-----------------------------+
|     BOB (Verifier 1)        |<----------->|    CHARLIE (Verifier 2)     |
+-----------------------------+  Classical  +-----------------------------+
              ^                   Cross-Check               ^
              |                                             |
              +----------------------+----------------------+
                                     |
                                [ EVE ]
                         Adversarial Attacker
                (Intercept-Resend, Forgery, Replay,
                 Impersonation, Decoherence Noise)
                                     |
                                     v
                 +---------------------------------------+
                 |       DETECTION ENGINE PIPELINE       |
                 |  - QBER Calculation                   |
                 |  - Chi-Square Born Test (p-value)     |
                 |  - Excess-Error Metric (\Delta E)     |
                 |  - Holevo / Helstrom Security Bounds  |
                 +-------------------+-------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |    POST-QUANTUM AUDIT LEDGER (DB)     |
                 |   (SHA3-512 / HMAC-SHA3 / Ed25519)    |
                 +-------------------+-------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |   FASTAPI REST API + REACT 18 SPA     |
                 |   (Three.js 3D WebGL + Recharts)      |
                 +---------------------------------------+
```

### Communication Channels
- **Quantum Channels**: Distribute entangled Bell pairs ($|\Phi^+\rangle$) and carry quantum teleportation target states. Sensitive to eavesdropping, decoherence, and manipulation.
- **Classical Authenticated Channels**: Transmit classical Bell measurement outcome bit pairs $(c_0, c_1)$, message hashes, timestamps, nonces, and verifier cross-check bit exchanges.

---

## 3. Formal Mathematical Model & Quantum Physics Foundations

### 3.1 Hilbert Space & State Encodings
The protocol operates over a complex 2-dimensional Hilbert space per qubit: $\mathcal{H} = \mathbb{C}^2$.
For the three-party tripartite system (Alice, Bob, Charlie), the state space is the tensor product:
$$\mathcal{H}_{ABC} = \mathcal{H}_A \otimes \mathcal{H}_B \otimes \mathcal{H}_C \cong \mathbb{C}^8$$

A pure single-qubit state is parameterized as:
$$|\psi\rangle = \alpha |0\rangle + \beta |1\rangle = \cos\left(\frac{\theta}{2}\right)|0\rangle + e^{i\phi}\sin\left(\frac{\theta}{2}\right)|1\rangle, \quad |\alpha|^2 + |\beta|^2 = 1$$
where $\theta \in [0, \pi]$ and $\phi \in [0, 2\pi)$ define the coordinates on the Bloch sphere $\mathcal{S}^2$.

Mixed states and noise channels are described by density matrices:
$$\rho \in \mathcal{B}(\mathcal{H}), \quad \rho \ge 0, \quad \text{Tr}(\rho) = 1$$

---

### 3.2 Bell State (EPR Pair) Formulations
The four maximally entangled orthonormal Bell states spanning $\mathcal{H} \otimes \mathcal{H}$ are:
$$|\Phi^+\rangle = \frac{|00\rangle + |11\rangle}{\sqrt{2}}, \quad |\Phi^-\rangle = \frac{|00\rangle - |11\rangle}{\sqrt{2}}$$
$$|\Psi^+\rangle = \frac{|01\rangle + |10\rangle}{\sqrt{2}}, \quad |\Psi^-\rangle = \frac{|01\rangle - |10\rangle}{\sqrt{2}}$$

#### Circuit Implementation (`qds_core/pauli_ops.py` & `qds_core/teleportation.py`)
$|\Phi^+\rangle$ is synthesized from the vacuum state $|00\rangle$ using a Hadamard gate $H$ on qubit 0 followed by a Controlled-NOT (CNOT) gate with control qubit 0 and target qubit 1:
$$\text{CNOT}_{0\to 1} (H \otimes I) |00\rangle = \text{CNOT}_{0\to 1} \left(\frac{|00\rangle + |10\rangle}{\sqrt{2}}\right) = \frac{|00\rangle + |11\rangle}{\sqrt{2}} = |\Phi^+\rangle$$

---

### 3.3 Pauli Operators & MUB Encodings
The single-qubit Pauli operator group is:
$$I = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}, \quad X = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}, \quad Y = \begin{pmatrix} 0 & -i \\ i & 0 \end{pmatrix}, \quad Z = \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}$$

The eigenstates of $X, Y, Z$ constitute three **Mutually Unbiased Bases (MUBs)** satisfying $|\langle u_i | v_j \rangle|^2 = \frac{1}{2}$ for all eigenstates $|u_i\rangle \in \mathcal{B}_1, |v_j\rangle \in \mathcal{B}_2$ with $\mathcal{B}_1 \ne \mathcal{B}_2$:
- **$Z$-basis (computational)**: $\{|0\rangle, |1\rangle\}$
- **$X$-basis (Hadamard)**: $\{|+\rangle = \frac{|0\rangle+|1\rangle}{\sqrt{2}}, |-\rangle = \frac{|0\rangle-|1\rangle}{\sqrt{2}}\}$
- **$Y$-basis (circular)**: $\{|+i\rangle = \frac{|0\rangle+i|1\rangle}{\sqrt{2}}, |-i\rangle = \frac{|0\rangle-i|1\rangle}{\sqrt{2}}\}$

*Note on Protocol Usage*: In HyperQDS, the BB84-style key exchange uses $X$ and $Z$ conjugate bases. The teleportation payload is deterministically $Z$-basis encoded per message bit, while `qds_core/pauli_ops.py` provides the full 3-basis machinery.

---

### 3.4 3-Party Quantum Teleportation Signing Primitive
The signing protocol teleports an unknown or encoded quantum state $|\psi\rangle_0 = \alpha|0\rangle + \beta|1\rangle$ from Alice to Bob (and Charlie) through pre-shared entangled pairs.

#### Composite Initial State (3 Qubits)
$$|\Psi_{\text{total}}\rangle = |\psi\rangle_0 \otimes |\Phi^+\rangle_{12} = (\alpha|0\rangle_0 + \beta|1\rangle_0) \otimes \frac{1}{\sqrt{2}}(|00\rangle_{12} + |11\rangle_{12})$$
$$|\Psi_{\text{total}}\rangle = \frac{1}{\sqrt{2}} \left[ \alpha|000\rangle + \alpha|011\rangle + \beta|100\rangle + \beta|111\rangle \right]$$

Expressing qubits 0 and 1 in terms of the Bell basis:
$$|00\rangle = \frac{1}{\sqrt{2}}(|\Phi^+\rangle + |\Phi^-\rangle), \quad |01\rangle = \frac{1}{\sqrt{2}}(|\Psi^+\rangle + |\Psi^-\rangle)$$
$$|10\rangle = \frac{1}{\sqrt{2}}(|\Psi^+\rangle - |\Psi^-\rangle), \quad |11\rangle = \frac{1}{\sqrt{2}}(|\Phi^+\rangle - |\Phi^-\rangle)$$

Substituting these identities yields:
$$|\Psi_{\text{total}}\rangle = \frac{1}{2} \Big[ |\Phi^+\rangle_{01} \otimes (\alpha|0\rangle + \beta|1\rangle)_2 + |\Phi^-\rangle_{01} \otimes (\alpha|0\rangle - \beta|1\rangle)_2 + |\Psi^+\rangle_{01} \otimes (\beta|0\rangle + \alpha|1\rangle)_2 + |\Psi^-\rangle_{01} \otimes (-\beta|0\rangle + \alpha|1\rangle)_2 \Big]$$

Rewritten in terms of Pauli operators acting on Bob's qubit 2:
$$|\Psi_{\text{total}}\rangle = \frac{1}{2} \Big[ |\Phi^+\rangle_{01} \otimes (I |\psi\rangle)_2 + |\Phi^-\rangle_{01} \otimes (Z |\psi\rangle)_2 + |\Psi^+\rangle_{01} \otimes (X |\psi\rangle)_2 + |\Psi^-\rangle_{01} \otimes (ZX |\psi\rangle)_2 \Big]$$

---

### 3.5 Bell-State Measurement (BSM) & Feed-Forward Pauli Corrections
Alice performs a BSM on qubits 0 and 1 by applying $\text{CNOT}_{0\to 1}$ followed by $H_0$ and measuring in the computational basis. This projects the state into classical bits $(c_0, c_1) \in \{0, 1\}^2$:

| Classical Measurement $(c_0, c_1)$ | Bell State Projected | State on Bob's Qubit $Q_2$ | Required Pauli Correction $\hat{U}_{c_0, c_1}$ |
|:---:|:---:|:---:|:---:|
| `0 0` | $|\Phi^+\rangle$ | $|\psi\rangle$ | $I$ (No operation) |
| `0 1` | $|\Psi^+\rangle$ | $X|\psi\rangle$ | $X = \sigma_x$ |
| `1 0` | $|\Phi^-\rangle$ | $Z|\psi\rangle$ | $Z = \sigma_z$ |
| `1 1` | $|\Psi^-\rangle$ | $ZX|\psi\rangle$ | $Z X = -i Y$ |

General formula implemented in `qds_core/verification.py`:
$$\hat{U}_{c_0, c_1} = Z^{c_0} X^{c_1}$$
After applying $\hat{U}_{c_0, c_1}$, Bob's state recovers $|\psi\rangle$ with fidelity $F = 1.0$ under noiseless conditions.

---

### 3.6 Born Rule, Transition Probabilities & Fidelity
The probability of observing outcome $|m\rangle$ from state $|\psi\rangle$:
$$P(m) = |\langle m | \psi \rangle|^2 = \text{Tr}(|m\rangle\langle m| \rho)$$

For mixed states $\rho$ and pure target $|\psi\rangle$, Quantum State Fidelity is:
$$F(\rho, |\psi\rangle) = \langle\psi|\rho|\psi\rangle = \text{Tr}\left(\sqrt{\sqrt{\rho}|\psi\rangle\langle\psi|\sqrt{\rho}}\right)^2$$
- Uncorrupted state: $F \ge 0.99$
- Intercepted / Forged state: $F \le 0.50$

---

### 3.7 Statistical Hypothesis Testing: QBER, Excess-Error, Chi-Squared ($\chi^2$)

#### Quantum Bit Error Rate (QBER)
$$\text{QBER} = \frac{N_{\text{discrepancies}}}{N_{\text{total\_measurements}}} = \frac{\sum_{i=1}^N |b_i^{\text{sent}} - b_i^{\text{received}}|}{N}$$

#### Excess-Error Metric ($\Delta E$)
Measures the anomalous error above the physical baseline noise:
$$\Delta E = \text{QBER}_{\text{observed}} - \text{QBER}_{\text{baseline}}$$
where $\text{QBER}_{\text{baseline}} \approx 0.01$ (1.0% dark counts / thermal noise).

#### Chi-Squared ($\chi^2$) Born-Rule Goodness-of-Fit Test
Tests whether observed shot distributions $O_k$ match the theoretical Born distribution $E_k = N_{\text{shots}} \cdot P(k)$:
$$\chi^2 = \sum_{k \in \{00, 01, 10, 11\}} \frac{(O_k - E_k)^2}{E_k}, \quad \text{degrees of freedom } k - 1 = 3$$
The two-tailed survival function (p-value) is computed via the regularized upper incomplete gamma function:
$$p = 1 - F(\chi^2; 3) = \frac{\Gamma(3/2, \chi^2 / 2)}{\Gamma(3/2)}$$
- $p \ge 0.05$: Measurements consistent with honest quantum transmission.
- $p < 0.01$: Statistically significant channel perturbation / active eavesdropping.

---

### 3.8 Information-Theoretic Security Bounds

#### 1. BB84 Security Threshold ($11.0\%$)
By Shor-Preskill (2000) and Gottesman-Lo-Lütkenhaus-Preskill (GLLP 2004), secret key distillation and signature non-forgeability hold if and only if:
$$\text{QBER} < \text{QBER}_{\text{abort}} = \frac{1 - 1/\sqrt{2}}{2} \approx 11.0\%$$
Above $11.0\%$, the mutual information between Alice and Eve $I(A:E)$ exceeds that between Alice and Bob $I(A:B)$, permitting undetected forgery.

#### 2. Helstrom Bound (Minimum-Error Distinguishability)
The maximum probability of distinguishing an honest state $\rho$ from an attacked state $\sigma$ under optimal quantum measurement is:
$$P_D = \frac{1}{2} + \frac{1}{4}\|\rho - \sigma\|_1 = \frac{1}{2} + \frac{1}{2} D(\rho, \sigma)$$
where $D(\rho, \sigma) = \frac{1}{2}\text{Tr}|\rho - \sigma|$ is the trace distance. For pure states with fidelity $F$:
$$D(|\psi\rangle, |\phi\rangle) = \sqrt{1 - F^2}$$

#### 3. Dunjko et al. (2014) Non-Repudiation & Forgery Bound
For signature length $L$ qubits, the probability that Alice can repudiate her signature or that Bob can forge it is strictly bounded by:
$$P_{\text{forgery}} \le \exp\left( -2 L (s_{\text{verify}} - s_{\text{auth}})^2 \right)$$
where $s_{\text{auth}}$ is the authentication threshold and $s_{\text{verify}}$ is the verification threshold ($s_{\text{auth}} < s_{\text{verify}}$).

---

## 4. Adversarial Threat Models & Attack Simulation Mechanics

HyperQDS models four exhaustive threat classes, implemented in `attack_sim/`:

```
+-------------------------------------------------------------------------------+
|                        ADVERSARIAL ATTACK TAXONOMY                            |
+-------------------+--------------------+------------------+-------------------+
| 1. FORGERY        | 2. IMPERSONATION   | 3. REPLAY        | 4. CHANNEL NOISE  |
| - Basis Guessing  | - Identity Masq.   | - Signature Resend| - Depolarizing    |
| - Intercept/Resend| - EPR Substitution | - Nonce Expiry   | - Pauli X, Y, Z   |
| - QBER ~ 25%-50%  | - QBER ~ 40%-50%   | - State Collapse | - Damping (T1/T2) |
+-------------------+--------------------+------------------+-------------------+
```

### 4.1 Attack Class 1: Quantum Forgery (`attack_sim/forgery.py`)
- **Adversary Capability**: Eve intercepts the classical signature or tries to generate a valid signature for message $M'$ without possessing the corresponding private key states.
- **Physics**: Due to the no-cloning theorem, Eve must measure the flying qubits in a guessed basis. By Born's rule, if she measures in basis $B' \ne B$, she incurs a $50\%$ error rate. Averaged over unbiased basis choices, Eve introduces $\text{QBER} \ge 25.0\%$.
- **Simulation**: `simulate_forgery()` replaces Bob's entangled halves with forged eigenstates, measures overlap with Alice's true key, and computes the resulting fidelity collapse ($F \le 0.50$) and high $\chi^2$ anomaly.

### 4.2 Attack Class 2: Impersonation (`attack_sim/impersonation.py`)
- **Adversary Capability**: Eve claims to be Alice and signs a message directed to Bob and Charlie.
- **Physics**: Eve has no entangled Bell pairs with Bob and Charlie. If she generates unentangled states or Bell pairs of her own, the joint Bell measurement correlation between Alice's supposed state and Bob's receiver state fails.
- **Detection**: Bob and Charlie cross-check signature outcomes over classical authenticated channels. The statistical discrepancy between Bob's outcome and Charlie's outcome immediately triggers an impersonation abort ($\text{QBER} \approx 45\% - 50\%$).

### 4.3 Attack Class 3: Replay Attacks (`attack_sim/replay.py`)
- **Adversary Capability**: Eve captures a valid, historical signature from a previous session and re-transmits it for a new transaction.
- **Physics & Logic**:
  1. *Quantum Collapse*: The quantum signature states for the original session have already undergone measurement and irreversible wavepacket collapse. They cannot be reused.
  2. *Cryptographic Nonce/Timestamp*: Each signature bundle contains a cryptographic nonce, session ID, and ISO-8601 timestamp signed into the classical payload. Replayed nonces are rejected by the SQLite ledger's unique constraint.

### 4.4 Attack Class 4: Quantum Channel Manipulation (`attack_sim/channel_manipulation.py`)
Eve injects decoherence and environmental noise onto the quantum fiber:
1. **Depolarizing Noise Channel**:
   $$\mathcal{E}_{\text{depol}}(\rho) = (1 - p)\rho + \frac{p}{3}(X\rho X + Y\rho Y + Z\rho Z) = \left(1 - \frac{4p}{3}\right)\rho + \frac{4p}{3}\frac{I}{2}$$
2. **Pauli Bit-Flip ($X$) & Phase-Flip ($Z$) Noise**: Inverts $|0\rangle \leftrightarrow |1\rangle$ or introduces relative phase shifts $|+\rangle \leftrightarrow |-\rangle$.
3. **Amplitude Damping ($T_1$ Relaxation)**: Simulates photon absorption loss in fiber:
   $$E_0 = \begin{pmatrix} 1 & 0 \\ 0 & \sqrt{1-\gamma} \end{pmatrix}, \quad E_1 = \begin{pmatrix} 0 & \sqrt{\gamma} \\ 0 & 0 \end{pmatrix}$$
4. **Phase Damping ($T_2$ Dephasing)**: Simulates refractive index fluctuations without energy loss:
   $$E_0 = \begin{pmatrix} 1 & 0 \\ 0 & \sqrt{1-\lambda} \end{pmatrix}, \quad E_1 = \begin{pmatrix} 0 & 0 \\ 0 & \sqrt{\lambda} \end{pmatrix}$$
5. **Coherent Unitary Rotation**: Inadvertent or deliberate channel rotation $R_x(\theta), R_y(\theta), R_z(\theta)$.

---

## 5. Physics-Based Anomaly Detection Engine (`detection_engine/`)

### 5.1 Pipeline Workflow (`detector.py`)
The master entrypoint `detect_threat(measurement_data)` executes in $<10\mu s$:
1. Computes observed $\text{QBER}$ and excess-error $\Delta E$.
2. Performs $\chi^2$ test against theoretical Born probability distribution to obtain the $p$-value.
3. Classifies individual metrics against calibrated quantum thresholds.
4. Evaluates information-theoretic security bounds (Hoeffding confidence, Helstrom distinguishability, Dunjko forgery probability).
5. Calculates continuous confidence score $S \in [0.0, 1.0]$.
6. Emits threat classification: `is_malicious: bool`, `confidence_score: float`, and `recommended_action: {NONE, ALERT, ABORT}`.

```
       Measurement Data (Counts, Sent/Recv Bits, Bases, Fidelity)
                                   |
                                   v
             +-------------------------------------------+
             | statistics.py: calculate_qber(), chi2()   |
             +---------------------+---------------------+
                                   |
                                   v
             +-------------------------------------------+
             | thresholds.py: classify_qber, chi2, fid   |
             +---------------------+---------------------+
                                   |
                                   v
             +-------------------------------------------+
             | detector.py: Sigmoid Score Aggregation    |
             | S = w1*QBER_sig + w2*Chi2_sig + w3*Fid_sig|
             +---------------------+---------------------+
                                   |
               +-------------------+-------------------+
               |                                       |
        S < 0.65 (BENIGN)                      S >= 0.65 (MALICIOUS)
        Action: NONE / ALERT                   Action: ABORT
        Audit: Logged to Ledger                Audit: Alert + Hash Chained
```

---

### 5.2 Continuous Confidence Scoring Algorithm
Rather than a naive binary if-else switch, HyperQDS computes a continuous, calibrated score $S \in [0.0, 1.0]$:
$$S = W_{\text{QBER}} \cdot \sigma\left(k_1 (\text{QBER} - \theta_{\text{QBER}})\right) + W_{\chi^2} \cdot \sigma\left(k_2 (-\log_{10}(p) - \theta_{\chi^2})\right) + W_{\text{fidelity}} \cdot \sigma\left(k_3 (\theta_{\text{fid}} - F)\right)$$

Where:
- Weights: $W_{\text{QBER}} = 0.50$, $W_{\chi^2} = 0.30$, $W_{\text{fidelity}} = 0.20$ (Sum = 1.0)
- Sigmoid function: $\sigma(x) = \frac{1}{1 + e^{-x}}$
- Steepness constants: $k_1 = 30.0$, $k_2 = 2.0$, $k_3 = 15.0$
- Critical Thresholds: $\theta_{\text{QBER}} = 0.08$ ($8\%$), $\theta_{\chi^2} = 2.0$ ($p = 0.01$), $\theta_{\text{fid}} = 0.85$

---

### 5.3 Calibrated Physical Thresholds & Actions

| Metric | Range | Status | Recommended Action |
|---|---|---|---|
| **QBER** | $< 0.05$ ($5\%$) | `SECURE` | `NONE` (Proceed) |
| **QBER** | $0.05 \le \text{QBER} < 0.11$ | `WARNING` | `ALERT` (Increase error-correction shots) |
| **QBER** | $\ge 0.11$ ($11\%$ BB84 bound) | `COMPROMISED` | `ABORT` (Discard session immediately) |
| **$\chi^2$ $p$-value** | $\ge 0.05$ | `NORMAL` | `NONE` |
| **$\chi^2$ $p$-value** | $0.01 \le p < 0.05$ | `WARNING` | `ALERT` |
| **$\chi^2$ $p$-value** | $< 0.01$ | `ANOMALOUS` | `ABORT` |
| **State Fidelity** | $\ge 0.90$ | `HIGH` | `NONE` |
| **State Fidelity** | $0.70 \le F < 0.90$ | `DEGRADED` | `ALERT` |
| **State Fidelity** | $< 0.70$ | `CRITICAL` | `ABORT` |

---

## 6. Post-Quantum Cryptographic Audit Ledger (`backend/audit_ledger.py`)

### 6.1 Cryptographic Primitives
To withstand future quantum cryptanalysis:
1. **SHA3-512 (Keccak FIPS 202)**:
   Replaces legacy SHA-256. Under Grover's algorithm ($O(\sqrt{N})$ speedup), SHA-256 provides only $128$-bit security. SHA3-512 guarantees **$256$-bit post-quantum security**, meeting NIST PQC standards.
2. **HMAC-SHA3-512**:
   Computes a keyed Message Authentication Code for every ledger block under an ephemeral or configured root secret key, providing integrity protection against database file modification.
3. **Ed25519 (EdDSA over Curve25519)**:
   High-speed, constant-time signature scheme used to sign the genesis block and periodic checkpoint milestones, preventing side-channel leakage.

---

### 6.2 Blockchain-Style Hash Chaining & Merkle Integrity
Ledger blocks form a cryptographic hash chain where block $n$ embeds the hash of block $n-1$:
$$\text{Block\_Hash}_n = \text{SHA3-512}\Big(\text{Block\_Hash}_{n-1} \,\|\, \text{Timestamp} \,\|\, \text{Session\_ID} \,\|\, \text{Event\_Type} \,\|\, \text{Payload\_Hash} \,\|\, \text{Nonce}\Big)$$

```
+--------------------------+       +--------------------------+
|      BLOCK #1 (GENESIS)  |       |         BLOCK #2         |
| Hash: 00a3f9...          |       | PrevHash: 00a3f9...      |
| PrevHash: "GENESIS"      |<------| Hash: 88b14c...          |
| PayloadHash: 3c4d...     |       | PayloadHash: 9e0a...     |
| HMAC: 77f0...            |       | HMAC: 44c2...            |
+--------------------------+       +--------------------------+
                                                 ^
                                                 |
                                   +--------------------------+
                                   |         BLOCK #3         |
                                   | PrevHash: 88b14c...      |
                                   | Hash: d22f80...          |
                                   | PayloadHash: 11a7...     |
                                   | HMAC: ee9b...            |
                                   +--------------------------+
```

---

### 6.3 SQLite Persistence, Concurrency & Thread-Safety
- **Storage**: Stored in `backend/audit_ledger.db` using WAL mode (Write-Ahead Logging).
- **Thread Safety**: Thread-safe with Python `threading.Lock()` and async queue background flushing, ensuring zero latency impact on real-time quantum execution circuits.
- **Privacy Compliance**: No raw quantum measurement bitstrings or private keys are stored. Only cryptographic hashes, session IDs, timestamps, statistical metrics, and threat verdicts are persisted.

---

### 6.4 Verification APIs & Anti-Tampering Self-Audit
The ledger exposes a deterministic verification algorithm:
- `POST /audit/verify`: Re-computes the entire SHA3-512 chain from Genesis to tip. If a single byte in `audit_ledger.db` is altered, the chain breaks at that exact block index, identifying the tampering timestamp and corrupt block.

---

## 7. FastAPI Backend REST API Reference & Data Contracts

### 7.1 Endpoints Catalogue

| Endpoint | Method | Purpose | Typical Response |
|---|---|---|---|
| `/generate-keys` | `POST` | Generates EPR pairs and public key states for Alice, Bob, Charlie | Session ID, public key states, basis sequences |
| `/sign` | `POST` | Alice signs a message using teleportation and Bell measurement | Signature payload, measurement outcomes, correction bits |
| `/verify` | `POST` | Bob or Charlie verifies Alice's signature via Pauli corrections | `is_valid: bool`, QBER, Fidelity, Born overlap |
| `/simulate-attack` | `POST` | Simulates adversarial attack (forgery, impersonation, replay, noise) | Attacked measurement counts, perturbed states |
| `/detect` | `POST` | Executes physics-based threat detection pipeline | `is_malicious`, `confidence_score`, `recommended_action` |
| `/audit/ledger` | `GET` | Fetches historical immutable audit ledger blocks | List of chained ledger blocks with hashes |
| `/audit/verify` | `POST` | Validates hash chain integrity and HMAC signatures | `valid: bool`, `total_blocks`, `tampered_block_index` |
| `/metrics` | `GET` | Prometheus/monitoring statistics (throughput, QBER distributions) | Real-time operational metrics |
| `/health` | `GET` | Liveness and readiness probe | `status: "healthy"`, backend version |

---

### 7.2 Pydantic V2 Request & Response Schemas

#### Key Request Models (`backend/schemas.py`)
```python
class SimulationRequest(BaseModel):
    num_qubits: int = Field(default=8, ge=1, le=5000)
    batch_size: int = Field(default=14, ge=1, le=14)  # Max 14 EPR pairs = 28 qubits on Aer
    attack_type: AttackType = Field(default=AttackType.NONE)
    noise_rate: float | None = Field(default=None, ge=0.0, le=1.0)
    shots: int = Field(default=1024, ge=64, le=8192)
    seed: int = Field(default=42, ge=0)

class MeasurementDataSchema(BaseModel):
    measurement_counts: dict[str, int]
    fidelity: float = Field(ge=0.0, le=1.0)
    measured_qber: float | None = Field(default=None, ge=0.0, le=1.0)
    sent_bits: list[int] | None = None
    received_bits: list[int] | None = None
    sent_bases: list[str] | None = None
    received_bases: list[str] | None = None
    expected_distribution: dict[str, float] | None = None
    session_id: str | None = None
    total_shots: int | None = None
```

#### Key Detection Response Model
```python
class ThreatDetectionResponse(BaseModel):
    is_malicious: bool
    confidence_score: float = Field(ge=0.0, le=1.0)
    qber: float
    qber_class: QBERClass           # "SECURE", "WARNING", "COMPROMISED"
    chi2_p_value: float
    chi2_class: Chi2Class           # "NORMAL", "WARNING", "ANOMALOUS"
    fidelity: float
    fidelity_class: FidelityClass   # "HIGH", "DEGRADED", "CRITICAL"
    recommended_action: RecommendedAction # "NONE", "ALERT", "ABORT"
    quantum_security_bounds: dict[str, Any]
    audit_record_id: str
```

---

### 7.3 Security Architecture: CORS, Token Auth, API Key Enforcement
- **CORS Middleware**: Explicitly configured for local development (`http://localhost:5173`, `http://127.0.0.1:5173`) and container networks. Rejects unauthorized origins.
- **Authentication**: `backend/auth.py` provides bearer token and API key validation (`X-API-Key`).
- **Signature Integrity**: `backend/integrity.py` computes HMAC-SHA256 integrity tags across all signature fields, preventing classical payload tampering between signing and verification.

---

### 7.4 Qiskit 1.x / 0.x Compatibility Layer (`backend/qiskit_compat.py`)
Qiskit underwent breaking API changes between version 0.45 and 1.0+ (`qiskit.Aer` migration to `qiskit_aer`, execution primitives refactoring). `qiskit_compat.py` dynamically probes the environment:
1. Prefers `qiskit_aer.AerSimulator` (modern).
2. Falls back to legacy `qiskit.Aer.get_backend('aer_simulator')`.
3. If Qiskit is entirely unavailable, gracefully switches to a high-precision statevector matrix emulator (`Statevector` / `numpy`), ensuring tests and API runs never crash.

---

## 8. Frontend Dashboard Architecture (React 18 + Vite + Three.js)

### 8.1 UI Component Tree & Workflow Hierarchy
The frontend (`dashboard/src/`) is built with React 18.3 and Vite 5.4, following a modular tabbed layout:

```
[ App.jsx ]
   ├── [ StitchHeader.jsx ] — Navigation, System Status, API Health, Live Latency
   ├── [ Tab: StitchLandingPage.jsx ] — Hero, Protocol Walkthrough, Features
   ├── [ Tab: HonestProtocolPage.jsx ] — End-to-End Alice-Bob-Charlie Signing Lab
   │      ├── [ ProtocolRunPanel.jsx ] — Keygen, Message Input, Sign, Verify buttons
   │      └── [ Teleportation3D.jsx ] — Real-time 3D Teleportation Circuit Visualizer
   ├── [ Tab: AttackVisualizer.jsx ] — Adversarial Threat Simulation Lab
   │      ├── [ AttackSelectionPanel.jsx ] — Forgery, Impersonation, Replay, Noise controls
   │      ├── [ AttackArchitecture3D.jsx ] — 3D Node Mesh with Intercept Trajectories
   │      └── [ ResultsCharts.jsx ] — QBER Trends, Chi2 p-values, Confusion Matrix
   ├── [ Tab: AuditLedgerPanel.jsx ] — Blockchain Block Explorer & Hash Chain Verifier
   └── [ Tab: ScalableCluster3D.jsx ] — Multi-Node Quantum QDS Network Visualization
```

---

### 8.2 3D Quantum Visualizers (Three.js WebGL Engines)
1. **`Teleportation3D.jsx`**:
   Renders the 3-qubit teleportation channel in interactive 3D WebGL:
   - Alice's state preparation stage ($Q_0$) with glowing particle wavepackets.
   - Entangled Bell pair generation ($Q_1, Q_2$) with dynamic sine-wave Bell links.
   - Real-time Bell State Measurement (BSM) collapse animation.
   - Dual-rail classical feed-forward transmission pulses traveling to Bob's unitary correction gate.
2. **`AttackArchitecture3D.jsx`**:
   Spatial network topology displaying Alice, Bob, Charlie, and Eve. When an attack is triggered, Eve's node activates, emitting red intercepting laser beams that perturb the quantum fiber channel.
3. **`BlochSphere3D.jsx`**:
   Full 3D Bloch sphere rendering state vectors $|\psi\rangle$, equator circles, latitude/longitude grids, and Pauli basis axes ($X, Y, Z$) with interactive orbital controls.

---

### 8.3 Real-Time Statistical Analytics (Recharts)
- **QBER Distribution Histogram**: Displays observed error rates alongside the $11.0\%$ BB84 compromise threshold line.
- **Born Rule Probability Radar/Bar Chart**: Compares measured shot counts $O_k$ against theoretical predictions $E_k$.
- **Security Bounds Curve**: Plots Dunjko forgery probability decay vs signature length $L$.
- **Confidence Gauge**: Visualizes continuous threat score $S \in [0, 1]$ with dynamic color gradients (Green $\to$ Amber $\to$ Red).

---

### 8.4 Quantum Dark-Mode Glassmorphism Design System
All UI styles reside in `dashboard/src/index.css` (150 KB custom CSS):
- Dark slate/navy theme: `#050811`, `#0a1026`, `#0f172a`.
- Glowing quantum accent colors: Cyan (`#00f5d4`), Electric Purple (`#7928ca`), Alert Rose (`#ff0055`).
- Backdrop filters with frosted glassmorphism: `backdrop-filter: blur(16px)`.
- GPU-accelerated 3D card tilts with custom CSS perspective transforms.

---

## 9. Verification, Benchmarks & Validation Results

### 9.1 1,000-Run Accuracy Study Findings (`docs/accuracy_study_results.md`)
Conducted across 1,000 randomized Monte Carlo protocol executions:

| Scenario / Attack Vector | Total Runs | Correct Detections | False Positives | False Negatives | Accuracy |
|---|:---:|:---:|:---:|:---:|:---:|
| **Honest Protocol (Benign Noise $\le 1\%$)** | 250 | 249 | 1 (0.4%) | 0 | **99.6%** |
| **Quantum Forgery Attack** | 250 | 248 | 0 | 2 (0.8%) | **99.2%** |
| **Impersonation Attack** | 250 | 250 | 0 | 0 | **100.0%** |
| **Channel Noise (Depolarizing $\ge 12\%$)** | 250 | 250 | 0 | 0 | **100.0%** |
| **AGGREGATE TOTAL** | **1,000** | **997** | **1** | **2** | **99.7%** |

- **Detection Rate (Sensitivity)**: $99.73\%$
- **Specificity (True Negative Rate)**: $99.60\%$
- **Area Under Curve (AUC-ROC)**: $> 0.999$

---

### 9.2 Latency & Performance Benchmarking (`docs/performance_benchmark_results.md`)
Measured on AMD Ryzen / Intel i7 simulation hardware:

| Component / Subsystem | Operation | Mean Latency | Throughput |
|---|---|:---:|:---:|
| `qds_core/teleportation.py` | 8-qubit teleportation circuit | 4.2 ms | ~240 circuits/sec |
| `attack_sim/forgery.py` | Full forgery simulation + measurement | 6.8 ms | ~147 sims/sec |
| `detection_engine/detector.py` | Complete statistical threat pipeline | **0.08 ms (80 $\mu$s)** | **12,500 evals/sec** |
| `backend/audit_ledger.py` | SHA3-512 Block Chaining + SQLite Append | 0.45 ms | ~2,200 blocks/sec |
| FastAPI REST Endpoint | `POST /detect` end-to-end HTTP roundtrip | 1.8 ms | ~550 req/sec |

---

### 9.3 Test Suite Catalog & Coverage
The project maintains a 100% passing test suite across 6 test modules:
1. `tests/test_qds_core.py` (20.9 KB): Verifies Bell state generation, teleportation fidelity, and Pauli corrections.
2. `tests/test_attack_sim.py` (8.2 KB): Verifies all 4 attack models produce correct perturbed quantum states.
3. `tests/test_detection_engine.py` (22.9 KB): Tests QBER calculation, $\chi^2$ p-values, and threshold classifications.
4. `tests/test_quantum_engine.py` (15.9 KB): Tests Aer simulator integration and quantum circuit depth.
5. `tests/test_advanced_math.py` (7.1 KB): Tests Hoeffding bounds, Helstrom trace distance, and Born probabilities.
6. `backend/test_*.py` (10 files, ~200 KB): Exhaustive tests for API security, CORS, audit ledger persistence, and HMAC integrity.

---

## 10. Deployment, Infrastructure & Orchestration

### 10.1 Docker & Multi-Container Setup
The root `docker-compose.yml` spins up the entire stack with a single command:
- **`backend` service**: Runs FastAPI under `uvicorn` on port `8000`. Uses `docker/Dockerfile.backend` (Python 3.11-slim + Qiskit + scipy + cryptography).
- **`dashboard` service**: Runs React 18 + Vite on port `5173`. Uses `docker/Dockerfile.frontend` (Node 20-alpine + Nginx production reverse proxy).

```bash
# Build and run with Docker Compose
docker compose up --build
```

---

### 10.2 Native Scripts
For local development without Docker:
- **`start.py`**: Cross-platform launcher with automatic dependency checking, port conflict resolution, health checks, and auto-opening the browser.
- **`start.bat` / `stop.bat`**: Windows batch launchers.
- **`start.ps1`**: PowerShell launcher.
- **`start_services.bat` / `stop_services.bat`**: Minimal background service controllers.

---

### 10.3 Environment Variables & Configuration (`.env.example`)
```ini
# FastAPI Backend
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Quantum Simulation Engine
QISKIT_AER_SHOTS=1024
DEFAULT_EPR_PAIRS=8
MAX_CIRCUIT_QUBITS=28

# Post-Quantum Audit Ledger
AUDIT_LEDGER_DB_PATH=backend/audit_ledger.db
AUDIT_HMAC_SECRET_KEY=hyperqds_post_quantum_hmac_secret_key_2026

# Detection Engine Calibration
QBER_SECURE_THRESHOLD=0.05
QBER_ABORT_THRESHOLD=0.11
CHI2_P_VALUE_THRESHOLD=0.01
FIDELITY_ABORT_THRESHOLD=0.70
```

---

## 11. Comprehensive Repository File-by-File Index

| File Path | Lines | Size | Role / Description |
|---|:---:|:---:|---|
| **Core Quantum Protocol** | | | |
| `qds_core/key_distribution.py` | ~380 | 12.9 KB | Distributes entangled Bell pairs, establishes conjugate Pauli bases ($X, Z$) |
| `qds_core/teleportation.py` | ~270 | 9.0 KB | Constructs Qiskit teleportation circuit, executes BSM and state transfer |
| `qds_core/pauli_ops.py` | ~310 | 9.9 KB | Defines Pauli matrices, Bell state preparation, fidelity, and statevector ops |
| `qds_core/signing.py` | ~280 | 9.1 KB | Alice signs message: state encoding $\to$ teleportation $\to$ classical envelope |
| `qds_core/verification.py` | ~190 | 5.8 KB | Bob/Charlie verification: applies Pauli corrections $Z^{c_0} X^{c_1}$, checks fidelity |
| `qds_core/protocol_dag.py` | ~420 | 14.3 KB | DAG orchestrator managing state transitions and multi-round verification |
| **Adversarial Attack Simulation** | | | |
| `attack_sim/forgery.py` | ~410 | 14.1 KB | Simulates forgery via basis guessing and unentangled state substitution |
| `attack_sim/impersonation.py` | ~340 | 11.7 KB | Simulates Eve masquerading as Alice; detects correlation failure |
| `attack_sim/replay.py` | ~150 | 4.7 KB | Simulates replaying past signatures; enforces state collapse & nonce checks |
| `attack_sim/channel_manipulation.py` | ~520 | 17.7 KB | Models depolarizing noise, Pauli errors, damping ($T_1/T_2$), and rotations |
| **Physics Detection Engine** | | | |
| `detection_engine/statistics.py` | ~490 | 16.4 KB | Calculates QBER, excess error $\Delta E$, and $\chi^2$ Born-rule test with $p$-values |
| `detection_engine/thresholds.py` | ~680 | 25.3 KB | Houses physical constants, BB84 limits ($11\%$), Holevo/Helstrom bounds |
| `detection_engine/detector.py` | ~320 | 10.7 KB | Master detection pipeline; computes continuous score $S$ and action |
| **Backend & Security** | | | |
| `backend/main.py` | ~920 | 34.6 KB | FastAPI app entrypoint, routing, CORS, exception handling, rate limiting |
| `backend/schemas.py` | ~476 | 20.2 KB | Pydantic v2 schemas for all API requests, responses, and validation |
| `backend/audit_ledger.py` | ~767 | 31.4 KB | SQLite SHA3-512 hash-chained, HMAC-authenticated, Ed25519-signed ledger |
| `backend/integrity.py` | ~310 | 10.6 KB | HMAC-SHA256 signature payload binding and tamper-proofing |
| `backend/auth.py` | ~210 | 7.2 KB | API key and bearer token authentication middleware |
| `backend/qiskit_compat.py` | ~390 | 13.2 KB | Environment abstraction bridging Qiskit 1.x, 0.45, and NumPy fallbacks |
| `backend/routes/keys.py` | ~120 | 3.4 KB | `/generate-keys` route handler |
| `backend/routes/signatures.py`| ~320 | 11.1 KB | `/sign` and `/verify` route handlers |
| `backend/routes/attacks.py` | ~380 | 13.1 KB | `/simulate-attack` route handler |
| `backend/routes/detection.py` | ~170 | 5.1 KB | `/detect` threat detection route handler |
| **Frontend UI (Dashboard)** | | | |
| `dashboard/src/App.jsx` | ~330 | 11.2 KB | Top-level SPA state, tab router, API health poller |
| `dashboard/src/components/Teleportation3D.jsx` | ~780 | 35.3 KB | Interactive Three.js 3D quantum teleportation circuit visualizer |
| `dashboard/src/components/AttackArchitecture3D.jsx` | ~450 | 19.0 KB | 3D multi-node mesh showing Eve's intercept trajectories |
| `dashboard/src/components/BlochSphere3D.jsx` | ~310 | 11.5 KB | 3D Bloch sphere displaying quantum state vector coordinates |
| `dashboard/src/components/ResultsCharts.jsx` | ~580 | 21.4 KB | Recharts components for QBER histograms, Born curves, and radar charts |
| `dashboard/src/components/AuditLedgerPanel.jsx` | ~210 | 6.6 KB | Blockchain block explorer and cryptographic chain verification UI |
| `dashboard/src/components/ProtocolRunPanel.jsx`| ~520 | 19.1 KB | Interactive protocol run controller for Alice, Bob, and Charlie |
| `dashboard/src/components/AttackSelectionPanel.jsx` | ~390 | 13.7 KB | Interactive attack vector configurator and trigger panel |
| `dashboard/src/components/StitchLandingPage.jsx` | ~1100 | 50.4 KB | Comprehensive landing page with interactive demos and feature tours |
| `dashboard/src/index.css` | ~3500 | 151.0 KB | Quantum dark-mode glassmorphism design system |
| **Scripts & Benchmarks** | | | |
| `scripts/bundle_codebase.py` | ~160 | 5.2 KB | Generates Markdown codebase bundles for LLMs |
| `scripts/accuracy_study.py` | ~750 | 34.9 KB | Runs 1000-sample Monte Carlo accuracy verification study |
| `scripts/performance_benchmark.py` | ~420 | 16.5 KB | Measures execution latency and throughput across all components |
| `scripts/verify_formulas.py` | ~260 | 10.1 KB | Verifies mathematical consistency of quantum formulas |
| `start.py` | ~310 | 10.0 KB | Cross-platform service launcher and monitor |
| **Testing** | | | |
| `tests/test_qds_core.py` | ~520 | 20.4 KB | Unit tests for key distribution, teleportation, and verification |
| `tests/test_attack_sim.py` | ~240 | 8.0 KB | Unit tests for forgery, impersonation, replay, and noise |
| `tests/test_detection_engine.py` | ~580 | 22.3 KB | Tests for QBER, $\chi^2$, thresholds, and continuous scoring |

---

## 12. Quick Reference: How to Share With Claude

To extract any kind of information using Claude:

1. **For General Architecture, Formulas, Threat Models, and API Inquiries**:
   Upload `HYPERQDS_MASTER_CONTEXT.md` to Claude (or add it as Project Knowledge in Claude.ai). Claude can answer theoretical, statistical, architectural, or API usage questions with 100% precision.
2. **For Deep Code Analysis, Bug Fixing, Feature Generation, or Test Writing**:
   - **Backend & Core Logic**: Upload `BACKEND_AND_CORE_CODEBASE.md` (contains every Python file, Qiskit circuit, attack engine, detection module, and test).
   - **Frontend & 3D UI**: Upload `FRONTEND_CODEBASE.md` (contains every React component, Three.js 3D canvas, CSS file, and Vite configuration).
   - **All-in-One / Monolithic**: Upload `COMPLETE_CODEBASE.md` (contains every single source file across the entire repository).
3. **To Regenerate Codebase Bundles**:
   Whenever you make modifications to the code, simply run:
   ```bash
   python scripts/bundle_codebase.py
   ```
   This immediately refreshes all three Markdown bundles with your latest edits!
