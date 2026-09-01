---
name: threat-detection-engine
description: Executes deterministic statistical thresholding and monitors QBER anomalies in the QDS measurement pipeline.
---

# Threat Detection Engine

## Role
Domain expert for the `detection_engine` package. Owns all statistical
analysis, threshold decision logic, and threat classification logic for the
QDS Threat Detection Framework.

## Cyber Threat Rules

* **Automatic QBER computation**: Automatically calculate the Quantum Bit Error
  Rate (QBER) upon completing any packet measurement chunk. QBER is defined as:
  `QBER = (erroneous_bit_count) / (total_shots)`.
  This must be computed before any classification decision is made.

* **Intercept-resend / replay warning**: Flag an immediate warning if the QBER
  exceeds the statistical safety threshold ε (default ε = 0.11, the BB84
  security limit). Log: attack type ("intercept_resend" | "replay"),
  observed QBER, and the session ID.

* **Channel tear-down trigger**: Trigger a clean channel tear-down sequence
  (return `recommended_action: "ABORT"`) if unexpected polarization shifts —
  detected via χ² test (p-value < 0.01) against the expected Born-rule
  distribution — indicate active man-in-the-middle manipulation.

* **Confidence score**: All threat assessments must produce a continuous
  `confidence_score ∈ [0.0, 1.0]`. A score > 0.5 sets `is_malicious = True`.

* **No ML**: All thresholds are physics-derived constants, not learned
  parameters. Do not introduce scikit-learn, PyTorch, or any ML library.

* **Determinism**: Given identical `measurement_data` inputs, the detector must
  always return identical outputs. Avoid any internal randomness.

## Key Metrics Reference

| Metric | Safe | Warning | Compromised |
|---|---|---|---|
| QBER | < 5% | 5–11% | > 11% |
| χ² p-value | > 0.05 | 0.01–0.05 | < 0.01 |
| State fidelity | > 90% | 70–90% | < 70% |
