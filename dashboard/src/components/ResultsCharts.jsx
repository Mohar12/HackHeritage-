/**
 * ResultsCharts.jsx
 * =================
 * Dashboard panel for rendering real-time physics and threat metrics:
 *  - Threat classification badge (SECURE, WARNING, COMPROMISED)
 *  - Quantum Bit Error Rate (QBER) meter vs BB84 bounds (5% & 11%)
 *  - Pearson's χ² Born distribution p-value gauge
 *  - State fidelity gauge vs critical limits (70% & 90%)
 *  - Threat confidence score bar [0.0 - 1.0]
 *  - Raw measurement count distribution breakdown
 */

import React from 'react';

export default function ResultsCharts({ data }) {
  if (!data) {
    return (
      <section className="panel results-panel">
        <h2>3. Telemetry & Threat Classification</h2>
        <div className="empty-state">
          <p>No simulation data loaded yet.</p>
          <span>Run an Honest Protocol Pipeline or Attack Simulation above to view live physics telemetry.</span>
        </div>
      </section>
    );
  }

  const { type, keys, sig, verify, attack, detect } = data;
  const isMalicious = detect?.is_malicious ?? false;
  const qber = detect?.qber ?? 0.0;
  const pVal = detect?.chi2_p_value ?? 1.0;
  const fidelity = detect?.fidelity ?? 1.0;
  const confidence = detect?.confidence_score ?? 0.0;
  const action = detect?.recommended_action ?? 'NONE';
  const qberClass = detect?.qber_classification ?? 'SECURE';
  const chi2Class = detect?.chi2_classification ?? 'NORMAL';
  const fidelityClass = detect?.fidelity_classification ?? 'HIGH';
  const counts = detect?.statistics_summary?.chi2_result?.observed_counts || {};

  const badgeClass = isMalicious ? 'badge-danger' : action === 'ALERT' ? 'badge-warning' : 'badge-secure';

  return (
    <section className="panel results-panel">
      <div className="results-header">
        <h2>3. Telemetry & Threat Classification</h2>
        <span className={`status-badge ${badgeClass}`}>
          {isMalicious ? '🚨 COMPROMISED / ATTACK DETECTED' : action === 'ALERT' ? '⚠️ WARNING DETECTED' : '🛡️ SECURE / AUTHENTIC'}
        </span>
      </div>

      <div className="metrics-grid">
        {/* Metric 1: Threat Confidence */}
        <div className="metric-card">
          <div className="metric-title">Threat Confidence Score</div>
          <div className="metric-value">{(confidence * 100).toFixed(1)}%</div>
          <div className="progress-bar-container">
            <div
              className={`progress-bar ${confidence > 0.5 ? 'bar-red' : confidence > 0.3 ? 'bar-yellow' : 'bar-green'}`}
              style={{ width: `${Math.min(confidence * 100, 100)}%` }}
            />
          </div>
          <small>Classification Threshold: 50%</small>
        </div>

        {/* Metric 2: QBER */}
        <div className="metric-card">
          <div className="metric-title">Quantum Bit Error Rate (QBER)</div>
          <div className="metric-value">{(qber * 100).toFixed(2)}%</div>
          <div className={`metric-subtag ${qberClass.toLowerCase()}`}>Status: {qberClass}</div>
          <small>BB84 Secure: &lt;5% | Abort: &gt;11%</small>
        </div>

        {/* Metric 3: Chi-Squared p-value */}
        <div className="metric-card">
          <div className="metric-title">Born χ² Goodness-of-Fit</div>
          <div className="metric-value">{pVal < 0.0001 ? '< 0.0001' : pVal.toFixed(4)}</div>
          <div className={`metric-subtag ${chi2Class.toLowerCase()}`}>Status: {chi2Class}</div>
          <small>p &lt; 0.01 indicates spoofing anomaly</small>
        </div>

        {/* Metric 4: Fidelity */}
        <div className="metric-card">
          <div className="metric-title">Quantum State Fidelity</div>
          <div className="metric-value">{(fidelity * 100).toFixed(1)}%</div>
          <div className={`metric-subtag ${fidelityClass.toLowerCase()}`}>Status: {fidelityClass}</div>
          <small>Critical threshold: &lt;70%</small>
        </div>
      </div>

      {/* Protocol Summary / Verification Status */}
      {verify && (
        <div className="verification-box">
          <h3>Signature Verification Verdict:</h3>
          <div className={`verdict-pill ${verify.is_valid ? 'valid' : 'invalid'}`}>
            {verify.is_valid ? '✅ Signature Verified Authentic (Bob Accepted)' : `❌ Verification Failed: ${verify.reason}`}
          </div>
        </div>
      )}

      {/* Raw Measurement Distribution */}
      <div className="counts-breakdown">
        <h3>Observed Bell-State Measurement Histogram</h3>
        <div className="histogram-bars">
          {Object.entries(counts).map(([basis, count]) => (
            <div key={basis} className="hist-item">
              <span className="hist-label">|{basis}⟩</span>
              <div className="hist-bar-wrapper">
                <div
                  className="hist-bar"
                  style={{
                    height: `${Math.min((count / Math.max(...Object.values(counts), 1)) * 100, 100)}px`,
                  }}
                />
              </div>
              <span className="hist-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
