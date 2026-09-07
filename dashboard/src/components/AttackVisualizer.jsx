/**
 * AttackVisualizer.jsx
 * =====================
 * Custom, mathematically faithful visualizer tailored for quantum protocols & attack vectors:
 *  - Mode 'honest': Explanatory bubbles (7-Stage Legitimate Teleportation Lifecycle)
 *  - Mode 'attack' / Vector Mechanisms:
 *      * Intercept-Resend (EPR Bell-State Measurement & Collapse)
 *      * Depolarizing Noise (Environmental Fiber Decoherence)
 *      * Signature Forgery (Blind Statevector Guessing, P_success = 2^-L)
 *      * Alice Impersonation (Spoofed Unentangled States -> severe χ² skew)
 *      * Signature Replay (Session Timestamp / Nonce Mismatch)
 */

import React, { useState, useEffect } from 'react';

export const HONEST_PROTOCOL_BUBBLES = [
  {
    step: 1,
    id: 'encoding',
    title: 'Message Encoding',
    actor: 'Alice (Signer)',
    icon: '🅰️',
    text: 'Alice encodes each message bit into a Pauli eigenstate in the Z-basis — no secret key guessing involved, the state is prepared honestly from the real message.',
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
    icon: '⚛️',
    text: "A genuine Bell-State Measurement (BSM) is performed between the message qubit and Alice's half of the entangled EPR pair, using real Qiskit Aer simulation — not a spoofed or precomputed outcome.",
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
    icon: '🔢',
    text: 'The BSM outcome yields two classical correction bits (c₀, c₁). These are the legitimate teleportation correction bits — Eve never sees or influences them.',
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
    icon: '📦',
    text: 'The signature packet {hash, outcomes, correction_bits, session_id} is built and sent over an authenticated channel. The session_id is cryptographically bound to this exact transaction.',
    formula: 'Packet = {SHA256(m), outcomes, (c₀,c₁), sid}',
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
    icon: '🛡️',
    text: 'Bob checks the SHA-256 hash and confirms the session_id matches — this is the cryptographic layer that blocks replay, independent of the physics below.',
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
    icon: '🅱️',
    text: 'Bob applies σz^(c₀)·σx^(c₁) to his half of the entangled pair, exactly as the protocol specifies — recovering the teleported state with no eavesdropper interference.',
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
    icon: '✅',
    text: "With no attacker present, QBER comes out at ~0.0000 and confidence score ~0.13 — well under the 0.30 'safe' ceiling. Verdict: ACCEPT.",
    formula: 'QBER ~ 0.0000 < 0.11 · Score ~ 0.13 < 0.30',
    stageId: 7,
    subsystem: 'Zero-ML Physics Threat Engine',
    physicalLaw: 'BB84 Bound & Pearson χ²: Zero anomalous phase skew yields definitive ACCEPT verdict.',
    statusBadge: 'VERDICT: ACCEPT',
  },
];

export default function AttackVisualizer({
  attackType = 'intercept_resend',
  mode = 'attack',
  activeStage = 1,
  onStageSelect,
  attackData,
  detectData,
  stepData,
}) {
  const isHonest = mode === 'honest' || attackType === 'honest';
  const bubbles = stepData || HONEST_PROTOCOL_BUBBLES;

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
    const targetBubble = bubbles.find((b) => b.step === step);
    if (onStageSelect && targetBubble) {
      onStageSelect(targetBubble.stageId);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MODE 1: HONEST PROTOCOL EXPLANATORY BUBBLES & ACTOR FLOW
  // ─────────────────────────────────────────────────────────────
  if (isHonest) {
    const activeBubble = bubbles.find((b) => b.step === selectedStep) || bubbles[0];
    const honestQber = typeof detectData?.qber === 'number' ? detectData.qber : 0.00;
    const honestPval = typeof detectData?.chi2_p_value === 'number' ? detectData.chi2_p_value : 0.9800;
    const honestFidelity = typeof detectData?.fidelity === 'number' ? detectData.fidelity : 0.998;

    return (
      <div className="attack-visualizer-container honest-protocol-visualizer" style={{ marginTop: '1.4rem' }}>
        {/* Header */}
        <div className="attack-viz-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span className="viz-badge" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
              VECTOR MECHANISM INSPECTOR
            </span>
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
            <span className="node-icon">🅰️</span>
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
              <span className="eve-icon" style={{ color: 'var(--accent-cyan)' }}>⚛️ Bell-State Measurement</span>
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
            <span className="node-icon">🅱️</span>
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

        {/* 7 Explanatory Bubbles Sub-header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.06em' }}>
            7-STAGE SEQUENTIAL FLOW BUBBLES
          </span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            Click any bubble to inspect circuit specification
          </span>
        </div>

        {/* Phase Steps Strip (Reusing Attack Lab .phase-steps-strip & .phase-pill) */}
        <div className="phase-steps-strip" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '6px' }}>
          {bubbles.map((b) => (
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
              title={`Inspect Bubble ${b.step}: ${b.title}`}
            >
              {b.step}. {b.title}
            </span>
          ))}
        </div>

        {/* All 7 Explanatory Bubbles in Strict Sequence Order */}
        <div
          className="viz-diagram honest-diagram"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '12px',
            alignItems: 'stretch',
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.65)',
          }}
        >
          {bubbles.map((b) => {
            const isSelected = selectedStep === b.step;
            return (
              <div
                key={b.step}
                className="key-state-card"
                onClick={() => handleStepClick(b.step)}
                style={{
                  cursor: 'pointer',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(192, 132, 252, 0.14)' : 'rgba(15, 23, 42, 0.85)',
                  border: `1px solid ${isSelected ? '#c084fc' : 'rgba(255, 255, 255, 0.08)'}`,
                  boxShadow: isSelected ? '0 0 16px rgba(192, 132, 252, 0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#c084fc' }}>
                      Bubble {b.step} — "{b.title}"
                    </span>
                    <span className="node-icon" style={{ fontSize: '0.95rem' }}>{b.icon}</span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: '#e2e8f0', lineHeight: '1.5', margin: '4px 0 10px 0' }}>
                    "{b.text}"
                  </p>
                </div>

                <div>
                  <code style={{ display: 'block', fontSize: '0.68rem', color: '#38bdf8', marginBottom: '6px' }}>
                    {b.formula}
                  </code>
                  <div className="outcome-pill success" style={{ margin: 0, fontSize: '0.66rem', padding: '0.22rem 0.45rem' }}>
                    {b.statusBadge}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Step Detailed HUD (Reusing Attack Lab .target-hud-box) */}
        {activeBubble && (
          <div className="target-hud-box" style={{ marginTop: '1rem' }}>
            <div className="hud-title-bar" onClick={() => setHudExpanded(!hudExpanded)}>
              <span className="hud-icon">🛡️</span>
              <span className="hud-heading">
                Step {activeBubble.step} Specification: <strong>{activeBubble.title}</strong>
              </span>
              <span className="hud-toggle">{hudExpanded ? '▲' : '▼'}</span>
            </div>

            {hudExpanded && (
              <div className="hud-content-grid">
                <div className="hud-field">
                  <span className="hud-label">Subsystem &amp; Channel Node:</span>
                  <span className="hud-val">{activeBubble.subsystem} ({activeBubble.actor})</span>
                </div>
                <div className="hud-field">
                  <span className="hud-label">Honest Protocol Operation:</span>
                  <span className="hud-val safe-text">{activeBubble.text}</span>
                </div>
                <div className="hud-field">
                  <span className="hud-label">Governing Physical Law:</span>
                  <span className="hud-val code-font">{activeBubble.physicalLaw}</span>
                </div>
                <div className="hud-field">
                  <span className="hud-label">Deterministic Verification:</span>
                  <span className="hud-val safe-text">✓ Physical State Intact · Zero Wiretap Anomaly Detected</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Telemetry Footer (Reusing Attack Lab .viz-footer & .viz-stat) */}
        <div className="viz-footer" style={{ marginTop: '1rem' }}>
          <div className="viz-stat">
            <span>Expected QBER:</span>
            <strong style={{ color: '#00e676' }}>~0.0000</strong>
          </div>
          <div className="viz-stat">
            <span>Born χ² p-value:</span>
            <strong style={{ color: '#00e676' }}>1.0000</strong>
          </div>
          <div className="viz-stat">
            <span>State Fidelity:</span>
            <strong style={{ color: '#00e676' }}>~99.8%</strong>
          </div>
          <div className="viz-stat">
            <span>Threat Confidence:</span>
            <strong style={{ color: '#00e676' }}>~0.13 (&lt; 0.30 Safe)</strong>
          </div>
          <div className="viz-stat">
            <span>Verdict:</span>
            <strong style={{ color: '#00e676' }}>ACCEPT</strong>
          </div>
        </div>
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
}
