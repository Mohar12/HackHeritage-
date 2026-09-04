# Empirical Verification Accuracy & Attack Detection Study

## Executive Summary

This empirical study evaluates the statistical accuracy of the HyperQDS protocol 
and its multi-dimensional physics-based threat detection pipeline across 200 randomized trials 
per scenario (1,000 total protocol executions). In accordance with rigorous scientific 
methodology, each trial employs a distinct pseudo-random seed ($seed = 1000 + i$) to demonstrate 
statistical consistency across the state space without reliance on tuned static parameters.

### Detection Metric Methodology
- **System-Level Defense Detection**: An attack is defined as successfully detected if 
  **either** the physics-based anomaly detector flags the transmission as malicious (`is_malicious == True`) 
  **or** cryptographic signature verification rejects the payload (`is_valid == False`). Either mechanism 
  independently protects the system from compromise.
- **Confidence Intervals**: Computed using the **Wilson score interval for binomial proportions** 
  with $\alpha = 0.05$ (95% confidence level), ensuring mathematical validity at boundary values 
  near 0% and 100% where standard Gaussian approximations break down.
- **Architectural Boundary on Intercept-Resend**: Intercept-resend operates during quantum 
  channel transmission (QKD/distribution phase) before signatures are signed. Detection is performed 
  exclusively via channel QBER elevation, so signature verification False Negative Rate is designated **N/A**.

## Aggregate Results Summary

| Scenario | Target Metric | Rate (%) | 95% Wilson CI | FPR (%) | FNR (%) | Mean QBER | Mean Fidelity | Mean Confidence |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Clean / Legitimate Transmission** | Acceptance Rate | 100.00% | [98.12%, 100.00%] | 0.50% | 0.00% | 0.0000 ± 0.0000 | 0.9996 ± 0.0001 | 0.1347 ± 0.0686 |
| **Quantum Signature Forgery** | Detection Rate | 100.00% | [98.12%, 100.00%] | 0.00% | 0.00% | 0.5044 ± 0.1890 | 0.5000 ± 0.0000 | 0.8679 ± 0.0427 |
| **Alice Impersonation Attack** | Detection Rate | 100.00% | [98.12%, 100.00%] | 0.00% | 0.00% | 0.5075 ± 0.1857 | 0.4500 ± 0.0000 | 1.0000 ± 0.0000 |
| **Signature Replay Attack** | Detection Rate | 100.00% | [98.12%, 100.00%] | 0.00% | 0.00% | 0.0000 ± 0.0000 | 0.9996 ± 0.0001 | 0.1413 ± 0.0974 |
| **Intercept-Resend / Eavesdropping** | Detection Rate | 100.00% | [98.12%, 100.00%] | 0.00% | N/A | 0.3762 ± 0.1772 | 0.5000 ± 0.0000 | 1.0000 ± 0.0000 |

## Scenario Analysis & Physical Interpretation

### 1. Clean / Legitimate Transmission

Under authentic execution without adversarial interference, teleportation-based signing achieved a verification acceptance rate of 100.00% (95% Wilson CI: [98.12%, 100.00%]). The mean empirical QBER remained at 0.0000, well below the Shor-Preskill BB84 security threshold of 0.11, while mean teleportation fidelity attained 0.9996. The detector correctly maintained low confidence scores (mean 0.1347), demonstrating that legitimate quantum signatures pass without false-alarm disruption.

### 2. Quantum Signature Forgery Attack

Adversarial forgery attempts using blind guessing and unentangled quantum states were thwarted with a 100.00% detection rate (95% Wilson CI: [98.12%, 100.00%]) and a 0.00% false negative acceptance rate. Because an adversary lacks Alice's pre-distributed EPR key correlations, random projective measurements evaluated directly by `verify()` yield an empirical QBER of 0.5044 (consistent with theoretical 50% bit error) and degraded fidelity of 0.5000, triggering immediate verification rejection (`reason: qber_exceeded`) and detector abort alerts.

### 3. Alice Impersonation Attack

Spoofed signature submissions generated without Alice's tripartite Bell pairs achieved a 100.00% detection rate (95% Wilson CI: [98.12%, 100.00%]) with zero false negatives. Evaluating Eve's spoofed payload in `verify()` revealed elevated bit error rates (0.5075) and low state fidelity (0.4500), while the heavily distorted measurement distribution yielded high detector threat confidence (1.0000), terminating the protocol.

### 4. Signature Replay Attack

Replaying genuine captured signatures (generated independently per trial with unique seeds) into unauthenticated session contexts resulted in a 100.00% defense detection/rejection rate (95% Wilson CI: [98.12%, 100.00%]). Crucially, because Eve replays authentic signature states from a prior session, the quantum transmission itself exhibits low error (0.0000) and high fidelity (0.9996); the attack is thwarted 100.00% by cryptographic session binding (`session_valid: False`, `reason: session_mismatch`), proving the necessity of layered defense across both physics and crypto layers.

### 5. Intercept-Resend Eavesdropping Attack

Eavesdropping on flying qubits via projective measurement and resending induced an empirical QBER of 0.3762 and state fidelity of 0.5000, achieving a 100.00% detection rate (95% Wilson CI: [98.12%, 100.00%]). In accordance with the No-Cloning Theorem, Eve's measurement collapses the qubit basis states, introducing detectable perturbations that violate the BB84 bounds and guarantee tamper-evidence before any signature transaction can proceed.
