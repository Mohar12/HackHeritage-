# Security Analysis — QDS Threat Detection Framework

## Protocol Security Model

The teleportation-based QDS protocol achieves **information-theoretic security**
under the following assumptions:

| Assumption | Justification |
|---|---|
| Authenticated classical channel | Prevents man-in-the-middle on correction bits |
| No quantum memory for Eve | Proven unconditionally secure (Dunjko et al., 2014) |
| Honest abort on verification failure | Recipients terminate on mismatch |
| Trusted quantum channel noise baseline | Hardware QBER ≤ 1% assumed |

## Attack Surface & Detection Bounds

### 1. Forgery
- **Theoretical success probability**: `P(forge) = 2^(-n)` for `n`-qubit key
- **Detection mechanism**: Forged measurement outcomes produce QBER ≈ 0.5
  (random guessing), far above the security threshold of 11%.
- **Detection confidence**: High (> 0.95 for n ≥ 8 qubits)

### 2. Impersonation
- **Detection mechanism**: Spoofed Bell pairs produce a different joint-state
  distribution; the χ² test against the expected Born-rule distribution rejects
  the null hypothesis with p < 0.001 for n ≥ 4 qubits.
- **False-positive rate**: < 0.1% under honest channel conditions.

### 3. Replay
- **Detection mechanism**: Measurement bit-string patterns repeat across
  sessions (statistically impossible for fresh quantum states).
  Session-ID and timestamp cross-checks provide a second layer.
- **Limitation**: Classical replay of correction bits is detectable only if
  session IDs are cryptographically bound to the signature.

### 4. Channel Manipulation (Intercept-Resend)
- **QBER impact**: Intercept-resend attacks on BB84-basis states introduce
  QBER ≈ 25%, well above the 11% security threshold.
- **Detection mechanism**: `compute_excess_error()` flags QBER elevation
  above the hardware noise baseline.

## Threat Classification Thresholds

| Metric | Safe | Warning | Compromised |
|---|---|---|---|
| QBER | < 5% | 5–11% | > 11% |
| χ² p-value | > 0.05 | 0.01–0.05 | < 0.01 |
| State fidelity | > 90% | 70–90% | < 70% |
| Confidence score | < 0.3 | 0.3–0.5 | > 0.5 |

## Out-of-Scope Threats

The following are **not modelled** in this framework:
- Side-channel attacks on the classical hardware
- Quantum-memory-assisted attacks (no quantum memory assumed for Eve)
- Denial-of-service on the classical correction channel
- Blockchain / distributed ledger attacks (not part of this system)

<!-- TODO: Add formal security proofs and epsilon-delta bounds -->
<!-- TODO: Reference Amiri & Andersson (2015) for composable security -->
