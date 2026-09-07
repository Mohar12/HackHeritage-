/**
 * LargeScaleSimulationPanel.jsx
 * =============================
 * Purpose: Large-Scale Workload Configuration & Batch Telemetry Panel.
 * Supports user-defined sample counts (N = 10 to 100,000+), explicit batching
 * distinction (logical protocol samples vs physical 28-qubit circuits), progress
 * meters, throughput telemetry (samples/sec), and execution timing.
 */

import React, { useState, useEffect } from 'react';
import { runUnifiedSimulation } from '../api/client.js';

const SAMPLE_PRESETS = [
  { label: '10 Samples (1 Batch)', value: 10 },
  { label: '100 Samples (8 Batches)', value: 100 },
  { label: '500 Samples (36 Batches)', value: 500 },
  { label: '1,000 Samples (72 Batches)', value: 1000 },
  { label: '5,000 Samples (358 Batches - Max)', value: 5000 },
];

export default function LargeScaleSimulationPanel({ onResult, onParamsChange }) {
  const [numSamples, setNumSamples] = useState(100);
  const [attackType, setAttackType] = useState('none');
  const [noiseRate, setNoiseRate] = useState(0.02);
  const [seed, setSeed] = useState(42);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [telemetry, setTelemetry] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const maxPairsPerBatch = 14;
  const calculatedBatches = Math.ceil(numSamples / maxPairsPerBatch);

  useEffect(() => {
    onParamsChange?.({
      numSamples,
      attackType,
      noiseRate,
      status,
      calculatedBatches,
    });
  }, [numSamples, attackType, noiseRate, status, calculatedBatches, onParamsChange]);

  async function handleExecuteLargeScale() {
    setStatus('running');
    setErrorMsg('');
    setProgress(10);

    const startTime = performance.now();

    try {
      setProgress(40);
      const safeSamples = Math.min(5000, Math.max(1, Number(numSamples)));
      const payload = {
        num_qubits: safeSamples,
        batch_size: maxPairsPerBatch,
        attack_type: attackType,
        shots: 1024,
        seed: Number(seed),
      };
      if (attackType === 'depolarizing') {
        payload.noise_rate = Number(noiseRate) >= 0 && noiseRate !== '' ? Number(noiseRate) : 0.02;
      }
      const res = await runUnifiedSimulation(payload);

      setProgress(100);
      const totalTimeMs = Math.round(performance.now() - startTime);

      const simTelemetry = {
        requestedSamples: numSamples,
        batchesExecuted: res.batches_executed || calculatedBatches,
        physicalQubitsPerCircuit: res.physical_qubits_per_circuit || 28,
        totalExecutionTimeMs: res.execution_time_ms || totalTimeMs,
        throughputSamplesPerSec: res.samples_per_sec || Math.round(numSamples / (totalTimeMs / 1000)),
      };

      setTelemetry(simTelemetry);
      setStatus('done');

      onResult({
        type: 'large_scale_simulation',
        sim: res,
        detect: {
          is_malicious: res.is_malicious,
          qber: res.statistics.qber,
          chi2_p_value: res.statistics.chi2_p_value,
          fidelity: res.fidelity,
          confidence_score: res.confidence_score,
          recommended_action: res.classification.recommended_action,
          qber_classification: res.classification.qber_classification,
          chi2_classification: res.classification.chi2_classification,
          fidelity_classification: res.classification.fidelity_classification,
          statistics_summary: {
            chi2_result: {
              observed_counts: res.statistics.measurement_counts,
            },
          },
        },
        telemetry: simTelemetry,
      });
    } catch (err) {
      console.error('Large-scale simulation failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Simulation execution failed');
    }
  }

  return (
    <section className="panel large-scale-panel">
      <div className="panel-badge">GENERIC INCREMENTAL BATCHING ENGINE</div>
      <h2>Scalable QDS Simulation Workload</h2>
      <p className="panel-desc">
        Execute arbitrarily large key/sample workloads partitioned dynamically across 28-qubit Aer circuits.
      </p>

      <div className="form-group">
        <label>Logical Protocol Samples (N):</label>
        <div className="preset-buttons">
          {SAMPLE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`btn-preset ${numSamples === p.value ? 'active' : ''}`}
              onClick={() => setNumSamples(p.value)}
              disabled={status === 'running'}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          max="5000"
          value={numSamples}
          onChange={(e) => setNumSamples(Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)))}
          disabled={status === 'running'}
        />
        <small className="calc-note">
          Partitioning into <strong>{calculatedBatches} independent batches</strong> (max 14 EPR pairs / 28 physical qubits per circuit). Enforces safe upper bound (max 5,000 samples).
        </small>
      </div>

      <div className="form-row">
        <div className="form-group half">
          <label>Adversarial Channel Mode:</label>
          <select
            value={attackType}
            onChange={(e) => setAttackType(e.target.value)}
            disabled={status === 'running'}
          >
            <option value="none">Baseline (Honest Channel)</option>
            <option value="intercept_resend">Intercept-Resend Attack</option>
            <option value="depolarizing">Depolarizing Channel Decoherence</option>
            <option value="forgery">Signature Forgery Attempt</option>
            <option value="impersonation">Alice Impersonation</option>
            <option value="replay">Signature Replay Attack</option>
          </select>
        </div>

        <div className="form-group half">
          <label>
            Thermal Noise Rate (p):{' '}
            <span style={{ fontSize: '0.8em', color: attackType === 'depolarizing' ? '#38bdf8' : '#94a3b8' }}>
              {attackType === 'depolarizing' ? '● Active' : '(Auto-activates Depolarizing mode)'}
            </span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.0"
            max="1.0"
            value={noiseRate}
            onChange={(e) => {
              const val = e.target.value;
              setNoiseRate(val === '' ? '' : parseFloat(val));
              if (attackType !== 'depolarizing') {
                setAttackType('depolarizing');
              }
            }}
            disabled={status === 'running'}
            placeholder="0.02"
          />
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handleExecuteLargeScale}
        disabled={status === 'running'}
      >
        {status === 'running' ? `Simulating ${calculatedBatches} Batches...` : `🚀 Launch ${numSamples.toLocaleString()} Sample Simulation`}
      </button>

      {status === 'running' && (
        <div className="progress-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {telemetry && (
        <div className="telemetry-box">
          <div className="tel-item">
            <span className="tel-label">Logical Samples</span>
            <span className="tel-val">{telemetry.requestedSamples.toLocaleString()}</span>
          </div>
          <div className="tel-item">
            <span className="tel-label">Batches Processed</span>
            <span className="tel-val">{telemetry.batchesExecuted}</span>
          </div>
          <div className="tel-item">
            <span className="tel-label">Physical Qubits/Circuit</span>
            <span className="tel-val">{telemetry.physicalQubitsPerCircuit} Qubits</span>
          </div>
          <div className="tel-item">
            <span className="tel-label">Execution Time</span>
            <span className="tel-val">{telemetry.totalExecutionTimeMs} ms</span>
          </div>
          <div className="tel-item">
            <span className="tel-label">Throughput</span>
            <span className="tel-val">{telemetry.throughputSamplesPerSec.toLocaleString()} samples/sec</span>
          </div>
        </div>
      )}
    </section>
  );
}
