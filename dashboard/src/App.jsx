/**
 * App.jsx
 * =======
 * Production Quantum Security Operations Center (SOC) Root Application.
 * Integrates:
 *  - Global SOC Header & Operational Telemetry Indicators
 *  - 3-Phase Workload Navigation (Honest Protocol, Quantum Attack Lab, Scalable Workload)
 *  - Dual 3D Visualizer Modules (3D Teleportation Flow & 3D Bloch Sphere / Network Mesh)
 *  - Deterministic Zero-ML Threat Verdict Desk & Continuous Pauli/χ² Gauges
 *  - Immutable SHA-256 Hash-Chained Post-Quantum Audit Ledger
 *  - Full Component-Level & Global Error Boundaries
 */

import React, { useState } from 'react';
import ProtocolRunPanel from './components/ProtocolRunPanel.jsx';
import AttackSelectionPanel from './components/AttackSelectionPanel.jsx';
import LargeScaleSimulationPanel from './components/LargeScaleSimulationPanel.jsx';
import ResultsCharts from './components/ResultsCharts.jsx';
import BlochSphere3D from './components/BlochSphere3D.jsx';
import Teleportation3D from './components/Teleportation3D.jsx';
import NetworkTopology3D from './components/NetworkTopology3D.jsx';
import AuditLedgerPanel from './components/AuditLedgerPanel.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

export default function App() {
  const [activeData, setActiveData] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'attack' | 'large_scale'
  const [activeStage, setActiveStage] = useState(1);

  const isAttacked = Boolean(activeData?.detect?.is_malicious || activeData?.type === 'attack');
  const fidelity = typeof activeData?.detect?.fidelity === 'number' ? activeData.detect.fidelity : 0.99;

  return (
    <ErrorBoundary title="Quantum SOC Global Error">
      <div className="soc-container">
        {/* Top SOC Navigation Bar */}
        <header className="soc-header">
          <div className="header-left">
            <div className="soc-brand">
              <span className="soc-logo-glow">⚛️</span>
              <div>
                <h1>HYPER-QDS QUANTUM SECURITY OPERATIONS CENTER</h1>
                <p className="soc-tagline">
                  Deterministic Physics-Based Teleportation Signatures · Zero-ML Pauli &amp; Pearson $\chi^2$ Threat Detection
                </p>
              </div>
            </div>
          </div>

          <div className="header-right">
            <div className="status-indicator">
              <span className="pulse-dot active" />
              <span>QISKIT AER OPERATIONAL (28-QUBIT CIRCUIT CAP)</span>
            </div>
          </div>
        </header>

        {/* Tabbed Pipeline Switcher */}
        <nav className="soc-nav">
          <button
            className={`nav-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            1. Honest QDS Protocol Pipeline
          </button>
          <button
            className={`nav-tab ${activeTab === 'attack' ? 'active' : ''}`}
            onClick={() => setActiveTab('attack')}
          >
            2. Adversarial Attack Laboratory
          </button>
          <button
            className={`nav-tab ${activeTab === 'large_scale' ? 'active' : ''}`}
            onClick={() => setActiveTab('large_scale')}
          >
            3. Scalable Workload Engine ($N=1\dots 100,000$)
          </button>
        </nav>

        {/* Primary 2-Column Responsive SOC Grid */}
        <main className="soc-main">
          {/* Left Column: Interactive Parameters & Control Desks */}
          <div className="soc-left-column">
            <ErrorBoundary title="Interactive Controls Unavailable">
              {activeTab === 'pipeline' && (
                <ProtocolRunPanel
                  onResult={setActiveData}
                  onStageUpdate={setActiveStage}
                />
              )}
              {activeTab === 'attack' && (
                <AttackSelectionPanel
                  onResult={setActiveData}
                  onStageUpdate={setActiveStage}
                />
              )}
              {activeTab === 'large_scale' && (
                <LargeScaleSimulationPanel
                  onResult={setActiveData}
                />
              )}
            </ErrorBoundary>

            {/* Scientific 3D Visualizer Row */}
            <div className="visualizations-row">
              <ErrorBoundary title="3D Bloch Sphere Unavailable">
                <BlochSphere3D fidelity={fidelity} isAttacked={isAttacked} />
              </ErrorBoundary>
              <ErrorBoundary title="Network Topology Unavailable">
                <NetworkTopology3D isAttacked={isAttacked} />
              </ErrorBoundary>
            </div>
          </div>

          {/* Right Column: 3D Teleportation Flow, Live Gauges, Verdicts */}
          <div className="soc-right-column">
            <ErrorBoundary title="3D Teleportation Flow Unavailable">
              <Teleportation3D
                activeStage={isAttacked ? 7 : activeStage}
                isCompromised={isAttacked}
              />
            </ErrorBoundary>

            <ErrorBoundary title="Telemetry & Verdict Desk Unavailable">
              <ResultsCharts data={activeData} />
            </ErrorBoundary>
          </div>
        </main>

        {/* Bottom Section: Immutable Cryptographic Audit Ledger */}
        <footer className="soc-bottom-section">
          <ErrorBoundary title="Audit Ledger Unavailable">
            <AuditLedgerPanel />
          </ErrorBoundary>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
