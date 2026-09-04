/**
 * AttackSelectionPanel.jsx
 * ========================
 * Scientific Adversarial Attack Lab with:
 *  - Explicit Target Signature Entity Selection & Dossier (Federal Reserve Wire,
 *    DoD Satellite Lockdown, National Genomic Vault).
 *  - Adversarial Vector Selection (Intercept-Resend, Depolarizing Noise, Forgery,
 *    Impersonation, Replay).
 *  - State-Synchronized Operation Execution (Dispatch -> In-Transit -> Intercept -> Collapse -> Defense Abort).
 *  - Clean mathematical typography and liquid glass HUDs.
 */

import React, { useState } from 'react';
import { simulateAttack, detectThreat } from '../api/client.js';
import AttackVisualizer from './AttackVisualizer.jsx';

export const TARGET_SIGNATURE_ENTITIES = [
  {
    id: 'TX-2026-FED-BOE',
    name: 'Federal Reserve → Bank of England ($25M Wire Settlement)',
    category: 'Critical Financial Infrastructure',
    sender: 'Alice (US-East-1 QKD Gateway)',
    recipient: 'Bob (UK-LON-2 QKD Gateway)',
    documentPayload: 'SWIFT-AUTH: Transfer $25,000,000 USD to Bank of England [Settlement Acc #GB89-4402]',
    payloadHash: '0x9f4a81b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
    sessionNonce: '0x7b2f489a',
    keyBits: '1100101011110001010110100110',
  },
  {
    id: 'CMD-994-DEFCON1',
    name: 'DoD SATCOM (Orbital Perimeter Lockdown Command)',
    category: 'Defense / National Security',
    sender: 'Alice (US-NORAD-Secure-01)',
    recipient: 'Bob (US-SPACECOM-Polar-04)',
    documentPayload: 'CMD-EXEC: DEFCON-1 Orbital Defense Shield Perimeter Lockout [AUTH-LEVEL-OMEGA]',
    payloadHash: '0xd81e9204fbca10982345ef01a92c348719283746',
    sessionNonce: '0x3c99a14d',
    keyBits: '0111010010101110001101011100',
  },
  {
    id: 'HLTH-771-GENOME',
    name: 'National Genomic Vault (Master Vault Decryption Key)',
    category: 'Sovereign Biomedical Intelligence',
    sender: 'Alice (NIH-BioVault-East)',
    recipient: 'Bob (CDC-Genome-Center-Atlanta)',
    documentPayload: 'VAULT-UNLOCK: Decrypt Sovereign Genomic Database Slice #0994 [Access: RESTRICTED]',
    payloadHash: '0x44289a01be9c87f1234901827364510293847561',
    sessionNonce: '0x88f1e29c',
    keyBits: '1010011101010011110010101001',
  },
];

export const ATTACK_VECTORS = [
  {
    value: 'intercept_resend',
    label: '⚡ Intercept-Resend (EPR Collapse)',
    targetSubsystem: 'Optical Fiber Link [Alice → Bob]',
    desc: 'Eve measures flying qubits in random Pauli bases (X or Z), collapsing Bell entanglement and inducing ~25% QBER (violates BB84 bound ε = 0.11).',
  },
  {
    value: 'depolarizing',
    label: '🌊 Depolarizing Channel Noise',
    targetSubsystem: 'Fiber Core & Ambient Quantum Environment',
    desc: 'Models uniform environmental thermal decoherence: (1 − p)ρ + (p/3) ∑ᵢ σᵢ ρ σᵢ. Reduces Uhlmann fidelity without active eavesdropper.',
  },
  {
    value: 'forgery',
    label: '🎭 Signature Forgery (Blind Guessing)',
    targetSubsystem: 'Alice\'s Private EPR Key Store & Signature Ingestion',
    desc: 'Eve attempts to forge Alice\'s signature without private EPR key material. Probability of successful forgery is bounded by P(forgery) ≤ 2⁻ᴸ.',
  },
  {
    value: 'impersonation',
    label: '👤 Alice Impersonation (Spoofed States)',
    targetSubsystem: 'Alice\'s Identity & Quantum State Preparation Node',
    desc: 'Eve transmits unentangled product states claiming to be Alice. Produces severe Pearson χ² Born distribution skew (p < 0.0001).',
  },
  {
    value: 'replay',
    label: '🔁 Signature Replay Attack',
    targetSubsystem: 'Session Nonce Registry & Audit Timestamp Channel',
    desc: 'Eve captures a valid signature from Session A and attempts re-submission in Session B. Rejected via session nonce and state non-reuse.',
  },
];

export default function AttackSelectionPanel({
  onResult,
  onStageUpdate,
  selectedAttack: externalAttack,
  onSelectAttack,
  selectedEntity: externalEntity,
  onSelectEntity,
  onOperationPhase,
}) {
  const [internalAttack, setInternalAttack] = useState('intercept_resend');
  const selectedAttack = externalAttack || internalAttack;

  const [internalEntityId, setInternalEntityId] = useState('TX-2026-FED-BOE');
  const selectedEntityId = externalEntity?.id || internalEntityId;
  const currentEntity = TARGET_SIGNATURE_ENTITIES.find((e) => e.id === selectedEntityId) || TARGET_SIGNATURE_ENTITIES[0];

  const [nQubits, setNQubits] = useState(14);
  const [errorRate, setErrorRate] = useState(0.20);
  const [status, setStatus] = useState('idle');
  const [currentPhase, setCurrentPhase] = useState('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastAttackResult, setLastAttackResult] = useState(null);

  function handleAttackChange(val) {
    setInternalAttack(val);
    if (onSelectAttack) onSelectAttack(val);
    setLastAttackResult(null);
  }

  function handleEntityChange(val) {
    setInternalEntityId(val);
    const ent = TARGET_SIGNATURE_ENTITIES.find((e) => e.id === val);
    if (onSelectEntity && ent) onSelectEntity(ent);
    setLastAttackResult(null);
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function handleSimulateAttack() {
    setStatus('running');
    setErrorMsg('');
    if (onStageUpdate) onStageUpdate(7);

    try {
      // Synchronized Phase 1: Payload Dispatched
      setCurrentPhase('DISPATCH');
      if (onOperationPhase) onOperationPhase('DISPATCH');
      await sleep(600);

      // Synchronized Phase 2: In-Flight Optical Waveguide Transmit
      setCurrentPhase('IN_TRANSIT');
      if (onOperationPhase) onOperationPhase('IN_TRANSIT');
      await sleep(600);

      // Synchronized Phase 3: Eve Wiretap Interception
      setCurrentPhase('INTERCEPT');
      if (onOperationPhase) onOperationPhase('INTERCEPT');
      await sleep(600);

      // 1. Run Attack Simulation on Aer Backend
      const attackData = await simulateAttack(selectedAttack, {
        params: {
          n_qubits: Number(nQubits),
          error_rate: Number(errorRate),
          target_identity: `${currentEntity.id} (${currentEntity.name})`,
          target_payload: currentEntity.documentPayload,
          strategy: selectedAttack === 'forgery' ? 'blind_guess' : 'unentangled_spoof',
        },
        target_identity: `${currentEntity.id} (${currentEntity.name})`,
        target_payload: currentEntity.documentPayload,
        shots: 1024,
        seed: 42,
      });

      // Synchronized Phase 4: Wavefunction Collapse & QBER Anomaly
      setCurrentPhase('COLLAPSE');
      if (onOperationPhase) onOperationPhase('COLLAPSE');
      await sleep(600);

      // 2. Run Deterministic Statistical Detection Engine
      const detectResult = await detectThreat({
        measurement_data: attackData.measurement_data,
      });

      // Synchronized Phase 5: Bob Physical Layer Firewall Abort
      setCurrentPhase('DEFENSE_ABORT');
      if (onOperationPhase) onOperationPhase('DEFENSE_ABORT');
      await sleep(400);

      setLastAttackResult({ attackData, detectResult });
      setStatus('done');

      onResult({
        type: 'attack',
        attackType: selectedAttack,
        targetEntity: currentEntity,
        attack: attackData,
        detect: detectResult,
      });
    } catch (err) {
      console.error('Attack simulation failed:', err);
      setStatus('error');
      setCurrentPhase('IDLE');
      if (onOperationPhase) onOperationPhase('IDLE');
      setErrorMsg(err.message || 'Attack execution error');
    }
  }

  const currentVector = ATTACK_VECTORS.find((a) => a.value === selectedAttack);

  return (
    <section className="panel attack-panel liquid-glass">
      <div className="panel-badge danger">ADVERSARIAL QUANTUM SIMULATION LAB</div>
      <h2>2. Adversarial Quantum Attack Laboratory</h2>
      <p className="panel-desc">
        Target high-value digital signatures and evaluate deterministic physical-layer threat detection.
      </p>

      {/* Target Signature Entity Selector */}
      <div className="entity-selection-section">
        <label className="entity-selector-label" htmlFor="entity-select">
          🎯 Target Digital Signature Entity to Attack:
        </label>
        <select
          id="entity-select"
          className="entity-dropdown"
          value={selectedEntityId}
          onChange={(e) => handleEntityChange(e.target.value)}
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
            <span className="dossier-badge">{currentEntity.category}</span>
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

      {/* Adversarial Attack Vector Selection */}
      <div className="form-group" style={{ marginTop: '1.2rem' }}>
        <label htmlFor="attack-select">Target Adversarial Vector:</label>
        <select
          id="attack-select"
          value={selectedAttack}
          onChange={(e) => handleAttackChange(e.target.value)}
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

      {/* Synchronized Operation Phase Bar */}
      {status === 'running' && (
        <div className="operation-phase-indicator">
          <div className="phase-title">
            <span className="pulsing-red-dot" />
            <span>OPERATIONAL ATTACK SEQUENCE IN PROGRESS:</span>
          </div>
          <div className="phase-steps-strip">
            <span className={`phase-pill ${currentPhase === 'DISPATCH' ? 'active' : ''}`}>1. Dispatch</span>
            <span className={`phase-pill ${currentPhase === 'IN_TRANSIT' ? 'active' : ''}`}>2. In-Transit</span>
            <span className={`phase-pill ${currentPhase === 'INTERCEPT' ? 'active' : ''}`}>3. Intercept</span>
            <span className={`phase-pill ${currentPhase === 'COLLAPSE' ? 'active' : ''}`}>4. Collapse</span>
            <span className={`phase-pill ${currentPhase === 'DEFENSE_ABORT' ? 'active' : ''}`}>5. Firewall</span>
          </div>
        </div>
      )}

      <button
        id="btn-simulate-attack"
        className="btn-primary btn-danger"
        onClick={handleSimulateAttack}
        disabled={status === 'running'}
      >
        {status === 'running' ? '⚡ Executing Phased Attack Sequence...' : `💥 Launch ${currentVector?.label}`}
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
