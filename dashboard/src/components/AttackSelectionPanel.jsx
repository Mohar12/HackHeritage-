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
import TabCrossFade from './TabCrossFade.jsx';

import {
  TARGET_SIGNATURE_ENTITIES,
  ATTACK_VECTORS,
  ATTACK_CANVAS_CONFIG,
  ATTACK_TO_PILLAR,
  ATTACK_TO_DIMENSION,
  normalizeAttackType,
} from './attackConstants.js';

export {
  TARGET_SIGNATURE_ENTITIES,
  ATTACK_VECTORS,
  ATTACK_CANVAS_CONFIG,
  ATTACK_TO_PILLAR,
  ATTACK_TO_DIMENSION,
  normalizeAttackType,
};

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
    // Reset phase synchronously before anything else so blobThreatAlert
    // is guaranteed to start from 0 on the very first render frame of the
    // new attack, even if the previous run ended at DEFENSE_ABORT (=1.0).
    if (onOperationPhase) onOperationPhase('IDLE');
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

  // Specular mouse-following light coordinate handler (Matching Audit Ledger cards & buttons)
  const handleButtonMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div className="hqds-attack-selection-scene">
      {/* ── 1. Target Signature Entity Selection & Dossier ── */}
      <div className="hqds-scene-sub-block">
        <div className="hqds-attack-subhead">
          <span className="hqds-attack-subhead-eyebrow">01 · TARGET SIGNATURE ENTITY</span>
          <h3 className="hqds-attack-subhead-title">Target Digital Signature Entity</h3>
          <p className="hqds-attack-subhead-desc">Choose authenticated quantum communication channel to target</p>
        </div>

        {/* Entity Selector Pills (Audit-style) */}
        <div className="hqds-entity-pill-strip" role="tablist" aria-label="Select Target Signature Entity">
          {TARGET_SIGNATURE_ENTITIES.map((ent, idx) => {
            const isSelected = selectedEntityId === ent.id;
            return (
              <button
                key={ent.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`hqds-entity-select-pill hqds-cursor-light ${isSelected ? 'is-active' : ''}`}
                onClick={() => handleEntityChange(ent.id)}
                onMouseMove={handleButtonMouseMove}
                disabled={status === 'running'}
              >
                <span className="hqds-entity-pill-glow" aria-hidden="true" />
                <span className="hqds-entity-pill-num">0{idx + 1}</span>
                <span className="hqds-entity-pill-title">{ent.name.split('(')[0].trim()}</span>
                <span className="hqds-entity-pill-tag">{ent.id}</span>
              </button>
            );
          })}
        </div>

        {/* Functionally intact select for screen readers and test runners */}
        <select
          id="entity-select"
          className="hqds-sr-only-select"
          value={selectedEntityId}
          onChange={(e) => handleEntityChange(e.target.value)}
          disabled={status === 'running'}
          aria-hidden="true"
          tabIndex={-1}
        >
          {TARGET_SIGNATURE_ENTITIES.map((ent) => (
            <option key={ent.id} value={ent.id}>
              {ent.name} [{ent.id}]
            </option>
          ))}
        </select>

        {/* Selected Entity Premium Glass Dossier (Requirement 4: Explicit Hierarchy) */}
        <TabCrossFade activeKey={selectedEntityId} duration={320} className="entity-dossier-crossfade">
          <div key={selectedEntityId} className="hqds-glass-dossier-card">
            {/* Hierarchy Level 1: Category Eyebrow + ID Chip */}
            <div className="hqds-dossier-top-bar">
              <span className="hqds-dossier-category">{currentEntity.category}</span>
              <span className="hqds-dossier-id-badge">ID: {currentEntity.id}</span>
            </div>

            {/* Hierarchy Level 2: Large Entity Name */}
            <h3 className="hqds-dossier-entity-name">{currentEntity.name}</h3>

            {/* Hierarchy Level 3: Monospace Payload (Requirement 5: Readable, not giant paragraph) */}
            <div className="hqds-dossier-payload-container">
              <div className="hqds-dossier-payload-header">
                <span className="hqds-dossier-label">SIGNED TRANSACTION / COMMAND PAYLOAD</span>
                <span className="hqds-dossier-payload-tag">IMMUTABLE QUANTUM PAYLOAD</span>
              </div>
              <pre className="hqds-dossier-payload-text">"{currentEntity.documentPayload}"</pre>
            </div>

            {/* Hierarchy Level 4: Metadata Grid (Alice, Bob, Hash, Nonce) */}
            <div className="hqds-dossier-meta-grid">
              {/* Alice (Signer) */}
              <div className="hqds-dossier-field">
                <span className="hqds-dossier-label">SIGNER (ALICE)</span>
                <div className="hqds-dossier-actor-val is-alice">
                  <span className="hqds-dossier-dot is-crimson" aria-hidden="true" />
                  <span className="hqds-dossier-strong-val">{currentEntity.sender}</span>
                </div>
                <span className="hqds-dossier-sub">Quantum State Preparation (QSP) Node</span>
              </div>

              {/* Bob (Verifier) */}
              <div className="hqds-dossier-field">
                <span className="hqds-dossier-label">VERIFIER (BOB)</span>
                <div className="hqds-dossier-actor-val is-bob">
                  <span className="hqds-dossier-dot is-rose" aria-hidden="true" />
                  <span className="hqds-dossier-strong-val">{currentEntity.recipient}</span>
                </div>
                <span className="hqds-dossier-sub">Born χ² Goodness-of-Fit Receiver</span>
              </div>

              {/* SHA3-512 Cryptographic Hash */}
              <div className="hqds-dossier-field">
                <span className="hqds-dossier-label">SHA3-512 CRYPTOGRAPHIC HASH</span>
                <code className="hqds-dossier-code-val" title={currentEntity.payloadHash}>
                  {currentEntity.payloadHash.slice(0, 20)}...{currentEntity.payloadHash.slice(-8)}
                </code>
                <span className="hqds-dossier-sub">Deterministic Digest Verification</span>
              </div>

              {/* Session Nonce */}
              <div className="hqds-dossier-field">
                <span className="hqds-dossier-label">SESSION NONCE</span>
                <code className="hqds-dossier-nonce-val">{currentEntity.sessionNonce}</code>
                <span className="hqds-dossier-sub">Temporal Freshness · Single-Use Epoch</span>
              </div>
            </div>

            {/* Key Bits Strip */}
            <div className="hqds-dossier-key-strip">
              <span className="hqds-dossier-label">TARGET QUANTUM EPR KEY BITS</span>
              <code className="hqds-dossier-bits">{currentEntity.keyBits}</code>
            </div>
          </div>
        </TabCrossFade>
      </div>

      {/* ── 2. Adversarial Vector Selector (Audit-Style Glass Pills) ── */}
      <div className="hqds-scene-sub-block">
        <div className="hqds-attack-subhead">
          <span className="hqds-attack-subhead-eyebrow">02 · ADVERSARIAL VECTOR SELECTION</span>
          <h3 className="hqds-attack-subhead-title">Adversarial Vector Selection</h3>
          <p className="hqds-attack-subhead-desc">Choose physical eavesdropping mechanism to deploy</p>
        </div>

        {/* Vector Pill Selector Controls */}
        <div className="hqds-attack-vector-pills" role="tablist" aria-label="Select Adversarial Vector">
          {ATTACK_VECTORS.map((a, idx) => {
            const isActive = selectedAttack === a.value;
            return (
              <button
                key={a.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`hqds-attack-vector-pill hqds-cursor-light ${isActive ? 'is-active' : ''}`}
                onClick={() => handleAttackChange(a.value)}
                onMouseMove={handleButtonMouseMove}
                disabled={status === 'running'}
              >
                <span className="hqds-attack-pill-glow" aria-hidden="true" />
                <span className="hqds-attack-pill-idx">0{idx + 1}</span>
                {isActive && <span className="hqds-attack-pill-dot is-active-dot" aria-hidden="true" />}
                <span className="hqds-attack-pill-text">{a.label}</span>
              </button>
            );
          })}
        </div>

        {/* Functionally intact select for screen readers and test runners */}
        <select
          id="attack-select"
          className="hqds-sr-only-select"
          value={selectedAttack}
          onChange={(e) => handleAttackChange(e.target.value)}
          disabled={status === 'running'}
          aria-hidden="true"
          tabIndex={-1}
        >
          {ATTACK_VECTORS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        {/* Crossfaded Vector Description Callout */}
        <TabCrossFade activeKey={selectedAttack} duration={320} className="vector-desc-crossfade">
          <div key={selectedAttack} className="hqds-vector-spec-callout">
            <div className="hqds-vector-spec-head">
              <span className="hqds-vector-spec-badge">TARGET SUBSYSTEM</span>
              <span className="hqds-vector-spec-target">{currentVector?.targetSubsystem}</span>
            </div>
            <p className="hqds-vector-spec-desc">{currentVector?.desc}</p>
          </div>
        </TabCrossFade>
      </div>

      {/* ── 3. Narrative Flow: Attack Visualizer Mechanism Inspector (Requirement 9) ── */}
      <div className="hqds-scene-sub-block">
        <AttackVisualizer
          attackType={selectedAttack}
          attackData={lastAttackResult?.attackData}
          detectData={lastAttackResult?.detectResult}
        />
      </div>

      {/* ── 4. Parameters & Execution Deck ── */}
      <div className="hqds-scene-sub-block">
        <div className="hqds-attack-subhead">
          <span className="hqds-attack-subhead-eyebrow">03 · SIMULATION PARAMETERS &amp; EXECUTION</span>
          <h3 className="hqds-attack-subhead-title">Simulation Parameters &amp; Execution</h3>
          <p className="hqds-attack-subhead-desc">Adjust quantum channel physical properties and initiate sequence</p>
        </div>

        {/* Compact Audit Parameters (Requirement 6) */}
        <div className="hqds-attack-params-row">
          <div className="hqds-attack-param-field">
            <div className="hqds-attack-param-label-group">
              <label htmlFor="attack-qubits" className="hqds-attack-param-label">
                SIGNATURE LENGTH (L QUBITS)
              </label>
              <span className="hqds-attack-param-desc">Bell pairs per signature</span>
            </div>
            <div className="hqds-attack-param-input-wrap">
              <input
                id="attack-qubits"
                type="number"
                min="4"
                max="28"
                value={nQubits}
                onChange={(e) => setNQubits(Math.max(4, parseInt(e.target.value) || 4))}
                disabled={status === 'running'}
                className="hqds-attack-number-input"
              />
              <span className="hqds-attack-param-unit">qubits</span>
            </div>
          </div>

          <div className="hqds-attack-param-field">
            <div className="hqds-attack-param-label-group">
              <label htmlFor="attack-error" className="hqds-attack-param-label">
                CHANNEL NOISE RATE (p)
              </label>
              <span className="hqds-attack-param-desc">Decoherence probability</span>
            </div>
            <div className="hqds-attack-param-input-wrap">
              <input
                id="attack-error"
                type="number"
                step="0.05"
                min="0.0"
                max="1.0"
                value={errorRate}
                onChange={(e) => setErrorRate(parseFloat(e.target.value))}
                disabled={status === 'running'}
                className="hqds-attack-number-input"
              />
              <span className="hqds-attack-param-unit">p-rate</span>
            </div>
          </div>
        </div>

        {/* Compact Cinematic Telemetry Sequence (Requirement 8) */}
        {status === 'running' && (
          <div className="hqds-attack-phase-sequence" aria-live="polite">
            <div className="hqds-phase-seq-head">
              <span className="hqds-phase-pulse-dot" />
              <span className="hqds-phase-seq-title">PHYSICAL ADVERSARIAL SEQUENCE IN PROGRESS</span>
              <span className="hqds-phase-seq-tag">AER SIMULATION · PHASE {currentPhase}</span>
            </div>
            <div className="hqds-phase-seq-track">
              {[
                { id: 'DISPATCH', step: '01', name: 'DISPATCH', desc: 'Alice Source Emit' },
                { id: 'IN_TRANSIT', step: '02', name: 'IN-TRANSIT', desc: 'Fiber Propagation' },
                { id: 'INTERCEPT', step: '03', name: 'INTERCEPT', desc: 'Eve Optical Tap' },
                { id: 'COLLAPSE', step: '04', name: 'COLLAPSE', desc: 'Entanglement Decay' },
                { id: 'DEFENSE_ABORT', step: '05', name: 'FIREWALL', desc: 'Bob Verification' },
              ].map((phase, idx, arr) => {
                const phasesOrder = ['DISPATCH', 'IN_TRANSIT', 'INTERCEPT', 'COLLAPSE', 'DEFENSE_ABORT'];
                const currentIdx = phasesOrder.indexOf(currentPhase);
                const thisIdx = phasesOrder.indexOf(phase.id);
                const isComplete = thisIdx < currentIdx;
                const isCurrent = thisIdx === currentIdx;

                return (
                  <React.Fragment key={phase.id}>
                    <div
                      className={`hqds-phase-node ${
                        isCurrent ? 'is-current' : isComplete ? 'is-complete' : 'is-pending'
                      }`}
                    >
                      <div className="hqds-phase-node-step">{phase.step}</div>
                      <div className="hqds-phase-node-info">
                        <span className="hqds-phase-node-name">{phase.name}</span>
                        <span className="hqds-phase-node-desc">{phase.desc}</span>
                      </div>
                    </div>
                    {idx < arr.length - 1 && (
                      <div
                        className={`hqds-phase-connector ${
                          thisIdx < currentIdx ? 'is-active' : ''
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Stitch-Style Primary Action Attack Button (Requirement 7) */}
        <div className="hqds-attack-action-deck">
          <button
            id="btn-simulate-attack"
            type="button"
            className={`hqds-attack-launch-btn hqds-cursor-light ${status === 'running' ? 'is-running' : ''}`}
            onClick={handleSimulateAttack}
            disabled={status === 'running'}
            onMouseMove={handleButtonMouseMove}
            aria-label={`Launch ${currentVector?.label} Attack Simulation`}
          >
            <span className="hqds-attack-launch-glow" aria-hidden="true" />
            <span className="hqds-attack-launch-pulse" aria-hidden="true" />
            <span className="hqds-attack-launch-content">
              <span className="hqds-attack-launch-icon">
                {status === 'running' ? (
                  <span className="hqds-attack-spinner" aria-hidden="true" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )}
              </span>
              <span className="hqds-attack-launch-text">
                {status === 'running'
                  ? `Executing Phased Attack Sequence (${currentPhase})...`
                  : `Launch Adversarial Simulation · ${currentVector?.label.replace(/^[^\w]+/, '')}`}
              </span>
            </span>
            <span className="hqds-attack-launch-cue" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </button>
        </div>

        {errorMsg && <div className="hqds-attack-error-banner">{errorMsg}</div>}
      </div>
    </div>
  );
}
