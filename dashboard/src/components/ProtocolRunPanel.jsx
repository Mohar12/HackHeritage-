/**
 * ProtocolRunPanel.jsx
 * ====================
 * Dashboard panel for running the full QDS protocol:
 *  1. Generate quantum keys  → POST /generate-keys
 *  2. Sign a message         → POST /signatures/sign
 *  3. Verify the signature   → POST /signatures/verify
 *  4. Detect threats         → POST /detect
 *
 * Props
 * -----
 * onResult(result: object) — callback invoked with the combined protocol result.
 *
 * TODO: Implement form inputs for n_qubits and message text.
 * TODO: Add loading spinner while waiting for API responses.
 * TODO: Display intermediate results (key hashes, measurement counts) inline.
 */

import React, { useState } from 'react';
import { generateKeys, signMessage, verifySignature, detectThreat } from '../api/client.js';

export default function ProtocolRunPanel({ onResult }) {
  const [nQubits, setNQubits] = useState(8);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'done' | 'error'

  async function handleRunProtocol() {
    // TODO: implement full protocol flow:
    //   1. const keys   = await generateKeys({ n_qubits: nQubits });
    //   2. const sig    = await signMessage({ message, private_key: keys.alice_public_key });
    //   3. const verify = await verifySignature({ signature: sig.signature, public_key: keys.alice_public_key });
    //   4. const detect = await detectThreat({ measurement_data: sig.measurement_data });
    //   5. onResult({ keys, sig, verify, detect });
    setStatus('running');
    console.log('TODO: run protocol');
  }

  return (
    <section className="panel protocol-panel">
      <h2>Protocol Run</h2>
      {/* TODO: form elements */}
      <button id="btn-run-protocol" onClick={handleRunProtocol} disabled={status === 'running'}>
        {status === 'running' ? 'Running…' : 'Run QDS Protocol'}
      </button>
      {status === 'error' && <p className="error">Protocol failed. Check console.</p>}
    </section>
  );
}
