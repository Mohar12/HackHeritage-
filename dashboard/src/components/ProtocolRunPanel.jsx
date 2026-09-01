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
      setStepInfo('Protocol Completed Successfully');
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
      setStepInfo('Protocol Failed');
    }
  }

  return (
    <section className="panel protocol-panel">
      <h2>1. Honest QDS Protocol Pipeline</h2>
      <p className="panel-desc">
        Execute full end-to-end Alice $\rightarrow$ Bob $\rightarrow$ Charlie protocol lifecycle.
      </p>

      <div className="form-group">
        <label htmlFor="message-input">Signable Classical Message:</label>
        <input
          id="message-input"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === 'running'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="qubits-input">Quantum Key / Signature Length (Qubits):</label>
        <input
          id="qubits-input"
          type="number"
          min="4"
          max="64"
          value={nQubits}
          onChange={(e) => setNQubits(e.target.value)}
          disabled={status === 'running'}
        />
      </div>

      {stepInfo && <div className="step-indicator">{stepInfo}</div>}
      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <button
        id="btn-run-protocol"
        className="btn btn-primary"
        onClick={handleRunProtocol}
        disabled={status === 'running'}
      >
        {status === 'running' ? 'Executing Quantum Protocol...' : 'Execute Full QDS Protocol'}
      </button>
    </section>
  );
}
