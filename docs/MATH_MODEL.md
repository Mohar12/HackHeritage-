# Mathematical Model — QDS Threat Detection Framework

## 1. Hilbert Space and State Representation

The QDS protocol operates on a 2-dimensional complex Hilbert space $\mathcal{H} = \mathbb{C}^2$ per qubit. Multi-party states are tensor products: $\mathcal{H}_{ABC} = \mathcal{H}_A \otimes \mathcal{H}_B \otimes \mathcal{H}_C$.

### Pure Qubit States

A single qubit state $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$ with $|\alpha|^2 + |\beta|^2 = 1$.

### Density Matrices

Mixed states are described by density matrices $\rho \in \mathcal{B}(\mathcal{H})$, $\rho \geq 0$, $\text{Tr}(\rho) = 1$.

For a pure state: $\rho = |\psi\rangle\langle\psi|$.

---

## 2. Bell States (EPR Pairs)

The four maximally entangled Bell states form an orthonormal basis for $\mathcal{H}_A \otimes \mathcal{H}_B$:

$$|\Phi^+\rangle = \frac{|00\rangle + |11\rangle}{\sqrt{2}}, \quad |\Phi^-\rangle = \frac{|00\rangle - |11\rangle}{\sqrt{2}}$$

$$|\Psi^+\rangle = \frac{|01\rangle + |10\rangle}{\sqrt{2}}, \quad |\Psi^-\rangle = \frac{|01\rangle - |10\rangle}{\sqrt{2}}$$

**Circuit construction**: $|\Phi^+\rangle$ is prepared by:
1. Apply Hadamard $H$ to qubit $Q_0$: $|0\rangle \to \frac{|0\rangle + |1\rangle}{\sqrt{2}}$
2. Apply CNOT with $Q_0$ as control, $Q_1$ as target.

**Implementation**: `qds_core/pauli_ops.py:prepare_bell_state()` and `qds_core/teleportation.py:build_teleportation_circuit()`.

---

## 3. Mutually Unbiased Basis (MUB) Eigenstate Encoding

**Definition**: Three bases $\{X, Y, Z\}$ form mutually unbiased bases (MUBs) when any eigenstate of one basis has equal Born-rule probability $1/2$ for each outcome in any other basis.

The six Pauli eigenstates used for message encoding:

| Basis | Bit=0 | Bit=1 |
|-------|-------|-------|
| $Z$ | $|0\rangle = [1,0]^T$ | $|1\rangle = [0,1]^T$ |
| $X$ | $|{+}\rangle = \frac{1}{\sqrt{2}}[1,1]^T$ | $|{-}\rangle = \frac{1}{\sqrt{2}}[1,-1]^T$ |
| $Y$ | $|{+i}\rangle = \frac{1}{\sqrt{2}}[1,i]^T$ | $|{-i}\rangle = \frac{1}{\sqrt{2}}[1,-i]^T$ |

**Security property**: For any measurement Eve applies in a fixed basis $B'$, her average disturbance is at least $25\%$ per qubit whenever her basis $B' \neq B_i$ (which happens with probability $2/3$ for uniform MUB sampling).

**Implementation**: `qds_core/pauli_ops.py:encode_pauli_eigenstate()` and `generate_mub_bases()`.

---

## 4. Quantum Teleportation Protocol (Signing Primitive)

The QDS signing primitive uses three-party quantum teleportation (Bennett et al., 1993):

**Setup**: Alice shares EPR pair $|\Phi^+\rangle_{A_1 B}$ with Bob (and separately with Charlie).

**Circuit** (3 qubits: $Q_0$ = message, $Q_1$ = Alice's EPR, $Q_2$ = Bob's EPR):

1. **State preparation**: $Q_0 \leftarrow |\psi\rangle$ via unitary $U(\theta, \phi)$
2. **EPR distribution**: $H(Q_1)$, CNOT$(Q_1 \to Q_2)$ → shared $|\Phi^+\rangle_{Q_1 Q_2}$
3. **Bell-State Measurement** (BSM): CNOT$(Q_0 \to Q_1)$, $H(Q_0)$, Measure $(Q_0, Q_1)$ → $(c_0, c_1)$
4. **Classical channel**: $(c_0, c_1)$ transmitted to Bob
5. **Pauli corrections**: Bob applies $X^{c_1} Z^{c_0}$ to $Q_2$, recovering $|\psi\rangle$

**Implementation**: `qds_core/teleportation.py:build_teleportation_circuit()`.

---

## 5. Pauli Corrections and Verification

The Pauli correction operator applied during verification is:

$$\hat{U}_{c_0, c_1} = Z^{c_0} X^{c_1} = \begin{cases} I & (c_0=0, c_1=0) \\ X & (c_0=0, c_1=1) \\ Z & (c_0=1, c_1=0) \\ ZX & (c_0=1, c_1=1) \end{cases}$$

The corrected state satisfies $\hat{U}_{c_0,c_1} |\phi_{Bob}\rangle = |\psi_{Alice}\rangle$ with fidelity $F \geq 0.99$ under noise-free simulation.

**Implementation**: `qds_core/verification.py:apply_pauli_corrections()`.

---

## 6. Born Rule and Transition Probabilities

The probability of outcome $m$ when measuring $|\psi\rangle$ in basis $\{|m\rangle\}$:

$$P(\text{outcome } m) = |\langle m|\psi\rangle|^2$$

For Bell-state measurements, the ideal distribution over outcomes $\{|00\rangle, |01\rangle, |10\rangle, |11\rangle\}$ is uniform: $P = 1/4$ each for an unentangled input.

A correlated Bell pair $|\Phi^+\rangle$ produces $P(|00\rangle) = P(|11\rangle) = 1/2$, $P(|01\rangle) = P(|10\rangle) = 0$.

**Implementation**: `detection_engine/statistics.py:chi_squared_born_test()`.

---

## 7. Quantum Bit Error Rate (QBER)

The QBER quantifies the fraction of erroneous bits received over the quantum channel:

$$\text{QBER} = \frac{\text{erroneous bits}}{\text{total sifted bits}}$$

Where "sifted" means positions where sender and receiver used the same basis (BB84 sifting).

**Physical bounds**:
- Legitimate channel: $\text{QBER} \leq 1\%$ (hardware noise floor)
- Warning zone: $5\% < \text{QBER} \leq 11\%$
- Compromised (BB84 abort): $\text{QBER} > 11\%$

The $11\%$ bound is derived from the Shor-Preskill (2000) security proof: the channel is secure iff $h(\text{QBER}) < 1/2$, where $h$ is the binary entropy function. Solving $h^{-1}(1/2) \approx 0.11$.

**Implementation**: `detection_engine/statistics.py:calculate_qber()`.

---

## 8. Pearson's χ² Born-Rule Distribution Test

**Null hypothesis** $H_0$: Observed measurement counts follow the expected Born-rule distribution.

The Pearson χ² statistic with Cochran's rule (minimum 5 expected per bin):

$$\chi^2 = \sum_{i} \frac{(O_i - E_i)^2}{E_i}, \quad \text{dof} = k - 1$$

- $O_i$: observed count in bin $i$ (one of $|00\rangle, |01\rangle, |10\rangle, |11\rangle$)
- $E_i = N \cdot p_i$: expected count under $H_0$

**Decision rules**:
- $p$-value $> 0.05$: NORMAL (distribution matches expectation)
- $0.01 \leq p\text{-value} \leq 0.05$: WARNING
- $p$-value $< 0.01$: ANOMALOUS → recommended action **ABORT**

**Implementation**: `detection_engine/statistics.py:chi_squared_born_test()`.

---

## 9. Uhlmann State Fidelity

The quantum fidelity between two density matrices $\rho$ and $\sigma$:

$$F(\rho, \sigma) = \left(\text{Tr}\sqrt{\sqrt{\rho}\,\sigma\,\sqrt{\rho}}\right)^2$$

Implemented via eigenvalue decomposition (exact, no approximations):

$$\sqrt{\rho} = V \sqrt{\Lambda} V^\dagger, \quad M = \sqrt{\rho}\,\sigma\,\sqrt{\rho}$$

$$F(\rho, \sigma) = \left(\sum_i \sqrt{\lambda_i(M)}\right)^2$$

**Threshold bounds**:
- $F > 90\%$: HIGH (authentic channel)
- $70\% \leq F \leq 90\%$: DEGRADED (noise or partial attack)
- $F < 70\%$: CRITICAL (severe tampering)

**Implementation**: `qds_core/pauli_ops.py:calculate_state_fidelity()`.

---

## 10. Hoeffding Inequality — QBER Confidence

For $N$ i.i.d. binary measurements with baseline error rate $p_0$ and observed rate $\hat{p}$:

$$P\left(\hat{p} - p_0 \geq \varepsilon\right) \leq \exp\left(-2N\varepsilon^2\right)$$

The **detection confidence** (probability the excess is real, not noise):

$$C_{\text{QBER}} = 1 - \exp\left(-2N\varepsilon^2\right), \quad \varepsilon = \max(0, \hat{p} - p_0)$$

This replaces the previous arbitrary sigmoid scale factors with a statistically rigorous, physics-motivated formula that explicitly accounts for sample size $N$.

**Example**: For $N = 1024$, $\hat{p} = 0.25$ (intercept-resend), $p_0 = 0.01$:
$$C_{\text{QBER}} = 1 - \exp(-2 \times 1024 \times 0.24^2) = 1 - e^{-118.0} \approx 1.000000$$

**Implementation**: `detection_engine/thresholds.py:hoeffding_confidence()`.

**Reference**: Hoeffding, W. (1963). JASA 58, 13–30.

---

## 11. Helstrom Trace Distance — Quantum Distinguishability

The Helstrom trace distance quantifies the maximum distinguishability of two quantum states:

$$D(\rho, \sigma) = \frac{1}{2}\text{Tr}|\rho - \sigma| = \frac{1}{2}\sum_i |\lambda_i(\rho - \sigma)|$$

The **optimal measurement probability** of distinguishing $\rho$ from $\sigma$:

$$P_{\text{distinguish}}(\rho, \sigma) = \frac{1 + D(\rho, \sigma)}{2}$$

- $D = 0$: states are identical → $P = 0.5$ (cannot do better than random guessing)
- $D = 1$: states are orthogonal → $P = 1.0$ (perfect discrimination)

In the QDS context, $\rho_{\text{channel}}$ (observed) vs $\rho_{\text{ideal}}$ (authentic Bell state) gives the maximum probability that the detector can distinguish a legitimate channel from an attacked one.

**Implementation**: `detection_engine/thresholds.py:helstrom_distinguishability()`.

**Reference**: Helstrom, C.W. (1976). Quantum Detection and Estimation Theory. Academic Press.

---

## 12. Dunjko et al. (2014) Unforgeability and Non-Repudiation Bounds

For an $N$-qubit QDS with authentication threshold $s_a$ and verification threshold $s_v$ ($s_a < s_v$):

### Unforgeability Bound (Theorem 1, Dunjko 2014):
$$P_{\text{forge}}(N) \leq \exp\!\left(-\frac{(s_a - s_v)^2}{2} \cdot N\right)$$

A third party (Eve) cannot produce a valid signature with probability greater than $P_{\text{forge}}$.

### Non-Repudiation Bound (Theorem 1, Dunjko 2014):
$$P_{\text{repudiate}}(N) \leq \exp\!\left(-\frac{(s_v - s_a)^2}{2} \cdot N\right)$$

The signer cannot later deny having produced a valid signature with probability greater than $P_{\text{repudiate}}$.

### Gottesman-Chuang Random Guessing Bound:
For blind forgery (Eve guesses all $N$ outcomes randomly without entanglement):

$$P_{\text{forge,GC}}(N) = 2^{-N}$$

The implemented bound uses $\min(P_{\text{Dunjko}}, P_{\text{GC}})$ — the tighter of the two.

**Default parameters** (per Dunjko 2014 protocol): $s_a = 0.20$, $s_v = 0.35$.

**Example** ($N = 8$ qubits):
- $P_{\text{forge,GC}}(8) = 2^{-8} = 0.00390625 \approx 0.39\%$
- $P_{\text{repudiate}}(8) = \exp(-(0.35-0.20)^2 \cdot 8 / 2) = \exp(-0.09) \approx 9.14\%$

**Implementation**: `detection_engine/thresholds.py:forgery_probability_bound()` and `nonrepudiation_probability_bound()`.

**Reference**: Dunjko, V., Wallden, P., Andersson, E. (2014). PRL 112, 040502.

---

## 13. Composite Threat Confidence Score

The confidence score $C \in [0,1]$ is a weighted sum of three physics-grounded component scores:

$$C = W_{\text{QBER}} \cdot C_{\text{QBER}} + W_{\chi^2} \cdot C_{\chi^2} + W_F \cdot C_F$$

where:

| Component | Formula | Weight |
|-----------|---------|--------|
| $C_{\text{QBER}}$ | Hoeffding confidence: $1 - \exp(-2N\varepsilon^2)$ | $0.45$ |
| $C_{\chi^2}$ | $1 - p_{\text{value}}$ | $0.30$ |
| $C_F$ | $\max(0, F_{\text{thresh}} - F) / F_{\text{thresh}}$ | $0.25$ |

**ABORT floor**: If any metric triggers ABORT classification, $C \geq 0.75 + 0.25 \cdot \text{severity}$ (continuous severity scaling).

**Decision**: `is_malicious = True` iff $C > 0.50$.

**Previous formula** (replaced): $C = 0.45 \cdot \sigma\!\left(\frac{\text{QBER}-0.05}{0.03}\right) + 0.30 \cdot \sigma\!\left(\frac{0.05-p}{0.02}\right) + 0.25 \cdot \sigma\!\left(\frac{0.90-F}{0.08}\right)$ used arbitrary scale factors $(0.03, 0.02, 0.08)$ with no physics justification. Replaced by Hoeffding bound.

---

## 14. Depolarizing Channel Noise Model

The depolarizing channel with error probability $p$ acts as:

$$\mathcal{E}(\rho) = (1-p)\rho + \frac{p}{3}\left(X\rho X + Y\rho Y + Z\rho Z\right)$$

The corresponding Kraus operators are:

$$K_0 = \sqrt{1-p}\, I, \quad K_1 = \sqrt{\frac{p}{3}}\, X, \quad K_2 = \sqrt{\frac{p}{3}}\, Y, \quad K_3 = \sqrt{\frac{p}{3}}\, Z$$

Implemented both as a `qiskit_aer.noise.NoiseModel` (for circuit-level simulation) and as an explicit Kraus superoperator on density matrices (for analytic cross-validation).

**Implementation**: `attack_sim/channel_manipulation.py:apply_depolarizing_kraus()`.

**Reference**: Nielsen, M.A. & Chuang, I.L. (2000). QCQI §8.3.

---

## 15. Intercept-Resend Attack (Eve's QBER Contribution)

Eve measures each flying qubit in a randomly chosen basis $B_E \in \{X, Z\}$ and forwards the projected eigenstate to Bob.

**Theoretical QBER bound**: With probability $1/2$, Eve's basis $B_E \neq B_A$ (Alice's). When bases mismatch, Eve's re-prepared state has a $1/2$ probability of producing an error at Bob (who measures in $B_A$). Therefore:

$$\text{QBER}_{\text{IR}} = \frac{1}{2} \times \frac{1}{2} = \frac{1}{4} = 25\%$$

This is the fundamental intercept-resend detection bound of BB84 QKD. Any observed QBER above $11\%$ → ABORT.

**Projective measurement operators** (Eve's basis choices):

$$Z: \left\{|0\rangle\langle 0|, |1\rangle\langle 1|\right\}, \quad X: \left\{|{+}\rangle\langle{+}|, |{-}\rangle\langle{-}|\right\}$$

**Implementation**: `attack_sim/channel_manipulation.py:simulate_intercept_resend()`.

---

## 16. References

| Citation | Relevance |
|----------|-----------|
| Gottesman, D. & Chuang, I. (2001). arXiv:quant-ph/0105032 | Original QDS protocol; forgery bound $P = 2^{-n}$ |
| Dunjko, V. et al. (2014). PRL 112, 040502 | Unforgeability and non-repudiation bounds; no-quantum-memory QDS |
| Amiri, R. & Andersson, E. (2015). Entropy 17(8) | Unconditional security proofs |
| Bennett, C.H. & Brassard, G. (1984). IEEE | BB84 QKD protocol; QBER threshold derivation |
| Shor, P. & Preskill, J. (2000). PRL 85, 441 | BB84 security proof; $11\%$ QBER abort threshold |
| Hoeffding, W. (1963). JASA 58, 13–30 | Confidence intervals for QBER excess detection |
| Helstrom, C.W. (1976). Quantum Detection Theory | Trace distance optimal distinguishability bound |
| Nielsen, M.A. & Chuang, I.L. (2000). QCQI | Kraus operators; depolarizing channel; density matrices |
| Pearson, K. (1900). Philosophical Magazine | χ² goodness-of-fit test for Born-rule distribution |
| Scarani, V. et al. (2009). Rev. Mod. Phys. 81, 1301 | QKD security and intercept-resend QBER derivation |
