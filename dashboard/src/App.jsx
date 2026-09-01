/**
 * App.jsx
 * =======
 * Root Application Component — Quantum Security Operations Center (SOC).
 * Integrates:
 *  - Protocol Execution (Key Distribution -> Signing -> Teleportation -> Verification)
 *  - Adversarial Attack Lab (Intercept-Resend, Depolarizing, Forgery, Impersonation, Replay)
 *  - Large-Scale Scalable Workloads (N = 10 to 100,000+ with 28-qubit Batch Engine)
 *  - 3D Quantum Bloch Sphere & 3D Teleportation Flow
 *  - Real-Time Telemetry, QBER Threshold Gauges, χ² Goodness-of-Fit Meters
 *  - Immutable Post-Quantum Audit Ledger
 */

import React, { useState } from 'react';
import ProtocolRunPanel from './components/ProtocolRunPanel.jsx';
import AttackSelectionPanel from './components/AttackSelectionPanel.jsx';
import LargeScaleSimulationPanel from './components/LargeScaleSimulationPanel.jsx';
import ResultsCharts from './components/ResultsCharts.jsx';
import BlochSphere3D from './components/BlochSphere3D.jsx';
import Teleportation3D from './components/Teleportation3D.jsx';
import AuditLedgerPanel from './components/AuditLedgerPanel.jsx';
import './index.css';

export default function App() {
  const [activeData, setActiveData] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'attack' | 'large_scale'

  const isAttacked = activeData?.detect?.is_malicious || activeData?.type === 'attack';
  const fidelity = activeData?.detect?.fidelity ?? 0.99;

  return (
    <div className="soc-container">
      {/* Quantum SOC Navbar */}
      <header className="soc-header">
        <div className="header-left">
          <div className="soc-brand">
            <span className="soc-logo-glow">⚛️</span>
            <div>
              <h1>HYPER-QDS SECURITY OPERATIONS CENTER</h1>
              <p className="soc-tagline">
                Teleportation-Based Quantum Digital Signatures · Continuous Pauli &amp; χ² Threat Detection Engine
              </p>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="status-indicator">
            <span className="pulse-dot active" />
            <span>QISKIT AER SIMULATOR OPERATIONAL (28-QUBIT WIDTH LIMIT)</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="soc-nav">
        <button
          className={`nav-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          1. QDS Protocol Pipeline
        </button>
        <button
          className={`nav-tab ${activeTab === 'attack' ? 'active' : ''}`}
          onClick={() => setActiveTab('attack')}
        >
          2. Quantum Attack Laboratory
        </button>
        <button
          className={`nav-tab ${activeTab === 'large_scale' ? 'active' : ''}`}
          onClick={() => setActiveTab('large_scale')}
        >
          3. Scalable Workload Simulation (N=1..100k)
        </button>
      </nav>

      {/* Main Grid Layout */}
      <main className="soc-main">
        {/* Left Column: Interactive Controls based on Active Tab */}
        <div className="soc-left-column">
          {activeTab === 'pipeline' && <ProtocolRunPanel onResult={setActiveData} />}
          {activeTab === 'attack' && <AttackSelectionPanel onResult={setActiveData} />}
          {activeTab === 'large_scale' && <LargeScaleSimulationPanel onResult={setActiveData} />}

          {/* 3D Scientific Visualizations */}
          <div className="visualizations-row">
            <BlochSphere3D fidelity={fidelity} isAttacked={isAttacked} />
          </div>
        </div>

        {/* Right Column: Telemetry, 3D Teleportation, Charts */}
        <div className="soc-right-column">
          <Teleportation3D
            activeStage={isAttacked ? 7 : 8}
            isCompromised={isAttacked}
          />

          <ResultsCharts data={activeData} />
        </div>
      </main>

      {/* Full Width Bottom Section: Cryptographic Audit Ledger */}
      <footer className="soc-bottom-section">
        <AuditLedgerPanel />
      </footer>
    </div>
  );
}
