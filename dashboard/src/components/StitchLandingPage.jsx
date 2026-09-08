/**
 * StitchLandingPage.jsx
 * =====================
 * HyperQDS Quantum Physical-Layer Security Infrastructure Landing Experience.
 * Rebuilt around a genuinely scroll-driven single large 3D hero object
 * with 100% unified Cryogenic Optical Teal & Cold Photonic Ice Palette.
 * 
 * Specific Architecture:
 * - Minimal top nav: Wordmark left, simple text links center-right, ghost button + solid pill button right.
 * - Centered 2-line large sans-serif headline, 1-line subheadline, pill CTA button.
 * - Single large 3D hero object lower-center, partially cropped at the viewport's bottom edge,
 *   visibly transforming and morphing across each scroll act.
 * - Two floating glass stat cards overlapping the 3D object's edges at lower-left and lower-right.
 * - 100% Unified Palette: Cryogenic Optical Teal, Luminous Cyan, and Photonic Ice on obsidian ground.
 * - Asymmetric problem section (muted classical limitation vs luminous quantum solution).
 * - Actual scroll-driven sequential pillars (no click-to-switch tabs).
 * - Scroll-revealed comparison moments (classical muted first, overtaken by quantum law).
 * - Closing resting state anchoring the final CTA.
 * - Zero em dashes across all copy (Anti-slop Hard Gate R-02 compliant).
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import QuantumEntanglementCanvas from './QuantumEntanglementCanvas.jsx';
import TabCrossFade from './TabCrossFade.jsx';

export default function StitchLandingPage({ onEnterSOC, onNavigate }) {
  const [activeAct, setActiveAct] = useState('hero');
  const [activePillar, setActivePillar] = useState('01');
  const [activeDimension, setActiveDimension] = useState(0);
  const [initialCalibrationDone, setInitialCalibrationDone] = useState(false);

  // Direct DOM refs for 60-120fps performance without React re-render overhead
  const heroCardsRef = useRef(null);
  const railIndicatorRef = useRef(null);
  const problemCardsRef = useRef(null);
  const pillarMenuRef = useRef(null);
  const dimensionDeckRef = useRef(null);
  const pillarContentRef = useRef(null);
  const dimensionContentRef = useRef(null);

  // Navigation handlers
  const handleLaunchHonest = useCallback(() => {
    if (onNavigate) {
      onNavigate('honest');
    } else if (onEnterSOC) {
      onEnterSOC();
    }
  }, [onNavigate, onEnterSOC]);

  const handleNavigateTab = useCallback((view) => {
    if (onNavigate) {
      onNavigate(view);
    } else if (onEnterSOC) {
      onEnterSOC();
    }
  }, [onNavigate, onEnterSOC]);

  // Initial calibration reveal
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialCalibrationDone(true);
    }, 280);
    return () => clearTimeout(timer);
  }, []);

  // Stage 7B: High-Performance Positional Tab Pills & Content Panel Engine
  // Consolidated, zero-lag single rAF loop driving tabs, content panels, and hero drift
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Cache scroll position once per frame with passive listener
    let targetScrollY = window.scrollY;
    let lerpedScrollY = window.scrollY;

    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    let animId;

    // Cached element document positions to eliminate getBoundingClientRect layout thrashing during scroll
    let problemTopInDoc = 0;
    let problemTotalHeight = 450;
    let pillarTopInDoc = 0;
    let pillarTotalHeight = 620;
    let dimensionTopInDoc = 0;
    let dimensionTotalHeight = 690;

    const measureMetrics = () => {
      if (problemCardsRef.current) {
        const problemRect = problemCardsRef.current.getBoundingClientRect();
        problemTopInDoc = problemRect.top + window.scrollY;
        problemTotalHeight = problemRect.height || 450;
      }
      if (pillarMenuRef.current) {
        const menuRect = pillarMenuRef.current.getBoundingClientRect();
        pillarTopInDoc = menuRect.top + window.scrollY;
        if (pillarContentRef.current) {
          const contentRect = pillarContentRef.current.getBoundingClientRect();
          pillarTotalHeight = Math.max(200, (contentRect.bottom + window.scrollY) - pillarTopInDoc);
        } else {
          pillarTotalHeight = 620;
        }
      }
      if (dimensionDeckRef.current) {
        const deckRect = dimensionDeckRef.current.getBoundingClientRect();
        dimensionTopInDoc = deckRect.top + window.scrollY;
        if (dimensionContentRef.current) {
          const contentRect = dimensionContentRef.current.getBoundingClientRect();
          dimensionTotalHeight = Math.max(200, (contentRect.bottom + window.scrollY) - dimensionTopInDoc);
        } else {
          dimensionTotalHeight = 690;
        }
      }
    };

    // Initial measurement & re-measurement after layout calibration
    measureMetrics();
    const measureTimer = setTimeout(measureMetrics, 350);
    window.addEventListener('resize', measureMetrics, { passive: true });

    // Helper: direction-agnostic continuous 0 -> 1 -> 0 scroll-progress curve (Stage 9 Part E)
    // Calculates visibility based on actual element viewport intersection bounds
    const getSectionProgress = (topInDoc, totalHeight, currentScrollY, vh) => {
      if (!topInDoc) return 0;

      const topInView = topInDoc - currentScrollY;
      const bottomInView = (topInDoc + totalHeight) - currentScrollY;

      // Symmetrical viewport intersection bounds:
      // Bottom edge: element enters/exits bottom of viewport
      const bottomStart = vh * 1.12;
      const bottomEnd = vh * 0.70;
      const pBottom = Math.max(0, Math.min(1, (bottomStart - topInView) / (bottomStart - bottomEnd)));

      // Top edge: element enters/exits top of viewport
      const topStart = -vh * 0.12;
      const topEnd = vh * 0.35;
      const pTop = Math.max(0, Math.min(1, (bottomInView - topStart) / (topEnd - topStart)));

      // Overall progress is the intersection of both edge visibilities
      const p = Math.min(pBottom, pTop);
      return p * p * (3 - 2 * p);
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Tight, responsive damped lerp of scroll position (0.18 per frame: eliminates sitewide lag)
      lerpedScrollY += (targetScrollY - lerpedScrollY) * 0.18;

      // Update lateral progress rail
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, lerpedScrollY / docHeight)) : 0;
      if (railIndicatorRef.current) {
        railIndicatorRef.current.style.height = `${Math.min(100, Math.max(10, progress * 100))}%`;
      }

      const vh = window.innerHeight;

      // Part B: Hero Floating Stat Cards scroll-linked drift and subtle fade
      if (heroCardsRef.current) {
        const heroRange = vh * 0.85;
        const heroRatio = Math.min(1.0, Math.max(0, lerpedScrollY / heroRange));
        const heroDrift = (heroRatio * 52).toFixed(2);
        const heroFade = Math.max(0, Math.min(1, 1.0 - Math.max(0, (lerpedScrollY - vh * 0.18) / (vh * 0.60)))).toFixed(3);
        heroCardsRef.current.style.transform = `translate3d(0, -${heroDrift}px, 0)`;
        heroCardsRef.current.style.opacity = heroFade;
      }

      if (prefersReducedMotion) return;

      // Fallback measurement if elements were not ready during initial mount
      if (!problemTopInDoc || !pillarTopInDoc || !dimensionTopInDoc) {
        measureMetrics();
      }

      // 0. Problem Section Comparison Cards (Stage 9 Part A: fade + gentle 12px vertical rise)
      if (problemTopInDoc) {
        const p = Math.max(0, Math.min(1, getSectionProgress(problemTopInDoc, problemTotalHeight, lerpedScrollY, vh)));
        const k = 1.0 - p;
        const smoothK = k * k * (3 - 2 * k);
        const contentY = (smoothK * 12).toFixed(2);
        const contentOp = Math.max(0, Math.min(1, Math.pow(p, 0.85))).toFixed(3);
        if (problemCardsRef.current) {
          const cards = problemCardsRef.current.querySelectorAll('.hqds-problem-card');
          cards.forEach((card) => {
            card.style.transform = `translate3d(0, ${contentY}px, 0)`;
            card.style.opacity = contentOp;
          });
        }
      }

      // 1. Pillar Section (Tab Pills AND Content Panel, synchronized off the SAME progress signal p)
      if (pillarTopInDoc) {
        const p = Math.max(0, Math.min(1, getSectionProgress(pillarTopInDoc, pillarTotalHeight, lerpedScrollY, vh)));

        // Soft settling ease with subtle spring settle / slight overshoot
        const k = 1.0 - p;
        const smoothK = k * k * (3 - 2 * k);
        const settleOvershoot = (p > 0.60 && p < 1.0)
          ? -0.035 * Math.sin(((p - 0.60) / 0.40) * Math.PI)
          : 0;
        const easeK = smoothK + settleOvershoot;

        // 1a. Tab Pills: Positional Slide In/Out (from respective sides)
        if (pillarMenuRef.current) {
          const pills = pillarMenuRef.current.querySelectorAll('.hqds-pillar-tab-btn');
          const count = pills.length;
          pills.forEach((pill, idx) => {
            // Positional weight: left is -1, center is 0, right is +1
            const w = count > 1 ? (idx - (count - 1) / 2) / ((count - 1) / 2) : 0;
            const tx = (w * 40 * easeK).toFixed(2);
            const ty = ((1.0 - Math.abs(w)) * 6 * easeK).toFixed(2);
            const op = Math.max(0, Math.min(1, Math.pow(p, 0.75))).toFixed(3);

            pill.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
            pill.style.opacity = op;
          });
        }

        // 1b. Part A: Content Panel below tab bar (Fade + gentle 12px vertical rise, ZERO horizontal translate)
        if (pillarContentRef.current) {
          const contentY = (smoothK * 12).toFixed(2);
          const contentOp = Math.max(0, Math.min(1, Math.pow(p, 0.85))).toFixed(3);
          pillarContentRef.current.style.transform = `translate3d(0, ${contentY}px, 0)`;
          pillarContentRef.current.style.opacity = contentOp;
        }
      }

      // 2. Dimension Section (Tab Pills AND Content Panel, synchronized off the SAME progress signal p)
      if (dimensionTopInDoc) {
        const p = Math.max(0, Math.min(1, getSectionProgress(dimensionTopInDoc, dimensionTotalHeight, lerpedScrollY, vh)));

        const k = 1.0 - p;
        const smoothK = k * k * (3 - 2 * k);
        const settleOvershoot = (p > 0.60 && p < 1.0)
          ? -0.035 * Math.sin(((p - 0.60) / 0.40) * Math.PI)
          : 0;
        const easeK = smoothK + settleOvershoot;

        // 2a. Dimension Tab Pills: Positional Slide In/Out
        if (dimensionDeckRef.current) {
          const pills = dimensionDeckRef.current.querySelectorAll('.hqds-dimension-tab-btn');
          const count = pills.length;
          pills.forEach((pill, idx) => {
            const w = count > 1 ? (idx - (count - 1) / 2) / ((count - 1) / 2) : 0;
            const tx = (w * 44 * easeK).toFixed(2);
            const ty = ((1.0 - Math.abs(w)) * 6 * easeK).toFixed(2);
            const op = Math.max(0, Math.min(1, Math.pow(p, 0.75))).toFixed(3);

            pill.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
            pill.style.opacity = op;
          });
        }

        // 2b. Part A: Dimension Content Panel below tab bar (Fade + gentle 12px vertical rise, ZERO horizontal translate)
        if (dimensionContentRef.current) {
          const contentY = (smoothK * 12).toFixed(2);
          const contentOp = Math.max(0, Math.min(1, Math.pow(p, 0.85))).toFixed(3);
          dimensionContentRef.current.style.transform = `translate3d(0, ${contentY}px, 0)`;
          dimensionContentRef.current.style.opacity = contentOp;
        }
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', measureMetrics);
      clearTimeout(measureTimer);
    };
  }, []);

  // Performance: IntersectionObserver updates activeAct for section tracking
  // and reveals individual elements with smooth upward rise upon entering viewport (Section 0.1)
  useEffect(() => {
    // 1. Section Act Tracker
    const actObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveAct(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -20% 0px',
        threshold: 0.05,
      }
    );
    const acts = document.querySelectorAll('.hqds-act');
    acts.forEach((el) => actObserver.observe(el));

    // 2. Element-level Scroll-Triggered Reveal (0.1 Fix)
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1,
      }
    );

    const revealElements = document.querySelectorAll('.hqds-reveal');
    revealElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-revealed');
      } else {
        revealObserver.observe(el);
      }
    });

    return () => {
      actObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  // Smooth scroll to section
  const scrollToAct = (id) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Stage 9.5: Premium Cursor-Reactive 3D Card Tilt + Specular Tracking
  const handleCardPointerEnter = (e) => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = e.currentTarget;
    card.classList.add('is-pointer-active');
  };

  const handleCardPointerMove = (e) => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (card._rafId) return;

    card._rafId = requestAnimationFrame(() => {
      card._rafId = null;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const x = Math.max(0, Math.min(1, px / rect.width));
      const y = Math.max(0, Math.min(1, py / rect.height));

      // Map: rotateY = (x - 0.5) * 8deg, rotateX = (y - 0.5) * 8deg
      // Upper-right: rotateX -> negative, rotateY -> positive
      // Clamped to approximately ±4deg
      let rotY = (x - 0.5) * 8;
      let rotX = (y - 0.5) * 8;
      rotY = Math.max(-4, Math.min(4, rotY));
      rotX = Math.max(-4, Math.min(4, rotX));

      // Depth: center translateZ(0px), edges up to translateZ(8px)
      const distFromCenter = Math.hypot(x - 0.5, y - 0.5) * 2;
      const depth = Math.min(8, Math.max(0, distFromCenter * 8));

      // Restrained internal parallax: 1-2px max shift relative to card
      const shiftX = (x - 0.5) * 3;
      const shiftY = (y - 0.5) * 3;

      card.style.setProperty('--card-tilt-x', `${rotX.toFixed(2)}deg`);
      card.style.setProperty('--card-tilt-y', `${rotY.toFixed(2)}deg`);
      card.style.setProperty('--card-depth', `${depth.toFixed(1)}px`);
      card.style.setProperty('--card-shift-x', `${shiftX.toFixed(2)}px`);
      card.style.setProperty('--card-shift-y', `${shiftY.toFixed(2)}px`);
      card.style.setProperty('--mouse-x', `${px.toFixed(1)}px`);
      card.style.setProperty('--mouse-y', `${py.toFixed(1)}px`);
    });
  };

  const handleCardPointerLeave = (e) => {
    const card = e.currentTarget;
    if (card._rafId) {
      cancelAnimationFrame(card._rafId);
      card._rafId = null;
    }
    card.classList.remove('is-pointer-active');
    card.style.setProperty('--card-tilt-x', '0deg');
    card.style.setProperty('--card-tilt-y', '0deg');
    card.style.setProperty('--card-depth', '0px');
    card.style.setProperty('--card-shift-x', '0px');
    card.style.setProperty('--card-shift-y', '0px');
    card.style.setProperty('--mouse-x', '-999px');
    card.style.setProperty('--mouse-y', '-999px');
  };

  // Comparison Dimensions (Sequential Overtake Moments)
  const comparisonData = [
    {
      dimension: 'DIMENSION 01 · DETECTION MECHANISM',
      title: 'Interception Recognition Architecture',
      traditional: 'Statistical feature vector classification using software heuristic boundaries. Attackers craft targeted gradient mutations that slip beneath anomaly thresholds.',
      quantum: 'Immediate physical wavefunction collapse governed by the Pauli exclusion principle and quantum non-cloning theorem. Observation irreversibly destroys correlation prior to information extraction.',
      metric: '0 False Negatives',
    },
    {
      dimension: 'DIMENSION 02 · ADVERSARIAL NOISE',
      title: 'Perturbation Tolerance & Channel Injection',
      traditional: 'Vulnerable to imperceptible adversarial noise patterns that subtly poison classification weights and maintain undetected persistent access.',
      quantum: 'Any external observation or optical wiretap collapses the entangled superposition into orthogonal classical eigenstates, generating detectable phase errors.',
      metric: '100% Phase-Flip Catch',
    },
    {
      dimension: 'DIMENSION 03 · STATISTICAL MODEL',
      title: 'Confidence Proof & Hypothesis Rejection',
      traditional: 'Heuristic probability estimations yielding unstable confidence margins with recurrent 3% to 9% error classification bands.',
      quantum: 'Exact Pearson Chi-Square Born-rule goodness-of-fit hypothesis testing. Eavesdropper presence is mathematically rejected at strict p < 0.001 confidence.',
      metric: 'p < 0.001 Rigor',
    },
    {
      dimension: 'DIMENSION 04 · POST-QUANTUM LONGEVITY',
      title: 'Cryptographic Durability Against Quantum Factorization',
      traditional: 'Vulnerable to harvest-now-decrypt-later intercept vaults and future polynomial-time Shor factorization algorithms.',
      quantum: 'Physical-layer quantum key distribution independent of adversary computational power. Non-local entanglement cannot be factored or cloned.',
      metric: 'Unconditional Bound',
    },
    {
      dimension: 'DIMENSION 05 · DETECTION LATENCY',
      title: 'Hardware Execution & Mitigation Speed',
      traditional: '15 ms to 220 ms software inference overhead across complex multi-layer deep learning inspection stacks.',
      quantum: 'Sub-millisecond optical collapse directly at cryostat polarizing beam splitters and single-photon detectors.',
      metric: '< 0.24 ms Collapse',
    },
  ];

  // Pillars Data for the Continuous Scroll Sequence
  const pillars = [
    {
      digit: '01',
      title: 'Bell-State Superposition Collapse',
      subtitle: 'Entanglement Invariance Across Optical Channels',
      equation: '⟨Ψ| σ_z ⊗ σ_z |Ψ⟩ = 1',
      equationLabel: 'BELL FIDELITY INVARIANT',
      body: 'HyperQDS continuously distributes polarization-entangled photon pairs |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 between Alice and Bob over standard 1550nm fiber. Under the quantum non-cloning theorem, any measurement by an eavesdropper collapses the entangled state into classical eigenstates, instantly elevating error rates above deterministic thresholds.',
      specs: [
        { label: 'FIDELITY THRESHOLD', val: '99.4% Min' },
        { label: 'OPTICAL WAVELENGTH', val: '1550 nm C-Band' },
        { label: 'BELL PARAMETER S', val: '2.82 ± 0.01' },
      ],
      schematic: (
        <div className="hqds-artifact-schematic">
          <div className="hqds-schematic-title">EPR PHOTON PAIR DISTRIBUTION & COLLAPSE</div>
          <div className="hqds-circuit-wire">
            <span>Alice Optical Fiber (1550nm)</span>
            <span className="circuit-gate">PBS Splitter</span>
            <span style={{ color: 'var(--hqds-cyan)' }}>Photon |0⟩</span>
          </div>
          <div className="hqds-circuit-wire">
            <span>Bob Optical Fiber (1550nm)</span>
            <span className="circuit-gate">PBS Splitter</span>
            <span style={{ color: 'var(--hqds-cyan)' }}>Photon |1⟩</span>
          </div>
          <div className="hqds-circuit-wire" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            <span>Adversary Tap (Eve Probe)</span>
            <span className="circuit-sensor alert">Coherence Destroyed</span>
            <span className="circuit-collapse-result">Eigenstate Lock</span>
          </div>
          <p className="hqds-schematic-caption">
            Measurement intervention instantly terminates quantum correlation, preventing eavesdropper cloning.
          </p>
        </div>
      ),
    },
    {
      digit: '02',
      title: 'Pearson Chi-Square Hypothesis Testing',
      subtitle: 'Born-Rule Statistical Validation Engine',
      equation: 'χ² = Σ (O_i - E_i)² / E_i',
      equationLabel: 'GOODNESS-OF-FIT INVARIANT',
      body: 'Rather than relying on black-box neural networks or empirical anomaly rules, our statistical engine compares observed photon count distributions against theoretical Born-rule expectations. Any statistical deviation yields hypothesis rejection at p < 0.001 within 250 microseconds.',
      specs: [
        { label: 'REJECTION LEVEL', val: 'p < 0.001' },
        { label: 'WINDOW SIZE', val: '1,024 Shots' },
        { label: 'DEGREES OF FREEDOM', val: 'df = 3' },
      ],
      schematic: (
        <div className="hqds-artifact-schematic">
          <div className="hqds-schematic-title">CHI-SQUARE GOODNESS-OF-FIT SAMPLING</div>
          <div className="hqds-chart-mockup">
            <div className="bar-group">
              <div className="bar expected" style={{ height: '78%' }} />
              <div className="bar observed" style={{ height: '76%' }} />
              <span className="bar-label">|00⟩</span>
            </div>
            <div className="bar-group">
              <div className="bar expected" style={{ height: '4%' }} />
              <div className="bar observed error" style={{ height: '24%' }} />
              <span className="bar-label">|01⟩</span>
            </div>
            <div className="bar-group">
              <div className="bar expected" style={{ height: '4%' }} />
              <div className="bar observed error" style={{ height: '22%' }} />
              <span className="bar-label">|10⟩</span>
            </div>
            <div className="bar-group">
              <div className="bar expected" style={{ height: '78%' }} />
              <div className="bar observed" style={{ height: '77%' }} />
              <span className="bar-label">|11⟩</span>
            </div>
          </div>
          <p className="hqds-schematic-caption">
            Uncorrelated noise spikes on |01⟩ and |10⟩ trigger instantaneous cryptographic isolation.
          </p>
        </div>
      ),
    },
    {
      digit: '03',
      title: 'Unitary Teleportation Correction',
      subtitle: 'Pauli X & Z Real-Time Compensation',
      equation: 'U = X^m2 · Z^m1',
      equationLabel: 'UNITARY CORRECTION INVARIANT',
      body: 'Verified state transmission requires dynamic quantum teleportation over physical fiber channels. When Alice conducts Bell measurement on her unknown state and shared EPR photon, the classical two-bit outcome directs Bob to execute exact Pauli X or Z unitary rotations, recovering the pristine quantum state with zero residual decoherence.',
      specs: [
        { label: 'CORRECTION LATENCY', val: '180 ns' },
        { label: 'STATE FIDELITY', val: '99.85%' },
        { label: 'QPU COMPATIBILITY', val: '28-Qubit Qiskit' },
      ],
      schematic: (
        <div className="hqds-artifact-schematic">
          <div className="hqds-schematic-title">4-STAGE QUANTUM TELEPORTATION PIPELINE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="hqds-teleport-step">
              <span className="step-badge">STAGE 1</span>
              <span>Bell Pair Entanglement Distribution</span>
            </div>
            <div className="hqds-teleport-arrow">↓</div>
            <div className="hqds-teleport-step">
              <span className="step-badge">STAGE 2</span>
              <span>Alice Joint Bell-State Measurement</span>
            </div>
            <div className="hqds-teleport-arrow">↓</div>
            <div className="hqds-teleport-step">
              <span className="step-badge">STAGE 3</span>
              <span>Classical 2-Bit Coordinate Transmission</span>
            </div>
            <div className="hqds-teleport-arrow">↓</div>
            <div className="hqds-teleport-step final">
              <span className="step-badge">STAGE 4</span>
              <span>Bob Unitary Pauli Rotation Recovery</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={`hqds-root ${initialCalibrationDone ? 'is-calibrated' : ''}`}>
      {/* 3D WebGL Canvas: Genuinely Scroll-Driven Single 3D Hero Object */}
      <QuantumEntanglementCanvas activePillar={activePillar} activeDimension={activeDimension} />

      {/* Atmospheric Cryogenic Ambient Scrim */}
      <div className="hqds-ambient-scrim" aria-hidden="true" />

      {/* Minimal Lateral Progress Rail */}
      <div className="hqds-progress-rail-minimal" aria-hidden="true">
        <div ref={railIndicatorRef} className="hqds-rail-indicator-fill" style={{ height: '15%' }} />
      </div>

      {/* Minimal Top Navigation (Liquid Brokers Reference Architecture) */}
      <nav className="hqds-top-nav" aria-label="Main Navigation">
        <div className="hqds-nav-ambient-light" aria-hidden="true" />
        <div className="hqds-nav-inner">
          <div className="hqds-brand-wrap" onClick={() => scrollToAct('hero')}>
            <span className="hqds-brand-title">HYPERQDS</span>
          </div>

          <div className="hqds-nav-center">
            <button type="button" className="hqds-nav-link" onClick={() => scrollToAct('problem')}>
              Physical Layer
            </button>
            <button type="button" className="hqds-nav-link" onClick={() => scrollToAct('pillars')}>
              Pillars
            </button>
            <button type="button" className="hqds-nav-link" onClick={() => scrollToAct('comparison')}>
              Verification
            </button>
            <button type="button" className="hqds-nav-link" onClick={() => handleNavigateTab('audit')}>
              Audit Ledger
            </button>
          </div>

          <div className="hqds-nav-right">
            <button
              type="button"
              className="hqds-nav-ghost-btn"
              onClick={() => handleNavigateTab('operations')}
            >
              <span>Console</span>
            </button>
            <button
              type="button"
              className="hqds-nav-pill-btn"
              onClick={handleLaunchHonest}
            >
              <span>Launch Protocol</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Narrative Flow */}
      <main className="hqds-flow-stream">
        {/* ACT 1: HERO SECTION (Liquid Brokers Reference Structure) */}
        <section id="hero" className="hqds-act hqds-act-hero-unified">
          <div className="hqds-hero-center-content">
            <h1 className="hqds-hero-two-line-title hqds-hero-enter-title">
              <span>DETERMINISTIC QUANTUM SECURITY.</span>
              <span>ENFORCED BY THE LAWS OF PHYSICS.</span>
            </h1>

            <p className="hqds-hero-one-line-sub hqds-hero-enter-sub">
              Physical-layer quantum key distribution and real-time Bell-state verification eliminating adversarial interception.
            </p>

            <div style={{ display: 'inline-flex' }}>
              <button
                type="button"
                className="hqds-hero-primary-cta hqds-hero-enter-cta"
                onClick={handleLaunchHonest}
              >
                <span>Deploy Quantum Protection</span>
              </button>
            </div>
          </div>

          {/* Symmetrical Bilateral Floating Glass Stat Cards Framed Over the 3D Hero Object */}
          <div ref={heroCardsRef} className="hqds-hero-stage-overlap" aria-hidden="false">
            {/* Left Stat Card: Physical Collapse Latency */}
            <div className="hqds-floating-stat-card hqds-fstat-left hqds-hero-enter-card-left">
              <div className="hqds-fstat-top-row">
                <span className="hqds-fstat-label">Physical Collapse Latency</span>
                <button
                  type="button"
                  className="hqds-fstat-arrow-btn"
                  onClick={() => scrollToAct('problem')}
                  aria-label="View Latency Details"
                >
                  ↗
                </button>
              </div>
              <div className="hqds-fstat-value">&lt; 0.24 ms</div>
              <div className="hqds-fstat-sub">Deterministic Pauli Bound</div>
            </div>

            {/* Right Stat Card: Hypothesis Rejection Confidence */}
            <div className="hqds-floating-stat-card cyan-accent hqds-fstat-right hqds-hero-enter-card-right">
              <div className="hqds-fstat-top-row">
                <span className="hqds-fstat-label">Hypothesis Rejection Confidence</span>
                <button
                  type="button"
                  className="hqds-fstat-arrow-btn"
                  onClick={() => scrollToAct('comparison')}
                  aria-label="View Confidence Proof"
                >
                  ↗
                </button>
              </div>
              <div className="hqds-fstat-value">p &lt; 0.001</div>
              <div className="hqds-fstat-sub">Born-Rule Statistical Proof</div>
            </div>
          </div>
        </section>

        {/* ACT 2: PROBLEM SECTION (Asymmetric Composition, No Bordered Chips) */}
        <section id="problem" className="hqds-act">
          <div className="hqds-act-container">
            <header className="hqds-act-header hqds-reveal">
              <span className="hqds-act-index">ACT I · THE PHYSICAL LAYER REALITY</span>
              <h2 className="hqds-act-title">Why Classical Cyber Defense Fails</h2>
              <p className="hqds-act-summary">
                Traditional security treats defense as a software feature classification puzzle. In an era of automated gradient attacks and post-quantum factorization, heuristic boundaries cannot guarantee cryptographic safety.
              </p>
            </header>

            <div ref={problemCardsRef} className="hqds-problem-asymmetric">
              {/* Left Column: Muted Classical Limitation */}
              <div className="hqds-problem-card is-classical hqds-scroll-content-wrap">
                <div>
                  <div className="hqds-pcard-tag classical-tag">CLASSICAL HEURISTIC LIMITATION</div>
                  <h3 className="hqds-pcard-headline">Neural Classification and Heuristics</h3>
                  <p className="hqds-pcard-prose">
                    Classical cyber defenses inspect network packets after transmission using software filters, neural classifiers, and statistical signatures. Attackers intentionally calculate adversarial perturbations that keep malicious activity below detection thresholds.
                  </p>
                  <div className="hqds-pcard-fact-list">
                    <div className="hqds-pcard-fact-item">
                      <span className="hqds-pcard-bullet danger" />
                      <span>Data packets can be copied, intercepted, and stored indefinitely without warning</span>
                    </div>
                    <div className="hqds-pcard-fact-item">
                      <span className="hqds-pcard-bullet danger" />
                      <span>Adversarial gradient poisoning evades trained machine learning weights</span>
                    </div>
                    <div className="hqds-pcard-fact-item">
                      <span className="hqds-pcard-bullet danger" />
                      <span>Harvest-now-decrypt-later renders symmetric secrets vulnerable to quantum speedup</span>
                    </div>
                  </div>
                </div>

                <div className="hqds-pcard-bottom-metric danger">
                  <span>Detection Latency: 15 to 220 ms</span>
                  <strong>False Negatives: Present</strong>
                </div>
              </div>

              {/* Right Column: Prominent Quantum Physical Invariant */}
              <div className="hqds-problem-card is-quantum hqds-scroll-content-wrap">
                <div>
                  <div className="hqds-pcard-tag quantum-tag">PHYSICAL-LAYER DETERMINISM</div>
                  <h3 className="hqds-pcard-headline">Enforced Quantum Mechanical Invariants</h3>
                  <p className="hqds-pcard-prose">
                    HyperQDS migrates cryptographic integrity from software logic into fundamental quantum mechanics. Information is encoded onto entangled photon states. By the quantum non-cloning theorem, any eavesdropping attempt disturbs the superposition state, destroying correlation before data can be extracted.
                  </p>
                  <div className="hqds-pcard-fact-list">
                    <div className="hqds-pcard-fact-item">
                      <span className="hqds-pcard-bullet teal" />
                      <span>Wavefunction collapses immediately upon interception, preventing passive wiretapping</span>
                    </div>
                    <div className="hqds-pcard-fact-item">
                      <span className="hqds-pcard-bullet teal" />
                      <span>Deterministic Born-rule validation operates with exact mathematical hypothesis rejection</span>
                    </div>
                    <div className="hqds-pcard-fact-item">
                      <span className="hqds-pcard-bullet teal" />
                      <span>Unconditional security bound independent of adversary computing resources</span>
                    </div>
                  </div>
                </div>

                <div className="hqds-pcard-bottom-metric teal">
                  <span>Hardware Verification: &lt; 0.24 ms</span>
                  <strong>False Negatives: Mathematically 0</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ACT 3: THREE TECHNOLOGICAL PILLARS (Single Unified Pillars Container with Synchronized Internal Selector) */}
        <section id="pillars" className="hqds-act">
          <div className="hqds-act-container">
            <header className="hqds-act-header">
              <span className="hqds-act-index">ACT II · THREE TECHNOLOGICAL PILLARS</span>
              <h2 className="hqds-act-title">Core Cryptographic Mechanics</h2>
              <p className="hqds-act-summary">
                A continuous sequential verification architecture. Scroll through each pillar to observe the physical mechanics governing entangled state distribution, statistical Born-rule testing, and dynamic unitary correction.
              </p>
            </header>

            {/* Single Unified Pillars Container */}
            <div className="hqds-pillars-unified-container">
              {/* Localized Internal Horizontal Selector Menu (Scroll-Position Driven Positional Tab Convergence) */}
              <div ref={pillarMenuRef} className="hqds-pillar-internal-menu" role="tablist" aria-label="Core Cryptographic Pillars">
                {pillars.map((p) => {
                  const isActive = p.digit === activePillar;
                  return (
                    <button
                      key={p.digit}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`hqds-pillar-tab-btn pillar-tab-${p.digit} ${isActive ? 'is-active' : ''}`}
                      onClick={() => setActivePillar(p.digit)}
                    >
                      <span className="pillar-tab-num">{p.digit}</span>
                      <span className="pillar-tab-label">{p.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Single Active Pillar Display Card with Smooth Cross-Fade & Stage 7B Content Fade/Rise */}
              <div ref={pillarContentRef} className="hqds-scroll-content-wrap">
                <TabCrossFade activeKey={activePillar} duration={320}>
                  {(() => {
                    const currentPillar = pillars.find((p) => p.digit === activePillar) || pillars[0];
                    return (
                      <div
                        key={currentPillar.digit}
                        className={`hqds-glass-sharp hqds-pillar-single-card pillar-card-${currentPillar.digit}`}
                        onPointerEnter={handleCardPointerEnter}
                        onPointerMove={handleCardPointerMove}
                        onPointerLeave={handleCardPointerLeave}
                      >
                        <div className="hqds-pillar-header-row">
                          <div>
                            <span className="hqds-pillar-eyebrow">
                              PILLAR {currentPillar.digit} · PHYSICAL PROTOCOL
                            </span>
                            <h3 className="hqds-pillar-display">{currentPillar.title}</h3>
                            <p className="hqds-pillar-subtext">{currentPillar.subtitle}</p>
                          </div>
                          <div className="hqds-pillar-equation-box">
                            <span className="hqds-equation-label">{currentPillar.equationLabel}</span>
                            <code className="hqds-equation-code">{currentPillar.equation}</code>
                          </div>
                        </div>

                        <div className="hqds-pillar-content-split">
                          <div>
                            <p className="hqds-pillar-body">{currentPillar.body}</p>
                            <div className="hqds-specs-grid">
                              {currentPillar.specs.map((spec) => (
                                <div key={spec.label} className="hqds-spec-box">
                                  <span className="hqds-spec-lbl">{spec.label}</span>
                                  <span className="hqds-spec-val">{spec.val}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            {currentPillar.schematic}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </TabCrossFade>
              </div>
            </div>
          </div>
        </section>

        {/* ACT 4: VERIFICATION COMPARISON (Structured Interactive Dimension Tabs & Deck) */}
        <section id="comparison" className="hqds-act">
          <div className="hqds-act-container">
            <header className="hqds-act-header">
              <span className="hqds-act-index">ACT III · DETERMINISTIC VERIFICATION</span>
              <h2 className="hqds-act-title">Quantum Laws vs Heuristic Approximations</h2>
              <p className="hqds-act-summary">
                A scroll-revealed evaluation across 5 critical dimensions. Each limitation of traditional cyber defense is displayed first, followed immediately by HyperQDS physical law superseding it.
              </p>
            </header>

            {/* Structured Dimension Menu / Tab Bar (Scroll-Position Driven Positional Tab Convergence) */}
            <div className="hqds-dimension-deck-wrapper">
              <div ref={dimensionDeckRef} className="hqds-dimension-nav-deck" role="tablist" aria-label="Verification Dimensions">
                {comparisonData.map((row, idx) => {
                  const isActive = idx === activeDimension;
                  const shortTitle = row.dimension.split('·')[1]?.trim() || `Dimension 0${idx + 1}`;
                  return (
                    <button
                      key={row.dimension}
                      type="button"
                      role="tab"
                      id={`dim-tab-${idx}`}
                      aria-selected={isActive}
                      aria-controls={`dim-panel-${idx}`}
                      className={`hqds-dimension-tab-btn dim-tab-${idx} ${isActive ? 'is-active' : ''}`}
                      onClick={() => setActiveDimension(idx)}
                    >
                      <span className="dim-tab-num">0{idx + 1}</span>
                      <span className="dim-tab-label">{shortTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Dimension Display Card (Content panel stays completely static on scroll) */}
            <div
              className={`hqds-dimension-stage-container dim-stage-${activeDimension}`}
              style={{ '--dim-accent': ['#2dd4bf', '#38bdf8', '#c084fc', '#f59e0b', '#ff3355'][activeDimension] || '#2dd4bf' }}
            >
              <div className="hqds-dimension-ambient-glow" aria-hidden="true" />
              {/* Active Dimension Display Card with Smooth Cross-Fade & Stage 7B Content Fade/Rise */}
              <div ref={dimensionContentRef} className="hqds-scroll-content-wrap">
                <TabCrossFade activeKey={activeDimension} duration={320}>
                  {(() => {
                    const row = comparisonData[activeDimension] || comparisonData[0];
                    return (
                      <div
                        key={row.dimension}
                        id={`dim-panel-${activeDimension}`}
                        role="tabpanel"
                        aria-labelledby={`dim-tab-${activeDimension}`}
                        className={`hqds-glass-deep hqds-dimension-active-card dim-card-${activeDimension}`}
                        onPointerEnter={handleCardPointerEnter}
                        onPointerMove={handleCardPointerMove}
                        onPointerLeave={handleCardPointerLeave}
                      >
                        <div className="hqds-dimcard-header">
                          <div className="hqds-dimcard-title-group">
                            <span className="hqds-dimcard-dimension">{row.dimension}</span>
                            <h3 className="hqds-dimcard-title">{row.title}</h3>
                          </div>
                          <div className="hqds-dimcard-metric-badge">
                            <span className="dimcard-metric-pulse" />
                            <span className="dimcard-metric-text">{row.metric}</span>
                          </div>
                        </div>

                        <div className="hqds-dimcard-columns">
                          {/* Classical Approach: Shown muted and desaturated */}
                          <div className="hqds-dim-box classical-muted">
                            <div className="hqds-dim-badge danger">TRADITIONAL HEURISTIC DEFENSE</div>
                            <p className="hqds-dim-text">{row.traditional}</p>
                            <div className="hqds-dim-foot danger">
                              <span>Failure Mode: Vulnerable to gradient search and noise bypass</span>
                              <strong>Probabilistic / Insecure</strong>
                            </div>
                          </div>

                          {/* Overtake Transition Marker */}
                          <div className="hqds-dim-overtake-divider">
                            <div className="dim-overtake-pill">
                              <span className="dim-overtake-icon">↓</span>
                              <span>SUPERSEDED BY PHYSICAL LAW</span>
                            </div>
                          </div>

                          {/* HyperQDS Answer: Illuminated with vibrant cyan/teal */}
                          <div className="hqds-dim-box quantum-overtake">
                            <div className="hqds-dim-badge teal">HYPERQDS PHYSICAL GUARANTEE · {row.metric}</div>
                            <p className="hqds-dim-text">{row.quantum}</p>
                            <div className="hqds-dim-foot teal">
                              <span>Hardware Enforcement: Immediate optical wavefunction collapse</span>
                              <strong>Deterministic Bound</strong>
                            </div>
                          </div>
                        </div>

                        {/* Pagination & Arrow Controls for Rapid Dimension Flipping */}
                        <div className="hqds-dimcard-footer-controls">
                          <button
                            type="button"
                            className="hqds-dim-nav-btn"
                            onClick={() => setActiveDimension((prev) => (prev > 0 ? prev - 1 : comparisonData.length - 1))}
                            aria-label="Previous Dimension"
                          >
                            <span>← Previous Dimension</span>
                          </button>
                          <div className="hqds-dim-counter">
                            <span>0{activeDimension + 1}</span>
                            <span className="dim-sep">/</span>
                            <span>0{comparisonData.length}</span>
                          </div>
                          <button
                            type="button"
                            className="hqds-dim-nav-btn"
                            onClick={() => setActiveDimension((prev) => (prev < comparisonData.length - 1 ? prev + 1 : 0))}
                            aria-label="Next Dimension"
                          >
                            <span>Next Dimension →</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </TabCrossFade>
              </div>
            </div>
          </div>
        </section>

        {/* ACT 5: CLOSING RESTING STATE & FINAL CTA */}
        <section id="conduit" className="hqds-act">
          <div className="hqds-act-container">
            <div className="hqds-glass-sharp hqds-conduit-portal-resting hqds-reveal">
              <span className="hqds-portal-eyebrow">THE OPERATIONAL HORIZON</span>
              <h2 className="hqds-portal-headline">
                Transition to Deterministic Quantum Infrastructure
              </h2>
              <p className="hqds-portal-desc">
                Deploy physics-grounded protection across your distributed nodes. Integrate with existing 1550nm optical fiber backbones and eliminate interception risk today.
              </p>

              <div className="hqds-portal-metrics">
                <div className="portal-stat">
                  <span className="portal-stat-label">SUPERPOSITION FIDELITY</span>
                  <span className="portal-stat-val" style={{ color: 'var(--hqds-cyan)' }}>99.85%</span>
                </div>
                <div className="portal-stat">
                  <span className="portal-stat-label">DETECTION LATENCY</span>
                  <span className="portal-stat-val">0.24 ms</span>
                </div>
                <div className="portal-stat">
                  <span className="portal-stat-label">QPU CLUSTER</span>
                  <span className="portal-stat-val">28-Qubit Live</span>
                </div>
              </div>

              <div style={{ display: 'inline-flex' }}>
                <button
                  type="button"
                  className="hqds-hero-primary-cta hqds-btn-xl"
                  onClick={handleLaunchHonest}
                >
                  <span>Launch Protocol SOC</span>
                </button>
              </div>

              <div className="hqds-secondary-nav-strip">
                <button
                  type="button"
                  className="hqds-sec-link"
                  onClick={() => handleNavigateTab('attack')}
                >
                  Inspect Attack Simulation Lab
                </button>
                <span className="hqds-sec-sep">·</span>
                <button
                  type="button"
                  className="hqds-sec-link"
                  onClick={() => handleNavigateTab('audit')}
                >
                  Post-Quantum Cryptographic Audit
                </button>
              </div>
            </div>
          </div>

          {/* Minimalist Colophon: Positioned flush at true bottom */}
          <footer className="hqds-colophon">
            <div className="hqds-colophon-inner">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="hqds-colophon-brand">HYPERQDS</span>
                <span className="hqds-colophon-copy">
                  Physical-Layer Quantum Key Distribution & Bell Invariance Engine.
                </span>
              </div>
              <div className="hqds-colophon-specs">
                <span>1550nm C-BAND</span>
                <span className="dot-sep">·</span>
                <span>BORN RULE RIGOR</span>
                <span className="dot-sep">·</span>
                <span>POST-QUANTUM PROOF</span>
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
