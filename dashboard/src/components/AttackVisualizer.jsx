/**
 * AttackVisualizer.jsx
 * =====================
 * Custom, mathematically faithful visualizer tailored for each quantum attack vector:
 *  - Intercept-Resend (EPR Bell-State Measurement & Collapse)
 *  - Depolarizing Noise (Environmental Fiber Decoherence)
 *  - Signature Forgery (Blind Statevector Guessing, P_success = 2^-L)
 *  - Alice Impersonation (Spoofed Unentangled States -> severe χ² skew)
 *  - Signature Replay (Session Timestamp / Nonce Mismatch)
 */

import React from 'react';

export default function AttackVisualizer({ attackType = 'intercept_resend', attackData, detectData }) {
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
              <span className="eve-effect">Collapses Bell entanglement $\rightarrow$ Induces ~25% QBER</span>
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
              <span className="superoperator-title">Channel Superoperator $\mathcal{E}(\rho)$</span>
              <code>(1 - p)ρ + (p/3)(XρX + YρY + ZρZ)</code>
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
              <code>|K_A⟩ = ⊗_{"{i=1}"}^L (|00⟩ + |11⟩)/√2</code>
              <span>Pauli Encoded with Private EPR Keys</span>
            </div>
            <div className="outcome-pill success">Bob Verification: ACCEPTED</div>
          </div>

          <div className="vs-divider">VS</div>

          <div className="comparison-col forged">
            <h5>❌ Forged Signature (Eve)</h5>
            <div className="key-state-card forged-card">
              <code>|K_Eve⟩ = Random Blind Guess</code>
              <span>Success Probability: P = 2^{"{-L}"}</span>
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
              <strong>Pearson's $\chi^2$ Born Test Outcome:</strong>
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
          <span>Born $\chi^2$ p-val:</span>
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
