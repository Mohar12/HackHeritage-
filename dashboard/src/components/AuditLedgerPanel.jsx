/**
 * AuditLedgerPanel.jsx
 * ====================
 * Purpose: Cryptographic Post-Quantum Audit Ledger Viewer.
 * Displays immutable hash-chained event records (Key Distribution, Signatures,
 * Verifications, Attacks, and Security Detection verdicts) with hash validation.
 */

import React, { useEffect, useState } from 'react';
import { getAuditLedger } from '../api/client.js';

export default function AuditLedgerPanel() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchLedger() {
    setLoading(true);
    setError('');
    try {
      const data = await getAuditLedger(30);
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
      setError('Unable to load audit ledger records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="panel ledger-panel">
      <div className="ledger-header">
        <div>
          <h2>4. Immutable Cryptographic Audit Ledger</h2>
          <p className="panel-desc">
            Post-quantum SHA-256 hash-chained event log ensuring tamper-evident accountability.
          </p>
        </div>
        <button className="btn-refresh" onClick={fetchLedger} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh Ledger'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-responsive">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Sequence #</th>
              <th>Timestamp</th>
              <th>Event Type</th>
              <th>Node ID</th>
              <th>QBER</th>
              <th>Action</th>
              <th>Entry Hash</th>
              <th>Previous Hash</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  {loading ? 'Fetching audit records...' : 'No ledger entries recorded yet. Run a protocol or simulation.'}
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.record_id} className={`row-${rec.event_type.toLowerCase()}`}>
                  <td className="seq-cell">#{rec.sequence_number}</td>
                  <td>{new Date(rec.timestamp * 1000).toLocaleTimeString()}</td>
                  <td>
                    <span className={`event-badge badge-${rec.event_type.toLowerCase()}`}>
                      {rec.event_type}
                    </span>
                  </td>
                  <td>{rec.node_id}</td>
                  <td>{rec.qber !== null && rec.qber !== undefined ? `${(rec.qber * 100).toFixed(2)}%` : '—'}</td>
                  <td>
                    <span className={`action-badge action-${(rec.recommended_action || 'none').toLowerCase()}`}>
                      {rec.recommended_action || 'NONE'}
                    </span>
                  </td>
                  <td className="hash-cell" title={rec.entry_hash}>
                    {rec.entry_hash.slice(0, 8)}...{rec.entry_hash.slice(-6)}
                  </td>
                  <td className="hash-cell" title={rec.previous_hash}>
                    {rec.previous_hash.slice(0, 8)}...{rec.previous_hash.slice(-6)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
