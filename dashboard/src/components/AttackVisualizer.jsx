/**
 * AttackVisualizer.jsx
 * =====================
 * Custom, mathematically faithful visualizer tailored for quantum protocols & attack vectors:
 *  - Mode 'honest': 7-Stage Legitimate Teleportation Lifecycle
 *  - Mode 'attack' / Vector Mechanisms:
 *      * Intercept-Resend (EPR Bell-State Measurement & Collapse)
 *      * Depolarizing Noise (Environmental Fiber Decoherence)
 *      * Signature Forgery (Blind Statevector Guessing, P_success = 2^-L)
 *      * Alice Impersonation (Spoofed Unentangled States -> severe χ² skew)
 *      * Signature Replay (Session Timestamp / Nonce Mismatch)
 */

import React, { useState, useEffect } from 'react';
import TabCrossFade from './TabCrossFade.jsx';

export const HONEST_PROTOCOL_STAGES = [
  {
    step: 1,
    id: 'encoding',
    title: 'Message Encoding',
    actor: 'Alice (Signer)',
    iconType: 'pulse',
    text: 'Alice encodes each message bit into a Pauli eigenstate in the Z-basis. The quantum state |ψ⟩ is prepared from verified message payload without secret-key dependence.',
    formula: '|ψ⟩ = α|0⟩ + β|1⟩ (Z-Basis)',
    stageId: 2,
    subsystem: 'Alice Quantum State Preparation (QSP)',
    physicalLaw: 'Pauli Eigenstate Preparation: Honest pure state formulation without secret key guesswork.',
    statusBadge: 'STATE PREPARED',
  },
  {
    step: 2,
    id: 'bsm',
    title: 'Bell-State Measurement',
    actor: 'Alice QPU',
    iconType: 'atom',
    text: "A joint Bell-State Measurement (BSM) projects the message qubit and Alice's EPR half into one of four orthogonal Bell states on Qiskit Aer.",
    formula: 'BSM(|ψ⟩ ⊗ |Φ⁺⟩_A) → (c₀, c₁)',
    stageId: 3,
    subsystem: 'Joint Entangled Qubit Measurement',
    physicalLaw: 'Bell Projective Measurement: True quantum projection onto the 4 Bell basis states on Qiskit Aer.',
    statusBadge: 'GENUINE BSM PERFORMED',
  },
  {
    step: 3,
    id: 'correction_bits',
    title: 'Correction Bits Extracted',
    actor: 'Classical Feedforward',
    iconType: 'bits',
    text: 'BSM projection resolves two classical feedforward correction bits (c₀, c₁). These parity coordinates are transmitted via an authenticated classical channel.',
    formula: '(c₀, c₁) ∈ {0, 1}² [Protected]',
    stageId: 4,
    subsystem: 'Authenticated Feedforward Channel',
    physicalLaw: 'Classical Parity Extraction: Legitimate teleportation coordinates immune to eavesdropper tampering.',
    statusBadge: 'LEGITIMATE BITS EXTRACTED',
  },
  {
    step: 4,
    id: 'packet_assembly',
    title: 'Signature Packet Assembled',
    actor: 'Network Gateway',
    iconType: 'packet',
    text: 'The signature payload {hash, outcomes, correction_bits, session_id} is cryptographically assembled and bound to an ephemeral single-use session token.',
    formula: 'Packet = {SHA256(m), outcomes, (c₀, c₁), sid}',
    stageId: 4,
    subsystem: 'Cryptographic Packet Assembly Gate',
    physicalLaw: 'Cryptographic Nonce Binding: Single-use session token prevents stale replay vectors.',
    statusBadge: 'SIGNATURE PACKET BOUND',
  },
  {
    step: 5,
    id: 'identity_verify',
    title: 'Bob Verifies Identity & Session',
    actor: 'Bob Ingestion Port',
    iconType: 'shield',
    text: 'Bob validates SHA-256 payload integrity and confirms the session token matches current epoch, preventing replay before quantum measurement.',
    formula: 'Check: SHA256(m) == H ∧ sid == sid_curr',
    stageId: 5,
    subsystem: 'Classical Authenticity & Session Gate',
    physicalLaw: 'Collision Resistance & Freshness: Cryptographic replay mitigation independent of quantum layer.',
    statusBadge: 'IDENTITY & NONCE VERIFIED',
  },
  {
    step: 6,
    id: 'pauli_correction',
    title: 'Pauli Correction Applied',
    actor: 'Bob Unitary Engine',
    iconType: 'unitary',
    text: "Bob applies deterministic unitary transformation σ_z^(c₀)·σ_x^(c₁) to his EPR qubit, reconstructing the original state |ψ⟩ with unit fidelity.",
    formula: 'U_corr = σ_z^(c₀) · σ_x^(c₁)',
    stageId: 5,
    subsystem: 'Bob Quantum State Recovery Unit',
    physicalLaw: "Unitary State Teleportation: Exact deterministic reconstruction of |ψ⟩ on Bob's subsystem.",
    statusBadge: 'TELEPORTED STATE RECOVERED',
  },
  {
    step: 7,
    id: 'qber_verdict',
    title: 'QBER Computed → Verdict',
    actor: 'Deterministic Detector',
    iconType: 'verdict',
    text: 'Observed QBER remains at 0.00% and Born χ² distribution matches theoretical prediction. Zero wiretap anomaly produces a conclusive ACCEPT verdict.',
    formula: 'QBER = 0.00% < 0.11 · Score = 0.08 < 0.30',
    stageId: 7,
    subsystem: 'Zero-ML Physics Threat Engine',
    physicalLaw: 'BB84 Bound & Pearson χ²: Zero anomalous phase skew yields definitive ACCEPT verdict.',
    statusBadge: 'VERDICT: ACCEPT',
  },
];

// Backward compatibility export alias
export const HONEST_PROTOCOL_BUBBLES = HONEST_PROTOCOL_STAGES;

function StageIcon({ type }) {
  const props = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (type) {
    case 'pulse':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M7 12h10" />
        </svg>
      );
    case 'atom':
      return (
        <svg {...props}>
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );
    case 'bits':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="8" height="14" rx="2" />
          <rect x="13" y="5" width="8" height="14" rx="2" />
          <path d="M7 10v4M17 10v4" />
        </svg>
      );
    case 'packet':
      return (
        <svg {...props}>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'unitary':
      return (
        <svg {...props}>
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
      );
    case 'verdict':
      return (
        <svg {...props}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

const AttackVisualizer = React.memo(function AttackVisualizer({
  attackType = 'intercept_resend',
  mode = 'attack',
  activeStage = 1,
  onStageSelect,
  attackData,
  detectData,
  stepData,
  stages: customStages,
  lastUpdated,
  isUpdating = false,
}) {
  const isHonest = mode === 'honest' || attackType === 'honest';
  const stages = (Array.isArray(customStages) && customStages.length > 0)
    ? customStages
    : (Array.isArray(stepData) && stepData.length > 0)
    ? stepData
    : HONEST_PROTOCOL_STAGES;

  const [selectedStep, setSelectedStep] = useState(1);
  const [hudExpanded, setHudExpanded] = useState(true);

  // Synchronize with external 3D activeStage if provided
  useEffect(() => {
    if (!isHonest || !activeStage) return;
    if (activeStage <= 2) setSelectedStep(1);
    else if (activeStage === 3) setSelectedStep(2);
    else if (activeStage === 4) setSelectedStep(3);
    else if (activeStage === 5) setSelectedStep(5);
    else if (activeStage === 6) setSelectedStep(6);
    else if (activeStage >= 7) setSelectedStep(7);
  }, [activeStage, isHonest]);

  function handleStepClick(step) {
    setSelectedStep(step);
    const targetStage = stages.find((b) => b.step === step);
    if (onStageSelect && targetStage) {
      // Pass both stageId (for 3D teleportation) and step number (for node/link mapping)
      onStageSelect(targetStage.stageId, step);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MODE 1: HONEST PROTOCOL SEQUENCE & ACTOR FLOW
  // ─────────────────────────────────────────────────────────────
  if (isHonest) {
    const activeStageItem = stages.find((b) => b.step === selectedStep) || stages[0];
    const honestQber = typeof detectData?.qber === 'number' ? detectData.qber : 0.00;
    const honestPval = typeof detectData?.chi2_p_value === 'number' ? detectData.chi2_p_value : 0.9800;
    const honestFidelity = typeof detectData?.fidelity === 'number' ? detectData.fidelity : 0.998;

    return (
      <div className="attack-visualizer-container honest-protocol-visualizer">
        {/* Header */}
        <div className="attack-viz-header">
          <div className="hqds-honest-header-row">
            <div className="hqds-honest-header-left">
              <span className="viz-badge hqds-honest-badge">
                VECTOR MECHANISM INSPECTOR
              </span>
              {lastUpdated && (
                <span
                  className={`hqds-honest-live-tag ${isUpdating ? 'is-updating' : ''}`}
                  title="Wired to live simulation recomputation"
                >
                  <span
                    className={`hqds-honest-live-dot ${isUpdating ? 'is-updating' : ''}`}
                    aria-hidden="true"
                  />
                  {isUpdating ? 'Recomputing...' : `Live: ${lastUpdated}`}
                </span>
              )}
            </div>
            <span className="hqds-honest-desc-eyebrow">
              Deterministic Quantum Teleportation Signature Lifecycle
            </span>
          </div>
          <h4 className="hqds-honest-title">
            Alice → Bob Legitimate Quantum Signature Lifecycle
          </h4>
        </div>

        {/* 1. Horizontal 3-box actor flow */}
        <div className="viz-diagram intercept-diagram hqds-honest-actor-flow">
          <div className="node-box alice">
            <span className="node-icon hqds-honest-node-icon is-alice">A</span>
            <strong>Alice</strong>
            <small>Sends |Φ⁺⟩ flying qubit</small>
          </div>

          <div className="channel-flow legitimate-flow">
            <div className="beam beam-quantum">|ψ⟩</div>
            <div className="eve-interceptor hqds-honest-eve-interceptor">
              <span className="eve-icon hqds-honest-eve-icon">
                <StageIcon type="atom" /> Bell-State Measurement
              </span>
              <span className="eve-action hqds-honest-eve-action">
                Genuine BSM on message qubit + EPR half — correction bits (c₀, c₁) extracted honestly
              </span>
            </div>
            {/* 2. State banner beneath actor flow */}
            <div className="beam beam-quantum hqds-honest-state-banner">
              |ψ⟩ Teleported Intact
            </div>
          </div>

          <div className="node-box bob">
            <span className="node-icon hqds-honest-node-icon is-bob">B</span>
            <strong>Bob</strong>
            <small>Applies Pauli correction, measures intact qubit</small>
          </div>
        </div>

        {/* 3. Inline Metrics Row */}
        <div className="viz-footer hqds-honest-metrics-footer">
          <div className="viz-stat">
            <span>Observed QBER:</span>
            <strong className="hqds-honest-metric-val">{(honestQber * 100).toFixed(2)}%</strong>
          </div>
          <div className="viz-stat">
            <span>Born χ² p-value:</span>
            <strong className="hqds-honest-metric-val">{honestPval.toFixed(4)}</strong>
          </div>
          <div className="viz-stat">
            <span>State Fidelity:</span>
            <strong className="hqds-honest-metric-val">{(honestFidelity * 100).toFixed(1)}%</strong>
          </div>
        </div>

        {/* 7-Stage Protocol Sequence Sub-header */}
        <div className="hqds-honest-sub-divider">
          <span className="hqds-honest-sub-label">
            7-STAGE PROTOCOL SEQUENCE
          </span>
          <span className="hqds-honest-sub-hint">
            Select a stage to inspect physical parameters &amp; circuit verification
          </span>
        </div>

        {/* Phase Steps Strip */}
        <div className="phase-steps-strip hqds-honest-phase-strip">
          {stages.map((b) => (
            <span
              key={b.step}
              className={`phase-pill ${selectedStep === b.step ? 'active' : ''}`}
              onClick={() => handleStepClick(b.step)}
              title={`View Stage ${b.step}: ${b.title}`}
            >
              {b.step}. {b.title}
            </span>
          ))}
        </div>

        {/* All 7 Protocol Stages in Strict Sequence Order (Responsive CSS grid) */}
        <div className="viz-diagram honest-diagram hqds-honest-stages-grid">
          {stages.map((b) => {
            const isSelected = selectedStep === b.step;
            return (
              <div
                key={b.step}
                className={`key-state-card hqds-honest-stage-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleStepClick(b.step)}
              >
                <div>
                  <div className="hqds-honest-card-top">
                    <span className="hqds-honest-card-title">
                      Stage {b.step} — {b.title}
                    </span>
                    <span className="hqds-honest-card-icon">
                      <StageIcon type={b.iconType} />
                    </span>
                  </div>
                  <p className="hqds-honest-card-desc">
                    {b.text}
                  </p>
                </div>

                <div>
                  <code className="hqds-honest-card-formula">
                    {b.formula}
                  </code>
                  <div className="outcome-pill success hqds-honest-card-pill">
                    {b.statusBadge}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Stage Detailed Technical Specification */}
        {activeStageItem && (
          <div className="target-hud-box hqds-honest-spec-hud">
            <div className="hud-title-bar" onClick={() => setHudExpanded(!hudExpanded)}>
              <span className="hud-icon"><StageIcon type="shield" /></span>
              <span className="hud-heading">
                Stage {activeStageItem.step} Technical Specification: <strong>{activeStageItem.title}</strong>
              </span>
              <span className="hud-toggle">{hudExpanded ? '▲' : '▼'}</span>
            </div>

            {hudExpanded && (
              <div className="hud-content-grid">
                <div className="hud-field">
                  <span className="hud-label">Subsystem &amp; Channel Node:</span>
                  <span className="hud-val">{activeStageItem.subsystem} ({activeStageItem.actor})</span>
                </div>
                <div className="hud-field">
                  <span className="hud-label">Governing Physical Law:</span>
                  <span className="hud-val code-font">{activeStageItem.physicalLaw}</span>
                </div>
                <div className="hud-field">
                  <span className="hud-label">Deterministic Verification:</span>
                  <span className="hud-val safe-text">[NOMINAL] Physical State Intact · Zero Wiretap Anomaly Detected</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODE 2: AUDIT/STITCH ADVERSARIAL PHYSICAL-LAYER INSTRUMENT
  // ─────────────────────────────────────────────────────────────
  const qber = detectData?.qber ?? (attackType === 'intercept_resend' ? 0.25 : attackType === 'forgery' ? 0.50 : 0.05);
  const pVal = detectData?.chi2_p_value ?? (attackType === 'impersonation' ? 0.00001 : 0.45);
  const fidelity = detectData?.fidelity ?? (attackType === 'depolarizing' ? 0.78 : 0.99);

  return (
    <div className="hqds-viz-instrument-container attack-visualizer-container">
      {/* ── Visualizer Header ── */}
      <div className="hqds-viz-instrument-header">
        <div className="hqds-viz-header-top">
          <span className="hqds-viz-instrument-eyebrow">02.1 · PHYSICAL ATTACK MECHANISM OBSERVATORY</span>
          <span className="hqds-viz-instrument-badge">LIVE INSTRUMENT SURFACE</span>
        </div>
      </div>

      {/* ── Crossfaded Attack Mechanism Visual Scenes (One Scientific Instrument) ── */}
      <TabCrossFade activeKey={attackType} duration={320} className="attack-viz-mechanism-crossfade">
        <div key={attackType} className="hqds-viz-scene-frame">

          {/* ═══════════════════════════════════════════════════════════
              STATE 1: INTERCEPT-RESEND (EPR COLLAPSE & BASIS MISMATCH)
              ═══════════════════════════════════════════════════════════ */}
          {(attackType === 'intercept_resend' || attackType === 'beam_splitter') && (
            <div className="hqds-viz-scene-content">
              <div className="hqds-viz-scene-intro">
                <span className="hqds-viz-scene-eyebrow">VECTOR 01 // INTERCEPT-RESEND EAVESDROPPING</span>
                <h4 className="hqds-viz-scene-title">EPR Entanglement Collapse &amp; Pauli Basis Mismatch</h4>
                <p className="hqds-viz-scene-desc">
                  Eve splices an optical beam splitter into the quantum channel between Alice and Bob, projecting flying entangled qubits onto random conjugate bases {'{X, Z}'}. Projective measurement permanently destroys quantum superposition, inducing an anomalous ~25% QBER.
                </p>
              </div>

              {/* Central Physical Mechanism Scene */}
              <div className="hqds-viz-physical-track">
                {/* Alice Node */}
                <div className="hqds-viz-node is-alice">
                  <div className="hqds-viz-node-badge">
                    <span className="hqds-viz-node-dot is-cyan" aria-hidden="true" />
                    <span>ALICE (QSP)</span>
                  </div>
                  <div className="hqds-viz-node-state">|Φ⁺⟩ = (|00⟩ + |11⟩)/√2</div>
                  <div className="hqds-viz-node-sub">Source Qubit Ingestion</div>
                </div>

                {/* Laser Waveguide Beam: Pure */}
                <div className="hqds-viz-beam-segment is-pure">
                  <div className="hqds-viz-beam-line" />
                  <span className="hqds-viz-beam-pulse is-cyan" aria-hidden="true" />
                  <span className="hqds-viz-beam-label">Flying Qubit |ψ⟩</span>
                </div>

                {/* Eve Optical Wiretap & Collapse */}
                <div className="hqds-viz-interceptor">
                  <div className="hqds-viz-interceptor-badge">
                    <span className="hqds-viz-node-dot is-crimson" aria-hidden="true" />
                    <span>EVE OPTICAL WIRETAP</span>
                  </div>
                  <div className="hqds-viz-interceptor-action">
                    Random Pauli Basis Projector &#123;σ_x, σ_z&#125;
                  </div>
                  <div className="hqds-viz-interceptor-impact">
                    <span className="hqds-viz-impact-title">Entanglement Collapsed</span>
                    <code className="hqds-viz-impact-state">|ψ⟩ → |00⟩ or |11⟩</code>
                  </div>
                </div>

                {/* Perturbed Beam: Collapsed */}
                <div className="hqds-viz-beam-segment is-collapsed">
                  <div className="hqds-viz-beam-line is-broken" />
                  <span className="hqds-viz-beam-pulse is-crimson" aria-hidden="true" />
                  <span className="hqds-viz-beam-label">Perturbed Qubit |ψ&#39;⟩</span>
                </div>

                {/* Bob Node */}
                <div className="hqds-viz-node is-bob">
                  <div className="hqds-viz-node-badge">
                    <span className="hqds-viz-node-dot is-emerald" aria-hidden="true" />
                    <span>BOB (DETECTOR)</span>
                  </div>
                  <div className="hqds-viz-node-state">P(Mismatch) = 25.0%</div>
                  <div className="hqds-viz-node-sub">Firewall Abort Triggered</div>
                </div>
              </div>

              {/* Supporting Telemetry & Result State */}
              <div className="hqds-viz-scene-footer">
                <div className="hqds-viz-scene-telemetry-row">
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">INTERCEPT PROBABILITY</span>
                    <strong className="hqds-viz-mini-val">100.0%</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">EVE PROJECTIVE BASIS</span>
                    <strong className="hqds-viz-mini-val">Random &#123;X, Z&#125;</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">THEORETICAL INDUCED ERROR</span>
                    <strong className="hqds-viz-mini-val is-alert">25.00% QBER</strong>
                  </div>
                </div>
                <div className="hqds-viz-result-banner is-alert">
                  <span className="hqds-viz-banner-dot is-crimson" aria-hidden="true" />
                  <span>CRITICAL ANOMALY: QBER = {(qber * 100).toFixed(2)}% &gt; 11.00% · BB84 Bound Violated · Optical Link Severed</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STATE 2: DEPOLARIZING CHANNEL NOISE (THERMAL DECOHERENCE)
              ═══════════════════════════════════════════════════════════ */}
          {attackType === 'depolarizing' && (
            <div className="hqds-viz-scene-content">
              <div className="hqds-viz-scene-intro">
                <span className="hqds-viz-scene-eyebrow">VECTOR 02 // DEPOLARIZING CHANNEL NOISE</span>
                <h4 className="hqds-viz-scene-title">Environmental Thermal Decoherence &amp; Phase Flips</h4>
                <p className="hqds-viz-scene-desc">
                  Simulates environmental thermal noise and phase-damping in the fiber-optic silica core. The superoperator acts isotropically on the density operator ρ, reducing state purity and fidelity without requiring an active eavesdropper.
                </p>
              </div>

              {/* Central Physical Mechanism Scene */}
              <div className="hqds-viz-depolarizing-track">
                {/* Pure State Input */}
                <div className="hqds-viz-node is-pure-state">
                  <div className="hqds-viz-node-badge">
                    <span className="hqds-viz-node-dot is-cyan" aria-hidden="true" />
                    <span>PURE INPUT STATE</span>
                  </div>
                  <div className="hqds-viz-node-state">ρ_in = |ψ⟩⟨ψ|</div>
                  <div className="hqds-viz-node-sub">Tr(ρ²) = 1.000 · Unit Fidelity</div>
                </div>

                {/* Central Mathematical Superoperator Object */}
                <div className="hqds-viz-superoperator-card">
                  <div className="hqds-viz-superoperator-head">
                    <span className="hqds-viz-superoperator-badge">KRAUS CHANNEL SUPEROPERATOR</span>
                    <span className="hqds-viz-superoperator-noise">Noise Rate: p = {((1 - fidelity) * 1.5).toFixed(2)}</span>
                  </div>
                  <div className="hqds-viz-math-display">
                    <code className="hqds-viz-formula">
                      E(ρ) = (1 − p)ρ + (p/3)(σ_x ρ σ_x + σ_y ρ σ_y + σ_z ρ σ_z)
                    </code>
                  </div>
                  <p className="hqds-viz-superoperator-desc">
                    Isotropic depolarizing map with uniform bit flips (σ_x), phase flips (σ_z), and bit-phase flips (σ_y).
                  </p>
                </div>

                {/* Mixed Degraded State Output */}
                <div className="hqds-viz-node is-mixed-state">
                  <div className="hqds-viz-node-badge">
                    <span className="hqds-viz-node-dot is-amber" aria-hidden="true" />
                    <span>MIXED OUTPUT STATE</span>
                  </div>
                  <div className="hqds-viz-node-state">F = {(fidelity * 100).toFixed(1)}%</div>
                  <div className="hqds-viz-node-sub">Tr(ρ²) &lt; 1.000 · Coherence Decayed</div>
                </div>
              </div>

              {/* Supporting Telemetry & Result State */}
              <div className="hqds-viz-scene-footer">
                <div className="hqds-viz-scene-telemetry-row">
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">NOISE CHANNEL TYPE</span>
                    <strong className="hqds-viz-mini-val">Isotropic Depolarizing</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">KRAUS GENERATORS</span>
                    <strong className="hqds-viz-mini-val">Pauli &#123;I, X, Y, Z&#125;</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">UHLMANN FIDELITY</span>
                    <strong className="hqds-viz-mini-val is-warning">{(fidelity * 100).toFixed(1)}%</strong>
                  </div>
                </div>
                <div className="hqds-viz-result-banner is-warning">
                  <span className="hqds-viz-banner-dot is-amber" aria-hidden="true" />
                  <span>DECOHERENCE ACTIVE: State Fidelity = {(fidelity * 100).toFixed(1)}% · Thermal Fiber Loss Observed Without Wiretap</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STATE 3: SIGNATURE FORGERY (BLIND GUESSING COMPARISON)
              ═══════════════════════════════════════════════════════════ */}
          {attackType === 'forgery' && (
            <div className="hqds-viz-scene-content">
              <div className="hqds-viz-scene-intro">
                <span className="hqds-viz-scene-eyebrow">VECTOR 03 // SIGNATURE FORGERY ATTEMPT</span>
                <h4 className="hqds-viz-scene-title">Private EPR Key Material vs. Blind Statevector Guess</h4>
                <p className="hqds-viz-scene-desc">
                  Eve attempts to generate a verified quantum signature without possessing Alice&#39;s private EPR key store. The probability of forging an L-qubit quantum signature is exponentially bounded by the Holevo information limit P(forgery) ≤ 2⁻ᴸ.
                </p>
              </div>

              {/* Central Physical Mechanism Scene: Side-by-Side Comparison */}
              <div className="hqds-viz-comparison-deck">
                {/* Legitimate Column */}
                <div className="hqds-viz-compare-card is-legitimate">
                  <div className="hqds-viz-compare-head">
                    <span className="hqds-viz-node-dot is-emerald" aria-hidden="true" />
                    <span className="hqds-viz-compare-title">LEGITIMATE SIGNATURE (ALICE)</span>
                  </div>
                  <div className="hqds-viz-compare-body">
                    <code className="hqds-viz-code-block">
                      |K_A⟩ = ⨂ (|00⟩ + |11⟩)/√2
                    </code>
                    <p className="hqds-viz-compare-desc">
                      Pauli-encoded with Alice&#39;s private EPR key store. Perfect correlation on Bob&#39;s Bell-state measurement.
                    </p>
                  </div>
                  <div className="hqds-viz-compare-status is-pass">
                    <span>[PASS] BOB VERIFICATION: ACCEPTED</span>
                    <span className="hqds-viz-status-metric">QBER ≤ 5.0%</span>
                  </div>
                </div>

                {/* Central VS Holevo Bound Barrier */}
                <div className="hqds-viz-vs-barrier">
                  <span className="hqds-viz-vs-badge">VS</span>
                  <div className="hqds-viz-vs-bound">
                    <span className="hqds-viz-vs-bound-lbl">HOLEVO BOUND</span>
                    <code className="hqds-viz-vs-bound-val">P(Forgery) ≤ 2⁻ᴸ</code>
                  </div>
                </div>

                {/* Forged Column */}
                <div className="hqds-viz-compare-card is-forged">
                  <div className="hqds-viz-compare-head">
                    <span className="hqds-viz-node-dot is-crimson" aria-hidden="true" />
                    <span className="hqds-viz-compare-title">FORGED SIGNATURE (EVE)</span>
                  </div>
                  <div className="hqds-viz-compare-body">
                    <code className="hqds-viz-code-block is-forged-code">
                      |K_Eve⟩ = Random Guess ∈ ℋ₂^⊗L
                    </code>
                    <p className="hqds-viz-compare-desc">
                      Zero private key material. Random statevector guesses produce orthogonal projection error on ~50% of qubits.
                    </p>
                  </div>
                  <div className="hqds-viz-compare-status is-fail">
                    <span>[REJECTED] BOB VERIFICATION: REJECTED</span>
                    <span className="hqds-viz-status-metric">QBER = {(qber * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Supporting Telemetry & Result State */}
              <div className="hqds-viz-scene-footer">
                <div className="hqds-viz-scene-telemetry-row">
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">KEY HILBERT SPACE</span>
                    <strong className="hqds-viz-mini-val">2¹⁴ = 16,384</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">MAX SUCCESS PROBABILITY</span>
                    <strong className="hqds-viz-mini-val">P ≤ 6.10 × 10⁻⁵</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">OBSERVED GUESS ERROR</span>
                    <strong className="hqds-viz-mini-val is-alert">{(qber * 100).toFixed(1)}% QBER</strong>
                  </div>
                </div>
                <div className="hqds-viz-result-banner is-alert">
                  <span className="hqds-viz-banner-dot is-crimson" aria-hidden="true" />
                  <span>FORGERY ABORT: QBER = {(qber * 100).toFixed(2)}% &gt;&gt; 11.00% · Orthogonal Statevector Blind Guess Blocked</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STATE 4: ALICE IMPERSONATION (UNENTANGLED SPOOF & BORN SKEW)
              ═══════════════════════════════════════════════════════════ */}
          {attackType === 'impersonation' && (
            <div className="hqds-viz-scene-content">
              <div className="hqds-viz-scene-intro">
                <span className="hqds-viz-scene-eyebrow">VECTOR 04 // ALICE IMPERSONATION ATTEMPT</span>
                <h4 className="hqds-viz-scene-title">Unentangled Product States &amp; Born Distribution Anomaly</h4>
                <p className="hqds-viz-scene-desc">
                  Eve attempts to impersonate Alice by transmitting factorized product states without genuine Bell entanglement. While classical messages appear valid, Bob&#39;s zero-ML physical detector identifies extreme Pearson χ² Born distribution skew.
                </p>
              </div>

              {/* Central Physical Mechanism Scene */}
              <div className="hqds-viz-impersonation-layout">
                {/* Spoofed Source Card */}
                <div className="hqds-viz-spoof-card">
                  <div className="hqds-viz-compare-head">
                    <span className="hqds-viz-node-dot is-crimson" aria-hidden="true" />
                    <span className="hqds-viz-compare-title">EVE SPOOFED QUANTUM TRANSMITTER</span>
                  </div>
                  <div className="hqds-viz-spoof-content">
                    <code className="hqds-viz-code-block is-forged-code">
                      |ψ_spoof⟩ = |q₀⟩ ⊗ |q₁⟩ ⊗ ... ⊗ |q_L⟩
                    </code>
                    <p className="hqds-viz-compare-desc">
                      Transmits separable classical product states to spoof Alice&#39;s identity without quantum entanglement.
                    </p>
                    <div className="hqds-viz-spoof-concurrence">
                      <span className="hqds-viz-mini-lbl">ENTANGLEMENT CONCURRENCE</span>
                      <span className="hqds-viz-concurrence-val is-alert">C = 0.00 (Zero Entanglement)</span>
                    </div>
                  </div>
                </div>

                {/* Flow Indicator to Focal Point */}
                <div className="hqds-viz-flow-indicator">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                  <span>Bob Joint Projection</span>
                </div>

                {/* Born χ² Statistical Focal Point Card */}
                <div className="hqds-viz-chi2-focal-card">
                  <div className="hqds-viz-chi2-head">
                    <span className="hqds-viz-chi2-badge">ZERO-ML STATISTICAL ENGINE</span>
                    <span className="hqds-viz-chi2-title">Pearson χ² Born-Rule Goodness-of-Fit</span>
                  </div>
                  <div className="hqds-viz-chi2-formula-wrap">
                    <code className="hqds-viz-formula">
                      χ² = ∑_i (O_i − E_i)² / E_i
                    </code>
                  </div>
                  <div className="hqds-viz-chi2-stat-row">
                    <div className="hqds-viz-chi2-val-box">
                      <span className="hqds-viz-chi2-lbl">OBSERVED p-VALUE</span>
                      <span className="hqds-viz-chi2-val is-alert">{pVal < 0.0001 ? '< 0.0001' : pVal.toFixed(6)}</span>
                    </div>
                    <div className="hqds-viz-chi2-verdict-box">
                      <span className="hqds-viz-chi2-lbl">BORN DISTRIBUTION SKEW</span>
                      <span className="hqds-viz-chi2-alert-text">EXTREME ANOMALY DETECTED</span>
                    </div>
                  </div>
                  <p className="hqds-viz-chi2-note">
                    Product states fatally skew joint coincidence rates across measurement bases. The Born-rule p-value collapses below 0.0001, triggering deterministic rejection.
                  </p>
                </div>
              </div>

              {/* Supporting Telemetry & Result State */}
              <div className="hqds-viz-scene-footer">
                <div className="hqds-viz-scene-telemetry-row">
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">STATISTICAL TEST</span>
                    <strong className="hqds-viz-mini-val">Pearson χ² Test</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">DEGREES OF FREEDOM</span>
                    <strong className="hqds-viz-mini-val">ν = 3 (Bell Basis)</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">CONFIDENCE INTERVAL</span>
                    <strong className="hqds-viz-mini-val is-alert">&gt; 99.999% Anomaly</strong>
                  </div>
                </div>
                <div className="hqds-viz-result-banner is-alert">
                  <span className="hqds-viz-banner-dot is-crimson" aria-hidden="true" />
                  <span>IMPERSONATION BLOCKED: Born χ² p-Value &lt; 0.0001 · Deterministic Physics Rejection Triggered</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STATE 5: SIGNATURE REPLAY (TEMPORAL SEQUENCE & NONCE MISMATCH)
              ═══════════════════════════════════════════════════════════ */}
          {attackType === 'replay' && (
            <div className="hqds-viz-scene-content">
              <div className="hqds-viz-scene-intro">
                <span className="hqds-viz-scene-eyebrow">VECTOR 05 // SIGNATURE REPLAY ATTACK</span>
                <h4 className="hqds-viz-scene-title">Temporal Epoch Desynchronization &amp; Nonce Invalidation</h4>
                <p className="hqds-viz-scene-desc">
                  Eve eavesdrops and intercepts a valid quantum signature from a past epoch (Session #1) and attempts re-submission in the active epoch (Session #2). The attack is rejected via single-use ephemeral session nonces and the no-cloning theorem.
                </p>
              </div>

              {/* Central Physical Mechanism Scene: Temporal Sequence */}
              <div className="hqds-viz-timeline-deck">
                {/* Session 1 (Past) */}
                <div className="hqds-viz-epoch-card is-past">
                  <div className="hqds-viz-epoch-head">
                    <span className="hqds-viz-epoch-badge">SESSION #1 (EPOCH T₀ · PAST)</span>
                    <span className="hqds-viz-epoch-tag is-closed">COMMITTED</span>
                  </div>
                  <div className="hqds-viz-epoch-body">
                    <div className="hqds-viz-epoch-field">
                      <span className="hqds-viz-epoch-lbl">TRANSACTION DIGEST</span>
                      <code className="hqds-viz-epoch-code">0x9f4a...81b2</code>
                    </div>
                    <div className="hqds-viz-epoch-field">
                      <span className="hqds-viz-epoch-lbl">LEGITIMATE NONCE</span>
                      <code className="hqds-viz-epoch-code is-nonce">0x7b2f489a</code>
                    </div>
                    <p className="hqds-viz-epoch-desc">
                      Valid quantum signature successfully verified and committed to the immutable audit ledger.
                    </p>
                  </div>
                </div>

                {/* Temporal Replay Injection Connector */}
                <div className="hqds-viz-temporal-connector">
                  <div className="hqds-viz-temporal-line" />
                  <div className="hqds-viz-temporal-eve-badge">
                    <span className="hqds-viz-node-dot is-crimson" aria-hidden="true" />
                    <span>EVE REPLAY INJECTION</span>
                  </div>
                  <span className="hqds-viz-temporal-delay">Delay Δt &gt; τ_session · Stale Packet</span>
                </div>

                {/* Session 2 (Active) */}
                <div className="hqds-viz-epoch-card is-active">
                  <div className="hqds-viz-epoch-head">
                    <span className="hqds-viz-epoch-badge is-danger">SESSION #2 (EPOCH T₁ · ACTIVE)</span>
                    <span className="hqds-viz-epoch-tag is-reject">REJECTED</span>
                  </div>
                  <div className="hqds-viz-epoch-body">
                    <div className="hqds-viz-epoch-field">
                      <span className="hqds-viz-epoch-lbl">EXPECTED ACTIVE NONCE</span>
                      <code className="hqds-viz-epoch-code is-active-nonce">0x3c99a14d</code>
                    </div>
                    <div className="hqds-viz-epoch-field">
                      <span className="hqds-viz-epoch-lbl">INJECTED STALE NONCE</span>
                      <code className="hqds-viz-epoch-code is-stale-nonce">0x7b2f489a (COLLISION)</code>
                    </div>
                    <div className="hqds-viz-epoch-alert">
                      [COLLAPSE] RE-MEASUREMENT COLLAPSE: No-cloning theorem prevents state reuse
                    </div>
                  </div>
                </div>
              </div>

              {/* Supporting Telemetry & Result State */}
              <div className="hqds-viz-scene-footer">
                <div className="hqds-viz-scene-telemetry-row">
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">SESSION TOKEN STATUS</span>
                    <strong className="hqds-viz-mini-val is-alert">Expired Epoch</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">NONCE REUSE CHECK</span>
                    <strong className="hqds-viz-mini-val is-alert">Collision Detected</strong>
                  </div>
                  <div className="hqds-viz-metric-mini">
                    <span className="hqds-viz-mini-lbl">NO-CLONING VALIDATION</span>
                    <strong className="hqds-viz-mini-val">Irreversible Collapse</strong>
                  </div>
                </div>
                <div className="hqds-viz-result-banner is-alert">
                  <span className="hqds-viz-banner-dot is-crimson" aria-hidden="true" />
                  <span>REPLAY NEUTRALIZED: Ephemeral Nonce Mismatch · Quantum Non-Reuse Rule Enforced</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </TabCrossFade>

      {/* ── 10. Audit-Style Technical Telemetry Footer (Requirement 10) ── */}
      <div className="hqds-viz-footer-telemetry" aria-label="Physical Threat Detection Telemetry">
        {/* Chip 1: Observed QBER */}
        <div className={`hqds-viz-telemetry-chip ${qber > 0.11 ? 'is-anomaly' : 'is-nominal'}`}>
          <div className="hqds-viz-chip-top">
            <span className="hqds-viz-chip-label">OBSERVED QBER</span>
            <span className="hqds-viz-chip-limit">BB84 BOUND: 11.0%</span>
          </div>
          <div className="hqds-viz-chip-val">{(qber * 100).toFixed(2)}%</div>
          <div className="hqds-viz-chip-sub">
            {qber > 0.11 ? '[ANOMALY] Eavesdropping Threshold Exceeded' : '[NOMINAL] Physical Channel Secure'}
          </div>
        </div>

        {/* Chip 2: Born χ² p-value */}
        <div className={`hqds-viz-telemetry-chip ${pVal < 0.01 ? 'is-anomaly' : 'is-nominal'}`}>
          <div className="hqds-viz-chip-top">
            <span className="hqds-viz-chip-label">BORN χ² p-VALUE</span>
            <span className="hqds-viz-chip-limit">CRITICAL α: 0.01</span>
          </div>
          <div className="hqds-viz-chip-val">{pVal < 0.0001 ? '< 0.0001' : pVal.toFixed(4)}</div>
          <div className="hqds-viz-chip-sub">
            {pVal < 0.01 ? '[ANOMALY] Significant State Distribution Skew' : '[NOMINAL] Conforms to Bell State Statistics'}
          </div>
        </div>

        {/* Chip 3: State Fidelity */}
        <div className={`hqds-viz-telemetry-chip ${fidelity < 0.85 ? 'is-anomaly' : 'is-nominal'}`}>
          <div className="hqds-viz-chip-top">
            <span className="hqds-viz-chip-label">STATE FIDELITY</span>
            <span className="hqds-viz-chip-limit">UHLMANN F(ρ, σ)</span>
          </div>
          <div className="hqds-viz-chip-val">{(fidelity * 100).toFixed(1)}%</div>
          <div className="hqds-viz-chip-sub">
            {fidelity < 0.85 ? '[ANOMALY] Substantial Mixed State Decoherence' : '[NOMINAL] Unitary Pure State Overlap'}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AttackVisualizer;

