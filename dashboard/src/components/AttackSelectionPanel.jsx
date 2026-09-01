/**
 * AttackSelectionPanel.jsx
 * ========================
 * Adversarial injection panel executing all 4 quantum attack vectors.
 */

import React, { useState } from 'react';
import { simulateAttack, detectThreat } from '../api/client.js';

const ATTACK_TYPES = [
  {
    value: 'intercept_resend',
    label: 'Intercept-Resend (EPR Collapse)',
    desc: 'Eve measures flying qubits in random Pauli bases, inducing ~25% QBER.',
  },
  {
    value: 'depolarizing',
    label: 'Depolarizing Noise Injection',
    desc: 'Simulates non-malicious environmental thermal decoherence.',
  },
  {
    value: 'forgery',
    label: 'Signature Forgery (Blind Guessing)',
    desc: 'Eve crafts a signature without private Bell keys; P(success) = 2^-n.',
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
      const attackData = await simulateAttack(selectedAttack, {
        params: {
          n_qubits: Number(nQubits),
          error_rate: 0.20,
          target_identity: 'Alice',
          strategy: selectedAttack === 'forgery' ? 'blind_guess' : 'unentangled_spoof',
        },
        shots: 1024,
        seed: 42,
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

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <button
        id="btn-run-attack"
        className="btn btn-attack"
        onClick={handleSimulateAttack}
        disabled={status === 'running'}
      >
        {status === 'running' ? 'Simulating Attack Vector...' : 'Execute Adversarial Attack'}
      </button>
    </section>
  );
}
