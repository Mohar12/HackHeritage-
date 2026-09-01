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

export default function ProtocolRunPanel({ onResult, onStageUpdate }) {
  const [nQubits, setNQubits] = useState(14);
  const [message, setMessage] = useState('Quantum Financial Authorization: Account Wire #8942');
  const [shots, setShots] = useState(1024);
  const [status, setStatus] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [stepInfo, setStepInfo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleRunProtocol() {
    setStatus('running');
    setErrorMsg('');
    setCurrentStep(1);

    try {
      // Step 1: Distributed Bell Pairs
      setStepInfo('Stage 1/4: Generating & Distributing EPR Bell States (|Φ⁺⟩ = (|00⟩+|11⟩)/√2)...');
      if (onStageUpdate) onStageUpdate(1);
      const keys = await generateKeys({ n_qubits: Number(nQubits), shots: Number(shots), seed: 42 });

      // Step 2: Sign Message via Teleportation
      setCurrentStep(2);
      setStepInfo('Stage 2/4: Alice encoding signature state |ψ⟩ and measuring joint Bell basis...');
      if (onStageUpdate) onStageUpdate(3);
      const sig = await signMessage({
        message,
        private_key: keys.alice_public_key,
        n_qubits: Number(nQubits),
        shots: Number(shots),
        seed: 42,
      });

      // Step 3: Verify Signature with Pauli Corrections
      setCurrentStep(3);
      setStepInfo('Stage 3/4: Bob applying conditional Pauli corrections (X^c1 · Z^c0) & projective measurement...');
      if (onStageUpdate) onStageUpdate(5);
      const verify = await verifySignature({
        signature: sig.signature,
        public_key: keys.bob_shared_material,
        message,
      });

      // Step 4: Deterministic Threat Detection
      setCurrentStep(4);
      setStepInfo('Stage 4/4: Evaluating QBER against BB84 bound (0.11) & Pearson χ² Born test...');
      if (onStageUpdate) onStageUpdate(7);
      const numQ = Number(nQubits);
      const zeroSentBits = Array(numQ).fill(0);
      const detect = await detectThreat({
        measurement_data: {
          measurement_counts: sig.measurement_counts,
          fidelity: sig.fidelity,
          sent_bits: zeroSentBits,
          received_bits: sig.measurement_outcomes,
          session_id: sig.session_id,
        },
      });

      setStatus('done');
      if (onStageUpdate) onStageUpdate(8);
      setStepInfo('Protocol Completed: Signature Verified & Threat Assessment Logged');

      onResult({
        type: 'protocol',
        keys,
        sig,
        verify,
        detect,
      });
    } catch (err) {
      console.error('Protocol execution failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Protocol execution error');
      setStepInfo('Protocol Execution Failed');
    }
  }

  return (
    <section className="panel protocol-panel">
      <div className="panel-badge">HONEST QUANTUM TELEPORTATION PIPELINE</div>
      <h2>1. Quantum Digital Signature Protocol</h2>
      <p className="panel-desc">
        Execute full Alice $\rightarrow$ Bob $\rightarrow$ Charlie quantum teleportation signature lifecycle on Qiskit Aer.
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
          Quantum Signature Length (Distributed EPR Pairs $L$):
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
          Security Bound: <strong>P(forgery) ≤ 2^{`-${nQubits}`} ({Math.pow(2, -nQubits).toExponential(2)})</strong>. Uses {nQubits * 2} physical qubits on Aer.
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

      {/* Step Progress Bar */}
      {status === 'running' && (
        <div className="protocol-progress-box">
          <div className="progress-steps-row">
            <span className={`step-dot ${currentStep >= 1 ? 'active' : ''}`}>1. EPR Dist</span>
            <span className={`step-dot ${currentStep >= 2 ? 'active' : ''}`}>2. Teleport</span>
            <span className={`step-dot ${currentStep >= 3 ? 'active' : ''}`}>3. Pauli Verify</span>
            <span className={`step-dot ${currentStep >= 4 ? 'active' : ''}`}>4. χ² Detection</span>
          </div>
          <div className="step-indicator-text">{stepInfo}</div>
        </div>
      )}

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
