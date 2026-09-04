# Security Analysis — QDS Threat Detection Framework

## Protocol Security Model

This simulation demonstrates the security mechanisms underlying an information-theoretically-secure QDS scheme under the following explicit physical and cryptographic assumptions:

| Assumption | Justification |
|---|---|
| **Authenticated classical channel** | Prevents man-in-the-middle tampering on classical Pauli correction bits $(c_0, c_1)$. |
| **No quantum memory for Eve** | Proven unconditionally secure against collective and individual quantum attacks (Dunjko et al., 2014). |
| **Honest abort on verification failure** | Recipients terminate protocol if $\text{QBER} \ge 11\%$ or session mismatch occurs. |
| **Trusted hardware baseline** | Hardware channel noise floor is fixed at $\text{QBER}_0 = 1.0\%$. |

---

## Adversarial Threat Models & Mathematical Verification

### 1. Quantum Forgery Attack
- **Mechanism**: Adversary (Eve) intercepts signature metadata and attempts to blindly guess measurement outcomes and Pauli correction bits without pre-shared entanglement with Alice.
- **Theoretical Bound**: For an $n$-qubit signature, $P(\text{forge}) = 2^{-n}$. For $n \ge 8$, $P(\text{forge}) \le 0.0039$.
- **Detection Signal**: Blind outcome guessing yields $\text{QBER} \approx 0.50$, far exceeding the $11\%$ abort boundary.
- **Status**: **PASS** — Forged signatures fail verification and trigger $\text{COMPROMISED}$ threat alerts.

### 2. Impersonation Attack
- **Mechanism**: Eve generates a spoofed public key and unentangled quantum state distribution, masquerading as Alice.
- **Statistical Signal**: Spoofed states distort joint Pauli measurement outcomes away from the uniform Born-rule distribution. Pearson's $\chi^2$ goodness-of-fit test rejects the null hypothesis with $p < 0.001$.
- **Status**: **PASS** — Spoofed distributions detected by $\chi^2$ test with $p < 0.01$, triggering immediate channel tear-down.

### 3. Replay Attack
- **Mechanism**: Eve captures a valid signature packet from Session $A$ and resubmits it in Session $B$.
- **Detection & Boundary**:
  - **Cryptographic Session Binding**: Verifier checks $\text{session\_id}_A \neq \text{session\_id}_B$ and rejects with `session_mismatch`.
  - **No-Cloning Property**: Quantum signature states are single-use; replayed measurement records produce key desynchronization errors upon verification.
- **Status**: **PASS** — Replayed signatures cannot be accepted as fresh valid signatures.

### 4. Intercept-Resend (Eavesdropping)
- **Mechanism**: Eve intercepts flying signature qubits, measures them in a randomly chosen basis ($X$ or $Z$), collapses their state vectors via Born projection, and forwards the collapsed eigenstates to Bob.
- **Theoretical Bound**: Basis mismatch probability is $50\%$; basis mismatch error is $50\% \implies \text{QBER} \approx 25.0\%$.
- **Detection Signal**: Empirical $\text{QBER} \approx 25\%$ exceeds the $11\%$ BB84 safety threshold with positive excess error $> 20\%$.
- **Status**: **PASS** — Detector flags channel as $\text{COMPROMISED}$ with recommended action $\text{ABORT}$.

---

## Threat Classification Thresholds

| Metric | Safe | Warning | Compromised |
|---|---|---|---|
| **QBER** | $< 5.0\%$ | $5.0\% - 11.0\%$ | $> 11.0\%$ (BB84 Limit) |
| **χ² $p$-value** | $> 0.05$ | $0.01 - 0.05$ | $< 0.01$ (Distribution Skew) |
| **State Fidelity** | $> 90.0\%$ | $70.0\% - 90.0\%$ | $< 70.0\%$ |
| **Confidence Score** | $< 0.30$ | $0.30 - 0.50$ | $> 0.50$ (`is_malicious = True`) |

---

## Out-of-Scope Threats

The following attack vectors are explicitly out of scope:
1. Classical side-channel physical probing of laser diodes and single-photon avalanche detectors (SPADs).
2. Advanced coherent quantum memory storage attacks (quantum memory is strictly assumed unavailable to Eve).
3. Classical Denial-of-Service (DoS) attacks jamming classical communication lines.
4. Decentralized ledger / blockchain vulnerabilities.
