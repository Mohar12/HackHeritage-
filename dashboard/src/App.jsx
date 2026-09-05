/**
 * App.jsx
 * =======
 * Production Quantum Security Operations Center (SOC) Root Application.
 * Integrates:
 *  - Multi-View Architecture:
 *      * Executive 3D Landing Showcase (LandingHero)
 *      * Operations Command Center (Horizontal 4-Module Deck)
 *  - Dedicated 3D Visualizer Modules Distinct Per Tab:
 *      * Module 1 (Honest Protocol): 3D 4-Stage Teleportation Flow & 3D Bloch Sphere
 *      * Module 2 (Attack Lab): Synchronized 3D Targeted Attack Architecture & Wiretap
 *      * Module 3 (Scalable Workload): 3D Multi-Channel Parallel QPU Computing Cluster
 *      * Module 4 (Audit Ledger): Full-Width Post-Quantum Cryptographic Audit Explorer
 *  - Explicit Target Signature Entity Dossier & State-Synchronized Operation Phases
 *  - Liquid Glass Design System & Specular Refraction Styling
 */

import React, { useState } from 'react';
import StitchLandingPage from './components/StitchLandingPage.jsx';
import HonestProtocolPage from './components/HonestProtocolPage.jsx';
import StitchHeader from './components/StitchHeader.jsx';
import ProtocolRunPanel from './components/ProtocolRunPanel.jsx';
import AttackSelectionPanel, { TARGET_SIGNATURE_ENTITIES } from './components/AttackSelectionPanel.jsx';
import LargeScaleSimulationPanel from './components/LargeScaleSimulationPanel.jsx';
import ResultsCharts from './components/ResultsCharts.jsx';
import BlochSphere3D from './components/BlochSphere3D.jsx';
import Teleportation3D from './components/Teleportation3D.jsx';
import NetworkTopology3D from './components/NetworkTopology3D.jsx';
import AttackArchitecture3D from './components/AttackArchitecture3D.jsx';
import ScalableCluster3D from './components/ScalableCluster3D.jsx';
import AuditLedgerPanel from './components/AuditLedgerPanel.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

export default function App() {
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qView = params.get('view');
      if (qView === 'honest' || qView === 'pipeline') return 'honest';
      if (qView === 'attack' || qView === 'large_scale' || qView === 'audit') return 'operations';
      if (window.location.hash === '#honest' || window.location.hash === '#pipeline') return 'honest';
      if (window.location.hash === '#attack') return 'operations';
    }
    return 'landing';
  };

  const [currentView, setCurrentView] = useState(getInitialView); // 'landing' | 'honest' | 'operations'
  const [activeData, setActiveData] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qView = params.get('view');
      if (qView === 'large_scale' || qView === 'audit') return qView;
    }
    return 'attack';
  }); // 'attack' | 'large_scale' | 'audit'
  const [activeStage, setActiveStage] = useState(1);
  const [selectedAttack, setSelectedAttack] = useState('intercept_resend');
  const [selectedEntity, setSelectedEntity] = useState(TARGET_SIGNATURE_ENTITIES[0]);
  const [operationPhase, setOperationPhase] = useState('IDLE');

  const isAttacked = Boolean(activeData?.detect?.is_malicious || activeData?.type === 'attack');
  const fidelity = typeof activeData?.detect?.fidelity === 'number' ? activeData.detect.fidelity : 0.99;

  const handleNavigate = (view) => {
    if (view === 'landing') {
      setCurrentView('landing');
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', window.location.pathname);
      }
    } else if (view === 'honest' || view === 'pipeline') {
      setCurrentView('honest');
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', '?view=honest');
      }
    } else {
      setCurrentView('operations');
      setActiveTab(view);
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', `?view=${view}`);
      }
    }
  };

  // View 1: Canonical Stitch Landing Page
  if (currentView === 'landing') {
    return (
      <ErrorBoundary title="HyperQDS Landing Page Error">
        <StitchLandingPage 
          onEnterSOC={() => handleNavigate('honest')}
          onNavigate={handleNavigate}
        />
      </ErrorBoundary>
    );
  }

  // View 2: Canonical Honest QDS Protocol Page (Inheriting Stitch Design System)
  if (currentView === 'honest') {
    return (
      <ErrorBoundary title="HyperQDS Honest Protocol Error">
        <HonestProtocolPage 
          onNavigate={handleNavigate}
          onResultData={(data) => setActiveData(data)}
        />
      </ErrorBoundary>
    );
  }

  // View 3: Operational Command Center (Modules 2, 3, 4)
  return (
    <ErrorBoundary title="Quantum SOC Global Error">
      <div className="soc-container" style={{ background: '#06070a' }}>
        {/* Canonical Stitch Header */}
        <StitchHeader activeTab={activeTab} onNavigate={handleNavigate} />

            {/* Dedicated Audit Ledger View (De-cluttered Full-Width) */}
            {activeTab === 'audit' ? (
              <main className="soc-audit-deck">
                <ErrorBoundary title="Audit Ledger Unavailable">
                  <AuditLedgerPanel />
                </ErrorBoundary>
              </main>
            ) : (
              /* Primary 2-Column Responsive SOC Operations Grid */
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
                        selectedAttack={selectedAttack}
                        onSelectAttack={setSelectedAttack}
                        selectedEntity={selectedEntity}
                        onSelectEntity={setSelectedEntity}
                        onOperationPhase={setOperationPhase}
                      />
                    )}
                    {activeTab === 'large_scale' && (
                      <LargeScaleSimulationPanel
                        onResult={setActiveData}
                      />
                    )}
                  </ErrorBoundary>

                  {/* Supporting 3D Visualizer Row (Context-Aware) */}
                  <div className="visualizations-row">
                    {activeTab === 'pipeline' && (
                      <>
                        <ErrorBoundary title="3D Bloch Sphere Unavailable">
                          <BlochSphere3D fidelity={fidelity} isAttacked={false} />
                        </ErrorBoundary>
                        <ErrorBoundary title="Network Topology Unavailable">
                          <NetworkTopology3D isAttacked={false} />
                        </ErrorBoundary>
                      </>
                    )}

                    {activeTab === 'attack' && (
                      <>
                        <ErrorBoundary title="3D Bloch Sphere Unavailable">
                          <BlochSphere3D fidelity={fidelity} isAttacked={true} />
                        </ErrorBoundary>
                        <ErrorBoundary title="Network Topology Unavailable">
                          <NetworkTopology3D isAttacked={true} />
                        </ErrorBoundary>
                      </>
                    )}

                    {activeTab === 'large_scale' && (
                      <>
                        <ErrorBoundary title="3D Bloch Sphere Unavailable">
                          <BlochSphere3D fidelity={fidelity} isAttacked={isAttacked} />
                        </ErrorBoundary>
                        <ErrorBoundary title="Network Topology Unavailable">
                          <NetworkTopology3D isAttacked={isAttacked} />
                        </ErrorBoundary>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Column: Tab-Specific Primary 3D Animation & Telemetry Desk */}
                <div className="soc-right-column">
                  {/* TAB 1 ANIMATION: 4-Stage Quantum Teleportation Signature Journey */}
                  {activeTab === 'pipeline' && (
                    <ErrorBoundary title="3D Teleportation Flow Unavailable">
                      <Teleportation3D
                        activeStage={activeStage}
                        isCompromised={isAttacked}
                      />
                    </ErrorBoundary>
                  )}

                  {/* TAB 2 ANIMATION: Targeted Adversarial Architecture & Wiretap Probe */}
                  {activeTab === 'attack' && (
                    <ErrorBoundary title="3D Attack Architecture Unavailable">
                      <AttackArchitecture3D
                        attackType={selectedAttack}
                        isAttacked={isAttacked}
                        targetEntity={selectedEntity}
                        operationPhase={operationPhase}
                        attackData={activeData?.attack}
                        detectData={activeData?.detect}
                      />
                    </ErrorBoundary>
                  )}

                  {/* TAB 3 ANIMATION: High-Throughput Quantum Computing Cluster & Parallel Batch Bus */}
                  {activeTab === 'large_scale' && (
                    <ErrorBoundary title="3D Scalable Cluster Unavailable">
                      <ScalableCluster3D
                        numSamples={activeData?.sim?.num_qubits || 100}
                        batchesExecuted={activeData?.sim?.batches_executed || 8}
                        throughput={activeData?.sim?.samples_per_sec || 450}
                        status={activeData ? 'done' : 'idle'}
                      />
                    </ErrorBoundary>
                  )}

                  {/* Continuous Deterministic Verdict & Telemetry Desk */}
                  <ErrorBoundary title="Telemetry & Verdict Desk Unavailable">
                    <ResultsCharts data={activeData} />
                  </ErrorBoundary>
                </div>
              </main>
            )}
      </div>
    </ErrorBoundary>
  );
}
