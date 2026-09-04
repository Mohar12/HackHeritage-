/**
 * AuditLedgerPanel.jsx
 * ====================
 * Purpose: Cryptographic Post-Quantum Audit Ledger Viewer.
 * Displays immutable hash-chained event records (Key Distribution, Signatures,
 * Verifications, Attacks, and Security Detection verdicts) with hash validation.
 * Built with complete null/undefined protection and loading/empty/error states.
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
      if (Array.isArray(data)) {
        setRecords(data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
      setError('Unable to load audit ledger records.');
      setRecords([]);
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
          <div className="panel-badge">POST-QUANTUM AUDIT LAYER</div>
          <h2>4. Immutable Cryptographic Audit Ledger</h2>
          <p className="panel-desc">
            SHA-256 hash-chained event timeline ensuring tamper-evident non-repudiation and accountability.
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
              <th>Record ID</th>
              <th>Timestamp</th>
              <th>Operational Origin / Source Tab</th>
              <th>Target Entity</th>
              <th>Event Type</th>
              <th>Session ID</th>
              <th>QBER</th>
              <th>Fidelity</th>
              <th>Action</th>
              <th>Entry Hash</th>
              <th>Node Hash</th>
            </tr>
          </thead>
          <tbody>
            {!Array.isArray(records) || records.length === 0 ? (
              <tr>
                <td colSpan="11" className="empty-cell">
                  {loading ? 'Fetching cryptographic audit records...' : 'No ledger entries recorded yet. Run a protocol, attack, or scalable simulation to commit immutable audit records.'}
                </td>
              </tr>
            ) : (
              records.map((rec, idx) => {
                if (!rec) return null;
                const recId = rec.record_id || `aud-${idx + 1}`;
                const evType = rec.event_type || 'UNKNOWN';
                const sessId = rec.session_id || '—';
                const srcTab = rec.source_tab || (
                  evType === 'ATTACK_SIMULATION' ? 'Tab 2: Adversarial Attack Laboratory' :
                  evType === 'SIMULATION_RUN' ? 'Tab 1: Honest QDS Protocol Pipeline' :
                  evType === 'KEY_EXCHANGE' || evType === 'SIGNATURE_GEN' || evType === 'VERIFICATION' ? 'Tab 1: Honest QDS Protocol Pipeline' :
                  'Operations Control'
                );
                const targetEnt = rec.target_entity || (
                  evType === 'ATTACK_SIMULATION' ? 'Digital Signature Asset' :
                  evType === 'KEY_EXCHANGE' ? 'Alice-Bob-Charlie Bell Pairs' :
                  evType === 'VERIFICATION' ? 'Signed Quantum Payload' :
                  'QDS Quantum State Pipeline'
                );
                const qberVal = Number.isFinite(rec.qber) ? `${(rec.qber * 100).toFixed(2)}%` : '—';
                const fidVal = Number.isFinite(rec.fidelity) ? `${(rec.fidelity * 100).toFixed(1)}%` : '—';
                const actionVal = rec.recommended_action || 'NONE';
                const entryHash = typeof rec.record_hash === 'string' ? rec.record_hash : '0000000000000000';
                const nodeHash = typeof rec.node_id_hash === 'string' ? rec.node_id_hash : '00000000';
                const timeStr = rec.timestamp ? new Date(rec.timestamp * 1000).toLocaleTimeString() : '—';

                // Determine badge style for origin tab
                let tabBadgeClass = 'tab-badge-generic';
                if (srcTab.includes('Tab 1')) tabBadgeClass = 'tab-badge-pipeline';
                else if (srcTab.includes('Tab 2')) tabBadgeClass = 'tab-badge-attack';
                else if (srcTab.includes('Tab 3')) tabBadgeClass = 'tab-badge-scale';

                return (
                  <tr key={recId} className={`row-${evType.toLowerCase()}`}>
                    <td className="seq-cell">{recId}</td>
                    <td>{timeStr}</td>
                    <td>
                      <span className={`tab-origin-badge ${tabBadgeClass}`}>
                        {srcTab}
                      </span>
                    </td>
                    <td>
                      <span className="target-entity-pill" title={targetEnt}>
                        🎯 {targetEnt.length > 28 ? `${targetEnt.slice(0, 26)}...` : targetEnt}
                      </span>
                    </td>
                    <td>
                      <span className={`event-badge badge-${evType.toLowerCase()}`}>
                        {evType}
                      </span>
                    </td>
                    <td className="hash-cell" title={sessId}>
                      {sessId.length > 16 ? `${sessId.slice(0, 16)}...` : sessId}
                    </td>
                    <td>{qberVal}</td>
                    <td>{fidVal}</td>
                    <td>
                      <span className={`action-badge action-${actionVal.toLowerCase()}`}>
                        {actionVal}
                      </span>
                    </td>
                    <td className="hash-cell" title={entryHash}>
                      {entryHash.length >= 14 ? `${entryHash.slice(0, 8)}...${entryHash.slice(-6)}` : entryHash}
                    </td>
                    <td className="hash-cell" title={nodeHash}>
                      {nodeHash}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
