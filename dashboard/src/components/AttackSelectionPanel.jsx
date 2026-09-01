/**
 * AttackSelectionPanel.jsx
 * ========================
 * Dashboard panel that allows users to select and launch one of the four
 * modelled quantum attack simulations:
 *  - Forgery
 *  - Impersonation
 *  - Replay
 *  - Channel Manipulation
 *
 * Submits to POST /simulate-attack with the selected attack_type and params.
 *
 * Props
 * -----
 * onResult(result: object) — callback invoked with the attack simulation result.
 *
 * TODO: Render a dropdown or radio group for attack type selection.
 * TODO: Show per-attack parameter inputs (e.g. error_rate for channel_manipulation).
 * TODO: Display returned measurement_data and attack_result inline.
 */

import React, { useState } from 'react';
import { simulateAttack } from '../api/client.js';

const ATTACK_TYPES = [
  { value: 'forgery',              label: 'Forgery' },
  { value: 'impersonation',        label: 'Impersonation' },
  { value: 'replay',               label: 'Replay' },
  { value: 'channel_manipulation', label: 'Channel Manipulation' },
];

export default function AttackSelectionPanel({ onResult }) {
  const [selectedAttack, setSelectedAttack] = useState('forgery');
  const [params, setParams] = useState({});
  const [status, setStatus] = useState('idle');

  async function handleSimulateAttack() {
    // TODO: const result = await simulateAttack({ attack_type: selectedAttack, params });
    // TODO: onResult(result);
    setStatus('running');
    console.log('TODO: simulate attack', selectedAttack, params);
  }

  return (
    <section className="panel attack-panel">
      <h2>Attack Simulation</h2>
      {/* TODO: attack type selector */}
      {/* TODO: dynamic params form */}
      <button id="btn-simulate-attack" onClick={handleSimulateAttack} disabled={status === 'running'}>
        {status === 'running' ? 'Simulating…' : 'Simulate Attack'}
      </button>
    </section>
  );
}
