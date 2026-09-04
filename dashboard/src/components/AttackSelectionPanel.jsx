/**
 * AttackSelectionPanel.jsx
 * ========================
 * Scientific Adversarial Attack Lab with mathematical descriptions,
 * parameter controls, and vector-specific visual integration.
 */

import React, { useState } from 'react';
import { simulateAttack, detectThreat } from '../api/client.js';
import AttackVisualizer from './AttackVisualizer.jsx';

const ATTACK_VECTORS = [
  {
    value: 'intercept_resend',
    label: '⚡ Intercept-Resend (EPR Collapse)',
    desc: 'Eve measures flying qubits in random Pauli bases (X or Z), collapsing Bell entanglement and inducing ~25% QBER (violates BB84 bound ε = 0.11).',
  },
  {
    value: 'depolarizing',
    label: '🌊 Depolarizing Channel Noise',
    desc: 'Models uniform environmental thermal decoherence: (1-p)ρ + (p/3)∑σ_i ρ σ_i. Reduces Uhlmann fidelity without adversary presence.',
  },
  {
    value: 'forgery',
    label: '🎭 Signature Forgery (Blind Guessing)',
    desc: 'Eve attempts to forge Alice signature without private EPR key material. Probability of successful forgery is bounded by 2^-L.',
  },
  {
    value: 'impersonation',
    label: '👤 Alice Impersonation (Spoofed States)',
    desc: 'Eve transmits unentangled product states claiming to be Alice. Produces severe Pearson χ² Born distribution skew (p < 0.0001).',
  },
  {
    value: 'replay',
    label: '🔁 Signature Replay Attack',
    desc: 'Eve captures a valid signature from Session A and attempts re-submission in Session B. Rejected via session nonce and state non-reuse.',
  },
];

export default function AttackSelectionPanel({ onResult, onStageUpdate }) {
  const [selectedAttack, setSelectedAttack] = useState('intercept_resend');
  const [nQubits, setNQubits] = useState(14);
  const [errorRate, setErrorRate] = useState(0.20);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastAttackResult, setLastAttackResult] = useState(null);

  async function handleSimulateAttack() {
    setStatus('running');
    setErrorMsg('');
    if (onStageUpdate) onStageUpdate(7);

    try {
      // 1. Run Attack Simulation on Aer Backend
      const attackData = await simulateAttack(selectedAttack, {
        params: {
          n_qubits: Number(nQubits),
          error_rate: Number(errorRate),
          target_identity: 'Alice',
          strategy: selectedAttack === 'forgery' ? 'blind_guess' : 'unentangled_spoof',
        },
        shots: 1024,
        seed: 42,
      });

      // 2. Run Deterministic Statistical Detection Engine
      const detectResult = await detectThreat({
        measurement_data: attackData.measurement_data,
      });

      setLastAttackResult({ attackData, detectResult });
      setStatus('done');

      onResult({
        type: 'attack',
        attackType: selectedAttack,
        attack: attackData,
        detect: detectResult,
      });
    } catch (err) {
      console.error('Attack simulation failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Attack execution error');
    }
  }

  const currentVector = ATTACK_VECTORS.find((a) => a.value === selectedAttack);

  return (
    <section className="panel attack-panel">
      <div className="panel-badge danger">ADVERSARIAL QUANTUM SIMULATION LAB</div>
      <h2>2. Quantum Attack Laboratory</h2>
      <p className="panel-desc">
        Inject quantum channel manipulations and test deterministic statistical detector resilience.
      </p>

      {/* Adversarial Vector Selection */}
      <div className="form-group">
        <label htmlFor="attack-select">Target Adversarial Vector:</label>
        <select
          id="attack-select"
          value={selectedAttack}
          onChange={(e) => {
            setSelectedAttack(e.target.value);
            setLastAttackResult(null);
          }}
          disabled={status === 'running'}
        >
          {ATTACK_VECTORS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <div className="vector-desc-box">
          <strong>Physical Mechanism:</strong> {currentVector?.desc}
        </div>
      </div>

      <div className="form-row">
        {/* Input: Target Signature Qubits */}
        <div className="form-group half">
          <label htmlFor="attack-qubits">Signature Length (L Qubits):</label>
          <input
            id="attack-qubits"
            type="number"
            min="4"
            max="28"
            value={nQubits}
            onChange={(e) => setNQubits(Math.max(4, parseInt(e.target.value) || 4))}
            disabled={status === 'running'}
          />
        </div>

        {/* Input: Channel Disturbance Rate */}
        <div className="form-group half">
          <label htmlFor="attack-error">Channel Noise Rate (p):</label>
          <input
            id="attack-error"
            type="number"
            step="0.05"
            min="0.0"
            max="1.0"
            value={errorRate}
            onChange={(e) => setErrorRate(parseFloat(e.target.value))}
            disabled={status === 'running'}
          />
        </div>
      </div>

      <button
        id="btn-simulate-attack"
        className="btn-primary btn-danger"
        onClick={handleSimulateAttack}
        disabled={status === 'running'}
      >
        {status === 'running' ? '⚡ Simulating Attack & Evaluating Detector...' : `💥 Launch ${currentVector?.label}`}
      </button>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {/* Attack Mechanism Visualizer */}
      <AttackVisualizer
        attackType={selectedAttack}
        attackData={lastAttackResult?.attackData}
        detectData={lastAttackResult?.detectResult}
      />
    </section>
  );
}
