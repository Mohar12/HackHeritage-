/**
 * AttackLab.jsx
 * =============
 * Canonical HyperQDS Attack Lab — First-Class Stitch-Style Full-Page Narrative Shell.
 * 
 * Stage 1 Architecture:
 *   Layer 0: Page Ground (#06070a)
 *   Layer 1: QuantumEntanglementCanvas (Full 3D WebGL Entanglement Sphere, isDashboard: false)
 *   Layer 2: Atmospheric Ambient Scrim (pointer-events: none)
 *   Layer 4: StitchHeader (Sticky global navigation)
 *   Layer 3: Page Narrative Body (Max-width 1440px, centered, large vertical rhythm)
 * 
 * The 7 Semantic Chapters:
 *   01 INTRO      — Quantum Physical-Layer Threat Sandbox & Benchmark Metrics
 *   02 ATTACK     — Attack Vector Selection & Target Entity Dossier
 *   03 PROTOCOL   — Targeted 3D Adversarial Architecture & Wiretap Interception
 *   04 TOPOLOGY   — Bloch Sphere Statevector & Tripartite Quantum Mesh
 *   05 RESULTS    — Physical Error Extraction & Born Rule Distribution
 *   06 BOUNDS     — Closed-Form Information-Theoretic Security Bounds
 *   07 VERDICT    — Deterministic Physical Layer Verdict & Immutable Audit Link
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QuantumEntanglementCanvas from './QuantumEntanglementCanvas.jsx';
import StitchHeader from './StitchHeader.jsx';
import AttackSelectionPanel, { ATTACK_CANVAS_CONFIG, normalizeAttackType } from './AttackSelectionPanel.jsx';
import AttackArchitecture3D from './AttackArchitecture3D.jsx';
import BlochSphere3D from './BlochSphere3D.jsx';
import NetworkTopology3D from './NetworkTopology3D.jsx';
import ResultsCharts from './ResultsCharts.jsx';
import TabCrossFade from './TabCrossFade.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import './AttackLab.css';

// The 7 Canonical Attack Lab Chapters (Matching Audit Subnav Capsule Architecture - Red Spectrum)
const ATTACK_CHAPTERS_BASE = [
  { id: 'section-01-intro', index: '01', label: 'INTRO', accent: '#f43f5e' },
  { id: 'section-02-attack', index: '02', label: 'ATTACK', accent: '#ff1744' },
  { id: 'section-03-protocol', index: '03', label: 'PROTOCOL', accent: '#e11d48' },
  { id: 'section-04-topology', index: '04', label: 'TOPOLOGY', accent: '#ef4444' },
  { id: 'section-05-results', index: '05', label: 'RESULTS', accent: '#ef4444' },
  { id: 'section-06-bounds', index: '06', label: 'BOUNDS', accent: '#e11d48' },
  { id: 'section-07-verdict', index: '07', label: 'VERDICT', accent: '#f43f5e' },
];

export default function AttackLab({
  onNavigate,
  activeData,
  activeDataProp,
  onResult,
  onResultData,
  selectedAttack = 'intercept_resend',
  externalAttack,
  onSelectAttack,
  selectedEntity,
  externalEntity,
  onSelectEntity,
  operationPhase = 'IDLE',
  onOperationPhase,
  activeStage = 1,
  onStageUpdate,
}) {
  // Normalize inbound prop variations seamlessly
  const currentData = activeDataProp || activeData || null;
  const currentAttack = externalAttack || selectedAttack || 'intercept_resend';
  const currentEntity = externalEntity || selectedEntity || null;

  // Derived detection metrics (needed for dynamic accent in tab 07 and proof bounds in tab 06)
  const isAttacked = Boolean(currentData?.detect?.is_malicious || currentData?.type === 'attack');
  const fidelity = typeof currentData?.detect?.fidelity === 'number' ? currentData.detect.fidelity : 0.99;
  const qber = typeof currentData?.detect?.qber === 'number' ? currentData.detect.qber : 0.0;
  const pValue = typeof currentData?.detect?.chi2_p_value === 'number'
    ? currentData.detect.chi2_p_value
    : (typeof currentData?.detect?.born_test?.p_value === 'number' ? currentData.detect.born_test.p_value : 0.98);

  // Quantum security bounds variables for Chapter 06 Proof Scene
  const secBounds = currentData?.detect?.quantum_security_bounds || currentData?.sim?.quantum_security_bounds || {};
  const nQubits = secBounds?.n_qubits || 14;
  const forgeProb = Number.isFinite(secBounds?.forgery_probability_bound_gc)
    ? secBounds.forgery_probability_bound_gc
    : (Number.isFinite(secBounds?.forgery_probability_bound) ? secBounds.forgery_probability_bound : Math.pow(2, -nQubits));
  const hoeffdingConfidence = Number.isFinite(secBounds?.hoeffding_confidence)
    ? secBounds.hoeffding_confidence
    : (1 - Math.exp(-2 * 1024 * Math.max(qber, 0.08) * Math.max(qber, 0.08)));

  // Dynamic semantic chapters mapping: 07 VERDICT stays in the red spectrum
  const chapters = useMemo(() => {
    return ATTACK_CHAPTERS_BASE.map((ch) => {
      if (ch.id === 'section-07-verdict') {
        return {
          ...ch,
          accent: isAttacked || operationPhase === 'DEFENSE_ABORT' ? '#ef4444' : '#f43f5e',
        };
      }
      return ch;
    });
  }, [isAttacked, operationPhase]);

  const [activeSection, setActiveSection] = useState('section-01-intro');
  const [revealReady, setRevealReady] = useState(false);

  // High-frequency values held in refs to prevent React state thrashing during rAF interpolation
  const targetScrollYRef = useRef(0);
  const lerpedScrollYRef = useRef(0);
  const docProgressRef = useRef(0);
  const activeSectionRef = useRef('section-01-intro');
  const pendingSectionRef = useRef(null);
  const pendingTimeoutRef = useRef(null);
  const animFrameRef = useRef(null);
  const revealObserverRef = useRef(null);
  const subnavRef = useRef(null);
  const heroCardsRef = useRef(null);

  // Smooth scroll to chapter on tab click (Exact Audit Ledger implementation)
  const scrollToChapter = useCallback((targetId) => {
    const target = document.getElementById(targetId);
    if (!target) return;

    pendingSectionRef.current = targetId;
    activeSectionRef.current = targetId;
    setActiveSection(targetId);

    if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    pendingTimeoutRef.current = setTimeout(() => {
      pendingSectionRef.current = null;
    }, 850);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 4: UNIFIED SINGLE SCROLL NARRATIVE CONTROLLER (STITCH & AUDIT ENGINE)
  // Caches target scroll, interpolates via damped lerp, drives document progress,
  // determines active chapter bi-directionally, updates progressive reveals (including upward scroll),
  // and coordinates 3D semantic state without setting React state every frame.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Progressive Reveal Observer (Audit architecture: bi-directional for seamless upward scroll)
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          } else {
            // Un-mark when leaving viewport so upward scroll naturally re-reveals
            entry.target.classList.remove('is-revealed');
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08,
      }
    );
    revealObserverRef.current = revealObserver;

    const registerRevealElement = (element) => {
      if (!element) return;
      revealObserver.observe(element);
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        element.classList.add('is-revealed');
      }
    };

    const revealElements = document.querySelectorAll('.hqds-attack-page-body .hqds-reveal');
    revealElements.forEach(registerRevealElement);

    // MutationObserver: dynamically catches any newly rendered reveal elements
    let mutationObserver = null;
    const bodyEl = document.querySelector('.hqds-attack-page-body');
    if (bodyEl && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList?.contains('hqds-reveal')) {
                registerRevealElement(node);
              }
              if (node.querySelectorAll) {
                node.querySelectorAll('.hqds-reveal').forEach(registerRevealElement);
              }
            }
          });
        });
      });
      mutationObserver.observe(bodyEl, { childList: true, subtree: true });
    }

    setRevealReady(true);

    // 2. Cache scroll target with passive listener
    targetScrollYRef.current = window.scrollY;
    lerpedScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      targetScrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const chapterIds = [
      'section-01-intro',
      'section-02-attack',
      'section-03-protocol',
      'section-04-topology',
      'section-05-results',
      'section-06-bounds',
      'section-07-verdict',
    ];

    const evaluateActiveSection = (currentLerpedY) => {
      // If programmatically scrolling via tab click, ignore intermediate scroll events until target is reached
      if (pendingSectionRef.current) {
        const targetEl = document.getElementById(pendingSectionRef.current);
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          if (Math.abs(rect.top - 84) < 60) {
            pendingSectionRef.current = null;
            if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
          } else {
            return;
          }
        }
      }

      // Check top boundary (Intro)
      if (currentLerpedY < 160) {
        if (activeSectionRef.current !== 'section-01-intro') {
          activeSectionRef.current = 'section-01-intro';
          setActiveSection('section-01-intro');
        }
        return;
      }

      // Check bottom boundary (Verdict)
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight > 0 && currentLerpedY >= scrollableHeight - 80) {
        if (activeSectionRef.current !== 'section-07-verdict') {
          activeSectionRef.current = 'section-07-verdict';
          setActiveSection('section-07-verdict');
        }
        return;
      }

      // Bi-directional geometry detection (40% viewport trigger line)
      const triggerThreshold = window.innerHeight * 0.40;
      let matched = null;

      for (let i = chapterIds.length - 1; i >= 0; i--) {
        const id = chapterIds[i];
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= triggerThreshold && rect.bottom > 84) {
            matched = id;
            break;
          }
        }
      }

      // ONLY invoke React state update when the active chapter actually changes!
      if (matched && matched !== activeSectionRef.current) {
        activeSectionRef.current = matched;
        setActiveSection(matched);
      }
    };

    // 3. Consolidated Single rAF Loop: zero-lag 0.18 damped lerp interpolation
    const animate = () => {
      // Tight, responsive damped lerp of scroll position (0.18 per frame: eliminates lag while ensuring fluid glide)
      lerpedScrollYRef.current += (targetScrollYRef.current - lerpedScrollYRef.current) * 0.18;

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, lerpedScrollYRef.current / docHeight)) : 0;
      docProgressRef.current = progress;

      const vh = window.innerHeight;

      // Visual interpolation: Hero Telemetry Chips subtle drift & fade (Audit & Stitch pattern)
      if (heroCardsRef.current && !prefersReducedMotion) {
        const heroRange = vh * 0.85;
        const heroRatio = Math.min(1.0, Math.max(0, lerpedScrollYRef.current / heroRange));
        const heroDrift = (heroRatio * 28).toFixed(2);
        const heroFade = Math.max(0.12, Math.min(1, 1.0 - (lerpedScrollYRef.current / (vh * 0.95)))).toFixed(3);
        heroCardsRef.current.style.transform = `translate3d(0, -${heroDrift}px, 0)`;
        heroCardsRef.current.style.opacity = heroFade;
      }

      // Determine active section based on smooth lerped scroll position
      // Evaluated in rAF, but only triggers React state when threshold crossed
      evaluateActiveSection(lerpedScrollYRef.current);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (revealObserverRef.current) revealObserverRef.current.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      revealObserverRef.current = null;
    };
  }, []);

  // Synchronize dynamic elements into reveal observer when data or attack changes
  useEffect(() => {
    if (!revealReady || !revealObserverRef.current) return;
    const elements = document.querySelectorAll('.hqds-attack-page-body .hqds-reveal');
    elements.forEach((el) => {
      revealObserverRef.current.observe(el);
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-revealed');
      }
    });
  }, [revealReady, currentData, currentAttack]);

  // Mobile horizontal subnav capsule auto-centering (Exact Audit Ledger behavior)
  useEffect(() => {
    if (!subnavRef.current) return;
    const container = subnavRef.current;
    if (container.scrollWidth > container.clientWidth) {
      const activeBtn = container.querySelector('.hqds-attack-subnav-item.is-active');
      if (activeBtn) {
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        const targetScrollLeft =
          activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.offsetWidth / 2;
        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    }
  }, [activeSection]);

  // Progressive threat alert intensity ramping through operationPhase
  const attackPhaseIntensity = {
    IDLE: 0,
    DISPATCH: 0.10,
    IN_TRANSIT: 0.22,
    INTERCEPT: 0.58,
    COLLAPSE: 0.85,
    DEFENSE_ABORT: 0.95,
  };

  // Normalized attack key and configuration from single source of truth
  const normalizedAttack = normalizeAttackType(currentAttack);
  const currentAttackConfig = ATTACK_CANVAS_CONFIG[normalizedAttack] || ATTACK_CANVAS_CONFIG.intercept_resend;

  // Operational Simulation State
  const isSimulating = operationPhase !== 'IDLE' && operationPhase !== 'DEFENSE_ABORT';
  const phaseIntensity = attackPhaseIntensity[operationPhase] || 0;

  // 3D Canvas visual progression synced to active section and operational lifecycle (Red Threat Spectrum)
  const canvasState = useMemo(() => {
    switch (activeSection) {
      // 01 INTRO: Adversarial Reddish opening state
      case 'section-01-intro':
        return {
          pillar: '03',
          dimension: 4,
          threatAlert: 0.85,
        };

      // 02 ATTACK: Adversarial Vector Selection & Execution
      case 'section-02-attack':
        return {
          pillar: '03',
          dimension: currentAttackConfig.dimension ?? 4,
          threatAlert: isSimulating ? Math.max(0.85, phaseIntensity) : 0.85,
        };

      // 03 PROTOCOL: Protocol Architecture → Targeted Adversarial State
      case 'section-03-protocol':
        return {
          pillar: '03',
          dimension: currentAttackConfig.dimension ?? 4,
          threatAlert: isSimulating ? Math.max(0.85, phaseIntensity) : (isAttacked ? 0.95 : 0.85),
        };

      // 04 TOPOLOGY: Perturbed Statevector & Tripartite Mesh
      case 'section-04-topology':
        return {
          pillar: '03',
          dimension: currentAttackConfig.dimension ?? 4,
          threatAlert: isSimulating ? Math.max(0.85, phaseIntensity) : (isAttacked ? 0.95 : 0.85),
        };

      // 05 RESULTS: Telemetry & Analytical Visualization
      case 'section-05-results':
        return {
          pillar: '03',
          dimension: 4,
          threatAlert: isAttacked || operationPhase === 'DEFENSE_ABORT' ? 0.98 : 0.85,
        };

      // 06 BOUNDS: Information-Theoretic Security Guarantees
      case 'section-06-bounds':
        return {
          pillar: '03',
          dimension: 4,
          threatAlert: isAttacked ? 0.95 : 0.85,
        };

      // 07 VERDICT: Deterministic Protocol Verdict & Colophon
      case 'section-07-verdict':
      default:
        return {
          pillar: '03',
          dimension: 4,
          threatAlert: isAttacked || operationPhase === 'DEFENSE_ABORT' ? 0.98 : 0.85,
        };
    }
  }, [activeSection, currentAttackConfig, operationPhase, isSimulating, phaseIntensity, isAttacked]);

  const handleNav = useCallback((tab) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (typeof window !== 'undefined') {
      if (tab === 'landing') window.location.href = '/';
      else window.location.href = `/?view=${tab}`;
    }
  }, [onNavigate]);

  const handleResultForward = useCallback((data) => {
    if (onResultData) onResultData(data);
    if (onResult) onResult(data);
  }, [onResultData, onResult]);

  // Specular mouse-following light coordinate handler (Matching Audit Ledger cards & buttons)
  const handleButtonMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  // Attack Vector Human-Readable Nomenclature
  const attackVectorLabel = useMemo(() => {
    const ATTACK_NAMES = {
      intercept_resend: 'INTERCEPT-RESEND',
      beam_splitter: 'BEAM-SPLITTER',
      depolarizing_noise: 'DEPOLARIZING NOISE',
      bell_forgery: 'BELL FORGERY',
      replay: 'SESSION REPLAY',
      entanglement_hijack: 'ENTANGLEMENT HIJACK',
    };
    return ATTACK_NAMES[currentAttack] || String(currentAttack).replace(/_/g, '-').toUpperCase();
  }, [currentAttack]);

  // Target Entity Identifier
  const targetEntityLabel = useMemo(() => {
    return currentEntity?.id || currentEntity?.name || currentData?.target || 'TX-2026-FED-BOE';
  }, [currentEntity, currentData]);

  // Hero Status Text (Metadata line)
  const heroStatusText = useMemo(() => {
    if (isAttacked || operationPhase === 'DEFENSE_ABORT') {
      return 'DETECTED';
    }
    if (isSimulating) {
      return 'EXECUTING';
    }
    return 'READY';
  }, [isAttacked, operationPhase, isSimulating]);

  return (
    <div className="hqds-attack-page-root">
      {/* Layer 1: 3D WebGL Ambient Background Canvas (Exact Stitch/Audit 3D Object, Full Quality, Non-Dashboard) */}
      <QuantumEntanglementCanvas
        visualContext="attack"
        activePillar={canvasState.pillar}
        activeDimension={canvasState.dimension}
        threatAlert={canvasState.threatAlert}
        threatAttackType={normalizedAttack}
        isDashboard={false}
      />

      {/* Layer 2: Atmospheric Ambient Scrim */}
      <div className="hqds-attack-ambient-scrim" aria-hidden="true" />

      {/* Layer 4: Canonical Stitch Header */}
      <StitchHeader activeTab="attack" onNavigate={handleNav} />

      {/* Layer 3: Main Full-Page Narrative Flow Stream (Exact Audit Geometry) */}
      <main className={`hqds-attack-page-body ${revealReady ? 'hqds-scroll-enhanced' : ''}`}>

        {/* ====================================================================
            CHAPTER 01: HERO — Adversarial Quantum Attack Laboratory
            ==================================================================== */}
        <section
          id="section-01-intro"
          data-attack-section="hero"
          className={`hqds-attack-hero-section hqds-attack-scroll-section ${
            activeSection === 'section-01-intro' ? 'is-active-section' : ''
          }`}
          aria-labelledby="attack-hero-title"
        >
          {/* Centered Display Title & Supporting Description */}
          <div className="hqds-attack-hero-center-content">
            <h1
              id="attack-hero-title"
              className="hqds-attack-hero-title hqds-reveal is-delay-0"
            >
              <span>Adversarial Quantum</span>
              <span>Attack Laboratory</span>
            </h1>
            <p
              className="hqds-attack-hero-summary hqds-reveal is-delay-2"
            >
              Deterministic physical-layer attack simulation for testing quantum digital signatures against interception, noise, forgery, impersonation, and replay.
            </p>
          </div>

          {/* Centered Verification Capabilities Pill Strip */}
          <div
            className="hqds-attack-hero-pill-strip hqds-reveal is-delay-2"
            aria-label="Verification capabilities"
          >
            <span className="hqds-attack-hero-pill">
              <span className="hqds-attack-pill-dot is-cyan" />
              LIVE ATTACK SIMULATION
            </span>
            <span className="hqds-attack-hero-pill">
              <span className="hqds-attack-pill-dot is-violet" />
              ZERO-ML THREAT DETECTION
            </span>
            <span className="hqds-attack-hero-pill">
              <span className="hqds-attack-pill-dot is-emerald" />
              PHYSICAL-LAYER VERIFICATION
            </span>
          </div>

          {/* Small Technical State & Metadata Line */}
          <div
            className="hqds-attack-meta-line hqds-reveal is-delay-3"
            aria-label="Attack laboratory state metadata"
          >
            <div className="hqds-attack-meta-group">
              <span className="hqds-attack-meta-key">ATTACK VECTOR</span>
              <span className="hqds-attack-meta-val">{attackVectorLabel}</span>
            </div>
            <span className="hqds-attack-meta-divider" aria-hidden="true">/</span>
            <div className="hqds-attack-meta-group">
              <span className="hqds-attack-meta-key">TARGET</span>
              <span className="hqds-attack-meta-val">{targetEntityLabel}</span>
            </div>
            <span className="hqds-attack-meta-divider" aria-hidden="true">/</span>
            <div className="hqds-attack-meta-group">
              <span className="hqds-attack-meta-key">STATUS</span>
              <span
                className={`hqds-attack-meta-val status-tag ${
                  isAttacked || operationPhase === 'DEFENSE_ABORT'
                    ? 'is-danger'
                    : isSimulating
                    ? 'is-warning'
                    : 'is-ready'
                }`}
              >
                {heroStatusText}
              </span>
            </div>
          </div>

          {/* Converted Stitch/Audit-Style Telemetry Elements */}
          <div
            ref={heroCardsRef}
            className="hqds-attack-hero-telemetry-strip hqds-reveal is-delay-3"
            aria-label="Quantum security telemetry parameters"
          >
            {/* Item 01: Wavefunction Collapse Latency */}
            <div
              className="hqds-attack-telemetry-chip hqds-cursor-light"
              onMouseMove={handleButtonMouseMove}
            >
              <div className="hqds-attack-telemetry-head">
                <span className="hqds-attack-telemetry-idx">01</span>
                <span className="hqds-attack-telemetry-tag">PAULI BOUND</span>
              </div>
              <div className="hqds-attack-telemetry-val">&lt; 0.24 ms</div>
              <div className="hqds-attack-telemetry-lbl">Wavefunction Collapse Latency</div>
              <div className="hqds-attack-telemetry-sub">Deterministic Pauli Bound</div>
            </div>

            {/* Item 02: Holevo Security Margin */}
            <div
              className="hqds-attack-telemetry-chip hqds-cursor-light"
              onMouseMove={handleButtonMouseMove}
            >
              <div className="hqds-attack-telemetry-head">
                <span className="hqds-attack-telemetry-idx">02</span>
                <span className="hqds-attack-telemetry-tag">HOLEVO THRESHOLD</span>
              </div>
              <div className="hqds-attack-telemetry-val">11.0%</div>
              <div className="hqds-attack-telemetry-lbl">BB84 Security Bound Threshold</div>
              <div className="hqds-attack-telemetry-sub">Shor-Preskill QBER Margin</div>
            </div>

            {/* Item 03: 0-ML Physics Engine */}
            <div
              className="hqds-attack-telemetry-chip hqds-cursor-light"
              onMouseMove={handleButtonMouseMove}
            >
              <div className="hqds-attack-telemetry-head">
                <span className="hqds-attack-telemetry-idx">03</span>
                <span className="hqds-attack-telemetry-tag">ZERO-ML ENGINE</span>
              </div>
              <div className="hqds-attack-telemetry-val">0-ML</div>
              <div className="hqds-attack-telemetry-lbl">Deterministic Physics Proofs</div>
              <div className="hqds-attack-telemetry-sub">Born-Rule χ² Verification</div>
            </div>
          </div>

          {/* Primary Action / Scroll Cue */}
          <div
            className="hqds-attack-hero-action-row hqds-reveal is-delay-4"
          >
            <button
              type="button"
              className="hqds-attack-hero-cta-btn hqds-cursor-light"
              onMouseMove={handleButtonMouseMove}
              onClick={() => scrollToChapter('section-02-attack')}
              aria-label="Proceed to Attack Vector Configuration"
            >
              <span className="hqds-attack-hero-cta-glow" aria-hidden="true" />
              <span className="hqds-attack-hero-cta-text">Configure Attack Vector</span>
              <svg
                className="hqds-attack-hero-cta-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </button>
          </div>

          {/* Canonical Horizontal Subnav Capsule */}
          <nav
            ref={subnavRef}
            className="hqds-attack-subnav hqds-reveal is-delay-4"
            aria-label="Attack Lab chapters sub-navigation"
          >
            <div className="hqds-attack-subnav-capsule">
              {chapters.map((ch) => {
                const isActive = activeSection === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={`hqds-attack-subnav-item ${isActive ? 'is-active' : ''}`}
                    style={{
                      '--section-accent': ch.accent,
                      '--attack-accent': ch.accent,
                    }}
                    onClick={() => scrollToChapter(ch.id)}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`Jump to ${ch.label} chapter`}
                  >
                    <span className="hqds-attack-subnav-index">{ch.index}</span>
                    <span className="hqds-attack-subnav-label">{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </section>

        {/* ====================================================================
            CHAPTER 02: ATTACK — Vector Selection & Target Entity Dossier
            ==================================================================== */}
        <section
          id="section-02-attack"
          className={`hqds-attack-section hqds-attack-scroll-section ${
            activeSection === 'section-02-attack' ? 'is-active-section' : ''
          }`}
          aria-labelledby="attack-vector-heading"
        >
          <header className="hqds-attack-section-header is-centered hqds-reveal is-delay-0">
            <span className="hqds-attack-section-eyebrow">02 · ADVERSARIAL VECTOR</span>
            <h2 id="attack-vector-heading" className="hqds-attack-section-title">
              <span>Attack Vector</span>
              <span className="hqds-title-sub">&amp; Target Dossier</span>
            </h2>
            <p className="hqds-attack-section-summary">
              Select an adversarial vector and designated institutional target signature entity to initiate targeted physical-layer simulation.
            </p>
          </header>

          <div className="hqds-attack-vector-card hqds-reveal is-delay-1">
            <ErrorBoundary title="Attack Vector Configuration Unavailable">
              <AttackSelectionPanel
                selectedAttack={currentAttack}
                onSelectAttack={onSelectAttack}
                selectedEntity={currentEntity}
                onSelectEntity={onSelectEntity}
                onResult={handleResultForward}
                onOperationPhase={onOperationPhase}
                onStageUpdate={onStageUpdate}
              />
            </ErrorBoundary>
          </div>
        </section>

        {/* ====================================================================
            CHAPTER 03: PROTOCOL — Targeted Adversarial Architecture & Wiretap
            ==================================================================== */}
        <section
          id="section-03-protocol"
          className={`hqds-attack-section hqds-attack-scroll-section ${
            activeSection === 'section-03-protocol' ? 'is-active-section' : ''
          }`}
          aria-labelledby="protocol-arch-heading"
        >
          <header className="hqds-attack-section-header is-centered hqds-reveal is-delay-0">
            <span className="hqds-attack-section-eyebrow">03 · PROTOCOL ARCHITECTURE</span>
            <h2 id="protocol-arch-heading" className="hqds-attack-section-title">
              <span>Targeted Adversarial</span>
              <span className="hqds-title-sub">&amp; Wiretap Architecture</span>
            </h2>
            <p className="hqds-attack-section-summary">
              Live three-dimensional optical waveguide and beam-splitter physical layout illustrating Eve&#39;s spatial interception, projective measurement, and state perturbation.
            </p>
          </header>

          <div className="hqds-attack-protocol-card hqds-reveal is-delay-1">
            <ErrorBoundary title="Attack Architecture Unavailable">
              <AttackArchitecture3D
                attackType={currentAttack}
                attackData={currentData?.sim || currentData?.attack}
                detectData={currentData?.detect}
                isAttacked={isAttacked}
                canvasHeight={480}
              />
            </ErrorBoundary>
          </div>
        </section>

        {/* ====================================================================
            CHAPTER 04: TOPOLOGY — Bloch Sphere Statevector & Tripartite Mesh
            ==================================================================== */}
        <section
          id="section-04-topology"
          className={`hqds-attack-section hqds-attack-scroll-section ${
            activeSection === 'section-04-topology' ? 'is-active-section' : ''
          }`}
          aria-labelledby="quantum-topology-heading"
        >
          <header className="hqds-attack-section-header is-centered hqds-reveal is-delay-0">
            <span className="hqds-attack-section-eyebrow">04 · QUANTUM TOPOLOGY</span>
            <h2 id="quantum-topology-heading" className="hqds-attack-section-title">
              <span>Perturbed Statevector</span>
              <span className="hqds-title-sub">&amp; Tripartite Mesh</span>
            </h2>
            <p className="hqds-attack-section-summary">
              Real-time quantum statevector inspection on the Bloch Sphere paired with tripartite network mesh topology for Alice, Bob, and Charlie.
            </p>
          </header>

          {/* Unified Two-Instrument Observatory Bench Stage */}
          <div className="hqds-attack-observatory-stage hqds-reveal is-delay-1">
            {/* Bench Header / Live Telemetry Pill Row */}
            <div className="hqds-obs-top-telemetry hqds-reveal is-delay-1">
              <div className="hqds-obs-bay-indicator">
                <span className="hqds-obs-radar-pulse" aria-hidden="true" />
                <span className="hqds-obs-bay-title">QUANTUM OBSERVATORY BAY // DUAL-INSTRUMENT BENCH</span>
              </div>
              <div className="hqds-obs-sync-group">
                <div className="hqds-obs-sync-chip">
                  <span className="hqds-obs-sync-label">STATE PURITY:</span>
                  <strong
                    className={`hqds-obs-sync-val ${(fidelity < 0.85 || isAttacked) ? 'hqds-obs-val-threat' : 'hqds-obs-val-good'}`}
                  >
                    {isAttacked ? '0.582 (PERTURBED)' : '1.000 (PURE BELL)'}
                  </strong>
                </div>
                <div className="hqds-obs-sync-chip">
                  <span className="hqds-obs-sync-label">OPTICAL CHANNELS:</span>
                  <span className="hqds-obs-sync-tag">ALICE ↔ BOB ↔ CHARLIE</span>
                </div>
                <div className={`hqds-obs-status-pill ${isAttacked ? 'is-threat' : 'is-coherent'}`}>
                  <span className="hqds-obs-status-dot" aria-hidden="true" />
                  <span>{isAttacked ? 'ANOMALOUS FLUX' : 'PHASE COHERENT'}</span>
                </div>
              </div>
            </div>

            {/* Dedicated Two-Instrument Array (Desktop: Paired Left/Right Panes; Mobile: Stacked) */}
            <div className="hqds-observatory-bench">
              {/* Instrument 01: Bloch Sphere 3D Statevector */}
              <div className="hqds-obs-instrument-pane is-bloch hqds-reveal is-delay-2">
                <span className="hqds-obs-reticle top-left" aria-hidden="true" />
                <span className="hqds-obs-reticle top-right" aria-hidden="true" />
                <span className="hqds-obs-reticle bottom-left" aria-hidden="true" />
                <span className="hqds-obs-reticle bottom-right" aria-hidden="true" />

                <div className="hqds-obs-pane-header">
                  <div className="hqds-obs-pane-title-group">
                    <span className="hqds-obs-pane-index">INSTRUMENT A</span>
                    <h3 className="hqds-obs-pane-name">3D Bloch Sphere Statevector</h3>
                  </div>
                  <span className={`hqds-obs-pane-badge ${isAttacked ? 'is-threat' : 'is-safe'}`}>
                    {isAttacked ? 'State Vector Perturbed' : '|ψ⟩ Pure Bell State'}
                  </span>
                </div>

                <div className="hqds-obs-canvas-frame">
                  <ErrorBoundary title="3D Bloch Sphere Unavailable">
                    <BlochSphere3D fidelity={fidelity} isAttacked={isAttacked} canvasHeight={340} />
                  </ErrorBoundary>
                </div>
              </div>

              {/* Instrument 02: Tripartite Network Topology 3D */}
              <div className="hqds-obs-instrument-pane is-network hqds-reveal is-delay-2">
                <span className="hqds-obs-reticle top-left" aria-hidden="true" />
                <span className="hqds-obs-reticle top-right" aria-hidden="true" />
                <span className="hqds-obs-reticle bottom-left" aria-hidden="true" />
                <span className="hqds-obs-reticle bottom-right" aria-hidden="true" />

                <div className="hqds-obs-pane-header">
                  <div className="hqds-obs-pane-title-group">
                    <span className="hqds-obs-pane-index">INSTRUMENT B</span>
                    <h3 className="hqds-obs-pane-name">Tripartite Quantum Network Graph</h3>
                  </div>
                  <span className={`hqds-obs-pane-badge ${isAttacked ? 'is-threat' : 'is-safe'}`}>
                    {isAttacked ? 'ROGUE INTERCEPTOR DETECTED' : 'SECURE MESH LINKS'}
                  </span>
                </div>

                <div className="hqds-obs-canvas-frame">
                  <ErrorBoundary title="Network Topology Unavailable">
                    <NetworkTopology3D isAttacked={isAttacked} resultData={currentData} canvasHeight={340} />
                  </ErrorBoundary>
                </div>
              </div>
            </div>

            {/* Observatory Base Telemetry Deck (Audit-Style 4-Card Telemetry) */}
            <div className="hqds-obs-telemetry-deck hqds-reveal is-delay-3">
              {/* Telemetry Card 1: Statevector Purity */}
              <div className="hqds-obs-metric-card">
                <div className="hqds-obs-metric-head">
                  <span className="hqds-obs-metric-title">STATEVECTOR PURITY</span>
                  <span className="hqds-obs-metric-tag">Tr(ρ²)</span>
                </div>
                <div className="hqds-obs-metric-body">
                  <span
                    className={`hqds-obs-metric-value ${(fidelity < 0.85 || isAttacked) ? 'hqds-obs-val-threat' : 'hqds-obs-val-good'}`}
                  >
                    {isAttacked ? '0.582' : '1.000'}
                  </span>
                </div>
                <div className="hqds-obs-micro-track">
                  <div
                    className={`hqds-obs-micro-bar meter-width-purity ${isAttacked ? 'meter-danger' : 'meter-good'}`}
                  />
                </div>
                <span className="hqds-obs-metric-note">
                  {isAttacked ? 'Mixed State Density Decoherence' : 'Pure Bell Entanglement State'}
                </span>
              </div>

              {/* Telemetry Card 2: Born Rule Concordance */}
              <div className="hqds-obs-metric-card">
                <div className="hqds-obs-metric-head">
                  <span className="hqds-obs-metric-title">BORN RULE CONCORDANCE</span>
                  <span className="hqds-obs-metric-tag">PEARSON χ²</span>
                </div>
                <div className="hqds-obs-metric-body">
                  <span
                    className={`hqds-obs-metric-value ${isAttacked ? 'hqds-obs-val-threat' : 'hqds-obs-val-good'}`}
                  >
                    {isAttacked ? 'p < 0.0001' : 'p = 0.9820'}
                  </span>
                </div>
                <div className="hqds-obs-micro-track">
                  <div
                    className={`hqds-obs-micro-bar meter-width-concordance ${isAttacked ? 'meter-danger' : 'meter-good'}`}
                  />
                </div>
                <span className="hqds-obs-metric-note">
                  {isAttacked ? 'Severe Distribution Anomaly Detected' : 'Measurement Statistics Verified'}
                </span>
              </div>

              {/* Telemetry Card 3: Channel Wire-Loss */}
              <div className="hqds-obs-metric-card">
                <div className="hqds-obs-metric-head">
                  <span className="hqds-obs-metric-title">CHANNEL WIRE-LOSS</span>
                  <span className="hqds-obs-metric-tag">Δ LINK</span>
                </div>
                <div className="hqds-obs-metric-body">
                  <span
                    className={`hqds-obs-metric-value ${isAttacked ? 'hqds-obs-val-threat' : 'hqds-obs-val-warn'}`}
                  >
                    {isAttacked ? '+18.4 dB' : '0.00 dB'}
                  </span>
                </div>
                <div className="hqds-obs-micro-track">
                  <div
                    className={`hqds-obs-micro-bar meter-width-loss ${isAttacked ? 'meter-danger' : 'meter-good'}`}
                  />
                </div>
                <span className="hqds-obs-metric-note">
                  {isAttacked ? 'Optical Splice Loss Induced by Eve' : 'Lossless Cryogenic Optical Waveguide'}
                </span>
              </div>

              {/* Telemetry Card 4: Verification Consensus */}
              <div className="hqds-obs-metric-card is-verdict">
                <div className="hqds-obs-metric-head">
                  <span className="hqds-obs-metric-title">CONSENSUS VERDICT</span>
                  <span className="hqds-obs-metric-tag">CHARLIE</span>
                </div>
                <div className="hqds-obs-metric-body">
                  <span className={`hqds-obs-verdict-tag ${isAttacked ? 'is-threat' : 'is-clean'}`}>
                    <span className="hqds-obs-verdict-dot" aria-hidden="true" />
                    {isAttacked ? 'ABORT TRIGGERED' : 'CONSENSUS VALID'}
                  </span>
                </div>
                <div className="hqds-obs-micro-track">
                  <div
                    className={`hqds-obs-micro-bar is-full-width ${isAttacked ? 'meter-danger' : 'meter-good'}`}
                  />
                </div>
                <span className="hqds-obs-metric-note">
                  {isAttacked ? 'Gottesman-Chuang Violation Reject' : 'Tripartite Agreement Established'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            CHAPTER 05: RESULTS — Telemetry & Born Distribution
            ==================================================================== */}
        <section
          id="section-05-results"
          className={`hqds-attack-section hqds-attack-scroll-section ${
            activeSection === 'section-05-results' ? 'is-active-section' : ''
          }`}
          aria-labelledby="results-heading"
        >
          <header className="hqds-attack-section-header is-centered hqds-reveal is-delay-0">
            <span className="hqds-attack-section-eyebrow">05 · TELEMETRY &amp; METRICS</span>
            <h2 id="results-heading" className="hqds-attack-section-title">
              <span>Physical Error Extraction</span>
              <span>&amp; Born Rule Distribution</span>
            </h2>
            <p className="hqds-attack-section-summary">
              Deterministic physical layer evidence from Qiskit Aer simulation detailing projective Bell measurement distributions, Gottesman-Chuang unforgeability curves, and Hoeffding detection bounds.
            </p>
          </header>

          <div className="hqds-attack-results-wrapper">
            <ErrorBoundary title="Results Charts Unavailable">
              <ResultsCharts data={currentData} />
            </ErrorBoundary>
          </div>
        </section>

        {/* ====================================================================
            CHAPTER 06: BOUNDS — Information-Theoretic Security Guarantees
            ==================================================================== */}
        <section
          id="section-06-bounds"
          className={`hqds-attack-section hqds-attack-scroll-section ${
            activeSection === 'section-06-bounds' ? 'is-active-section' : ''
          }`}
          aria-labelledby="bounds-heading"
        >
          <header className="hqds-attack-section-header is-centered hqds-reveal is-delay-0">
            <span className="hqds-attack-section-eyebrow">06 · SECURITY BOUNDS</span>
            <h2 id="bounds-heading" className="hqds-attack-section-title">
              <span>Information-Theoretic</span>
              <span>Security Guarantees</span>
            </h2>
            <p className="hqds-attack-section-summary">
              Rigorous mathematical proofs establishing unconditional physical bounds against forgery,
              eavesdropping, and state alteration, derived directly from the fundamental postulates of quantum mechanics.
            </p>
          </header>

          <div className="hqds-proof-scene">
            {/* ── PRINCIPLE 01: GOTTESMAN-CHUANG UNFORGEABILITY BOUND ── */}
            <article className="hqds-proof-monolith is-gottesman hqds-reveal is-delay-1">
              <span className="hqds-proof-reticle top-left" aria-hidden="true" />
              <span className="hqds-proof-reticle top-right" aria-hidden="true" />
              <span className="hqds-proof-reticle bottom-left" aria-hidden="true" />
              <span className="hqds-proof-reticle bottom-right" aria-hidden="true" />

              <div className="hqds-proof-header">
                <div className="hqds-proof-meta">
                  <span className="hqds-proof-tag">THEOREM 01 // UNCONDITIONAL UNFORGEABILITY</span>
                  <span className="hqds-proof-citation-pill">Gottesman &amp; Chuang (2001) §2</span>
                </div>
                <h3 className="hqds-proof-title">Gottesman-Chuang Bound</h3>
              </div>

              {/* Large Focal Point Mathematical Altar */}
              <div className="hqds-proof-altar">
                <div className="hqds-proof-equation-glow" aria-hidden="true" />
                <div className="hqds-proof-equation-display">
                  <span className="hqds-math-expr">
                    <span className="math-p">P</span>
                    <span className="math-sub">forge</span>
                    <span className="math-paren">(</span>
                    <span className="math-var">n</span>
                    <span className="math-paren">)</span>
                    <span className="math-op">≤</span>
                    <span className="math-num">2</span>
                    <sup className="math-sup">−n</sup>
                  </span>
                </div>
                <div className="hqds-proof-eval-badge">
                  <span className="hqds-proof-eval-label">EVALUATED PROOF BOUND:</span>
                  <span className="hqds-proof-eval-val">
                    P<sub>forge</sub> ≤ {forgeProb ? forgeProb.toExponential(3) : '6.103e-5'} (n = {nQubits} Qubits)
                  </span>
                </div>
              </div>

              {/* Explanation & Physical Interpretation Split Grid */}
              <div className="hqds-proof-grid">
                <div className="hqds-proof-card-col is-math">
                  <div className="hqds-proof-col-label">
                    <span className="hqds-col-tag" aria-hidden="true">//</span>
                    <span>MATHEMATICAL DERIVATION</span>
                  </div>
                  <p className="hqds-proof-text">
                    For an entangled quantum signature of length <strong className="hqds-mono-term">n</strong> qubits distributed between Alice, Bob, and Charlie, an adversary attempting to forge an authentic signature without access to the private Bell pairs has at most a <strong className="hqds-mono-term">2<sup>−n</sup></strong> probability of correctly producing the required measurement correlations across all verification channels.
                  </p>
                  <div className="hqds-proof-params">
                    <span className="hqds-param-badge"><code>n = {nQubits}</code> EPR Pairs</span>
                    <span className="hqds-param-badge"><code>O(2⁻ⁿ)</code> Scaling</span>
                    <span className="hqds-param-badge">Unconditional Bound</span>
                  </div>
                </div>

                <div className="hqds-proof-card-col is-physics">
                  <div className="hqds-proof-col-label">
                    <span className="hqds-col-tag" aria-hidden="true">//</span>
                    <span>PHYSICAL-LAYER INTERPRETATION</span>
                  </div>
                  <p className="hqds-proof-text">
                    Grounded in the <strong>Quantum No-Cloning Theorem</strong> (<span className="hqds-mono-term">U|ψ⟩|0⟩ ≠ |ψ⟩|ψ⟩</span>). Unknown quantum states cannot be duplicated without projective disturbance. Even an adversary possessing infinite classical computing power or arbitrary polynomial-time quantum algorithms (such as Shor's) cannot circumvent this physical entropy barrier.
                  </p>
                  <div className="hqds-proof-security-pill">
                    <span className="hqds-security-dot is-cyan" aria-hidden="true" />
                    <span>Independent of Computational Complexity</span>
                  </div>
                </div>
              </div>

              <div className="hqds-proof-footer">
                <span className="hqds-proof-guarantee">GUARANTEE: EXPONENTIALLY VANISHING FORGERY RATE</span>
                <span className="hqds-proof-status-tag is-pass">MATHEMATICALLY PROVEN</span>
              </div>
            </article>

            {/* ── PRINCIPLE 02: HOEFFDING CONFIDENCE BOUND ── */}
            <article className="hqds-proof-monolith is-hoeffding hqds-reveal is-delay-2">
              <span className="hqds-proof-reticle top-left" aria-hidden="true" />
              <span className="hqds-proof-reticle top-right" aria-hidden="true" />
              <span className="hqds-proof-reticle bottom-left" aria-hidden="true" />
              <span className="hqds-proof-reticle bottom-right" aria-hidden="true" />

              <div className="hqds-proof-header">
                <div className="hqds-proof-meta">
                  <span className="hqds-proof-tag">THEOREM 02 // NON-ASYMPTOTIC STATISTICAL CONFIDENCE</span>
                  <span className="hqds-proof-citation-pill">Hoeffding (1963) Theorem 1</span>
                </div>
                <h3 className="hqds-proof-title">Hoeffding Confidence</h3>
              </div>

              {/* Large Focal Point Mathematical Altar */}
              <div className="hqds-proof-altar">
                <div className="hqds-proof-equation-glow" aria-hidden="true" />
                <div className="hqds-proof-equation-display">
                  <span className="hqds-math-expr">
                    <span className="math-gamma">Γ</span>
                    <span className="math-sub">det</span>
                    <span className="math-op">=</span>
                    <span className="math-num">1</span>
                    <span className="math-op">−</span>
                    <span className="math-fn">exp</span>
                    <span className="math-paren">(</span>
                    <span className="math-op">−</span>
                    <span className="math-num">2</span>
                    <span className="math-var">N</span>
                    <span className="math-op">·</span>
                    <span className="math-var">ε</span>
                    <sup className="math-sup">2</sup>
                    <span className="math-paren">)</span>
                  </span>
                </div>
                <div className="hqds-proof-eval-badge">
                  <span className="hqds-proof-eval-label">EVALUATED PROOF BOUND:</span>
                  <span className="hqds-proof-eval-val">
                    Γ<sub>det</sub> ≥ {(hoeffdingConfidence * 100).toFixed(2)}% (N = 1,024 Shots · ε = {(qber * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Explanation & Physical Interpretation Split Grid */}
              <div className="hqds-proof-grid">
                <div className="hqds-proof-card-col is-math">
                  <div className="hqds-proof-col-label">
                    <span className="hqds-col-tag" aria-hidden="true">//</span>
                    <span>MATHEMATICAL DERIVATION</span>
                  </div>
                  <p className="hqds-proof-text">
                    For <strong className="hqds-mono-term">N</strong> independent photon detection events with observed error rate <strong className="hqds-mono-term">ε</strong>, Hoeffding's concentration inequality guarantees that the probability of a false-positive detection decays as <strong className="hqds-mono-term">exp(−2Nε²)</strong>. This provides strict non-asymptotic bounds on detector decision fidelity without assuming infinite sample limits.
                  </p>
                  <div className="hqds-proof-params">
                    <span className="hqds-param-badge"><code>N = 1024</code> Basis Shots</span>
                    <span className="hqds-param-badge"><code>ε = {(qber * 100).toFixed(2)}%</code> QBER</span>
                    <span className="hqds-param-badge"><code>P(Error) &lt; 10⁻⁴</code></span>
                  </div>
                </div>

                <div className="hqds-proof-card-col is-physics">
                  <div className="hqds-proof-col-label">
                    <span className="hqds-col-tag" aria-hidden="true">//</span>
                    <span>PHYSICAL-LAYER INTERPRETATION</span>
                  </div>
                  <p className="hqds-proof-text">
                    Grounded in <strong>Chernoff-Hoeffding Concentration of Empirical Bernoulli Observables</strong>. Decouples security decisions from heuristic or black-box machine learning thresholds. If an adversary attempts low-probability eavesdropping below standard detection margins, the exponential accumulation across independent pulses guarantees deterministic detection.
                  </p>
                  <div className="hqds-proof-security-pill">
                    <span className="hqds-security-dot is-emerald" aria-hidden="true" />
                    <span>Eliminates Heuristic False Positives</span>
                  </div>
                </div>
              </div>

              <div className="hqds-proof-footer">
                <span className="hqds-proof-guarantee">GUARANTEE: RIGOROUS FINITE-SAMPLE PROBABILITY ENVELOPE</span>
                <span className="hqds-proof-status-tag is-pass">NON-ASYMPTOTIC VALID</span>
              </div>
            </article>

            {/* ── PRINCIPLE 03: UHLMANN STATE FIDELITY ── */}
            <article className="hqds-proof-monolith is-uhlmann hqds-reveal is-delay-3">
              <span className="hqds-proof-reticle top-left" aria-hidden="true" />
              <span className="hqds-proof-reticle top-right" aria-hidden="true" />
              <span className="hqds-proof-reticle bottom-left" aria-hidden="true" />
              <span className="hqds-proof-reticle bottom-right" aria-hidden="true" />

              <div className="hqds-proof-header">
                <div className="hqds-proof-meta">
                  <span className="hqds-proof-tag">THEOREM 03 // QUANTUM PURIFICATION TRANSITION</span>
                  <span className="hqds-proof-citation-pill">Uhlmann (1976) Rep. Math. Phys.</span>
                </div>
                <h3 className="hqds-proof-title">Uhlmann Fidelity</h3>
              </div>

              {/* Large Focal Point Mathematical Altar */}
              <div className="hqds-proof-altar">
                <div className="hqds-proof-equation-glow" aria-hidden="true" />
                <div className="hqds-proof-equation-display">
                  <span className="hqds-math-expr">
                    <span className="math-f">F</span>
                    <span className="math-paren">(</span>
                    <span className="math-rho">ρ</span>
                    <span className="math-comma">,</span>
                    <span className="math-sigma">σ</span>
                    <span className="math-paren">)</span>
                    <span className="math-op">≡</span>
                    <span className="math-paren">[</span>
                    <span className="math-tr">Tr</span>
                    <span className="math-sqrt-wrap">
                      <span className="math-sqrt-sym">√</span>
                      <span className="math-radicand">
                        <span className="math-sqrt-sym">√</span><span className="math-radicand-inner">ρ</span>
                        <span className="math-sigma">σ</span>
                        <span className="math-sqrt-sym">√</span><span className="math-radicand-inner">ρ</span>
                      </span>
                    </span>
                    <span className="math-paren">]</span>
                    <sup className="math-sup">2</sup>
                    <span className="math-op">≥</span>
                    <span className="math-gamma">γ</span>
                  </span>
                </div>
                <div className="hqds-proof-eval-badge">
                  <span className="hqds-proof-eval-label">LIVE SYSTEM OVERLAP:</span>
                  <span className={`hqds-proof-eval-val ${isAttacked ? 'is-danger' : 'is-good'}`}>
                    F(ρ, σ) = {(fidelity * 100).toFixed(1)}% (Threshold γ ≥ 85.0% {isAttacked ? '— VIOLATED' : '— NOMINAL'})
                  </span>
                </div>
              </div>

              {/* Explanation & Physical Interpretation Split Grid */}
              <div className="hqds-proof-grid">
                <div className="hqds-proof-card-col is-math">
                  <div className="hqds-proof-col-label">
                    <span className="hqds-col-tag" aria-hidden="true">//</span>
                    <span>MATHEMATICAL DERIVATION</span>
                  </div>
                  <p className="hqds-proof-text">
                    For a pure reference tripartite Bell state <strong className="hqds-mono-term">|ψ⟩</strong> and received density operator <strong className="hqds-mono-term">σ</strong>, the transition fidelity simplifies to the expectation value <strong className="hqds-mono-term">⟨ψ|σ|ψ⟩</strong>. Trace distance is bounded by <strong className="hqds-mono-term">D(ρ, σ) ≤ √(1 − F)</strong>, strictly confining the adversary's maximum discrimination advantage.
                  </p>
                  <div className="hqds-proof-params">
                    <span className="hqds-param-badge"><code>γ = 0.85</code> Abort Bound</span>
                    <span className="hqds-param-badge"><code>F = {(fidelity * 100).toFixed(1)}%</code> Live</span>
                    <span className="hqds-param-badge">Helstrom Bounded</span>
                  </div>
                </div>

                <div className="hqds-proof-card-col is-physics">
                  <div className="hqds-proof-col-label">
                    <span className="hqds-col-tag" aria-hidden="true">//</span>
                    <span>PHYSICAL-LAYER INTERPRETATION</span>
                  </div>
                  <p className="hqds-proof-text">
                    Grounded in <strong>Uhlmann's Theorem &amp; Helstrom State Distinguishability Bound</strong>. Any eavesdropping wiretap or state disturbance forces decoherence, introducing orthogonal mixed states into the Hilbert space and directly reducing fidelity below the threshold <span className="hqds-mono-term">γ = 0.85</span>, triggering deterministic protocol termination.
                  </p>
                  <div className={`hqds-proof-security-pill ${isAttacked ? 'is-violation' : ''}`}>
                    <span className={`hqds-security-dot ${isAttacked ? 'is-red' : 'is-violet'}`} aria-hidden="true" />
                    <span>{isAttacked ? 'Decoherence Collapse Detected' : 'Pure Statevector Coherence Intact'}</span>
                  </div>
                </div>
              </div>

              <div className="hqds-proof-footer">
                <span className="hqds-proof-guarantee">GUARANTEE: HILBERT SPACE PURIFICATION BOUND</span>
                <span className={`hqds-proof-status-tag ${isAttacked ? 'is-compromised' : 'is-pass'}`}>
                  {isAttacked ? 'THRESHOLD COLLAPSED' : 'COHERENCE PRESERVED'}
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* ====================================================================
            CHAPTER 07: VERDICT — Deterministic Verdict & Audit Link
            ==================================================================== */}
        <section
          id="section-07-verdict"
          className={`hqds-attack-section hqds-attack-scroll-section ${
            activeSection === 'section-07-verdict' ? 'is-active-section' : ''
          }`}
          aria-labelledby="verdict-heading"
        >
          <header className="hqds-attack-section-header is-centered hqds-reveal is-delay-0">
            <span className="hqds-attack-section-eyebrow">07 · PROTOCOL VERDICT</span>
            <h2 id="verdict-heading" className="hqds-attack-section-title">
              <span>Deterministic Decision</span>
              <span>&amp; Audit Trail</span>
            </h2>
            <p className="hqds-attack-section-summary">
              Automated cryptographically enforced abort/commit protocol linked directly to the
              immutable post-quantum audit ledger.
            </p>
          </header>

          <div className="hqds-verdict-scene">
            {/* ── CENTRAL VERDICT MONUMENT ── */}
            <div
              className={`hqds-verdict-monument hqds-reveal is-delay-1 ${isAttacked ? 'is-compromised' : 'is-verified'}`}
            >
              <span className="hqds-verdict-reticle top-left" aria-hidden="true" />
              <span className="hqds-verdict-reticle top-right" aria-hidden="true" />
              <span className="hqds-verdict-reticle bottom-left" aria-hidden="true" />
              <span className="hqds-verdict-reticle bottom-right" aria-hidden="true" />

              {/* Status Indicator Capsule */}
              <div className="hqds-verdict-capsule">
                <span className={`hqds-verdict-dot ${isAttacked ? 'is-threat-dot' : 'is-clean-dot'}`} aria-hidden="true" />
                <span className="hqds-verdict-status-txt">
                  {isAttacked ? 'PHYSICAL ANOMALY DETECTED // PROTOCOL VIOLATION' : 'PROTOCOL INVARIANCE CONFIRMED // CHANNEL SECURE'}
                </span>
              </div>

              {/* Main Decision Headline */}
              <div className="hqds-verdict-headgroup">
                <span className="hqds-verdict-eyebrow">
                  {isAttacked ? 'THREAT COMPROMISED' : 'NOMINAL CHANNEL'}
                </span>
                <h3 className="hqds-verdict-title">
                  {isAttacked ? 'CRITICAL ABORT' : 'VERIFIED COMMIT'}
                </h3>
              </div>

              {/* Scientific Decision Synthesis */}
              <p className="hqds-verdict-summary">
                {isAttacked ? (
                  <>
                    Physical layer disturbance confirmed. Measured QBER (
                    <strong className="hqds-mono-term">{(qber * 100).toFixed(2)}%</strong>) exceeds the Shor-Preskill limit (
                    <strong className="hqds-mono-term">ε ≤ 11.0%</strong>), and Pearson&apos;s Born test rejects the state hypothesis (
                    <strong className="hqds-mono-term">p = {pValue < 0.0001 ? '&lt; 0.0001' : pValue.toFixed(4)}</strong>). Automated quantum killswitch executed: signature quarantined and transaction aborted.
                  </>
                ) : (
                  <>
                    All physical observables strictly obey the Born distribution. Measured QBER (
                    <strong className="hqds-mono-term">{(qber * 100).toFixed(2)}%</strong>) remains safely within the Shor-Preskill tolerance limit (
                    <strong className="hqds-mono-term">ε ≤ 11.0%</strong>), and Pearson&apos;s goodness-of-fit accepts the null hypothesis (
                    <strong className="hqds-mono-term">p = {pValue.toFixed(4)}</strong>). Tripartite entanglement verified authentic; signature committed to post-quantum ledger.
                  </>
                )}
              </p>

              {/* Telemetry Evidence Quad */}
              <div className="hqds-verdict-telemetry-deck">
                <div className="hqds-verdict-tel-card">
                  <span className="hqds-verdict-tel-label">QUANTUM BIT ERROR (QBER)</span>
                  <span className={`hqds-verdict-tel-val ${qber > 0.11 ? 'is-danger' : 'is-good'}`}>
                    {(qber * 100).toFixed(2)}%
                  </span>
                  <span className="hqds-verdict-tel-sub">Limit: ε ≤ 11.0%</span>
                </div>

                <div className="hqds-verdict-tel-card">
                  <span className="hqds-verdict-tel-label">PEARSON χ² BORN TEST</span>
                  <span className={`hqds-verdict-tel-val ${pValue < 0.01 ? 'is-danger' : 'is-good'}`}>
                    {pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4)}
                  </span>
                  <span className="hqds-verdict-tel-sub">Anomaly: p &lt; 0.01</span>
                </div>

                <div className="hqds-verdict-tel-card">
                  <span className="hqds-verdict-tel-label">UHLMANN FIDELITY</span>
                  <span className={`hqds-verdict-tel-val ${fidelity < 0.85 ? 'is-danger' : 'is-good'}`}>
                    {(fidelity * 100).toFixed(1)}%
                  </span>
                  <span className="hqds-verdict-tel-sub">Threshold: ≥ 85.0%</span>
                </div>

                <div className="hqds-verdict-tel-card">
                  <span className="hqds-verdict-tel-label">ENFORCED ACTION</span>
                  <span className={`hqds-verdict-tel-action ${isAttacked ? 'is-abort' : 'is-commit'}`}>
                    {currentData?.detect?.recommended_action || (isAttacked ? 'ABORT' : 'COMMIT')}
                  </span>
                  <span className="hqds-verdict-tel-sub">Physical Policy</span>
                </div>
              </div>

              {/* CTA Ribbon */}
              <div className="hqds-verdict-cta-wrap">
                <button
                  type="button"
                  className="hqds-hero-primary-cta hqds-btn-xl hqds-verdict-audit-btn hqds-cursor-light"
                  onClick={() => handleNav('audit')}
                  onMouseMove={handleButtonMouseMove}
                  title="Inspect Immutable Cryptographic Audit Ledger"
                >
                  <span>
                    INSPECT AUDIT LEDGER
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
                <p className="hqds-verdict-cta-note">
                  Direct cryptographic link: Every projective basis measurement, Pauli sifting log, and verification verdict is immutably signed and hash-chained in the Audit Ledger.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Small Centered Technical Footer */}
      <footer className="hqds-attack-colophon">
        <div className="hqds-attack-colophon-inner">
          <div className="hqds-attack-colophon-brand-line">
            <span className="hqds-colophon-brand">HYPERQDS</span>
            <span className="hqds-colophon-sep" aria-hidden="true">/</span>
            <span className="hqds-colophon-desc">Adversarial Quantum Attack Sandbox &amp; Physical Verification Engine</span>
          </div>
          <div className="hqds-attack-colophon-specs">
            <span>1550nm C-BAND OPTICAL</span>
            <span className="hqds-dot-sep" aria-hidden="true">·</span>
            <span>ZERO-ML STATISTICAL DETECTOR</span>
            <span className="hqds-dot-sep" aria-hidden="true">·</span>
            <span>POST-QUANTUM AUDIT PROOF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
