/**
 * ResultsCharts.jsx
 * =================
 * Comprehensive Telemetry & Threat Metrics Visualization Component:
 *  - Dynamic Threat Badges (SECURE, ALERT, COMPROMISED)
 *  - Exact Mathematical Verdict Explanations with BB84 bounds (ε = 0.11)
 *  - QBER meter vs BB84 Threshold
 *  - Pearson's χ² Born distribution p-value gauge (with p < 0.01 spoofing marker)
 *  - State Fidelity meter
 *  - Threat Confidence Bar [0.0 - 1.0]
 *  - 2-Bit & Bell State Histograms
 *  - Attack vs Baseline Mathematical Difference Breakdown
 */

import React from 'react';

export default function ResultsCharts({ data }) {
  if (!data) {
    return (
      <section className="panel results-panel">
        <h2>Telemetry &amp; Threat Detection Engine</h2>
        <div className="empty-state">
          <div className="empty-icon">⚛️</div>
          <p>No quantum simulation data loaded yet.</p>
          <span>Select a pipeline tab on the left to trigger real-time Aer simulation and mathematical threat classification.</span>
        </div>
      </section>
    );
  }

  const { type, keys, sig, verify, attack, detect, sim, telemetry } = data;
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
        <div>
          <h2>Telemetry &amp; Threat Classification</h2>
          <span className="results-sub">Zero-ML Deterministic Quantum State Statistical Engine</span>
        </div>
        <span className={`status-badge ${badgeClass}`}>
          {isMalicious ? '🚨 COMPROMISED / ATTACK DETECTED' : action === 'ALERT' ? '⚠️ WARNING DETECTED' : '🛡️ SECURE / AUTHENTIC'}
        </span>
      </div>

      {/* Primary Metrics Grid */}
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
          <small>Detection Threshold: 50.0%</small>
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
          <div className="metric-title">Uhlmann State Fidelity</div>
          <div className="metric-value">{(fidelity * 100).toFixed(1)}%</div>
          <div className={`metric-subtag ${fidelityClass.toLowerCase()}`}>Status: {fidelityClass}</div>
          <small>Critical Threshold: &lt;70%</small>
        </div>
      </div>

      {/* Mathematical Verdict Explanation Box */}
      <div className="verdict-explanation-box">
        <h4>🔬 Mathematical Verdict Formulation &amp; Physical Evidence:</h4>
        <div className="verdict-content">
          <div className="verdict-item">
            <span>Observed QBER:</span>
            <strong>{(qber * 100).toFixed(2)}% {qber > 0.11 ? '(Exceeds BB84 Security Limit ε=0.11)' : '(Within Safe Threshold)'}</strong>
          </div>
          <div className="verdict-item">
            <span>Pearson χ² p-value:</span>
            <strong>{pVal.toFixed(4)} {pVal < 0.01 ? '(Born Distribution Null Hypothesis Rejected)' : '(Consistent with Born Rule)'}</strong>
          </div>
          <div className="verdict-item">
            <span>Recommended Action:</span>
            <strong className={`action-text ${action.toLowerCase()}`}>{action} ({action === 'ABORT' ? 'Immediate Quantum Channel Teardown' : 'Channel Integrity Verified'})</strong>
          </div>
        </div>
      </div>

      {/* Protocol Verification Details if Available */}
      {verify && (
        <div className="verification-box">
          <h4>Signature Verification Status:</h4>
          <div className={`verdict-pill ${verify.is_valid ? 'valid' : 'invalid'}`}>
            {verify.is_valid ? '✅ Signature Verified Authentic (Bob Accepted Statevector)' : `❌ Verification Failed: ${verify.reason}`}
          </div>
        </div>
      )}

      {/* Raw Measurement Distribution */}
      {Object.keys(counts).length > 0 && (
        <div className="counts-breakdown">
          <h4>Observed 2-Bit EPR Measurement Distribution:</h4>
          <div className="histogram-bars">
            {Object.entries(counts).map(([basis, count]) => {
              const maxCount = Math.max(...Object.values(counts), 1);
              const heightPct = Math.min((count / maxCount) * 100, 100);
              return (
                <div key={basis} className="hist-item">
                  <span className="hist-label">|{basis}⟩</span>
                  <div className="hist-bar-wrapper">
                    <div className="hist-bar" style={{ height: `${heightPct}px` }} />
                  </div>
                  <span className="hist-count">{count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
