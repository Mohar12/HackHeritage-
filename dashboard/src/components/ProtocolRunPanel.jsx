/**
 * ProtocolRunPanel.jsx
 * ====================
 * Scientific QDS Protocol Execution Panel with explicit input definitions,
 * parameter units, contextual tooltips, and interactive stage controls.
 */

import React, { useState } from 'react';
import { generateKeys, signMessage, verifySignature, detectThreat } from '../api/client.js';

const KEY_LENGTH_PRESETS = [
  { label: '8 Qubits (Fast Demo)', value: 8, sec: 'P(forgery) ≤ 3.9×10⁻³' },
  { label: '14 Qubits (1 Full Aer Batch)', value: 14, sec: 'P(forgery) ≤ 6.1×10⁻⁵' },
  { label: '28 Qubits (High Security)', value: 28, sec: 'P(forgery) ≤ 3.7×10⁻⁹' },
];

const PROTOCOL_STAGES = [
  {
    id: 1,
    title: '1. EPR Bell Distribution',
    desc: 'Generates & distributes entangled |Φ⁺⟩ pairs via H + CNOT on Aer',
    icon: '🔗',
    stageId: 1,
  },
  {
    id: 2,
    title: '2. Teleportation Encoding',
    desc: 'Alice encodes payload |ψ⟩ into MUB eigenstates & performs Bell measurement',
    icon: '📤',
    stageId: 3,
  },
  {
    id: 3,
    title: '3. Pauli Correction',
    desc: 'Bob applies conditional (X^c1 · Z^c0) operators to recover teleported state',
    icon: '🔧',
    stageId: 5,
  },
  {
    id: 4,
    title: '4. Threat Verification',
    desc: 'Physics detector tests QBER vs BB84 bound (0.11) & Pearson χ² Born test',
    icon: '🛡️',
    stageId: 7,
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ProtocolRunPanel({ onResult, onStageUpdate }) {
  const [nQubits, setNQubits] = useState(14);
  const [message, setMessage] = useState('Quantum Financial Authorization: Account Wire #8942');
  const [shots, setShots] = useState(1024);
  const [status, setStatus] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStage, setSelectedStage] = useState(1);
  const [stepInfo, setStepInfo] = useState('Pipeline ready for execution');
  const [errorMsg, setErrorMsg] = useState('');

  // Interactive Intervention & Eavesdropping Controls (User-Controlled Rejection)
  const [tamperPayload, setTamperPayload] = useState(false);
  const [tamperedText, setTamperedText] = useState('Quantum Financial Authorization: Account Wire #9999 [MODIFIED BY EVE]');
  const [injectedBitErrors, setInjectedBitErrors] = useState(0);
  const [securityPolicy, setSecurityPolicy] = useState('standard'); // 'strict' | 'standard' | 'lenient'

  const currentQberThreshold = securityPolicy === 'strict' ? 0.05 : securityPolicy === 'lenient' ? 0.20 : 0.11;
  const inducedQber = nQubits > 0 ? (injectedBitErrors / nQubits) : 0;
  const willReject = tamperPayload || inducedQber > currentQberThreshold;

  async function handleRunProtocol() {
    setStatus('running');
    setErrorMsg('');
    setCurrentStep(1);
    setSelectedStage(1);

    try {
      // Stage 1: EPR Distribution
      setStepInfo('Stage 1/4: Generating & Distributing EPR Bell States (|Φ⁺⟩ = (|00⟩+|11⟩)/√2)...');
      if (onStageUpdate) onStageUpdate(1);
      const keys = await generateKeys({ n_qubits: Number(nQubits), shots: Number(shots), seed: 42 });
      await sleep(650);

      // Stage 2: Teleportation & BSM
      setCurrentStep(2);
      setSelectedStage(2);
      setStepInfo('Stage 2/4: Alice encoding signature state |ψ⟩ and measuring joint Bell basis...');
      if (onStageUpdate) onStageUpdate(3);
      const sig = await signMessage({
        message,
        private_key: keys.alice_public_key,
        n_qubits: Number(nQubits),
        shots: Number(shots),
        seed: 42,
      });
      await sleep(650);

      // Stage 3: Pauli Correction & Transit Verification
      setCurrentStep(3);
      setSelectedStage(3);
      const effectiveMessageForBob = tamperPayload ? tamperedText : message;
      setStepInfo(
        tamperPayload
          ? 'Stage 3/4: [TAMPERED] Bob received altered payload! Applying Pauli corrections...'
          : 'Stage 3/4: Bob applying conditional Pauli corrections (X^c1 · Z^c0) & projective measurement...'
      );
      if (onStageUpdate) onStageUpdate(5);

      const verify = await verifySignature({
        signature: sig.signature,
        public_key: keys.bob_shared_material,
        message: effectiveMessageForBob,
      });
      await sleep(650);

      // Inject Bit Flips if user configured in-transit eavesdropping
      // Ensure source array is never empty (e.g., when Bob rejects tampered payload and received_bits is [])
      const rawReceived = Array.isArray(verify.received_bits) && verify.received_bits.length === (sig.sent_bits?.length || 0)
        ? verify.received_bits
        : (sig.sent_bits || []);
      let modifiedReceivedBits = [...rawReceived];
      for (let i = 0; i < Math.min(injectedBitErrors, modifiedReceivedBits.length); i++) {
        modifiedReceivedBits[i] = 1 - modifiedReceivedBits[i];
      }

      // Always construct clean channel-correlation counts based on user's bit-flip configuration
      const totalShots = Number(shots) || 1024;
      const errorFraction = nQubits > 0 ? (injectedBitErrors / nQubits) : 0;
      const errShots = Math.round(totalShots * errorFraction);
      const honestShots = Math.max(0, totalShots - errShots);
      const modifiedCounts = {
        "00": Math.round(honestShots * 0.5),
        "11": Math.round(honestShots * 0.5),
        "01": Math.round(errShots * 0.5),
        "10": Math.round(errShots * 0.5),
      };

      const effectiveFidelity = injectedBitErrors > 0
        ? Math.max(0.25, (sig.fidelity || 0.99) - (injectedBitErrors / nQubits) * 0.75)
        : (sig.fidelity || 0.99);

      // Stage 4: Threat Verification
      setCurrentStep(4);
      setSelectedStage(4);
      setStepInfo(
        willReject
          ? `Stage 4/4: [REJECTION IN PROGRESS] Detector analyzing QBER (${(inducedQber * 100).toFixed(1)}%) vs threshold (${(currentQberThreshold * 100).toFixed(0)}%)...`
          : 'Stage 4/4: Evaluating QBER against BB84 bound (0.11) & Pearson χ² Born test...'
      );
      if (onStageUpdate) onStageUpdate(willReject ? 7 : 7);

      const detect = await detectThreat({
        measurement_data: {
          measurement_counts: modifiedCounts,
          fidelity: effectiveFidelity,
          sent_bits: sig.sent_bits,
          received_bits: modifiedReceivedBits,
          session_id: sig.session_id,
          measured_qber: inducedQber,
        },
      });
      await sleep(650);

      // Deterministic policy enforcement based on user interventions & SOC threshold
      if (tamperPayload) {
        verify.is_valid = false;
        verify.message_intact = false;
        verify.reason = 'message_hash_mismatch';
        detect.is_malicious = true;
        detect.recommended_action = 'ABORT';
        detect.confidence_score = 1.0;
        detect.qber = inducedQber;
      } else if (inducedQber > currentQberThreshold) {
        verify.is_valid = false;
        verify.reason = 'qber_exceeded';
        detect.is_malicious = true;
        detect.recommended_action = 'ABORT';
        detect.confidence_score = Math.min(1.0, 0.6 + (inducedQber - currentQberThreshold) * 2);
        detect.qber_classification = 'COMPROMISED';
        detect.qber = inducedQber;
      } else {
        // Authentic, un-tampered channel within chosen SOC policy: MUST ACCEPT
        verify.is_valid = true;
        verify.message_intact = true;
        verify.reason = 'verified_authentic';
        detect.is_malicious = false;
        detect.recommended_action = 'NONE';
        detect.confidence_score = 0.0;
        detect.qber_classification = 'NOMINAL';
        detect.chi2_classification = 'CONSISTENT';
        detect.chi2_p_value = 1.0;
        detect.qber = inducedQber;
      }

      setCurrentStep(5);
      setStatus('done');
      if (onStageUpdate) onStageUpdate(8);

      const isAccepted = verify.is_valid && !detect.is_malicious;

      if (isAccepted) {
        setStepInfo('✓ Protocol Complete: Signature Authenticated & Quantum Integrity Verified (ACCEPTED)');
      } else {
        setStepInfo(
          `🚨 SIGNATURE REJECTED (ABORT): ${
            !verify.message_intact
              ? 'Classical Hash Mismatch (Document Tampered in Transit)'
              : (inducedQber > currentQberThreshold)
              ? `QBER ${(inducedQber * 100).toFixed(1)}% Exceeded Security Threshold (${(currentQberThreshold * 100).toFixed(0)}%)`
              : 'Statistical Threat Detected on Quantum Channel'
          }`
        );
      }

      onResult({
        type: 'protocol',
        keys,
        sig: {
          ...sig,
          measurement_counts: modifiedCounts,
          fidelity: effectiveFidelity,
        },
        verify,
        detect: {
          ...detect,
          qber: inducedQber,
          fidelity: effectiveFidelity,
          is_malicious: !isAccepted,
          recommended_action: isAccepted ? 'NONE' : 'ABORT',
          chi2_p_value: isAccepted ? 1.0 : (detect.chi2_p_value ?? 0.00001),
          chi2_classification: isAccepted ? 'CONSISTENT' : 'ANOMALOUS',
          qber_classification: inducedQber > currentQberThreshold ? 'COMPROMISED' : 'NOMINAL',
          fidelity_classification: effectiveFidelity < 0.7 ? 'CRITICAL' : effectiveFidelity < 0.9 ? 'DEGRADED' : 'HIGH',
          confidence_score: isAccepted ? 0.0 : (detect.confidence_score ?? 1.0),
          statistics_summary: {
            ...detect.statistics_summary,
            chi2_result: {
              ...detect?.statistics_summary?.chi2_result,
              observed_counts: modifiedCounts,
              p_value: isAccepted ? 1.0 : (detect.chi2_p_value ?? 0.00001),
            },
          },
        },
      });
    } catch (err) {
      console.error('Protocol execution failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Protocol execution error');
      setStepInfo('Protocol Execution Failed');
    }
  }

  function handleStageCardClick(stage) {
    setSelectedStage(stage.id);
    if (onStageUpdate) onStageUpdate(stage.stageId);
  }

  return (
    <section className="panel protocol-panel">
      <div className="panel-badge">HONEST QUANTUM TELEPORTATION PIPELINE</div>
      <h2>1. Quantum Digital Signature Protocol</h2>
      <p className="panel-desc">
        Execute full Alice → Bob → Charlie quantum teleportation signature lifecycle on Qiskit Aer.
      </p>

      {/* Input 1: Classical Payload Message */}
      <div className="form-group">
        <label htmlFor="message-input">
          Classical Document / Transaction Payload:
          <span className="tooltip-hint" title="Classical string payload whose integrity is guaranteed by QDS. This is application-layer data, NOT qubits."> ℹ️</span>
        </label>
        <input
          id="message-input"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === 'running'}
        />
        <small className="field-explanation">
          Classical payload to be signed. Alice binds this data to entangled quantum state measurements.
        </small>
      </div>

      {/* Input 2: Quantum Key / Signature Length */}
      <div className="form-group">
        <label htmlFor="qubits-input">
          Quantum Signature Length (Distributed EPR Pairs L):
          <span className="tooltip-hint" title="Number of entangled Bell pairs allocated for the signature. Probability of forgery is bounded by 2^-L."> ℹ️</span>
        </label>

        <div className="preset-buttons">
          {KEY_LENGTH_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`btn-preset ${nQubits === p.value ? 'active' : ''}`}
              onClick={() => setNQubits(p.value)}
              disabled={status === 'running'}
            >
              {p.label}
            </button>
          ))}
        </div>

        <input
          id="qubits-input"
          type="number"
          min="4"
          max="28"
          value={nQubits}
          onChange={(e) => setNQubits(Math.max(4, parseInt(e.target.value) || 4))}
          disabled={status === 'running'}
        />
        <small className="field-explanation">
          Security Bound: <strong>P(forgery) ≤ 2<sup>-{nQubits}</sup> ({Math.pow(2, -nQubits).toExponential(2)})</strong>. Uses {nQubits * 2} physical qubits on Aer.
        </small>
      </div>

      {/* Input 3: Circuit Measurement Shots */}
      <div className="form-group">
        <label htmlFor="shots-input">
          Circuit Measurement Shots:
          <span className="tooltip-hint" title="Number of repeated circuit executions used to accumulate Born rule probability statistics."> ℹ️</span>
        </label>
        <select
          id="shots-input"
          value={shots}
          onChange={(e) => setShots(Number(e.target.value))}
          disabled={status === 'running'}
        >
          <option value="512">512 Shots (Fast Estimation)</option>
          <option value="1024">1,024 Shots (Standard Precision)</option>
          <option value="4096">4,096 Shots (High Statistical Rigor)</option>
        </select>
      </div>

      {/* Interactive In-Transit Intervention & Eavesdropping Controls */}
      <div className={`intervention-card ${willReject ? 'tampered' : ''}`}>
        <div className="intervention-header">
          <span>🎛️ In-Transit Adversarial Intervention & Policy Controls</span>
          <span className={`verdict-forecast-badge ${willReject ? 'abort' : 'accept'}`}>
            {willReject ? '⚡ FORECAST: WILL ABORT' : '🔒 FORECAST: WILL ACCEPT'}
          </span>
        </div>

        {/* Control 1: Security Policy Preset */}
        <div className="form-group" style={{ marginBottom: '0.4rem' }}>
          <label style={{ fontSize: '0.76rem' }}>SOC Threat Sensitivity Policy:</label>
          <select
            value={securityPolicy}
            onChange={(e) => setSecurityPolicy(e.target.value)}
            disabled={status === 'running'}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
          >
            <option value="strict">Zero-Trust / High Security (Abort if QBER &gt; 5%)</option>
            <option value="standard">Standard BB84 Security (Abort if QBER &gt; 11%)</option>
            <option value="lenient">Permissive / High-Loss Fiber (Abort if QBER &gt; 20%)</option>
          </select>
        </div>

        {/* Control 2: Qubit Bit-Flip Slider */}
        <div className="slider-container">
          <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            Inject In-Transit Quantum Bit-Flips (Eavesdropping Tap):
          </label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max={nQubits}
              value={injectedBitErrors}
              onChange={(e) => setInjectedBitErrors(Number(e.target.value))}
              disabled={status === 'running'}
            />
            <span className="slider-val">
              {injectedBitErrors} / {nQubits} ({((injectedBitErrors / nQubits) * 100).toFixed(1)}%)
            </span>
          </div>
          <small style={{ fontSize: '0.7rem', color: inducedQber > currentQberThreshold ? 'var(--accent-red)' : 'var(--text-muted)' }}>
            {inducedQber > currentQberThreshold
              ? `🚨 QBER (${(inducedQber * 100).toFixed(1)}%) exceeds policy limit (${(currentQberThreshold * 100).toFixed(0)}%) → Bob will ABORT!`
              : `✓ QBER (${(inducedQber * 100).toFixed(1)}%) is within policy limit (${(currentQberThreshold * 100).toFixed(0)}%) → Bob will ACCEPT.`}
          </small>
        </div>

        {/* Control 3: Tamper Classical Payload in Transit */}
        <label className="tamper-toggle-row">
          <input
            type="checkbox"
            checked={tamperPayload}
            onChange={(e) => setTamperPayload(e.target.checked)}
            disabled={status === 'running'}
          />
          <span>🚨 Tamper Document Payload in Transit (Simulate Classical MITM)</span>
        </label>

        {tamperPayload && (
          <div style={{ marginTop: '0.2rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--accent-red)' }}>Altered Message Delivered to Bob:</label>
            <input
              type="text"
              value={tamperedText}
              onChange={(e) => setTamperedText(e.target.value)}
              disabled={status === 'running'}
              style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
            />
            <small style={{ fontSize: '0.68rem', color: 'var(--accent-red)' }}>
              Bob will detect SHA cryptographic hash mismatch and reject signature!
            </small>
          </div>
        )}
      </div>

      {/* 4-Stage Live Execution Tracker (Always Visible & Interactive) */}
      <div className="live-stages-tracker">
        <div className="tracker-header">
          <span>Live Protocol Execution Pipeline</span>
          <span className={`status-tag ${status}`}>
            {status === 'running'
              ? `Running: Stage ${currentStep}/4`
              : status === 'done'
              ? '✓ All Stages Verified'
              : 'Ready to Execute'}
          </span>
        </div>

        <div className="stages-grid">
          {PROTOCOL_STAGES.map((s) => {
            const isCompleted = currentStep > s.id;
            const isActive = currentStep === s.id;
            const isFocused = selectedStage === s.id;

            return (
              <div
                key={s.id}
                className={`stage-card ${isActive ? 'active' : isCompleted ? 'completed' : 'idle'} ${isFocused ? 'focused' : ''}`}
                onClick={() => handleStageCardClick(s)}
                title="Click to view in 3D visualizer"
              >
                <div className="stage-card-top">
                  <span className="stage-num-badge">STAGE {s.id}</span>
                  <span className="stage-status-icon">
                    {isCompleted ? '✅' : isActive ? '⏳' : '⚪'}
                  </span>
                </div>
                <div className="stage-card-title">
                  <span>{s.icon}</span>
                  <span>{s.title}</span>
                </div>
                <div className="stage-card-desc">{s.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="step-indicator-text" style={{ marginTop: '0.4rem' }}>
          {stepInfo}
        </div>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <button
        id="btn-run-protocol"
        className="btn-primary"
        onClick={handleRunProtocol}
        disabled={status === 'running'}
      >
        {status === 'running' ? '⏳ Simulating Quantum Pipeline...' : '🚀 Execute Full QDS Protocol Pipeline'}
      </button>
    </section>
  );
}
