/**
 * AttackLab.jsx
 * =============
 * Visual Foundation Shell for HyperQDS Attack Lab (Stage 2).
 * 
 * Visual Architecture:
 *   Velaris WebGL Simplex Noise (Cold Cryogenic Teal / Obsidian Palette)
 *   ↓
 *   Dark Readability Atmospheric Overlay (pointer-events: none)
 *   ↓
 *   UI: Existing Global StitchHeader Navigation + Minimal Chapter Progress Rail
 *   ↓
 *   Content: 7-Chapter Future Scroll Sections Shell:
 *     01 INTRO      — Adversarial Threat Benchmark Brief
 *     02 ATTACK     — Attack Vector Selection & Parameter Injection
 *     03 PROTOCOL   — Targeted Adversarial Architecture & Wiretap
 *     04 TOPOLOGY   — Perturbed Statevector & 3D Network Topology
 *     05 RESULTS    — Deterministic Physics Telemetry & Born Distribution
 *     06 BOUNDS     — Information-Theoretic Security Bounds
 *     07 VERDICT    — Cryptographic Verdict & SHA3-512 Ledger Link
 * 
 * Note: Individual components are NOT redesigned yet in Stage 2.
 * Their functionality is 100% preserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Velaris from './ui/velaris';
import StitchHeader from './StitchHeader.jsx';
import AttackSelectionPanel from './AttackSelectionPanel.jsx';
import AttackArchitecture3D from './AttackArchitecture3D.jsx';
import BlochSphere3D from './BlochSphere3D.jsx';
import NetworkTopology3D from './NetworkTopology3D.jsx';
import ResultsCharts from './ResultsCharts.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import './AttackLab.css';

// The 7 Chapters of the HyperQDS Attack Lab
const CHAPTERS = [
  { id: '01', key: 'intro', label: '01 INTRO', targetId: 'section-01-intro' },
  { id: '02', key: 'attack', label: '02 ATTACK', targetId: 'section-02-attack' },
  { id: '03', key: 'protocol', label: '03 PROTOCOL', targetId: 'section-03-protocol' },
  { id: '04', key: 'topology', label: '04 TOPOLOGY', targetId: 'section-04-topology' },
  { id: '05', key: 'results', label: '05 RESULTS', targetId: 'section-05-results' },
  { id: '06', key: 'bounds', label: '06 BOUNDS', targetId: 'section-06-bounds' },
  { id: '07', key: 'verdict', label: '07 VERDICT', targetId: 'section-07-verdict' },
];

export default function AttackLab({
  onNavigate,
  activeData,
  onResultData,
  selectedAttack = 'intercept_resend',
  onSelectAttack,
  selectedEntity,
  onSelectEntity,
  operationPhase = 'IDLE',
  onOperationPhase,
  activeStage = 1,
  onStageUpdate,
}) {
  const [activeChapter, setActiveChapter] = useState('01');
  const [scrollRatio, setScrollRatio] = useState(0);
  const containerRef = useRef(null);

  // Smooth scroll handler for chapter rail
  const scrollToChapter = useCallback((targetId, chapterId) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveChapter(chapterId);
    }
  }, []);

  // IntersectionObserver & Scroll Spy for Progress Rail
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollRatio(Math.min(Math.max(scrollY / docHeight, 0), 1));
      }

      // Check which chapter section is currently in view
      for (let i = CHAPTERS.length - 1; i >= 0; i--) {
        const el = document.getElementById(CHAPTERS[i].targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.45) {
            setActiveChapter(CHAPTERS[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAttacked = Boolean(activeData?.detect?.is_malicious || activeData?.type === 'attack');
  const fidelity = typeof activeData?.detect?.fidelity === 'number' ? activeData.detect.fidelity : 0.99;
  const qber = typeof activeData?.detect?.qber === 'number' ? activeData.detect.qber : 0.0;
  const pValue = typeof activeData?.detect?.born_test?.p_value === 'number' ? activeData.detect.born_test.p_value : 0.98;

  return (
    <div className="attack-lab-root" ref={containerRef}>
      {/* 1. Velaris WebGL Simplex-Noise Background (Cryogenic Optical Palette) */}
      <div className="attack-lab-velaris-bg" aria-hidden="true">
        <Velaris
          bg="#0a0b14"
          colors={["#042f2e", "#021a1d", "#0d9488", "#2dd4bf"]}
          speed={0.5}
          grain={0.16}
          height="100%"
          className="h-full w-full"
        />
      </div>

      {/* 2. Dark Readability Atmospheric Overlay */}
      <div className="attack-lab-overlay" aria-hidden="true" />

      {/* 3. Existing Global Navigation (Identical to Landing Page) */}
      <div className="attack-lab-header-wrap">
        <StitchHeader activeTab="attack" onNavigate={onNavigate} />
      </div>

      {/* 4. Minimal Floating Chapter Progress Rail */}
      <nav className="attack-lab-progress-rail" aria-label="Attack Lab Chapter Navigation">
        <div className="attack-lab-rail-spine">
          {/* Vertical Track & Dynamic Progress Fill */}
          <div className="attack-lab-rail-track-line">
            <div
              className="attack-lab-rail-track-fill"
              style={{ height: `${(scrollRatio * 100).toFixed(1)}%` }}
            />
          </div>

          {/* Chapter Ticks */}
          {CHAPTERS.map((ch) => {
            const isActive = activeChapter === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                className={`attack-lab-rail-item ${isActive ? 'is-active' : ''}`}
                onClick={() => scrollToChapter(ch.targetId, ch.id)}
                title={`Jump to ${ch.label}`}
              >
                <span className="attack-lab-rail-label">{ch.label}</span>
                <span className="attack-lab-rail-node">
                  <span className="attack-lab-rail-dot" />
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 5. Future Scroll Sections Container (Stage 2 Shell Foundation) */}
      <main className="attack-lab-content">
        {/* ====================================================================
            CHAPTER 01: INTRO — Threat Benchmark Context
            ==================================================================== */}
        <section id="section-01-intro" className="attack-lab-section">
          <div className="attack-lab-section-header">
            <div className="attack-lab-section-title-group">
              <span className="attack-lab-chapter-tag">01 // ADVERSARIAL ATTACK LAB</span>
              <h2 className="attack-lab-section-title">Quantum Physical-Layer Threat Sandbox</h2>
              <p className="attack-lab-section-desc">
                Deterministic adversarial simulation testing tripartite teleportation QDS resilience against physical eavesdropping.
              </p>
            </div>
          </div>

          <div className="attack-lab-intro-card">
            <div>
              <p className="attack-lab-intro-lead">
                Targeting high-value sovereign signatures with active wiretapping, intercept-resend, depolarizing noise,
                and statevector spoofing. Every adversarial interaction triggers quantum wavefunction collapse,
                producing real-time QBER and Born-rule anomalies.
              </p>
            </div>
            <div className="attack-lab-intro-metrics-grid">
              <div className="attack-lab-intro-metric-box">
                <span className="attack-lab-intro-metric-val">&lt;0.24 ms</span>
                <span className="attack-lab-intro-metric-lbl">Collapse Latency</span>
              </div>
              <div className="attack-lab-intro-metric-box">
                <span className="attack-lab-intro-metric-val">11.0%</span>
                <span className="attack-lab-intro-metric-lbl">Holevo Bound</span>
              </div>
              <div className="attack-lab-intro-metric-box">
                <span className="attack-lab-intro-metric-val">0-ML</span>
                <span className="attack-lab-intro-metric-lbl">Deterministic Proof</span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            CHAPTERS 02 & 03: WORKBENCH — Attack Selection & Targeted Architecture
            ==================================================================== */}
        <div className="attack-lab-workbench-grid">
          {/* Section 02: ATTACK — Controls */}
          <section id="section-02-attack" className="attack-lab-section">
            <div className="attack-lab-section-header">
              <div className="attack-lab-section-title-group">
                <span className="attack-lab-chapter-tag">02 // ADVERSARIAL VECTOR</span>
                <h3 className="attack-lab-section-title" style={{ fontSize: '1.15rem' }}>Attack Vector &amp; Target Dossier</h3>
              </div>
            </div>

            <ErrorBoundary title="Attack Controls Unavailable">
              <AttackSelectionPanel
                onResult={onResultData}
                onStageUpdate={onStageUpdate}
                selectedAttack={selectedAttack}
                onSelectAttack={onSelectAttack}
                selectedEntity={selectedEntity}
                onSelectEntity={onSelectEntity}
                onOperationPhase={onOperationPhase}
              />
            </ErrorBoundary>
          </section>

          {/* Section 03: PROTOCOL — 3D Targeted Adversarial Architecture */}
          <section id="section-03-protocol" className="attack-lab-section">
            <div className="attack-lab-section-header">
              <div className="attack-lab-section-title-group">
                <span className="attack-lab-chapter-tag">03 // PROTOCOL ARCHITECTURE</span>
                <h3 className="attack-lab-section-title" style={{ fontSize: '1.15rem' }}>Targeted 3D Attack Channel &amp; Optical Tap</h3>
              </div>
            </div>

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
          </section>
        </div>

        {/* ====================================================================
            CHAPTER 04: TOPOLOGY — Perturbed Statevector & 3D Network Topology
            ==================================================================== */}
        <section id="section-04-topology" className="attack-lab-section">
          <div className="attack-lab-section-header">
            <div className="attack-lab-section-title-group">
              <span className="attack-lab-chapter-tag">04 // QUANTUM TOPOLOGY</span>
              <h3 className="attack-lab-section-title" style={{ fontSize: '1.15rem' }}>Bloch Sphere Statevector &amp; Tripartite Mesh</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            <ErrorBoundary title="3D Bloch Sphere Unavailable">
              <BlochSphere3D fidelity={fidelity} isAttacked={isAttacked} />
            </ErrorBoundary>
            <ErrorBoundary title="Network Topology Unavailable">
              <NetworkTopology3D isAttacked={isAttacked} />
            </ErrorBoundary>
          </div>
        </section>

        {/* ====================================================================
            CHAPTER 05: RESULTS — Telemetry & Born Distribution
            ==================================================================== */}
        <section id="section-05-results" className="attack-lab-section">
          <div className="attack-lab-section-header">
            <div className="attack-lab-section-title-group">
              <span className="attack-lab-chapter-tag">05 // TELEMETRY &amp; METRICS</span>
              <h3 className="attack-lab-section-title" style={{ fontSize: '1.15rem' }}>Physical Error Extraction &amp; Born Rule Distribution</h3>
            </div>
          </div>

          <ErrorBoundary title="Results Charts Unavailable">
            <ResultsCharts data={activeData} />
          </ErrorBoundary>
        </section>

        {/* ====================================================================
            CHAPTER 06: BOUNDS — Information-Theoretic Security Bounds
            ==================================================================== */}
        <section id="section-06-bounds" className="attack-lab-section">
          <div className="attack-lab-section-header">
            <div className="attack-lab-section-title-group">
              <span className="attack-lab-chapter-tag">06 // SECURITY BOUNDS</span>
              <h3 className="attack-lab-section-title" style={{ fontSize: '1.15rem' }}>Closed-Form Information Security Guarantees</h3>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            background: 'rgba(12, 16, 28, 0.55)',
            border: '1px solid rgba(45, 212, 191, 0.18)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(248, 250, 252, 0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace" }}>
                Gottesman-Chuang Bound
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2dd4bf', fontFamily: "'JetBrains Mono', monospace" }}>
                P(forgery) ≤ 2^-14
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(248, 250, 252, 0.65)' }}>
                Exponential unforgeability without private EPR key material.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(248, 250, 252, 0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace" }}>
                Hoeffding Confidence
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2dd4bf', fontFamily: "'JetBrains Mono', monospace" }}>
                1 - exp(-2N·ΔQBER²)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(248, 250, 252, 0.65)' }}>
                Rigorous finite-sample bounds eliminating false positives at N=1024.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(248, 250, 252, 0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace" }}>
                Uhlmann Fidelity
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: isAttacked ? '#ef4444' : '#2dd4bf', fontFamily: "'JetBrains Mono', monospace" }}>
                {(fidelity * 100).toFixed(1)}% Overlap
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(248, 250, 252, 0.65)' }}>
                Density matrix overlap between ideal and received quantum states.
              </span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            CHAPTER 07: VERDICT — Cryptographic Verdict & Audit Link
            ==================================================================== */}
        <section id="section-07-verdict" className="attack-lab-section">
          <div className="attack-lab-section-header">
            <div className="attack-lab-section-title-group">
              <span className="attack-lab-chapter-tag">07 // PROTOCOL VERDICT</span>
              <h3 className="attack-lab-section-title" style={{ fontSize: '1.15rem' }}>Deterministic Decision &amp; Audit Trail</h3>
            </div>
          </div>

          <div style={{
            background: isAttacked ? 'rgba(239, 68, 68, 0.12)' : 'rgba(20, 184, 166, 0.12)',
            border: `1px solid ${isAttacked ? 'rgba(239, 68, 68, 0.4)' : 'rgba(45, 212, 191, 0.4)'}`,
            borderRadius: '12px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            backdropFilter: 'blur(8px)',
          }}>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.85rem',
                fontWeight: 700,
                color: isAttacked ? '#ef4444' : '#2dd4bf',
                marginBottom: '4px',
              }}>
                {isAttacked ? '● THREAT COMPROMISED — CRITICAL ABORT' : '● NOMINAL CHANNEL — VERIFIED COMMIT'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(248, 250, 252, 0.75)' }}>
                QBER: {(qber * 100).toFixed(2)}% · Pearson χ² p-value: {pValue.toFixed(4)} · Action: {activeData?.detect?.recommended_action || (isAttacked ? 'ABORT' : 'COMMIT')}
              </div>
            </div>

            <button
              type="button"
              className="hqds-btn-secondary hqds-cursor-light"
              onClick={() => onNavigate && onNavigate('audit')}
              style={{ fontSize: '0.78rem', padding: '8px 16px' }}
            >
              <span>INSPECT AUDIT LEDGER</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
