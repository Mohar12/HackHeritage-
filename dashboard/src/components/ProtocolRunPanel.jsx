/**
 * ProtocolRunPanel.jsx
 * ====================
 * Dashboard panel for executing the full honest QDS protocol pipeline:
 *  1. Generate quantum keys (EPR distribution)
 *  2. Sign message via quantum teleportation
 *  3. Verify signature with Pauli corrections
 *  4. Run threat detection over final measurement statistics
 */

import React, { useState } from 'react';
import { generateKeys, signMessage, verifySignature, detectThreat } from '../api/client.js';

export default function ProtocolRunPanel({ onResult }) {
  const [nQubits, setNQubits] = useState(8);
  const [message, setMessage] = useState('Quantum Financial Authorization: $100,000 to Alice');
  const [status, setStatus] = useState('idle');
  const [stepInfo, setStepInfo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleRunProtocol() {
    setStatus('running');
    setErrorMsg('');
    try {
      // Step 1: Key Generation
      setStepInfo('1/4: Distributing EPR Bell Pairs...');
      const keys = await generateKeys({ n_qubits: Number(nQubits), shots: 1024, seed: 42 });

      // Step 2: Sign Message
      setStepInfo('2/4: Teleporting state & encoding Pauli corrections (Alice)...');
      const sig = await signMessage({
        message,
        private_key: keys.alice_public_key,
        n_qubits: Number(nQubits),
        shots: 1024,
        seed: 42,
      });

      // Step 3: Verify Signature
      setStepInfo('3/4: Applying Pauli corrections & projective measurement (Bob)...');
      const verify = await verifySignature({
        signature: sig.signature,
        public_key: keys.bob_shared_material,
        message,
      });

      // Step 4: Run Threat Detection
      setStepInfo('4/4: Performing Pearson χ² Born test & QBER security bounds check...');
      const detect = await detectThreat({
        measurement_data: {
          measurement_counts: sig.measurement_counts,
          fidelity: sig.fidelity,
          sent_bits: [0] * nQubits,
          received_bits: sig.measurement_outcomes,
          session_id: sig.session_id,
        },
      });

      setStatus('done');
      setStepInfo('Protocol Completed Successfully');
      onResult({
        type: 'protocol',
        keys,
        sig,
        verify,
        detect,
      });
    } catch (err) {
      console.error('Protocol run failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Unknown protocol failure');
    }
  }

  return (
    <section className="panel protocol-panel">
      <h2>1. Honest Protocol Pipeline</h2>
      <p className="panel-desc">
        Execute full Information-Theoretically Secure (ITS) quantum signature exchange.
      </p>

      <div className="form-group">
        <label htmlFor="n-qubits-input">Qubit Register Size:</label>
        <input
          id="n-qubits-input"
          type="number"
          min="1"
          max="64"
          value={nQubits}
          onChange={(e) => setNQubits(e.target.value)}
          disabled={status === 'running'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="message-input">Message Payload:</label>
        <input
          id="message-input"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === 'running'}
          placeholder="Enter message to sign..."
        />
      </div>

      <button
        id="btn-run-protocol"
        className="btn-primary"
        onClick={handleRunProtocol}
        disabled={status === 'running'}
      >
        {status === 'running' ? 'Executing Protocol...' : 'Run Honest QDS Pipeline'}
      </button>

      {status === 'running' && <div className="status-banner running">{stepInfo}</div>}
      {status === 'done' && <div className="status-banner success">{stepInfo}</div>}
      {status === 'error' && <div className="status-banner error">Error: {errorMsg}</div>}
    </section>
  );
}
