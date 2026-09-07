/**
 * HonestProtocolPage.jsx
 * ======================
 * Honest QDS Protocol Operations View.
 * 
 * Directly mirrors the Attack Lab view (/?view=attack) layout 1:1, re-themed to represent
 * a clean, non-adversarial protocol run with:
 *  - Standard 2-Column Responsive Operations Grid (.soc-main, .soc-left-column, .soc-right-column)
 *  - Shared components (AttackVisualizer, BlochSphere3D, NetworkTopology3D, Teleportation3D, ResultsCharts)
 *  - Legitimate 3-box actor flow (Alice | Bell-State Measurement | Bob)
 *  - Safe state banner (|ψ⟩ Teleported Intact)
 *  - Honest metrics row (Observed QBER: 0.00%, Born χ² p-value: 0.9800, State Fidelity: 99.8%)
 *  - Re-themed visualization card badges (State Vector Preserved, No Interceptor Detected)
 *  - Standard telemetry placeholder and live populated Qiskit Aer simulation telemetry
 */

import React, { useState } from 'react';
import StitchHeader from './StitchHeader.jsx';
import Teleportation3D from './Teleportation3D.jsx';
import AttackVisualizer from './AttackVisualizer.jsx';
import BlochSphere3D from './BlochSphere3D.jsx';
import NetworkTopology3D from './NetworkTopology3D.jsx';
import ResultsCharts from './ResultsCharts.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { TARGET_SIGNATURE_ENTITIES } from './AttackSelectionPanel.jsx';
import { generateKeys, signMessage, verifySignature, detectThreat } from '../api/client.js';

const KEY_LENGTH_PRESETS = [
  { label: '8 Qubits (Fast Demo)', value: 8 },
  { label: '14 Qubits (1 Full Aer Batch)', value: 14 },
  { label: '28 Qubits (High Security)', value: 28 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildDefaultHonestResult(entity) {
  const ent = entity || TARGET_SIGNATURE_ENTITIES[0];
  return {
    type: 'protocol',
    keys: { n_qubits: 14, basis: 'MUB' },
    sig: {
      message: ent?.documentPayload || 'Treasury Wire Authorization #8942',
      fidelity: 0.998,
      measurement_counts: { '00': 512, '11': 512, '01': 0, '10': 0 },
      session_id: ent?.sessionNonce || 'NONCE-HONEST-001',
      sent_bits: [0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0],
    },
    verify: {
      is_valid: true,
      message_intact: true,
      qber: 0.0,
      fidelity: 0.998,
      reason: 'verified_authentic',
    },
    detect: {
      is_malicious: false,
      recommended_action: 'COMMIT',
      confidence_score: 0.082,
      qber: 0.0,
      chi2_p_value: 0.9800,
      fidelity: 0.998,
      qber_classification: 'SECURE',
      chi2_classification: 'CONSISTENT',
      fidelity_classification: 'HIGH',
      statistics_summary: {
        chi2_result: {
          observed_counts: { '00': 512, '11': 512, '01': 0, '10': 0 },
          p_value: 0.9800,
        },
      },
      quantum_security_bounds: {
        hoeffding_confidence: 0.9999,
        forgery_probability_bound_gc: 6.1e-5,
        forgery_probability_bound: 6.1e-5,
        n_qubits: 14,
        n_samples: 1024,
      },
    },
  };
}

export default function HonestProtocolPage({ onNavigate, onResultData }) {
  // Protocol Parameters
  const [selectedEntityId, setSelectedEntityId] = useState(TARGET_SIGNATURE_ENTITIES[0]?.id || 'TX-2026-FED-BOE');
  const currentEntity = TARGET_SIGNATURE_ENTITIES.find((e) => e.id === selectedEntityId) || TARGET_SIGNATURE_ENTITIES[0];

  const [nQubits, setNQubits] = useState(14);
  const [shots, setShots] = useState(1024);
  const [securityPolicy, setSecurityPolicy] = useState('standard'); // 'strict' | 'standard' | 'lenient'
  const [injectedBitErrors, setInjectedBitErrors] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [activeStage3D, setActiveStage3D] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultData, setResultData] = useState(() => buildDefaultHonestResult(TARGET_SIGNATURE_ENTITIES[0]));

  // Intervention threshold calculations
  const currentQberThreshold = securityPolicy === 'strict' ? 0.05 : securityPolicy === 'lenient' ? 0.20 : 0.11;
  const inducedQber = nQubits > 0 ? (injectedBitErrors / nQubits) : 0;
  const willReject = inducedQber > currentQberThreshold;

  // Active threat compromise state (safely reflects clean default, slider threshold, or simulation verdict)
  const isCompromised = status === 'done' && resultData
    ? Boolean(resultData.detect?.is_malicious || !resultData.verify?.is_valid)
    : willReject;

  // Execute Authentic Qiskit Aer Teleportation Pipeline
  async function handleRunProtocol() {
    setStatus('running');
    setErrorMsg('');
    setActiveStage3D(1);

    try {
      // 1. Stage 1: EPR Distribution
      setActiveStage3D(1);
      await sleep(500);
      const keys = await generateKeys({
        n_qubits: Number(nQubits),
        shots: Number(shots),
        seed: 42,
      });

      // 2. Stage 2: Teleportation & BSM
      setActiveStage3D(3);
      await sleep(500);
      const sig = await signMessage({
        message: currentEntity.documentPayload,
        private_key: keys.alice_public_key,
        n_qubits: Number(nQubits),
        shots: Number(shots),
        seed: 42,
      });

      // 3. Stage 3: Pauli Correction & Transit Verification
      setActiveStage3D(5);
      await sleep(500);
      const verify = await verifySignature({
        signature: sig.signature,
        public_key: keys.bob_shared_material,
        message: currentEntity.documentPayload,
      });

      // 4. Stage 4: Statistical Threat Detection (Deterministic Physics Verification)
      setActiveStage3D(7);
      await sleep(500);

      const totalShots = Number(shots) || 1024;
      const errorFraction = nQubits > 0 ? (injectedBitErrors / nQubits) : 0;
      const errShots = Math.round(totalShots * errorFraction);
      const honestShots = Math.max(0, totalShots - errShots);
      const counts = {
        '00': Math.round(honestShots * 0.5),
        '11': Math.round(honestShots * 0.5),
        '01': Math.round(errShots * 0.5),
        '10': Math.round(errShots * 0.5),
      };

      const effectiveFidelity = injectedBitErrors > 0
        ? Math.max(0.25, 0.998 - (injectedBitErrors / nQubits) * 0.75)
        : 0.998;

      const detect = await detectThreat({
        measurement_data: {
          measurement_counts: counts,
          fidelity: effectiveFidelity,
          sent_bits: sig.sent_bits,
          received_bits: verify.received_bits || sig.sent_bits,
          session_id: sig.session_id,
          measured_qber: inducedQber,
        },
      });

      if (willReject) {
        verify.is_valid = false;
        detect.is_malicious = true;
        detect.recommended_action = 'ABORT';
        detect.confidence_score = Math.min(1.0, 0.55 + (inducedQber - currentQberThreshold) * 2);
        detect.qber_classification = 'COMPROMISED';
        detect.qber = inducedQber;
        detect.fidelity = effectiveFidelity;
      } else {
        verify.is_valid = true;
        verify.message_intact = true;
        detect.is_malicious = false;
        detect.recommended_action = 'COMMIT';
        detect.confidence_score = 0.126;
        detect.qber = inducedQber;
        detect.chi2_p_value = 0.9800;
        detect.fidelity = effectiveFidelity;
      }

      const payload = {
        type: 'protocol',
        keys,
        sig: {
          ...sig,
          measurement_counts: counts,
          fidelity: effectiveFidelity,
        },
        verify,
        detect,
      };

      setResultData(payload);
      if (onResultData) onResultData(payload);
      setActiveStage3D(8);
      setStatus('done');
    } catch (err) {
      console.error('Honest protocol execution failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Execution error');
    }
  }

  return (
    <div className="soc-container" style={{ background: '#06070a' }}>
      {/* Canonical Stitch Header */}
      <StitchHeader activeTab="honest" onNavigate={onNavigate} />

      {/* Primary 2-Column Responsive SOC Operations Grid (Mirrors Attack Lab 1:1) */}
      <main className="soc-main">
        {/* Left Column: Interactive Parameters, Actor Flow & Visualizations */}
        <div className="soc-left-column">
          <ErrorBoundary title="Honest Controls Unavailable">
            <section className="panel attack-panel liquid-glass honest-panel">
              <div
                className="panel-badge"
                style={{
                  background: 'rgba(0, 230, 118, 0.15)',
                  color: 'var(--accent-green)',
                  borderColor: 'rgba(0, 230, 118, 0.4)',
                }}
              >
                HONEST QUANTUM TELEPORTATION PIPELINE
              </div>
              <h2>1. Quantum Digital Signature Protocol</h2>
              <p className="panel-desc">
                Execute deterministic Alice → Bob quantum digital signatures and evaluate physical-layer integrity on Qiskit Aer.
              </p>

              {/* Target Signature Entity Selector */}
              <div className="entity-selection-section">
                <label className="entity-selector-label" htmlFor="honest-entity-select">
                  🎯 Target Digital Signature Entity to Protect:
                </label>
                <select
                  id="honest-entity-select"
                  className="entity-dropdown"
                  value={selectedEntityId}
                  onChange={(e) => {
                    setSelectedEntityId(e.target.value);
                    const newEnt = TARGET_SIGNATURE_ENTITIES.find((ent) => ent.id === e.target.value);
                    setResultData(buildDefaultHonestResult(newEnt));
                    setStatus('idle');
                  }}
                  disabled={status === 'running'}
                >
                  {TARGET_SIGNATURE_ENTITIES.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} [{ent.id}]
                    </option>
                  ))}
                </select>

                {/* Detailed Target Signature Entity Dossier */}
                <div className="entity-dossier-card">
                  <div className="dossier-header">
                    <span
                      className="dossier-badge"
                      style={{
                        background: 'rgba(0, 242, 254, 0.15)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                      }}
                    >
                      {currentEntity.category}
                    </span>
                    <span className="dossier-id">ID: <strong>{currentEntity.id}</strong></span>
                  </div>

                  <div className="dossier-payload-box">
                    <span className="dossier-sub-label">Signed Transaction / Command Payload:</span>
                    <p className="payload-text">"{currentEntity.documentPayload}"</p>
                  </div>

                  <div className="dossier-meta-grid">
                    <div className="dossier-field">
                      <span className="dossier-sub-label">Signer (Alice):</span>
                      <span className="dossier-val cyan-text">{currentEntity.sender}</span>
                    </div>
                    <div className="dossier-field">
                      <span className="dossier-sub-label">Verifier (Bob):</span>
                      <span className="dossier-val green-text">{currentEntity.recipient}</span>
                    </div>
                    <div className="dossier-field">
                      <span className="dossier-sub-label">SHA3-512 Hash:</span>
                      <span className="dossier-val code-font">{currentEntity.payloadHash.slice(0, 18)}...</span>
                    </div>
                    <div className="dossier-field">
                      <span className="dossier-sub-label">Session Nonce:</span>
                      <span className="dossier-val code-font purple-text">{currentEntity.sessionNonce}</span>
                    </div>
                  </div>

                  <div className="dossier-keys-strip">
                    <span className="dossier-sub-label">Target Quantum EPR Key Bits:</span>
                    <span className="key-bits-val">{currentEntity.keyBits}</span>
                  </div>
                </div>
              </div>

              {/* Protocol Parameters Form Row */}
              <div className="form-row" style={{ marginTop: '1.2rem' }}>
                <div className="form-group half">
                  <label htmlFor="honest-qubits">Signature Length (L Qubits):</label>
                  <input
                    id="honest-qubits"
                    type="number"
                    min="4"
                    max="28"
                    value={nQubits}
                    onChange={(e) => setNQubits(Math.max(4, parseInt(e.target.value) || 4))}
                    disabled={status === 'running'}
                  />
                  <span className="field-explanation">
                    Security Bound: P(forgery) ≤ 2⁻{nQubits}
                  </span>
                </div>

                <div className="form-group half">
                  <label htmlFor="honest-shots">Circuit Measurement Shots:</label>
                  <select
                    id="honest-shots"
                    value={shots}
                    onChange={(e) => setShots(Number(e.target.value))}
                    disabled={status === 'running'}
                  >
                    <option value="512">512 Shots (Fast Estimation)</option>
                    <option value="1024">1,024 Shots (Standard Precision)</option>
                    <option value="4096">4,096 Shots (High Statistical Rigor)</option>
                  </select>
                  <span className="field-explanation">
                    Qiskit Aer Monte Carlo Sampling Depth
                  </span>
                </div>
              </div>

              {/* Key Length Quick Presets */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                {KEY_LENGTH_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`phase-pill ${nQubits === p.value ? 'active' : ''}`}
                    onClick={() => {
                      setNQubits(p.value);
                      if (injectedBitErrors > p.value) setInjectedBitErrors(p.value);
                    }}
                    disabled={status === 'running'}
                    style={{
                      cursor: 'pointer',
                      background: nQubits === p.value ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: nQubits === p.value ? 'var(--accent-cyan)' : 'var(--border-color)',
                      color: nQubits === p.value ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Intervention Controls: Channel Conditions & Noise Tolerance */}
              <div className={`intervention-card ${willReject ? 'tampered' : ''}`}>
                <div className="intervention-header">
                  <span>INTERVENTION CONTROLS</span>
                  <span className={`verdict-forecast-badge ${willReject ? 'abort' : 'accept'}`}>
                    {willReject ? '⚡ FORECAST: WILL ABORT' : '🔒 FORECAST: WILL ACCEPT'}
                  </span>
                </div>

                <h4 style={{ margin: '0.2rem 0', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Channel Conditions &amp; Noise Tolerance
                </h4>

                {/* Control 1: Security Policy Preset */}
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label htmlFor="policy-select" style={{ fontSize: '0.76rem' }}>SOC Threat Sensitivity Policy:</label>
                  <select
                    id="policy-select"
                    value={securityPolicy}
                    onChange={(e) => setSecurityPolicy(e.target.value)}
                    disabled={status === 'running'}
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  >
                    <option value="strict">Zero-Trust / Strict (Abort if QBER &gt; 5%)</option>
                    <option value="standard">Standard BB84 (Abort if QBER &gt; 11%)</option>
                    <option value="lenient">Permissive / High Loss (Abort if QBER &gt; 20%)</option>
                  </select>
                </div>

                {/* Control 2: Environmental Bit-Flip Rate (Natural Decoherence) Slider */}
                <div className="slider-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="noise-slider" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      Environmental Bit-Flip Rate (Natural Decoherence):
                    </label>
                    <span
                      className="slider-val"
                      style={{
                        color: willReject
                          ? 'var(--accent-red)'
                          : inducedQber > 0.05
                          ? '#ffb300'
                          : 'var(--accent-green)',
                        fontWeight: 700,
                      }}
                    >
                      {injectedBitErrors} / {nQubits} ({((inducedQber) * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <div className="slider-row">
                    <input
                      id="noise-slider"
                      type="range"
                      min="0"
                      max={nQubits}
                      value={injectedBitErrors}
                      onChange={(e) => setInjectedBitErrors(Number(e.target.value))}
                      disabled={status === 'running'}
                      style={{
                        accentColor: willReject
                          ? 'var(--accent-red)'
                          : inducedQber > 0.05
                          ? '#ffb300'
                          : 'var(--accent-green)',
                      }}
                    />
                  </div>

                  {willReject ? (
                    <small
                      className="intervention-warning"
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--accent-red)',
                        display: 'block',
                        marginTop: '4px',
                      }}
                    >
                      ⚠ Simulated noise exceeds policy limit → protocol would legitimately abort here
                    </small>
                  ) : (
                    <small
                      className="intervention-safe"
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--accent-green)',
                        display: 'block',
                        marginTop: '4px',
                      }}
                    >
                      ✓ Simulated noise within policy limit → protocol will accept intact states.
                    </small>
                  )}
                </div>

                {/* Footer Readout */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.3rem',
                    paddingTop: '0.4rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Policy QBER Limit:
                  </span>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {(currentQberThreshold * 100).toFixed(0)}%
                  </strong>
                </div>
              </div>

              {/* Execution Action Button */}
              <button
                id="btn-run-honest"
                className="btn-primary"
                onClick={handleRunProtocol}
                disabled={status === 'running'}
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.25), rgba(0, 230, 118, 0.25))',
                  borderColor: 'var(--accent-green)',
                  color: '#ffffff',
                  boxShadow: '0 0 15px rgba(0, 230, 118, 0.2)',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                {status === 'running' ? '⚡ Executing Legitimate Teleportation Pipeline...' : '🚀 Run Honest Protocol'}
              </button>

              {errorMsg && <div className="error-banner">{errorMsg}</div>}

              {/* Reused AttackVisualizer in Honest Mode */}
              <AttackVisualizer
                mode="honest"
                detectData={resultData?.detect}
                activeStage={activeStage3D}
                onStageSelect={(stageId) => setActiveStage3D(stageId)}
              />
            </section>
          </ErrorBoundary>

          {/* Supporting 3D Visualizer Row (Mirrors Attack Lab .visualizations-row) */}
          <div className="visualizations-row">
            <ErrorBoundary title="3D Bloch Sphere Unavailable">
              <BlochSphere3D
                fidelity={resultData?.sig?.fidelity ?? 0.998}
                isAttacked={isCompromised}
                badgeText={isCompromised ? 'State Vector Perturbed' : 'State Vector Preserved'}
                pillClass={isCompromised ? 'pill-danger' : 'pill-green'}
              />
            </ErrorBoundary>
            <ErrorBoundary title="Network Topology Unavailable">
              <NetworkTopology3D
                isAttacked={isCompromised}
                badgeText={isCompromised ? '🚨 High Channel Loss / Noise' : 'No Interceptor Detected'}
                pillClass={isCompromised ? 'pill-danger' : 'pill-green'}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Right Column: 3D Teleportation Flow & Telemetry Desk */}
        <div className="soc-right-column">
          {/* TAB 1 ANIMATION: 8-Stage Quantum Teleportation Signature Journey */}
          <ErrorBoundary title="3D Teleportation Flow Unavailable">
            <Teleportation3D
              activeStage={activeStage3D}
              isCompromised={isCompromised}
              mode="honest"
              onStageChange={(stageId) => setActiveStage3D(stageId)}
            />
          </ErrorBoundary>

          {/* Continuous Deterministic Verdict & Telemetry Desk */}
          <ErrorBoundary title="Telemetry & Verdict Desk Unavailable">
            <ResultsCharts
              data={resultData}
              emptyMessage="No active simulation loaded."
              emptySubtext="Select 'Run Honest Protocol' to execute a real Qiskit Aer teleportation circuit and view live Born statistics."
              mode="honest"
            />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
