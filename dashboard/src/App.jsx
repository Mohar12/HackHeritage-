/**
 * App.jsx
 * =======
 * Root Application Component — Quantum Security Operations Center (SOC).
 * Protected with individual component-level and global React Error Boundaries.
 */

import React, { useState } from 'react';
import ProtocolRunPanel from './components/ProtocolRunPanel.jsx';
import AttackSelectionPanel from './components/AttackSelectionPanel.jsx';
import LargeScaleSimulationPanel from './components/LargeScaleSimulationPanel.jsx';
import ResultsCharts from './components/ResultsCharts.jsx';
import BlochSphere3D from './components/BlochSphere3D.jsx';
import Teleportation3D from './components/Teleportation3D.jsx';
import AuditLedgerPanel from './components/AuditLedgerPanel.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

export default function App() {
  const [activeData, setActiveData] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'attack' | 'large_scale'

  const isAttacked = Boolean(activeData?.detect?.is_malicious || activeData?.type === 'attack');
  const fidelity = typeof activeData?.detect?.fidelity === 'number' ? activeData.detect.fidelity : 0.99;

  return (
    <ErrorBoundary title="Quantum SOC Global Error">
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
            <ErrorBoundary title="Protocol Controls Unavailable">
              {activeTab === 'pipeline' && <ProtocolRunPanel onResult={setActiveData} />}
              {activeTab === 'attack' && <AttackSelectionPanel onResult={setActiveData} />}
              {activeTab === 'large_scale' && <LargeScaleSimulationPanel onResult={setActiveData} />}
            </ErrorBoundary>

            {/* 3D Scientific Visualizations */}
            <div className="visualizations-row">
              <ErrorBoundary title="3D Bloch Sphere Unavailable">
                <BlochSphere3D fidelity={fidelity} isAttacked={isAttacked} />
              </ErrorBoundary>
            </div>
          </div>

          {/* Right Column: Telemetry, 3D Teleportation, Charts */}
          <div className="soc-right-column">
            <ErrorBoundary title="3D Teleportation Flow Unavailable">
              <Teleportation3D
                activeStage={isAttacked ? 7 : 8}
                isCompromised={isAttacked}
              />
            </ErrorBoundary>

            <ErrorBoundary title="Telemetry & Charts Unavailable">
              <ResultsCharts data={activeData} />
            </ErrorBoundary>
          </div>
        </main>

        {/* Full Width Bottom Section: Cryptographic Audit Ledger */}
        <footer className="soc-bottom-section">
          <ErrorBoundary title="Audit Ledger Unavailable">
            <AuditLedgerPanel />
          </ErrorBoundary>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
