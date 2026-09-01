/**
 * ResultsCharts.jsx
 * =================
 * Scientific Telemetry & Statistical Threat Detection Dashboard:
 *  - Quantum Bit Error Rate (QBER) Gauge with BB84 Holevo bound (ε = 0.11)
 *  - Pearson's χ² Born distribution goodness-of-fit comparison (Observed vs Expected)
 *  - Uhlmann State Fidelity Arc Meter
 *  - Deterministic Zero-ML Threat Confidence formulation
 *  - Full Mathematical Verdict & Recommended Action breakdown
 *  - Complete type guards and safe defaults for missing/partial telemetry.
 */

import React from 'react';

export default function ResultsCharts({ data }) {
  if (!data) {
    return (
      <section className="panel results-panel">
        <div className="panel-badge">CONTINUOUS STATISTICAL DETECTOR</div>
        <h2>Real-Time Scientific Telemetry</h2>
        <div className="empty-state">
          <div className="empty-icon">⚛️</div>
          <p>No active simulation or telemetry data loaded.</p>
          <span>Select a protocol or attack module on the left to execute quantum circuit simulation on Qiskit Aer and view live Born statistics.</span>
        </div>
      </section>
    );
  }

  const { type, keys, sig, verify, attack, detect, sim, telemetry } = data;
  const isMalicious = Boolean(detect?.is_malicious ?? sim?.is_malicious ?? false);
  const qber = Number.isFinite(detect?.qber) ? detect.qber : Number.isFinite(sim?.statistics?.qber) ? sim.statistics.qber : 0.0;
  const pVal = Number.isFinite(detect?.chi2_p_value) ? detect.chi2_p_value : Number.isFinite(sim?.statistics?.chi2_p_value) ? sim.statistics.chi2_p_value : 1.0;
  const fidelity = Number.isFinite(detect?.fidelity) ? detect.fidelity : Number.isFinite(sim?.fidelity) ? sim.fidelity : 1.0;
  const confidence = Number.isFinite(detect?.confidence_score) ? detect.confidence_score : Number.isFinite(sim?.confidence_score) ? sim.confidence_score : 0.0;
  const action = detect?.recommended_action || sim?.classification?.recommended_action || 'NONE';
  const qberClass = detect?.qber_classification || sim?.classification?.qber_classification || 'SECURE';
  const chi2Class = detect?.chi2_classification || sim?.classification?.chi2_classification || 'NORMAL';
  const fidelityClass = detect?.fidelity_classification || sim?.classification?.fidelity_classification || 'HIGH';
  const counts = detect?.statistics_summary?.chi2_result?.observed_counts || sim?.statistics?.measurement_counts || {};

  const badgeClass = isMalicious ? 'badge-danger' : action === 'ALERT' ? 'badge-warning' : 'badge-secure';

  return (
    <section className="panel results-panel">
      <div className="results-header">
        <div>
          <div className="panel-badge">PHYSICS-BASED THREAT METRICS</div>
          <h2>Live Quantum Telemetry &amp; Verdict</h2>
          <span className="results-sub">Deterministic Pauli &amp; χ² Born Rule Statistical Classifier (Zero-ML)</span>
        </div>
        <span className={`status-badge ${badgeClass}`}>
          {isMalicious ? '🚨 THREAT COMPROMISED (ABORT)' : action === 'ALERT' ? '⚠️ WARNING (ELEVATED NOISE)' : '🛡️ SECURE (AUTHENTIC)'}
        </span>
      </div>

      {/* Primary 4-Metric Grid */}
      <div className="metrics-grid">
        {/* Metric 1: QBER vs BB84 Threshold */}
        <div className="metric-card">
          <div className="metric-title">Quantum Bit Error Rate (QBER)</div>
          <div className="metric-value">{(qber * 100).toFixed(2)}%</div>
          <div className="threshold-meter">
            <div
              className={`meter-fill ${qber > 0.11 ? 'meter-red' : qber > 0.05 ? 'meter-yellow' : 'meter-green'}`}
              style={{ width: `${Math.min(qber * 100 * 3, 100)}%` }}
            />
            <div className="meter-marker bb84" title="BB84 Holevo Limit: 11%" style={{ left: '33%' }} />
          </div>
          <div className="metric-sub-row">
            <span className={`metric-subtag ${String(qberClass).toLowerCase()}`}>Status: {qberClass}</span>
            <small>BB84 Limit: ε ≤ 11.0%</small>
          </div>
        </div>

        {/* Metric 2: Pearson's Chi-Squared p-value */}
        <div className="metric-card">
          <div className="metric-title">Pearson's χ² Born Test</div>
          <div className="metric-value">{pVal < 0.0001 ? '< 0.0001' : pVal.toFixed(4)}</div>
          <div className="threshold-meter">
            <div
              className={`meter-fill ${pVal < 0.01 ? 'meter-red' : pVal < 0.05 ? 'meter-yellow' : 'meter-green'}`}
              style={{ width: `${Math.min(pVal * 100, 100)}%` }}
            />
            <div className="meter-marker chi2" title="Anomaly Threshold: p = 0.01" style={{ left: '10%' }} />
          </div>
          <div className="metric-sub-row">
            <span className={`metric-subtag ${String(chi2Class).toLowerCase()}`}>Status: {chi2Class}</span>
            <small>Anomaly Limit: p &lt; 0.01</small>
          </div>
        </div>

        {/* Metric 3: Uhlmann State Fidelity */}
        <div className="metric-card">
          <div className="metric-title">Uhlmann State Fidelity (F)</div>
          <div className="metric-value">{(fidelity * 100).toFixed(1)}%</div>
          <div className="threshold-meter">
            <div
              className={`meter-fill ${fidelity < 0.70 ? 'meter-red' : fidelity < 0.90 ? 'meter-yellow' : 'meter-green'}`}
              style={{ width: `${Math.min(fidelity * 100, 100)}%` }}
            />
          </div>
          <div className="metric-sub-row">
            <span className={`metric-subtag ${String(fidelityClass).toLowerCase()}`}>Status: {fidelityClass}</span>
            <small>Critical Threshold: &lt; 70%</small>
          </div>
        </div>

        {/* Metric 4: Deterministic Confidence Score */}
        <div className="metric-card">
          <div className="metric-title">Threat Confidence (C)</div>
          <div className="metric-value">{(confidence * 100).toFixed(1)}%</div>
          <div className="threshold-meter">
            <div
              className={`meter-fill ${confidence > 0.50 ? 'meter-red' : confidence > 0.30 ? 'meter-yellow' : 'meter-green'}`}
              style={{ width: `${Math.min(confidence * 100, 100)}%` }}
            />
          </div>
          <div className="metric-sub-row">
            <span className="confidence-formula">0.45·σ(QBER) + 0.30·σ(χ²) + 0.25·σ(F)</span>
            <small>Detection: &gt; 50%</small>
          </div>
        </div>
      </div>

      {/* Mathematical Verdict Breakdown */}
      <div className="verdict-explanation-box">
        <h4>🔬 Deterministic Decision &amp; Physics Evidence:</h4>
        <div className="verdict-content">
          <div className="verdict-item">
            <span>Observed QBER:</span>
            <strong>{(qber * 100).toFixed(2)}% {qber > 0.11 ? '⚠️ EXCEEDS BB84 SECURITY THRESHOLD (ε = 0.11)' : '✅ WITHIN SECURE LIMITS'}</strong>
          </div>
          <div className="verdict-item">
            <span>Born χ² Null Hypothesis:</span>
            <strong>{pVal.toFixed(4)} {pVal < 0.01 ? '🚨 REJECTED (Measurements deviate from quantum expectation)' : '✅ ACCEPTED (Consistent with pure Bell states)'}</strong>
          </div>
          <div className="verdict-item">
            <span>Recommended Security Action:</span>
            <strong className={`action-text ${String(action).toLowerCase()}`}>
              {action} {action === 'ABORT' ? '— Immediate Quantum Channel Teardown (Eavesdropping Detected)' : action === 'ALERT' ? '— Increase Error Correction Overhead' : '— Accept Signature & Commit to Immutable Ledger'}
            </strong>
          </div>
        </div>
      </div>

      {/* 2-Bit EPR Measurement Distribution */}
      {Object.keys(counts).length > 0 && (
        <div className="counts-breakdown">
          <div className="hist-header">
            <h4>Observed Bell Measurement Frequency (|00⟩, |01⟩, |10⟩, |11⟩):</h4>
            <span className="hist-note">Theoretical Pure Bell Pair Expectation: 50% |00⟩, 50% |11⟩</span>
          </div>

          <div className="histogram-bars">
            {['00', '01', '10', '11'].map((basis) => {
              const count = counts[basis] || 0;
              const totalCounts = Object.values(counts).reduce((a, b) => a + b, 0);
              const maxCount = Math.max(...Object.values(counts), 1);
              const heightPct = Math.min((count / maxCount) * 100, 100);
              const isCorrelated = basis === '00' || basis === '11';

              return (
                <div key={basis} className="hist-item">
                  <span className="hist-label">|{basis}⟩</span>
                  <div className="hist-bar-wrapper">
                    <div
                      className={`hist-bar ${isCorrelated ? 'bar-correlated' : 'bar-error'}`}
                      style={{ height: `${heightPct}px` }}
                    />
                  </div>
                  <span className="hist-count">{count.toLocaleString()}</span>
                  <small className="hist-pct">
                    {totalCounts > 0 ? `${((count / totalCounts) * 100).toFixed(1)}%` : '0%'}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
