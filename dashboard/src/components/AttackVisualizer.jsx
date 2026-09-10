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
      <div className="attack-visualizer-container honest-protocol-visualizer" style={{ marginTop: '1.4rem' }}>
        {/* Header */}
        <div className="attack-viz-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="viz-badge" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                VECTOR MECHANISM INSPECTOR
              </span>
              {lastUpdated && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.68rem',
                    color: isUpdating ? 'var(--accent-cyan)' : '#00e676',
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                  title="Wired to live simulation recomputation"
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isUpdating ? 'var(--accent-cyan)' : '#00e676',
                      boxShadow: isUpdating ? '0 0 6px #00f2fe' : '0 0 6px #00e676',
                      animation: isUpdating ? 'pulse 0.8s infinite alternate' : 'none',
                    }}
                  />
                  {isUpdating ? 'Recomputing...' : `Live: ${lastUpdated}`}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Deterministic Quantum Teleportation Signature Lifecycle
            </span>
          </div>
          <h4 style={{ color: '#ffffff', marginTop: '0.35rem' }}>
            ✨ Alice → Bob Legitimate Quantum Signature Lifecycle
          </h4>
        </div>

        {/* 1. Horizontal 3-box actor flow */}
        <div className="viz-diagram intercept-diagram" style={{ marginBottom: '0.8rem' }}>
          <div className="node-box alice">
            <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', fontWeight: 800, fontSize: '0.75rem' }}>A</span>
            <strong>Alice</strong>
            <small>Sends |Φ⁺⟩ flying qubit</small>
          </div>

          <div className="channel-flow legitimate-flow">
            <div className="beam beam-quantum">|ψ⟩</div>
            <div 
              className="eve-interceptor" 
              style={{ 
                background: 'rgba(0, 242, 254, 0.12)', 
                border: '1px solid rgba(0, 242, 254, 0.4)',
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
                margin: '0.3rem 0',
                textAlign: 'center'
              }}
            >
              <span className="eve-icon" style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <StageIcon type="atom" /> Bell-State Measurement
              </span>
              <span className="eve-action" style={{ color: '#cbd5e1' }}>
                Genuine BSM on message qubit + EPR half — correction bits (c₀, c₁) extracted honestly
              </span>
            </div>
            {/* 2. State banner beneath actor flow */}
            <div className="beam beam-quantum" style={{ color: '#00e676', fontWeight: 700 }}>
              |ψ⟩ Teleported Intact
            </div>
          </div>

          <div className="node-box bob">
            <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(0, 230, 118, 0.15)', color: '#00e676', fontWeight: 800, fontSize: '0.75rem' }}>B</span>
            <strong>Bob</strong>
            <small>Applies Pauli correction, measures intact qubit</small>
          </div>
        </div>

        {/* 3. Inline Metrics Row */}
        <div className="viz-footer" style={{ marginBottom: '1.2rem' }}>
          <div className="viz-stat">
            <span>Observed QBER:</span>
            <strong style={{ color: '#00e676' }}>{(honestQber * 100).toFixed(2)}%</strong>
          </div>
          <div className="viz-stat">
            <span>Born χ² p-value:</span>
            <strong style={{ color: '#00e676' }}>{honestPval.toFixed(4)}</strong>
          </div>
          <div className="viz-stat">
            <span>State Fidelity:</span>
            <strong style={{ color: '#00e676' }}>{(honestFidelity * 100).toFixed(1)}%</strong>
          </div>
        </div>

        {/* 7-Stage Protocol Sequence Sub-header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.06em' }}>
            7-STAGE PROTOCOL SEQUENCE
          </span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            Select a stage to inspect physical parameters &amp; circuit verification
          </span>
        </div>

        {/* Phase Steps Strip */}
        <div className="phase-steps-strip" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '6px' }}>
          {stages.map((b) => (
            <span
              key={b.step}
              className={`phase-pill ${selectedStep === b.step ? 'active' : ''}`}
              onClick={() => handleStepClick(b.step)}
              style={{
                cursor: 'pointer',
                background: selectedStep === b.step ? '#9333ea' : undefined,
                boxShadow: selectedStep === b.step ? '0 0 12px rgba(192, 132, 252, 0.6)' : undefined,
                color: selectedStep === b.step ? '#ffffff' : undefined,
              }}
              title={`View Stage ${b.step}: ${b.title}`}
            >
              {b.step}. {b.title}
            </span>
          ))}
        </div>

        {/* All 7 Protocol Stages in Strict Sequence Order */}
        <div
          className="viz-diagram honest-diagram"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '12px',
            alignItems: 'stretch',
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.65)',
            borderRadius: '8px',
          }}
        >
          {stages.map((b) => {
            const isSelected = selectedStep === b.step;
            return (
              <div
                key={b.step}
                className="key-state-card"
                onClick={() => handleStepClick(b.step)}
                style={{
                  cursor: 'pointer',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(192, 132, 252, 0.12)' : 'rgba(15, 23, 42, 0.85)',
                  border: `1px solid ${isSelected ? '#c084fc' : 'rgba(255, 255, 255, 0.08)'}`,
                  boxShadow: isSelected ? '0 0 16px rgba(192, 132, 252, 0.25)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#c084fc', letterSpacing: '-0.01em' }}>
                      Stage {b.step} — {b.title}
                    </span>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        minWidth: '24px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${isSelected ? 'rgba(192, 132, 252, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: isSelected ? '#e9d5ff' : '#94a3b8',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <StageIcon type={b.iconType} />
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.5', margin: '4px 0 10px 0' }}>
                    {b.text}
                  </p>
                </div>

                <div>
                  <code style={{ display: 'block', fontSize: '0.68rem', color: '#38bdf8', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                    {b.formula}
                  </code>
                  <div className="outcome-pill success" style={{ margin: 0, fontSize: '0.66rem', padding: '0.22rem 0.45rem', letterSpacing: '0.04em' }}>
                    {b.statusBadge}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Stage Detailed Technical Specification */}
        {activeStageItem && (
          <div className="target-hud-box" style={{ marginTop: '1rem' }}>
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
                  <span className="hud-val safe-text">✓ Physical State Intact · Zero Wiretap Anomaly Detected</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODE 2: ATTACK LAB VECTOR MECHANISM INSPECTOR (UNMODIFIED)
  // ─────────────────────────────────────────────────────────────
  const qber = detectData?.qber ?? (attackType === 'intercept_resend' ? 0.25 : attackType === 'forgery' ? 0.50 : 0.05);
  const pVal = detectData?.chi2_p_value ?? (attackType === 'impersonation' ? 0.00001 : 0.45);
  const fidelity = detectData?.fidelity ?? (attackType === 'depolarizing' ? 0.78 : 0.99);

  return (
    <div className="attack-visualizer-container">
      <div className="attack-viz-header">
        <span className="viz-badge">VECTOR MECHANISM INSPECTOR</span>
        <h4>
          {attackType === 'intercept_resend' && '⚡ Intercept-Resend (EPR Collapse)'}
          {attackType === 'depolarizing' && '🌊 Depolarizing Noise Decoherence'}
          {attackType === 'forgery' && '🎭 Signature Forgery (Blind Guessing)'}
          {attackType === 'impersonation' && '👤 Alice Impersonation (Spoofed States)'}
          {attackType === 'replay' && '🔁 Signature Replay Attack'}
        </h4>
      </div>

      {/* Vector 1: Intercept-Resend */}
      {attackType === 'intercept_resend' && (
        <div className="viz-diagram intercept-diagram">
          <div className="node-box alice">
            <span className="node-icon">🅰️</span>
            <strong>Alice</strong>
            <small>Sends |Φ⁺⟩ flying qubit</small>
          </div>

          <div className="channel-flow intercepted">
            <div className="beam beam-quantum">|ψ⟩</div>
            <div className="eve-interceptor">
              <span className="eve-icon">🕵️‍♀️ Eve</span>
              <span className="eve-action">Measures in random Pauli basis (X or Z)</span>
              <span className="eve-effect">Collapses Bell entanglement → Induces ~25% QBER</span>
            </div>
            <div className="beam beam-collapsed">|ψ'⟩ Collapsed</div>
          </div>

          <div className="node-box bob">
            <span className="node-icon">🅱️</span>
            <strong>Bob</strong>
            <small>Measures disturbed qubit</small>
          </div>
        </div>
      )}

      {/* Vector 2: Depolarizing Noise */}
      {attackType === 'depolarizing' && (
        <div className="viz-diagram depolarizing-diagram">
          <div className="node-box source">
            <span className="node-icon">⚛️</span>
            <strong>Pure State</strong>
            <small>ρ = |ψ⟩⟨ψ|</small>
          </div>

          <div className="channel-flow noisy-channel">
            <div className="superoperator-box">
              <span className="superoperator-title">Channel Superoperator E(ρ)</span>
              <code>(1 − p)ρ + (p/3)(XρX + YρY + ZρZ)</code>
              <small>Uniform thermal phase &amp; bit flips over optical fiber</small>
            </div>
          </div>

          <div className="node-box degraded">
            <span className="node-icon">📉</span>
            <strong>Mixed State</strong>
            <small>Fidelity = {(fidelity * 100).toFixed(1)}%</small>
          </div>
        </div>
      )}

      {/* Vector 3: Signature Forgery */}
      {attackType === 'forgery' && (
        <div className="viz-diagram forgery-diagram">
          <div className="comparison-col legitimate">
            <h5>✅ Legitimate Signature (Alice)</h5>
            <div className="key-state-card">
              <code>|K_A⟩ = EPR Bell Pairs (|00⟩ + |11⟩)/√2</code>
              <span>Pauli Encoded with Private EPR Keys</span>
            </div>
            <div className="outcome-pill success">Bob Verification: ACCEPTED</div>
          </div>

          <div className="vs-divider">VS</div>

          <div className="comparison-col forged">
            <h5>❌ Forged Signature (Eve)</h5>
            <div className="key-state-card forged-card">
              <code>|K_Eve⟩ = Random Blind Guess</code>
              <span>Success Probability: P(forgery) ≤ 2⁻ᴸ</span>
            </div>
            <div className="outcome-pill failure">Bob Verification: REJECTED (QBER = {(qber * 100).toFixed(1)}%)</div>
          </div>
        </div>
      )}

      {/* Vector 4: Alice Impersonation */}
      {attackType === 'impersonation' && (
        <div className="viz-diagram impersonation-diagram">
          <div className="spoof-flow">
            <div className="spoof-attacker">
              <span className="eve-icon">🚨 Eve</span>
              <strong>Transmits Unentangled Product States</strong>
              <small>Attempts to bypass Alice's EPR distribution entirely</small>
            </div>
            <div className="arrow-down">⬇️</div>
            <div className="born-rule-check">
              <strong>Pearson χ² Born Rule Test Outcome:</strong>
              <div className="chi2-alert-box">
                <span>Observed p-value: <strong>{pVal < 0.0001 ? '< 0.0001' : pVal.toFixed(6)}</strong></span>
                <p>Severe distribution skew: Product states violate the quantum Born distribution for Bell pairs!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vector 5: Replay */}
      {attackType === 'replay' && (
        <div className="viz-diagram replay-diagram">
          <div className="replay-flow">
            <div className="session-box old-session">
              <span className="sess-badge">SESSION #1 (Past)</span>
              <code>Hash: 0xa4f9...81c</code>
              <small>Legitimate signature captured by Eve</small>
            </div>

            <div className="replay-arrow">➡️ Replay Injection ➡️</div>

            <div className="session-box new-session">
              <span className="sess-badge danger">SESSION #2 (Current)</span>
              <code>Expected Nonce: 0x7b2e...</code>
              <div className="replay-rejection">
                ❌ REJECTED: Session Nonce Mismatch &amp; Stale State Re-measurement
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="viz-footer">
        <div className="viz-stat">
          <span>Observed QBER:</span>
          <strong style={{ color: qber > 0.11 ? '#ff1744' : '#00e676' }}>{(qber * 100).toFixed(2)}%</strong>
        </div>
        <div className="viz-stat">
          <span>Born χ² p-value:</span>
          <strong style={{ color: pVal < 0.01 ? '#ff1744' : '#00e676' }}>{pVal < 0.0001 ? '< 0.0001' : pVal.toFixed(4)}</strong>
        </div>
        <div className="viz-stat">
          <span>State Fidelity:</span>
          <strong style={{ color: fidelity < 0.85 ? '#ff1744' : '#00e676' }}>{(fidelity * 100).toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
});

export default AttackVisualizer;

