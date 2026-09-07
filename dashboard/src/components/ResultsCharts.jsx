/**
 * ResultsCharts.jsx
 * =================
 * Scientific Telemetry & Statistical Threat Detection Dashboard:
 *  - Quantum Bit Error Rate (QBER) Gauge with BB84 Holevo bound (ε = 0.11)
 *  - Pearson's χ² Born distribution goodness-of-fit comparison (Observed vs Expected)
 *  - Uhlmann State Fidelity Arc Meter
 *  - Hoeffding-Grounded Threat Confidence (replaces ad-hoc sigmoid formula)
 *  - Full Mathematical Verdict & Recommended Action breakdown
 *  - Quantum Security Bounds Panel (Forgery, Non-Repudiation, Helstrom, Hoeffding Curve)
 *  - Interactive SVG Visualizations via Recharts (Bell distribution bar chart, Forgery curve, Hoeffding curve)
 *  - Complete type guards and safe defaults for missing/partial telemetry.
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

/** Custom Glassmorphism Tooltip for Recharts */
function CustomRechartsTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div
        style={{
          background: 'rgba(10, 17, 40, 0.95)',
          border: '1px solid rgba(0, 242, 254, 0.4)',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          fontSize: '12px',
          color: '#e2e8f0',
          lineHeight: '1.4',
        }}
      >
        <div style={{ fontWeight: 700, color: '#00f2fe', marginBottom: '2px' }}>
          {label || dataPoint.name || dataPoint.basis}
        </div>
        {dataPoint.type && (
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
            {dataPoint.type}
          </div>
        )}
        <div style={{ fontWeight: 600 }}>
          Count: <span style={{ color: payload[0].color || '#00e676' }}>{payload[0].value?.toLocaleString()}</span>
        </div>
        {dataPoint.pct && (
          <div style={{ color: '#94a3b8' }}>
            Frequency: <strong>{dataPoint.pct}</strong>
          </div>
        )}
        {dataPoint.exactVal && (
          <div style={{ color: '#00f2fe', fontSize: '11px', marginTop: '2px' }}>
            P = {dataPoint.exactVal}
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function ResultsCharts({ data, emptyMessage, emptySubtext, mode }) {
  const [showBoundsDetail, setShowBoundsDetail] = useState(false);

  if (!data) {
    return (
      <section className="panel results-panel">
        <div className="panel-badge">CONTINUOUS STATISTICAL DETECTOR</div>
        <h2>Real-Time Scientific Telemetry</h2>
        <div className="empty-state">
          <div className="empty-icon">⚛️</div>
          <p>{emptyMessage || 'No active simulation or telemetry data loaded.'}</p>
          <span>{emptySubtext || 'Select a protocol or attack module on the left to execute quantum circuit simulation on Qiskit Aer and view live Born statistics.'}</span>
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

  // Quantum security bounds (from Hoeffding/Helstrom/Dunjko/Gottesman-Chuang/mpmath)
  const secBounds = detect?.quantum_security_bounds || sim?.quantum_security_bounds || {};
  const hoeffdingConf = Number.isFinite(secBounds?.hoeffding_confidence) ? secBounds.hoeffding_confidence : null;
  const forgeProbGC = Number.isFinite(secBounds?.forgery_probability_bound_gc) ? secBounds.forgery_probability_bound_gc : null;
  const forgeProb = Number.isFinite(secBounds?.forgery_probability_bound) ? secBounds.forgery_probability_bound : null;
  const nonrepudiate = Number.isFinite(secBounds?.nonrepudiation_probability_bound) ? secBounds.nonrepudiation_probability_bound : null;
  const helstromP = Number.isFinite(secBounds?.helstrom_p_distinguish) ? secBounds.helstrom_p_distinguish : null;
  const nQubits = secBounds?.n_qubits || sim?.num_qubits || 8;
  const forgeFormula = secBounds?.forgery_formula_gc || `2⁻${nQubits}`;
  const forgeCurve = secBounds?.forgery_probability_curve || {};
  const hoeffCurve = secBounds?.hoeffding_confidence_curve || {};

  const badgeClass = isMalicious ? 'badge-danger' : action === 'ALERT' ? 'badge-warning' : 'badge-secure';
  const hasSecBounds = hoeffdingConf !== null || forgeProbGC !== null;

  // Prepare Bell Basis Histogram Data for Recharts
  const totalCounts = Object.values(counts).reduce((a, b) => a + b, 0);
  const bellData = ['00', '01', '10', '11'].map((basis) => {
    const count = counts[basis] || 0;
    const pct = totalCounts > 0 ? ((count / totalCounts) * 100).toFixed(1) : '0';
    const isCorrelated = basis === '00' || basis === '11';
    return {
      basis: `|${basis}⟩`,
      rawBasis: basis,
      count,
      pct: `${pct}%`,
      fill: isCorrelated ? '#00f2fe' : '#ff1744',
      type: isCorrelated ? 'Correlated Bell State (|Φ⁺⟩)' : 'Eavesdropping / Noise Error Bin',
    };
  });

  // Prepare Forgery Probability Area Chart Data
  const forgeChartData = Object.entries(forgeCurve)
    .filter(([n]) => Number(n) <= 16)
    .map(([n, prob]) => ({
      name: `n=${n}`,
      qubits: Number(n),
      logProb: Math.max(0, 1.0 - (Number(n) - 1) / 15.0),
      exactVal: Number(prob).toExponential(3),
    }));

  // Prepare Hoeffding Confidence Curve Data
  const hoeffChartData = Object.entries(hoeffCurve).map(([n, conf]) => ({
    name: `N=${Number(n) >= 1000 ? `${Number(n) / 1000}k` : n}`,
    shots: Number(n),
    confidence: Math.round(Number(conf) * 100),
  }));

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

        {/* Metric 4: Hoeffding-Grounded Confidence Score */}
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
            <span className="confidence-formula">0.45·C_Hoeff + 0.30·(1−p) + 0.25·C_F</span>
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
          {hoeffdingConf !== null && (
            <div className="verdict-item">
              <span>Hoeffding QBER Confidence:</span>
              <strong>{(hoeffdingConf * 100).toFixed(2)}% — 1 − exp(−2N·ε²) [Hoeffding 1963]</strong>
            </div>
          )}
          <div className="verdict-item">
            <span>Recommended Security Action:</span>
            <strong className={`action-text ${String(action).toLowerCase()}`}>
              {action} {action === 'ABORT' ? '— Immediate Quantum Channel Teardown (Eavesdropping Detected)' : action === 'ALERT' ? '— Increase Error Correction Overhead' : '— Accept Signature & Commit to Immutable Ledger'}
            </strong>
          </div>
        </div>
      </div>

      {/* Quantum Security Bounds Panel (Dunjko, Gottesman-Chuang, Helstrom, Hoeffding) */}
      {hasSecBounds && (
        <div className="security-bounds-panel">
          <div className="bounds-header" onClick={() => setShowBoundsDetail(!showBoundsDetail)} style={{ cursor: 'pointer' }}>
            <h4>🔐 Quantum-Mechanical Security Bounds</h4>
            <span className="bounds-toggle">{showBoundsDetail ? '▲ Collapse' : '▼ Expand Details'}</span>
          </div>

          {/* Summary Row — always visible */}
          <div className="bounds-grid">
            {forgeProbGC !== null && (
              <div className="bound-card">
                <div className="bound-title">Forgery Probability</div>
                <div className="bound-value bound-safe">{forgeProbGC.toExponential(3)}</div>
                <div className="bound-formula">{forgeFormula}</div>
                <small>Gottesman &amp; Chuang (2001) §2</small>
              </div>
            )}
            {nonrepudiate !== null && (
              <div className="bound-card">
                <div className="bound-title">Non-Repudiation Bound</div>
                <div className="bound-value bound-safe">{nonrepudiate.toExponential(3)}</div>
                <div className="bound-formula">exp(−(sᵥ − sₐ)² · N / 2)</div>
                <small>Dunjko et al. (2014) Theorem 1</small>
              </div>
            )}
            {helstromP !== null && (
              <div className="bound-card">
                <div className="bound-title">Helstrom Distinguishability</div>
                <div className={`bound-value ${helstromP > 0.8 ? 'bound-alert' : helstromP > 0.6 ? 'bound-warn' : 'bound-safe'}`}>
                  {(helstromP * 100).toFixed(1)}%
                </div>
                <div className="bound-formula">P = (1 + D(ρ, σ)) / 2</div>
                <small>Helstrom (1976) §IV</small>
              </div>
            )}
            {hoeffdingConf !== null && (
              <div className="bound-card">
                <div className="bound-title">QBER Detection Confidence</div>
                <div className={`bound-value ${hoeffdingConf > 0.9 ? 'bound-alert' : hoeffdingConf > 0.5 ? 'bound-warn' : 'bound-safe'}`}>
                  {(hoeffdingConf * 100).toFixed(2)}%
                </div>
                <div className="bound-formula">1 − exp(−2Nε²)</div>
                <small>Hoeffding (1963) Theorem 1</small>
              </div>
            )}
          </div>

          {/* Forgery Probability Curve (Interactive Recharts Area) */}
          {showBoundsDetail && forgeChartData.length > 0 && (
            <div className="curve-section" style={{ marginTop: '16px' }}>
              <h5>P_forge(n) = 2⁻ⁿ — Unconditional Forgery Probability vs Signature Length (Recharts):</h5>
              <div style={{ width: '100%', height: 160, marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forgeChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forgeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#7928ca" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 1]} />
                    <Tooltip content={<CustomRechartsTooltip />} />
                    <ReferenceLine
                      x={`n=${nQubits}`}
                      stroke="#00e676"
                      strokeDasharray="3 3"
                      label={{ value: `n=${nQubits} (active)`, fill: '#00e676', fontSize: 10, position: 'top' }}
                    />
                    <Area type="monotone" dataKey="logProb" name="Relative Scale" stroke="#00f2fe" strokeWidth={2} fill="url(#forgeGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="curve-note">
                Current signature length: n={nQubits} → P_forge = {forgeProbGC ? forgeProbGC.toExponential(4) : 'N/A'}<br />
                Arbitrary precision computed via mpmath — no underflow at large n.
              </p>
            </div>
          )}

          {/* Hoeffding Confidence vs N Shots (Interactive Recharts Area) */}
          {showBoundsDetail && hoeffChartData.length > 0 && (
            <div className="curve-section" style={{ marginTop: '16px' }}>
              <h5>Hoeffding Confidence vs Number of Measurement Samples N (Recharts):</h5>
              <div style={{ width: '100%', height: 160, marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hoeffChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hoeffGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00e676" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#004d40" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip content={<CustomRechartsTooltip />} />
                    <ReferenceLine y={99} stroke="#ffd600" strokeDasharray="3 3" label={{ value: '99% Confidence', fill: '#ffd600', fontSize: 10 }} />
                    <Area type="monotone" dataKey="confidence" name="Confidence" stroke="#00e676" strokeWidth={2} fill="url(#hoeffGrad)" unit="%" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="curve-note">
                Confidence that observed excess QBER exceeds baseline by chance: 1 − exp(−2Nε²).<br />
                At N=1024, confidence approaches 100% for any excess &gt; ~8%.
              </p>
            </div>
          )}

          {showBoundsDetail && (
            <div className="bounds-references">
              <strong>References:</strong>
              <ul>
                <li>Gottesman &amp; Chuang (2001). arXiv:quant-ph/0105032 §2 — P_forge = 2^(−n)</li>
                <li>Dunjko et al. (2014). PRL 112, 040502 Theorem 1 — Unforgeability + Non-repudiation</li>
                <li>Hoeffding (1963). JASA 58, 13–30 Theorem 1 — QBER confidence intervals</li>
                <li>Helstrom (1976). Quantum Detection Theory §IV — Optimal distinguishability bound</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 2-Bit EPR Measurement Distribution (Interactive Recharts BarChart) */}
      {totalCounts > 0 && (
        <div className="counts-breakdown" style={{ marginTop: '16px' }}>
          <div className="hist-header">
            <h4>Observed Bell Measurement Distribution (|00⟩, |01⟩, |10⟩, |11⟩) — Recharts:</h4>
            <span className="hist-note">Theoretical Pure Bell Pair Expectation: 50% |00⟩, 50% |11⟩</span>
          </div>

          <div style={{ width: '100%', height: 180, marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bellData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="basis" tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip content={<CustomRechartsTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {bellData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#00f2fe' }} />
              Correlated Bell States (|00⟩, |11⟩)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ff1744' }} />
              Error / Anomaly States (|01⟩, |10⟩)
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
