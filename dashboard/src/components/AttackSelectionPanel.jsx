/**
 * AttackSelectionPanel.jsx
 * ========================
 * Dashboard panel for selecting and launching adversarial simulations:
 *  - Intercept-Resend (Eavesdropping on flying qubits)
 *  - Forgery (Blind state & outcome guessing)
 *  - Impersonation (Spoofed identity with unentangled states)
 *  - Replay (Stale session replay attempt)
 */

import React, { useState } from 'react';
import { simulateAttack, detectThreat } from '../api/client.js';

const ATTACK_TYPES = [
  {
    value: 'intercept_resend',
    label: 'Intercept-Resend (Eavesdropping)',
    desc: 'Eve intercepts and collapses flying signature qubits, inducing ~25% QBER.',
  },
  {
    value: 'forgery',
    label: 'Quantum Signature Forgery',
    desc: 'Eve guesses Pauli measurement outcomes blindly, triggering extreme QBER.',
  },
  {
    value: 'impersonation',
    label: 'Alice Impersonation (Spoofed States)',
    desc: 'Eve crafts unentangled spoofed states, causing massive χ² Born distribution skew.',
  },
  {
    value: 'replay',
    label: 'Signature Replay Attack',
    desc: 'Eve re-submits a captured signature into a newly initialized session.',
  },
];

export default function AttackSelectionPanel({ onResult }) {
  const [selectedAttack, setSelectedAttack] = useState('intercept_resend');
  const [nQubits, setNQubits] = useState(8);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSimulateAttack() {
    setStatus('running');
    setErrorMsg('');
    try {
      // 1. Run Attack Simulation
      const attackData = await simulateAttack({
        attack_type: selectedAttack,
        n_qubits: Number(nQubits),
        seed: 42,
        params: {
          error_rate: 0.20,
        },
      });

      // 2. Run Detection Engine on the Attack Data
      const detectResult = await detectThreat({
        measurement_data: attackData.measurement_data,
      });

      setStatus('done');
      onResult({
        type: 'attack',
        attack: attackData,
        detect: detectResult,
      });
    } catch (err) {
      console.error('Attack simulation failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Attack execution error');
    }
  }

  return (
    <section className="panel attack-panel">
      <h2>2. Adversarial Attack Simulator</h2>
      <p className="panel-desc">
        Inject quantum channel manipulations and verify detector bounds.
      </p>

      <div className="form-group">
        <label htmlFor="attack-select">Adversarial Vector:</label>
        <select
          id="attack-select"
          value={selectedAttack}
          onChange={(e) => setSelectedAttack(e.target.value)}
          disabled={status === 'running'}
        >
          {ATTACK_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <small className="attack-hint">
          {ATTACK_TYPES.find((a) => a.value === selectedAttack)?.desc}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="attack-qubits-input">Simulation Qubit Length:</label>
        <input
          id="attack-qubits-input"
          type="number"
          min="4"
          max="64"
          value={nQubits}
          onChange={(e) => setNQubits(e.target.value)}
          disabled={status === 'running'}
        />
      </div>

      <button
        id="btn-simulate-attack"
        className="btn-danger"
        onClick={handleSimulateAttack}
        disabled={status === 'running'}
      >
        {status === 'running' ? 'Simulating Adversary...' : 'Launch Attack & Run Detection'}
      </button>

      {status === 'running' && <div className="status-banner running">Executing Quantum Attack Simulation...</div>}
      {status === 'done' && <div className="status-banner success">Attack Executed & Analyzed</div>}
      {status === 'error' && <div className="status-banner error">Error: {errorMsg}</div>}
    </section>
  );
}
