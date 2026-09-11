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

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import QuantumEntanglementCanvas from './components/QuantumEntanglementCanvas.jsx';
import StitchLandingPage from './components/StitchLandingPage.jsx';
import SignInPage from './components/SignInPage.jsx';
import HonestProtocolPage from './components/HonestProtocolPage.jsx';
import StitchHeader from './components/StitchHeader.jsx';
import ProtocolRunPanel from './components/ProtocolRunPanel.jsx';
import AttackSelectionPanel, { TARGET_SIGNATURE_ENTITIES } from './components/AttackSelectionPanel.jsx';
import AttackLab from './pages/AttackLab.jsx';
import LargeScaleSimulationPanel from './components/LargeScaleSimulationPanel.jsx';
import ResultsCharts from './components/ResultsCharts.jsx';
import BlochSphere3D from './components/BlochSphere3D.jsx';
import Teleportation3D from './components/Teleportation3D.jsx';
import NetworkTopology3D from './components/NetworkTopology3D.jsx';
import AttackArchitecture3D from './components/AttackArchitecture3D.jsx';
import ScalableCluster3D from './components/ScalableCluster3D.jsx';
import ScalableEnginePage from './components/ScalableEnginePage.jsx';
import AuditLedgerPanel from './components/AuditLedgerPanel.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

// Per-tab & per-attack vector color pattern synchronization for QuantumEntanglementCanvas
const ATTACK_TO_PILLAR = {
  intercept_resend: '03',
  depolarizing: '01',
  forgery: '02',
  impersonation: '02',
  replay: '01',
};

const ATTACK_TO_DIMENSION = {
  intercept_resend: 4,
  depolarizing: 0,
  forgery: 2,
  impersonation: 3,
  replay: 1,
};

function AppContent() {
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qView = params.get('view');
      if (qView === 'overview' || qView === 'landing' || window.location.hash === '#overview' || window.location.hash === '#landing') return 'landing';
      if (qView === 'sign-in' || qView === 'signin' || qView === 'login') return 'sign-in';
      if (window.location.pathname === '/sign-in' || window.location.pathname === '/login') return 'sign-in';
      if (window.location.hash === '#sign-in' || window.location.hash === '#signin' || window.location.hash === '#login') return 'sign-in';
      if (qView === 'honest' || qView === 'pipeline' || window.location.hash === '#honest' || window.location.hash === '#pipeline') return 'honest';
      if (qView === 'large_scale' || qView === 'scalable' || window.location.hash === '#large_scale' || window.location.hash === '#scalable') return 'large_scale';
      if (qView === 'attack' || window.location.hash === '#attack') return 'operations';
      if (qView === 'audit') return 'operations';
    }
    return 'operations';
  };

  const [currentView, setCurrentView] = useState(getInitialView); // 'landing' | 'sign-in' | 'honest' | 'large_scale' | 'operations'
  const [currentUser, setCurrentUser] = useState(null);
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
  const handleSelectAttack = useCallback((attackType) => {
    setSelectedAttack(attackType);
    setOperationPhase('IDLE');
  }, []);

  const [selectedEntity, setSelectedEntity] = useState(TARGET_SIGNATURE_ENTITIES[0]);
  const [operationPhase, setOperationPhase] = useState('IDLE');
  const [largeScaleParams, setLargeScaleParams] = useState({
    numSamples: 100,
    attackType: 'none',
    noiseRate: 0.02,
    status: 'idle',
  });

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAttacked = Boolean(activeData?.detect?.is_malicious || activeData?.type === 'attack');
  const fidelity = typeof activeData?.detect?.fidelity === 'number' ? activeData.detect.fidelity : 0.99;

  // Blob threat-alert intensity: ramps up progressively through the attack's
  // own phase sequence (so the blob visibly reacts to Eve intercepting the
  // channel in real time, not just at the very end), rather than jumping
  // from 0 to 1 only once the final detection result lands. This avoids the
  // abrupt on/off flicker that happens when activeData is briefly stale or
  // reset between attack launches.
  const attackPhaseIntensity = {
    IDLE: 0,
    DISPATCH: 0.08,
    IN_TRANSIT: 0.18,
    INTERCEPT: 0.55,
    COLLAPSE: 0.85,
    DEFENSE_ABORT: 1.0,
  };

  const blobThreatAlert =
    activeTab === 'attack'
      ? Math.max(
          attackPhaseIntensity[operationPhase] || 0,
          activeData?.detect?.is_malicious ? 0.9 : 0
        )
      : 0;

  // Which attack type's color the blob should blend toward. Falls back to
  // the currently selected attack type even before a result lands, so the
  // color is correct throughout the whole phase sequence, not just at the end.
  const blobThreatAttackType = activeTab === 'attack' ? selectedAttack : null;

  const handleNavigate = useCallback((view) => {
    if (view === 'landing') {
      setCurrentView('landing');
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', '/');
      }
    } else if (view === 'sign-in' || view === 'signin' || view === 'login') {
      setCurrentView('sign-in');
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', '/sign-in');
      }
    } else if (view === 'honest' || view === 'pipeline') {
      setCurrentView('honest');
      setActiveData(null);
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', '?view=honest');
      }
    } else if (view === 'large_scale' || view === 'scalable') {
      setCurrentView('large_scale');
      setActiveTab('large_scale');
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', '?view=large_scale');
      }
    } else {
      setCurrentView('operations');
      setActiveTab(view);
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', `?view=${view}`);
      }
    }
  }, []);

  const handleEnterSOC = useCallback(() => {
    handleNavigate('honest');
  }, [handleNavigate]);

  // View 0: Secure Authentication Page (Stage 13)
  if (currentView === 'sign-in') {
    return (
      <ErrorBoundary title="HyperQDS Authentication Error">
        <SignInPage 
          onNavigate={handleNavigate}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            handleNavigate('honest');
          }}
        />
      </ErrorBoundary>
    );
  }

  // View 1: Canonical Stitch Landing Page
  if (currentView === 'landing') {
    return (
      <ErrorBoundary title="HyperQDS Landing Page Error">
        <StitchLandingPage 
          onEnterSOC={handleEnterSOC}
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
          onResultData={setActiveData}
        />
      </ErrorBoundary>
    );
  }

  // View 2.5: Canonical Scalable Engine Page (Dedicated High-Density Quantum Console)
  if (currentView === 'large_scale') {
    return (
      <ErrorBoundary title="HyperQDS Scalable Engine Error">
        <ScalableEnginePage 
          onNavigate={handleNavigate}
          onResultData={setActiveData}
          activeData={activeData}
        />
      </ErrorBoundary>
    );
  }

  // View 3: Operational Command Center (Modules 2, 3, 4)

  // ── Attack Lab: Full-page standalone (replaces split-column layout for tab 02) ──
  if (activeTab === 'attack') {
    return (
      <ErrorBoundary title="Attack Lab Error">
        <AttackLab
          onNavigate={handleNavigate}
          onResult={setActiveData}
          onOperationPhase={setOperationPhase}
          externalAttack={selectedAttack}
          externalEntity={selectedEntity}
          onSelectAttack={handleSelectAttack}
          onSelectEntity={setSelectedEntity}
          activeDataProp={activeData}
        />
      </ErrorBoundary>
    );
  }

  const activePillar = activeTab === 'large_scale' ? '02' : '01';
  const activeDimension = activeTab === 'large_scale' ? 3 : 1;

  return (
    <ErrorBoundary title="Quantum SOC Global Error">
      <div className="soc-container" style={{ background: '#06070a' }}>
        {/* 3D WebGL Canvas: Single 3D Hero Object Background */}
        <QuantumEntanglementCanvas activePillar={activePillar} activeDimension={activeDimension} threatAlert={blobThreatAlert} threatAttackType={blobThreatAttackType} isDashboard={true} />

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
                    {activeTab === 'large_scale' && (
                      <LargeScaleSimulationPanel
                        onResult={setActiveData}
                        onParamsChange={setLargeScaleParams}
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

                  {/* TAB 3 ANIMATION: High-Throughput Quantum Computing Cluster & Parallel Batch Bus */}
                  {activeTab === 'large_scale' && (
                    <ErrorBoundary title="3D Scalable Cluster Unavailable">
                      <ScalableCluster3D
                        numSamples={largeScaleParams.numSamples}
                        batchesExecuted={activeData?.sim?.batches_executed || Math.ceil(largeScaleParams.numSamples / 14)}
                        throughput={activeData?.sim?.samples_per_sec || 450}
                        attackType={largeScaleParams.attackType}
                        noiseRate={largeScaleParams.noiseRate}
                        status={largeScaleParams.status !== 'idle' ? largeScaleParams.status : (activeData ? 'done' : 'idle')}
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

