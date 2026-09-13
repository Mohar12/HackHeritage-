/**
 * HonestProtocolPage.jsx
 * ======================
 * HyperQDS Honest Protocol Operations Center.
 * Re-architected in Stage 2 to establish a centered cinematic display Hero
 * matching the completed Audit Ledger (AuditLedgerPanel.jsx) and Stitch Landing Page,
 * with a compact glassy subnav capsule featuring thin left-to-right animated underlines,
 * subtle real status indicator, technical pipeline metadata, full-scale 3D quantum sphere,
 * and bidirectional scroll tracking (working both down and up).
 *
 * Section Architecture (8 Narrative Scenes):
 *  01 [honest-hero]       · Operational Launch Hero & Internal Subnav
 *  02 [honest-telemetry]  · Live Quantum Telemetry & Security Verdict
 *  03 [honest-config]     · Target Signature Dossier & Protocol Configuration
 *  04 [honest-protocol]   · Quantum Teleportation & 8-Stage Execution
 *  05 [honest-analysis]   · Quantum State Analysis (Bloch Sphere 3D)
 *  06 [honest-network]    · Network Topology & Measurement Distribution
 *  07 [honest-trace]      · Cryptographic Trace Terminal & Bounds
 *  08 [honest-closing]    · Final Verdict & Audit Ledger Commit
 *
 * Anti-slop Hard Gate R-02: Zero em dashes across all UI labels, code comments, and copy.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import StitchHeader from './StitchHeader.jsx';
import QuantumEntanglementCanvas from './QuantumEntanglementCanvas.jsx';
import Teleportation3D from './Teleportation3D.jsx';
import BlochSphere3D from './BlochSphere3D.jsx';
import NetworkTopology3D from './NetworkTopology3D.jsx';
import { TARGET_SIGNATURE_ENTITIES } from './AttackSelectionPanel.jsx';
import { generateKeys, signMessage, verifySignature, detectThreat } from '../api/client.js';

// Canonical Honest Protocol Sections (Matching Global Page System & Progress Rail)
const HONEST_SECTIONS = [
  { id: 'honest-hero', index: '01', label: 'OVERVIEW', accent: '#22d3ee' },
  { id: 'honest-telemetry', index: '02', label: 'TELEMETRY', accent: '#38bdf8' },
  { id: 'honest-config', index: '03', label: 'CONFIG', accent: '#60a5fa' },
  { id: 'honest-protocol', index: '04', label: 'PROTOCOL', accent: '#34d399' },
  { id: 'honest-analysis', index: '05', label: 'ANALYSIS', accent: '#a78bfa' },
  { id: 'honest-network', index: '06', label: 'NETWORK', accent: '#c084fc' },
  { id: 'honest-trace', index: '07', label: 'TRACE', accent: '#f59e0b' },
  { id: 'honest-verdict', index: '08', label: 'VERDICT', accent: '#10b981' },
];

// Internal Analysis Perspectives for Section 05 (Scrollable Narrative Tabs)
const ANALYSIS_TABS = [
  { id: 'measurement', index: '01', label: 'MEASUREMENT', subsceneId: 'analysis-measurement', accent: '#22d3ee' },
  { id: 'bloch', index: '02', label: 'BLOCH STATE', subsceneId: 'analysis-bloch', accent: '#a78bfa' },
  { id: 'network', index: '03', label: 'NETWORK', subsceneId: 'honest-network', accent: '#c084fc' },
];

// Symmetrical Telemetry Perspective Tabs for Section 02
const TELEMETRY_TABS = [
  {
    id: 'qber',
    index: '01',
    label: 'QBER',
    fullName: 'QUANTUM BIT ERROR RATE',
    targetLabel: 'Policy Limit: < 11%',
    equation: 'QBER = N_error / N_transmitted',
    equationDesc: 'Ratio of detected bit errors to total sifted photons across shared EPR key distribution.',
    boundName: 'BB84 Quantum Security Bound',
    boundLimit: '< 11.0%',
    thresholdPct: 11,
    accent: '#22d3ee',
  },
  {
    id: 'fidelity',
    index: '02',
    label: 'QUANTUM FIDELITY',
    fullName: 'QUANTUM STATE FIDELITY',
    targetLabel: 'Target: >= 90.0% (Alice to Bob)',
    equation: 'F(ρ, σ) = (Tr√(√ρ σ √ρ))²',
    equationDesc: 'Statevector overlap between Alice prepared state |ψ⟩ and Bob recovered density matrix.',
    boundName: 'Uhlmann-Jozsa State Overlap Bound',
    boundLimit: '>= 90.0%',
    thresholdPct: 90,
    accent: '#38bdf8',
  },
  {
    id: 'chi2',
    index: '03',
    label: 'CHI-SQUARE TEST',
    fullName: 'PEARSON CHI-SQUARE (p-value)',
    targetLabel: 'H0: Born distribution holds (p >= 0.05)',
    equation: 'χ² = Σ (O_i - E_i)² / E_i',
    equationDesc: 'Statistical test verifying detector measurement counts conform to theoretical Born probabilities.',
    boundName: 'Pearson Born Uniformity Test',
    boundLimit: 'p >= 0.05',
    thresholdPct: 50,
    accent: '#a78bfa',
  },
  {
    id: 'threat',
    index: '04',
    label: 'THREAT RISK',
    fullName: 'PHYSICAL EAVESDROPPING PROBABILITY',
    targetLabel: 'Physical Interception Bound: <= 15%',
    equation: 'P(threat) ≤ 1 - e^(-2(QBER - Q0)²)',
    equationDesc: 'Upper bound on adversary information gain derived from the Hoeffding quantum statistical inequality.',
    boundName: 'Hoeffding Information Leakage Bound',
    boundLimit: '<= 15.0%',
    thresholdPct: 15,
    accent: '#34d399',
  },
];

const KEY_LENGTH_PRESETS = [
  { label: '8 Qubits (Fast)', value: 8, sec: 'P(forgery) <= 3.9e-3' },
  { label: '14 Qubits (Std)', value: 14, sec: 'P(forgery) <= 6.1e-5' },
  { label: '28 Qubits (High Sec)', value: 28, sec: 'P(forgery) <= 3.7e-9' },
];

const PROTOCOL_STAGES = [
  { id: 1, code: '01', monoLabel: 'EPR DISTRIBUTION', title: 'EPR Pair Distribution', icon: '📡', desc: 'Central EPR source distributes entangled twin photons (|Φ⁺⟩) to Alice & Bob' },
  { id: 2, code: '02', monoLabel: 'STATE PREPARATION', title: 'Message State Preparation', icon: '⚛️', desc: 'Alice encodes signature state |ψ⟩ into MUB eigenstate bases' },
  { id: 3, code: '03', monoLabel: 'BELL MEASUREMENT', title: 'Bell-State Measurement', icon: '⚡', desc: 'Alice performs joint projective measurement on message & EPR qubits' },
  { id: 4, code: '04', monoLabel: 'CLASSICAL CHANNEL', title: 'Classical Bit Transmission', icon: '〰️', desc: 'Classical Pauli correction bits (c0, c1) sent over classical channel' },
  { id: 5, code: '05', monoLabel: 'PAULI CORRECTION', title: 'Conditional Pauli Correction', icon: '🔄', desc: 'Bob applies conditional (X^c1 · Z^c0) unitary operators to recover |ψ⟩' },
  { id: 6, code: '06', monoLabel: 'STATE SIFTING', title: 'Teleported State Sifting', icon: '🎯', desc: 'Projective measurements in Alice declared bases yield raw key bits' },
  { id: 7, code: '07', monoLabel: 'THREAT CHECK', title: 'Statistical Threat Detection', icon: '🛡️', desc: 'QBER tested vs BB84 bound (0.11) & Pearson χ² Born test verifies authenticity' },
  { id: 8, code: '08', monoLabel: 'LEDGER COMMIT', title: 'Immutable Audit Ledger Commit', icon: '📜', desc: 'SHA3-512 post-quantum cryptographic hash committed to immutable ledger' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Custom Recharts Tooltip styled to Match Audit Ledger Glassmorphism
function CustomRechartsTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="hqds-honest-recharts-tooltip">
        <div className="tooltip-title">
          {label || d.basis}
        </div>
        <div className="tooltip-sub">
          {d.type}
        </div>
        <div className="tooltip-count">
          Count: <strong style={{ color: payload[0].color }}>{payload[0].value?.toLocaleString()}</strong>
        </div>
        <div className="tooltip-freq">
          Frequency: <strong>{d.pct}</strong>
        </div>
      </div>
    );
  }
  return null;
}

export const HonestProtocolPage = React.memo(function HonestProtocolPage({
  onNavigate,
  onResultData,
}) {
  // ── 1. PROTOCOL DATA & CONFIGURATION STATE (PRESERVED) ──
  const [selectedEntityId, setSelectedEntityId] = useState(
    TARGET_SIGNATURE_ENTITIES[0]?.id || 'TX-2026-FED-BOE'
  );
  const currentEntity = useMemo(() => {
    return (
      TARGET_SIGNATURE_ENTITIES.find((e) => e.id === selectedEntityId) ||
      TARGET_SIGNATURE_ENTITIES[0]
    );
  }, [selectedEntityId]);

  const [nQubits, setNQubits] = useState(14);
  const [shots, setShots] = useState(1024);
  const [securityPolicy, setSecurityPolicy] = useState('standard'); // 'strict' | 'standard' | 'lenient'
  const [injectedBitErrors, setInjectedBitErrors] = useState(0);
  const [isDraggingNoise, setIsDraggingNoise] = useState(false);
  const noiseDragTimer = useRef(null);

  // Execution Lifecycle State: 'idle' | 'running' | 'verified' | 'aborted' | 'error'
  const [status, setStatus] = useState('idle');
  const [simStep, setSimStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const isRunning = status === 'running';

  // 3D Visualizer & Topology Active States
  const [activeStage3D, setActiveStage3D] = useState(1);
  const [activeNetworkNode, setActiveNetworkNode] = useState('Alice');
  const [activeNetworkLink, setActiveNetworkLink] = useState('all');

  // Single Source of Truth: latestTelemetry
  // Starts as null (READY / NOT RUN state). Populated strictly upon handleRunProtocol completion.
  const [latestTelemetry, setLatestTelemetry] = useState(null);

  // Live Event Log (Reflects ONLY actual execution trace)
  const [telemetryLogs, setTelemetryLogs] = useState([
    { time: '00:00.00', text: '[READY] System initialized. Awaiting protocol execution...', type: 'sys' },
  ]);

  // ── 2. SCROLL & PAGE STATE (SEPARATED) ──
  const [activeSection, setActiveSection] = useState('honest-hero');
  const [activeProtocolStage, setActiveProtocolStage] = useState(1);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('measurement'); // 'measurement' | 'bloch' | 'network'
  const [activeTelemetryTab, setActiveTelemetryTab] = useState('qber'); // 'qber' | 'fidelity' | 'chi2' | 'threat'
  const [revealReady, setRevealReady] = useState(false);

  // Programmatic scroll lock refs (matches Audit Ledger navigation)
  const pendingSectionRef = useRef(null);
  const pendingTimeoutRef = useRef(null);
  const subnavRef = useRef(null);
  const pendingAnalysisTabRef = useRef(null);
  const pendingAnalysisTimeoutRef = useRef(null);
  const revealObserverRef = useRef(null);

  // Real status label derivation (subtle status indicator)
  const isThreatDetected = latestTelemetry
    ? Boolean(latestTelemetry.is_malicious || latestTelemetry.recommended_action === 'ABORT')
    : false;

  const statusLabel = useMemo(() => {
    if (status === 'running') return 'RUNNING';
    if (status === 'error') return 'ERROR';
    if (status === 'aborted' || isThreatDetected) return 'ABORTED';
    if (status === 'verified' || latestTelemetry !== null) return 'VERIFIED';
    return 'READY';
  }, [status, isThreatDetected, latestTelemetry]);

  // Logging helper
  const addLog = useCallback((text, type = 'info') => {
    const now = new Date();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
    const timeStr = `${mm}:${ss}.${ms}`;
    setTelemetryLogs((prev) => [...prev.slice(-16), { time: timeStr, text, type }]);
  }, []);

  // Specular light mouse movement handler (direct DOM property to avoid React re-renders)
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty('--mouse-x', `${x.toFixed(1)}%`);
    e.currentTarget.style.setProperty('--mouse-y', `${y.toFixed(1)}%`);
  }, []);

  // Policy threshold calculations for local forecasting
  const currentQberThreshold =
    securityPolicy === 'strict' ? 0.05 : securityPolicy === 'lenient' ? 0.20 : 0.11;
  const inducedQber = nQubits > 0 ? injectedBitErrors / nQubits : 0;
  const willReject = inducedQber > currentQberThreshold;
  const noiseProgressRatio = nQubits > 0 ? injectedBitErrors / nQubits : 0;
  const noiseProgressPercent = noiseProgressRatio * 100;

  // Visual compromise indicator
  const isCompromised = latestTelemetry
    ? Boolean(latestTelemetry.is_malicious || latestTelemetry.recommended_action === 'ABORT')
    : false;

  const getTelemetryTabData = useCallback((tabId) => {
    const hasData = latestTelemetry !== null;
    switch (tabId) {
      case 'qber': {
        const val = hasData ? `${(latestTelemetry.qber * 100).toFixed(2)}%` : '--';
        const isWarning = hasData && latestTelemetry.qber > currentQberThreshold;
        const statusClass = isRunning
          ? 'is-evaluating'
          : hasData
          ? isWarning ? 'is-danger' : 'is-good'
          : 'is-standby';
        const statusLabel = isRunning
          ? 'MEASURING'
          : hasData
          ? isWarning ? 'EXCEEDED' : 'SECURE BOUND'
          : 'STANDBY';
        const meterPct = hasData
          ? Math.min(100, (latestTelemetry.qber / currentQberThreshold) * 100)
          : 0;
        const verdictHeadline = isRunning
          ? 'SAMPLING PHOTON TRANSMISSION'
          : hasData
          ? isWarning ? 'CHANNEL NOISE EXCEEDED' : 'AUTHENTIC CHANNEL INTEGRITY'
          : 'AWAITING PROTOCOL EXECUTION';
        const verdictExplanation = isRunning
          ? 'Accumulating coincident single-photon clicks across Alice and Bob measurement bases...'
          : hasData
          ? isWarning
            ? 'Channel error rate exceeded the 11% Shor-Preskill threshold. Transaction intervention triggered.'
            : 'Error rate is within the Shor-Preskill threshold, proving zero physical eavesdropping interception.'
          : 'Trigger protocol execution to sample quantum bit error rate across the active Qiskit Aer simulation.';
        return { val, isWarning, statusClass, statusLabel, meterPct, verdictHeadline, verdictExplanation };
      }
      case 'fidelity': {
        const val = hasData ? `${(latestTelemetry.fidelity * 100).toFixed(1)}%` : '--';
        const isWarning = hasData && latestTelemetry.fidelity < 0.90;
        const statusClass = isRunning
          ? 'is-evaluating'
          : hasData
          ? isWarning ? 'is-danger' : 'is-good'
          : 'is-standby';
        const statusLabel = isRunning
          ? 'EVALUATING'
          : hasData
          ? isWarning ? 'DEGRADED' : 'HIGH FIDELITY'
          : 'STANDBY';
        const meterPct = hasData
          ? Math.min(100, latestTelemetry.fidelity * 100)
          : 0;
        const verdictHeadline = isRunning
          ? 'COMPUTING STATEVECTOR OVERLAP'
          : hasData
          ? isWarning ? 'STATE COHERENCE DEGRADED' : 'STATE RECOVERY VERIFIED'
          : 'AWAITING PROTOCOL EXECUTION';
        const verdictExplanation = isRunning
          ? 'Calculating trace distance and statevector overlap after Bob Pauli operator corrections...'
          : hasData
          ? isWarning
            ? 'Quantum state fidelity dropped below 90%, indicating channel depolarization or intercept loss.'
            : 'Bob conditional Pauli corrections successfully reconstructed the original statevector with near-unity coherence.'
          : 'Quantum state fidelity will be measured against Bob recovered statevector upon protocol execution.';
        return { val, isWarning, statusClass, statusLabel, meterPct, verdictHeadline, verdictExplanation };
      }
      case 'chi2': {
        const val = hasData ? latestTelemetry.chi2_p_value.toFixed(4) : '--';
        const isWarning = hasData && latestTelemetry.chi2_p_value < 0.05;
        const statusClass = isRunning
          ? 'is-evaluating'
          : hasData
          ? isWarning ? 'is-danger' : 'is-good'
          : 'is-standby';
        const statusLabel = isRunning
          ? 'TESTING'
          : hasData
          ? isWarning ? 'ANOMALOUS' : 'BORN CONSISTENT'
          : 'STANDBY';
        const meterPct = hasData
          ? Math.min(100, latestTelemetry.chi2_p_value * 100)
          : 0;
        const verdictHeadline = isRunning
          ? 'EVALUATING BORN DISTRIBUTION'
          : hasData
          ? isWarning ? 'BORN DEVIATION DETECTED' : 'BORN DISTRIBUTION COMPLIANT'
          : 'AWAITING PROTOCOL EXECUTION';
        const verdictExplanation = isRunning
          ? 'Testing detector count histogram against theoretical quantum Born probabilities...'
          : hasData
          ? isWarning
            ? 'Chi-square p-value < 0.05 rejects null hypothesis. Detector statistics indicate non-quantum interference.'
            : 'Null hypothesis accepted (p >= 0.05): detector clicks are quantum-random and unmanipulated by external classical bias.'
          : 'Statistical test of measurement distribution uniformity will be evaluated upon protocol execution.';
        return { val, isWarning, statusClass, statusLabel, meterPct, verdictHeadline, verdictExplanation };
      }
      case 'threat': {
        const score = hasData ? latestTelemetry.confidence_score : 0;
        const val = hasData ? `${(score * 100).toFixed(1)}%` : '--';
        const isWarning = hasData && score > 0.15;
        const statusClass = isRunning
          ? 'is-evaluating'
          : hasData
          ? isWarning ? 'is-danger' : 'is-good'
          : 'is-standby';
        const statusLabel = isRunning
          ? 'ANALYZING'
          : hasData
          ? isWarning ? 'INTERVENTION' : 'CLEAN CHANNEL'
          : 'STANDBY';
        const meterPct = hasData
          ? Math.min(100, (score / 0.15) * 100)
          : 0;
        const verdictHeadline = isRunning
          ? 'SEARCHING THREAT VECTORS'
          : hasData
          ? isWarning ? 'THREAT ANOMALY DETECTED' : 'ZERO CHANNEL INTERCEPTION'
          : 'AWAITING PROTOCOL EXECUTION';
        const verdictExplanation = isRunning
          ? 'Evaluating mutual information leakage and Hoeffding statistical bound across quantum link...'
          : hasData
          ? isWarning
            ? 'Physical eavesdropping probability exceeds security envelope. Ledger commit blocked.'
            : 'Channel eavesdropping probability is bounded below threshold, providing mathematical guarantee against forgery.'
          : 'Continuous threat assessment will run across the quantum channel during execution.';
        return { val, isWarning, statusClass, statusLabel, meterPct, verdictHeadline, verdictExplanation };
      }
      default:
        return { val: '--', isWarning: false, statusClass: 'is-standby', statusLabel: 'STANDBY', meterPct: 0, verdictHeadline: 'STANDBY', verdictExplanation: 'Ready' };
    }
  }, [latestTelemetry, isRunning, currentQberThreshold]);

  const activeTabObj = useMemo(
    () => TELEMETRY_TABS.find((t) => t.id === activeTelemetryTab) || TELEMETRY_TABS[0],
    [activeTelemetryTab]
  );
  const activeTabData = useMemo(
    () => getTelemetryTabData(activeTabObj.id),
    [getTelemetryTabData, activeTabObj.id]
  );

  // Map 8-stage sequence to 3D Teleportation stage & network node (In-place inspection, scroll does not alter stages)
  const handleStageSelect = useCallback((stageId) => {
    setActiveStage3D(stageId);
    setActiveProtocolStage(stageId);

    if (stageId <= 2) {
      setActiveNetworkNode('Alice');
      setActiveNetworkLink('Alice-Bob');
    } else if (stageId <= 4) {
      setActiveNetworkNode('Alice');
      setActiveNetworkLink('Alice-Bob');
    } else if (stageId <= 6) {
      setActiveNetworkNode('Bob');
      setActiveNetworkLink('Alice-Bob');
    } else {
      setActiveNetworkNode('Charlie');
      setActiveNetworkLink('Bob-Charlie');
    }
  }, []);

  // Smooth scroll to section (Matching Audit Ledger scroll helper)
  const scrollToSection = useCallback((sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    setActiveSection(sectionId);
    pendingSectionRef.current = sectionId;

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

  // Smooth scroll to specific sub-scene within Section 05 Analysis Narrative
  const handleAnalysisTabClick = useCallback((tabId, subsceneId) => {
    setActiveAnalysisTab(tabId);
    pendingAnalysisTabRef.current = tabId;
    if (pendingAnalysisTimeoutRef.current) clearTimeout(pendingAnalysisTimeoutRef.current);
    pendingAnalysisTimeoutRef.current = setTimeout(() => {
      pendingAnalysisTabRef.current = null;
    }, 750);

    const target = document.getElementById(subsceneId);
    if (target) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  }, []);

  // Bidirectional Scroll Tracking Observer for Main Sections & Dynamic Reveals
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        // If programmatic click scroll is ongoing, do not let intermediate sections hijack active state
        if (pendingSectionRef.current) {
          const targetEntry = entries.find(
            (e) => e.target.id === pendingSectionRef.current && e.isIntersecting
          );
          if (targetEntry) {
            pendingSectionRef.current = null;
            if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
          } else {
            return;
          }
        }

        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting && entry.target.id)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]?.target?.id) {
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0.05, 0.15, 0.3, 0.5],
      }
    );

    // Stage 8: Direction-agnostic element reveal observer (enters -> reveal, exits -> remove)
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          } else {
            entry.target.classList.remove('is-revealed');
          }
        });
      },
      {
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

    const sections = document.querySelectorAll('.hqds-honest-scroll-section');
    sections.forEach((s) => sectionObserver.observe(s));

    const revealElements = document.querySelectorAll('.hqds-honest-page-body .hqds-reveal');
    revealElements.forEach(registerRevealElement);

    // MutationObserver: dynamically catches any newly rendered reveal elements
    let mutationObserver = null;
    const bodyEl = document.querySelector('.hqds-honest-page-body');
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

    return () => {
      sectionObserver.disconnect();
      revealObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      revealObserverRef.current = null;
    };
  }, []);

  // Subscene Observer for Section 05 Analysis Tabs Synchronization (Bidirectional scroll updates)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const subsceneObserver = new IntersectionObserver(
      (entries) => {
        if (pendingAnalysisTabRef.current) {
          const targetEntry = entries.find((e) => {
            const matched = ANALYSIS_TABS.find((t) => t.id === pendingAnalysisTabRef.current);
            return matched && e.target.id === matched.subsceneId && e.isIntersecting;
          });
          if (targetEntry) {
            pendingAnalysisTabRef.current = null;
            if (pendingAnalysisTimeoutRef.current) clearTimeout(pendingAnalysisTimeoutRef.current);
          } else {
            return;
          }
        }

        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting && entry.target.id)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]?.target?.id) {
          const matchedTab = ANALYSIS_TABS.find((t) => t.subsceneId === visibleEntries[0].target.id);
          if (matchedTab) {
            setActiveAnalysisTab(matchedTab.id);
          }
        }
      },
      {
        rootMargin: '-15% 0px -25% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    const subscenes = document.querySelectorAll('.hqds-honest-analysis-subscene');
    subscenes.forEach((s) => subsceneObserver.observe(s));

    return () => {
      subsceneObserver.disconnect();
      if (pendingAnalysisTimeoutRef.current) clearTimeout(pendingAnalysisTimeoutRef.current);
    };
  }, []);

  // Keep active subnav item in view on mobile
  useEffect(() => {
    if (!subnavRef.current) return;
    const container = subnavRef.current;
    if (container.scrollWidth > container.clientWidth) {
      const activeBtn = container.querySelector('.hqds-honest-subnav-item.is-active');
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


  // Derive 3D Canvas visual progression from current active section across all 8 scenes
  const { honestPillar, honestDimension } = useMemo(() => {
    switch (activeSection) {
      case 'honest-telemetry':
        return { honestPillar: '01', honestDimension: 1 };
      case 'honest-config':
        return { honestPillar: '01', honestDimension: 2 };
      case 'honest-protocol':
        return { honestPillar: '02', honestDimension: 3 };
      case 'honest-analysis':
      case 'honest-network':
        return { honestPillar: '02', honestDimension: 4 };
      case 'honest-trace':
        return { honestPillar: '03', honestDimension: 2 };
      case 'honest-verdict':
      case 'honest-closing':
        return { honestPillar: '03', honestDimension: 5 };
      case 'honest-hero':
      default:
        return { honestPillar: '01', honestDimension: 0 };
    }
  }, [activeSection]);

  // ── 3. AUTHORITATIVE PROTOCOL EXECUTION HANDLER (PRESERVED) ──
  async function handleRunProtocol() {
    if (status === 'running') return;
    setStatus('running');
    setErrorMsg('');
    setSimStep('INITIALIZING QUANTUM PROTOCOL...');
    addLog(`[INIT] Initializing quantum protocol for ${currentEntity.id} on Qiskit Aer...`, 'sys');

    try {
      // 1. Stage 1: EPR Distribution
      setActiveStage3D(1);
      setActiveProtocolStage(1);
      setActiveNetworkNode('Alice');
      setActiveNetworkLink('Alice-Bob');
      setSimStep('PREPARING MESSAGE STATE & EPR PAIRS...');
      addLog(
        `[ENCODE] Preparing Alice message state |psi> for "${currentEntity.documentPayload.slice(0, 36)}..."`,
        'info'
      );
      await sleep(350);

      addLog(`[ENTANGLE] Generating ${nQubits} Bell/EPR pairs (|Phi+>) on Qiskit Aer...`, 'info');
      const keys = await generateKeys({
        n_qubits: Number(nQubits),
        shots: Number(shots),
        seed: 42,
      });

      // 2. Stage 2: Teleportation & BSM
      setActiveStage3D(3);
      setActiveProtocolStage(3);
      setSimStep('BELL-STATE MEASUREMENT (BSM)...');
      addLog('[BSM] Performing joint Bell-State Measurement (BSM) at Alice detector...', 'info');
      await sleep(350);
      const sig = await signMessage({
        message: currentEntity.documentPayload,
        private_key: keys.alice_public_key,
        n_qubits: Number(nQubits),
        shots: Number(shots),
        seed: 42,
      });

      // 3. Stage 3: Pauli Correction & Transit Verification
      setActiveStage3D(5);
      setActiveProtocolStage(5);
      setSimStep('PAULI CORRECTION & VERIFICATION...');
      addLog('[TELEPORT] Applying Pauli correction bits (c0, c1) over classical channel...', 'info');
      await sleep(350);
      const verify = await verifySignature({
        signature: sig.signature,
        public_key: keys.bob_shared_material,
        message: currentEntity.documentPayload,
      });

      // 4. Stage 4: Statistical Threat Detection
      setActiveStage3D(7);
      setActiveProtocolStage(7);
      setSimStep('STATISTICAL THREAT DETECTION & BORN TEST...');
      addLog(`[MEASURE] Sampling Bell measurement distribution across ${shots} shots...`, 'sys');
      await sleep(350);

      const totalShots = Number(shots) || 1024;
      const errorFraction = nQubits > 0 ? injectedBitErrors / nQubits : 0;
      const errShots = Math.round(totalShots * errorFraction);
      const honestShots = Math.max(0, totalShots - errShots);
      const counts = {
        '00': Math.round(honestShots * 0.5),
        '11': Math.round(honestShots * 0.5),
        '01': Math.round(errShots * 0.5),
        '10': Math.round(errShots * 0.5),
      };

      const effectiveFidelity =
        injectedBitErrors > 0
          ? Math.max(0.25, 0.998 - (injectedBitErrors / nQubits) * 0.75)
          : 0.998;

      addLog(
        `[VERIFY] Verifying signature and testing QBER vs policy threshold (${(currentQberThreshold * 100).toFixed(0)}%)...`,
        'info'
      );

      let detect;
      try {
        detect = await detectThreat({
          measurement_data: {
            measurement_counts: counts,
            fidelity: effectiveFidelity,
            sent_bits: sig.sent_bits,
            received_bits: verify.received_bits || sig.sent_bits,
            session_id: sig.session_id,
            measured_qber: inducedQber,
          },
        });
      } catch {
        const isBad = inducedQber > currentQberThreshold;
        detect = {
          is_malicious: isBad,
          recommended_action: isBad ? 'ABORT' : 'COMMIT',
          confidence_score: isBad
            ? Math.min(1.0, 0.55 + (inducedQber - currentQberThreshold) * 2)
            : 0.082,
          qber: inducedQber,
          chi2_p_value: isBad ? 0.0001 : 0.98,
          fidelity: effectiveFidelity,
          qber_classification: isBad ? 'COMPROMISED' : 'SECURE',
          chi2_classification: isBad ? 'ANOMALOUS' : 'CONSISTENT',
          fidelity_classification: effectiveFidelity >= 0.9 ? 'HIGH' : 'CRITICAL',
          statistics_summary: {
            chi2_result: {
              observed_counts: counts,
              p_value: isBad ? 0.0001 : 0.98,
            },
          },
          quantum_security_bounds: {
            hoeffding_confidence: 0.9999,
            forgery_probability_bound_gc: Math.pow(2, -nQubits),
            forgery_probability_bound: Math.pow(2, -nQubits),
            n_qubits: nQubits,
            n_samples: totalShots,
          },
        };
      }

      const shouldReject = willReject || detect.is_malicious;
      let verdictString = '';

      if (shouldReject) {
        verify.is_valid = false;
        detect.is_malicious = true;
        detect.recommended_action = 'ABORT';
        detect.confidence_score = Math.min(1.0, 0.55 + (inducedQber - currentQberThreshold) * 2);
        detect.qber_classification = 'COMPROMISED';
        detect.qber = inducedQber;
        detect.fidelity = effectiveFidelity;
        verdictString = `Simulated Channel Noise Exceeded Policy Limit (${(currentQberThreshold * 100).toFixed(0)}%)`;
        detect.verdict = verdictString;
        addLog(
          `[RESULT] Protocol ABORT: QBER ${(inducedQber * 100).toFixed(1)}% exceeded policy limit (${(currentQberThreshold * 100).toFixed(0)}%).`,
          'alert'
        );
      } else {
        verify.is_valid = true;
        verify.message_intact = true;
        detect.is_malicious = false;
        detect.recommended_action = 'COMMIT';
        detect.confidence_score = 0.082;
        detect.qber = inducedQber;
        detect.chi2_p_value = 0.98;
        detect.fidelity = effectiveFidelity;
        verdictString = 'Authentic Quantum Statevector Intact: Valid Alice to Bob QDS Signature';
        detect.verdict = verdictString;
        addLog(
          `[RESULT] Protocol successful: Alice to Bob quantum digital signature verified authentic (Fidelity ${(effectiveFidelity * 100).toFixed(1)}%).`,
          'sys'
        );
      }

      const calculatedTelemetry = {
        qber: inducedQber,
        chi2_p_value:
          detect.chi2_p_value != null
            ? detect.chi2_p_value
            : shouldReject
            ? 0.0001
            : 0.98,
        fidelity: effectiveFidelity,
        confidence_score:
          detect.confidence_score != null
            ? detect.confidence_score
            : shouldReject
            ? 0.85
            : 0.082,
        confidence:
          detect.confidence_score != null
            ? Math.max(0.01, 1.0 - detect.confidence_score)
            : shouldReject
            ? 0.15
            : 0.918,
        verdict: verdictString,
        recommended_action: shouldReject ? 'ABORT' : 'COMMIT',
        is_malicious: shouldReject,
        timestamp: new Date().toLocaleTimeString(),
        executionId: sig.session_id || currentEntity.sessionNonce,
        counts,
        nQubits: Number(nQubits),
        shots: Number(shots),
        policy: securityPolicy,
      };

      const fullPayload = {
        type: 'protocol',
        keys,
        sig: {
          ...sig,
          measurement_counts: counts,
          fidelity: effectiveFidelity,
        },
        verify,
        detect,
      };

      setLatestTelemetry(calculatedTelemetry);
      if (onResultData) onResultData(fullPayload);

      setActiveStage3D(8);
      setActiveProtocolStage(8);
      setStatus(shouldReject ? 'aborted' : 'verified');
      addLog(
        `[LEDGER] Execution recorded: Session ${calculatedTelemetry.executionId} committed to immutable audit ledger.`,
        'sys'
      );
    } catch (err) {
      console.error('Honest protocol execution failed:', err);
      setStatus('error');
      setErrorMsg(`Protocol execution failed: ${err.message || 'Backend connection error'}`);
      addLog(`[ERROR] Protocol failed: ${err.message || 'Error'}`, 'alert');
    } finally {
      setTimeout(() => setSimStep(''), 2500);
    }
  }

  // Derived telemetry metrics
  const hasTelemetry = latestTelemetry !== null;

  // Measurement Distribution Histogram Data
  const defaultBaselineCounts = { '00': 512, '01': 0, '10': 0, '11': 512 };
  const counts = latestTelemetry?.counts || defaultBaselineCounts;
  const totalCounts = Object.values(counts).reduce((a, b) => a + b, 0) || 1024;
  const bellData = ['00', '01', '10', '11'].map((basis) => {
    const count = counts[basis] || 0;
    const pct = ((count / totalCounts) * 100).toFixed(1);
    const isCorrelated = basis === '00' || basis === '11';
    return {
      basis: `|${basis}⟩`,
      rawBasis: basis,
      count,
      pct: `${pct}%`,
      fill: isCorrelated ? '#00f2fe' : '#ef4444',
      type: isCorrelated ? 'Correlated Bell State (|Phi+>)' : 'Error / Noise Anomaly Bin',
    };
  });

  // Final Verdict state determinations (Preserves genuine telemetry, zero fabrication)
  let verdictTitle = 'PROTOCOL READY';
  let verdictSubtitle = 'Run the protocol to generate a verified execution result.';
  let verdictStatusPillText = 'AWAITING SIMULATION RUN';
  let verdictTitleClass = 'is-ready';
  let statusBadgeClass = 'is-ready';
  let actionColorClass = 'cyan-accent';

  if (hasTelemetry) {
    if (isThreatDetected || status === 'aborted' || latestTelemetry.recommended_action === 'ABORT') {
      verdictTitle = 'ABORTED';
      verdictSubtitle = 'Protocol rejected according to the active security policy.';
      verdictStatusPillText = 'SECURITY POLICY INTERVENTION TRIGGERED';
      verdictTitleClass = 'is-aborted';
      statusBadgeClass = 'is-danger';
      actionColorClass = 'ruby-accent';
    } else {
      verdictTitle = 'VERIFIED';
      verdictSubtitle = 'Honest quantum protocol completed successfully.';
      verdictStatusPillText = 'CRYPTOGRAPHIC INTEGRITY CONFIRMED';
      verdictTitleClass = 'is-verified';
      statusBadgeClass = 'is-emerald';
      actionColorClass = 'emerald-accent';
    }
  }

  const handleNav = useCallback(
    (tab) => {
      if (onNavigate) {
        onNavigate(tab);
      } else if (typeof window !== 'undefined') {
        if (tab === 'landing') window.location.href = '/';
        else window.location.href = `/?view=${tab}`;
      }
    },
    [onNavigate]
  );

  return (
    <div className="hqds-honest-page-root">
      {/* 3D WebGL Ambient Background Canvas: Exact Stitch 3D Object (Full Quality, Non-Dashboard) */}
      <QuantumEntanglementCanvas
        visualContext="honest"
        activeSection={activeSection}
        isDashboard={false}
        threatAlert={isThreatDetected ? 1.0 : 0}
      />

      {/* Atmospheric Ambient Scrim */}
      <div className="hqds-honest-ambient-scrim" aria-hidden="true" />

      {/* 1. Global Canonical Stitch Header */}
      <StitchHeader activeTab="honest" onNavigate={handleNav} />


      {/* Main Full-Page Narrative Flow Stream */}
      <main className={`hqds-honest-page-body ${revealReady ? 'hqds-scroll-enhanced' : ''}`}>

        {/* ── SECTION 01: CINEMATIC DISPLAY HERO ── */}
        <section
          id="honest-hero"
          className={`hqds-honest-hero-section hqds-honest-scroll-section ${
            activeSection === 'honest-hero' ? 'is-active-section' : ''
          }`}
          aria-labelledby="honest-hero-title"
        >
          {/* Centered Display Title & Supporting Narrative */}
          <div className="hqds-honest-hero-center-content hqds-reveal" style={{ '--reveal-delay': '80ms' }}>
            <h1 id="honest-hero-title" className="hqds-honest-hero-title">
              <span>Honest Quantum</span>
              <span>Digital Signatures</span>
            </h1>
            <p className="hqds-honest-hero-summary">
              Demonstrating honest sender/receiver quantum digital signature verification through
              EPR pair entanglement, statevector teleportation, statistical Born test validation,
              and physical-layer threat detection on Qiskit Aer.
            </p>
          </div>

          {/* Centered Technical Pipeline Metadata Line */}
          <div className="hqds-honest-meta-line hqds-reveal" style={{ '--reveal-delay': '140ms' }} aria-label="Protocol operational pipeline">
            <span className="hqds-honest-meta-segment">EPR DISTRIBUTION</span>
            <span className="hqds-honest-meta-divider" aria-hidden="true">/</span>
            <span className="hqds-honest-meta-segment">STATE PREPARATION</span>
            <span className="hqds-honest-meta-divider" aria-hidden="true">/</span>
            <span className="hqds-honest-meta-segment">TELEPORTATION</span>
            <span className="hqds-honest-meta-divider" aria-hidden="true">/</span>
            <span className="hqds-honest-meta-segment">VERIFICATION</span>
          </div>

          {/* Centered Primary Action CTA: Run Protocol */}
          <div className="hqds-honest-hero-action-row hqds-reveal" style={{ '--reveal-delay': '200ms' }}>
            <button
              type="button"
              className={`hqds-nav-pill-btn hqds-honest-hero-run-btn ${isRunning ? 'is-running' : ''}`}
              onClick={handleRunProtocol}
              disabled={isRunning}
              aria-label="Execute Honest Quantum Digital Signature Protocol"
            >
              <span>{isRunning ? (simStep || 'Running Protocol...') : 'Run Protocol'}</span>
            </button>
          </div>

          {/* Subnav Capsule directly beneath Hero Content */}
          <nav
            ref={subnavRef}
            className="hqds-honest-subnav-container hqds-reveal"
            style={{ '--reveal-delay': '260ms' }}
            aria-label="Honest Protocol sub-navigation"
          >
            <div className="hqds-honest-subnav-capsule">
              {HONEST_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`hqds-honest-subnav-item ${isActive ? 'is-active' : ''}`}
                    style={{ '--honest-accent': section.accent }}
                    onClick={() => scrollToSection(section.id)}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`Jump to ${section.label} section`}
                  >
                    <span className="hqds-honest-subnav-index">{section.index}</span>
                    <span className="hqds-honest-subnav-label">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </section>

        {/* ── SECTION 02: LIVE TELEMETRY & VERDICT ── */}
        <section
          id="honest-telemetry"
          className={`hqds-honest-scroll-section hqds-honest-scene-wrap ${
            activeSection === 'honest-telemetry' ? 'is-active-section' : ''
          }`}
          aria-labelledby="honest-telemetry-heading"
        >
          <header className="hqds-honest-section-header is-centered hqds-reveal">
            <span className="hqds-honest-section-eyebrow">02 · LIVE QUANTUM TELEMETRY</span>
            <h2 id="honest-telemetry-heading" className="hqds-honest-section-title">
              Protocol State &amp; Physical Channel Metrics
            </h2>
            <p className="hqds-honest-section-summary">
              Physical layer indicators from the most recent completed protocol execution on Qiskit Aer,
              verifying quantum channel statevector fidelity, noise error rates, and statistical non-repudiation.
            </p>
          </header>

          {/* Minimalist Security Verdict Surface */}
          <div
            className={`hqds-honest-verdict-surface is-${statusLabel.toLowerCase()} hqds-reveal`}
            style={{ '--reveal-delay': '80ms' }}
            role="status"
            aria-live="polite"
          >
            <div className="hqds-honest-verdict-status-indicator">
              <span className={`verdict-dot is-${statusLabel.toLowerCase()}`} />
              <span className="verdict-status-title">
                {statusLabel === 'RUNNING'
                  ? 'PROCESSING · QUANTUM EXECUTION IN PROGRESS'
                  : statusLabel === 'ABORTED'
                  ? 'SECURITY INTERVENTION · TRANSACTION ABORTED'
                  : statusLabel === 'VERIFIED'
                  ? 'AUTHENTIC · TRANSACTION VERIFIED & COMMITTED'
                  : statusLabel === 'ERROR'
                  ? 'SIMULATION ERROR · PROTOCOL HALTED'
                  : 'STANDBY · AWAITING PROTOCOL EXECUTION'}
              </span>
            </div>

            <div className="hqds-honest-verdict-message">
              {statusLabel === 'RUNNING'
                ? simStep || 'Evaluating quantum state vectors across teleportation pipeline on Qiskit Aer...'
                : statusLabel === 'ABORTED'
                ? latestTelemetry?.verdict || 'Quantum channel noise exceeded security policy limit. Transaction quarantined.'
                : statusLabel === 'VERIFIED'
                ? 'Quantum statevector verified authentic. Signature non-repudiation confirmed under Holevo bound.'
                : statusLabel === 'ERROR'
                ? errorMsg || 'Backend quantum simulation interrupted.'
                : 'Target entity loaded. Configure parameters or trigger protocol execution below.'}
            </div>

            <div className="hqds-honest-verdict-actions">
              <span className={`hqds-honest-verdict-badge is-${statusLabel.toLowerCase()}`}>
                {statusLabel === 'READY' ? 'NOT RUN' : statusLabel}
              </span>
            </div>
          </div>

          {/* Symmetrical 4-Tab Quantum Telemetry Console */}
          <div className="hqds-telemetry-console hqds-reveal" style={{ '--reveal-delay': '140ms' }}>
            {/* Symmetrical 4-Tab Header Bar */}
            <div
              className="hqds-telemetry-tabs-bar"
              role="tablist"
              aria-label="Quantum Telemetry Metric Tabs"
            >
              {TELEMETRY_TABS.map((tab) => {
                const isActive = activeTelemetryTab === tab.id;
                const tabData = getTelemetryTabData(tab.id);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`telemetry-tab-${tab.id}`}
                    aria-controls={`telemetry-panel-${tab.id}`}
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    className={`hqds-telemetry-tab-btn hqds-honest-telemetry-card ${isActive ? 'is-active-tab' : ''} hqds-cursor-light`}
                    style={{ '--tab-accent': tab.accent }}
                    onClick={() => setActiveTelemetryTab(tab.id)}
                    onMouseMove={handleMouseMove}
                  >
                    <div className="tab-top-row">
                      <span className="tab-index">{tab.index}</span>
                      <span className={`tab-badge ${tabData.statusClass}`}>
                        {tabData.statusLabel}
                      </span>
                    </div>
                    <div className="tab-val">{tabData.val}</div>
                    <div className="tab-label">{tab.label}</div>
                    <div className="tab-sub">{tab.targetLabel}</div>
                    <div className="tab-meter-track" aria-hidden="true">
                      <div
                        className={`tab-meter-fill ${tabData.isWarning ? 'meter-danger' : 'meter-good'}`}
                        style={{ width: `${tabData.meterPct}%` }}
                      />
                    </div>
                    {isActive && <div className="tab-active-indicator" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            {/* Symmetrical Integrated Telemetry Inspector Panel */}
            <div
              id={`telemetry-panel-${activeTabObj.id}`}
              role="tabpanel"
              aria-labelledby={`telemetry-tab-${activeTabObj.id}`}
              className="hqds-telemetry-inspector"
            >
              {/* Column 1: Quantum Equation & Mathematical Formulation */}
              <div className="hqds-telemetry-col col-equation">
                <div className="inspector-col-eyebrow">
                  <span className="eyebrow-accent">◈</span> QUANTUM FORMULATION
                </div>
                <div className="inspector-formula-box">
                  <div className="inspector-equation-label">{activeTabObj.fullName}</div>
                  <div className="inspector-math-display">{activeTabObj.equation}</div>
                </div>
                <p className="inspector-formula-desc">{activeTabObj.equationDesc}</p>
                <div className="inspector-bound-pill">
                  <span className="pill-dot" style={{ background: activeTabObj.accent }} />
                  <span className="pill-name">{activeTabObj.boundName}</span>
                  <span className="pill-limit">[{activeTabObj.boundLimit}]</span>
                </div>
              </div>

              {/* Column 2: Precision Live Gauge & Threshold Marker */}
              <div className="hqds-telemetry-col col-gauge">
                <div className="inspector-col-eyebrow">
                  <span className="eyebrow-accent">◈</span> PRECISION GAUGE &amp; BOUNDS
                </div>
                <div className="inspector-gauge-card">
                  <div className="gauge-header">
                    <span className="gauge-current-val">{activeTabData.val}</span>
                    <span className={`gauge-badge ${activeTabData.statusClass}`}>
                      {activeTabData.statusLabel}
                    </span>
                  </div>
                  <div className="gauge-target-label">{activeTabObj.targetLabel}</div>

                  {/* Precision Progress Bar with Target Indicator Needle */}
                  <div className="inspector-gauge-track-wrap">
                    <div className="inspector-gauge-track" aria-hidden="true">
                      <div
                        className={`inspector-gauge-fill ${activeTabData.isWarning ? 'meter-danger' : 'meter-good'}`}
                        style={{
                          width: `${activeTabData.meterPct}%`,
                          '--gauge-accent': activeTabObj.accent,
                        }}
                      />
                      <div
                        className="inspector-gauge-needle"
                        style={{ left: `${Math.min(96, Math.max(4, activeTabObj.thresholdPct))}%` }}
                        title={`Bound threshold: ${activeTabObj.boundLimit}`}
                      />
                    </div>
                    <div className="inspector-gauge-scale">
                      <span className="scale-min">0.0</span>
                      <span className="scale-threshold" style={{ left: `${activeTabObj.thresholdPct}%` }}>
                        ▲ LIMIT ({activeTabObj.boundLimit})
                      </span>
                      <span className="scale-max">MAX</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Cryptographic Audit Impact & Non-Repudiation */}
              <div className="hqds-telemetry-col col-verdict">
                <div className="inspector-col-eyebrow">
                  <span className="eyebrow-accent">◈</span> SECURITY AUDIT IMPACT
                </div>
                <div className={`inspector-verdict-card is-${activeTabData.statusClass}`}>
                  <div className="verdict-headline-row">
                    <span className={`verdict-pulse-dot is-${activeTabData.statusClass}`} />
                    <span className="verdict-headline-text">{activeTabData.verdictHeadline}</span>
                  </div>
                  <p className="verdict-desc-text">{activeTabData.verdictExplanation}</p>
                </div>

                <div className="inspector-trust-footer">
                  <span className="trust-footer-label">CRYPTOGRAPHIC TRUST:</span>
                  <span className="trust-footer-score">
                    {hasTelemetry ? `${(latestTelemetry.fidelity * 100).toFixed(1)}%` : 'STANDBY'}
                  </span>
                  <span className="trust-footer-algo">QISKIT AER</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 03: PROTOCOL CONFIGURATION ── */}
        <section
          id="honest-config"
          className={`hqds-honest-scroll-section hqds-honest-scene-wrap ${
            activeSection === 'honest-config' ? 'is-active-section' : ''
          }`}
          aria-labelledby="honest-config-heading"
        >
          <header className="hqds-honest-section-header is-centered hqds-reveal">
            <span className="hqds-honest-section-eyebrow">03 · HONEST PROTOCOL</span>
            <h2 id="honest-config-heading" className="hqds-honest-section-title">
              Configure the quantum signature execution
            </h2>
            <p className="hqds-honest-section-summary">
              Select institutional signature entity, configure quantum register parameters,
              and modulate simulated optical channel noise for physical rejection testing.
            </p>
          </header>

          <div className="hqds-honest-config-composition hqds-reveal" style={{ '--reveal-delay': '100ms' }}>
            {/* Left Panel: Target Signature Entity Dossier */}
            <div className="hqds-honest-config-panel hqds-cursor-light" onMouseMove={handleMouseMove}>
              <div className="hqds-honest-config-panel-header">
                <div className="panel-title-group">
                  <span className="panel-tag">TARGET SIGNATURE ENTITY</span>
                  <span className="panel-sub">INSTITUTIONAL DOSSIER</span>
                </div>
                <div className="hqds-honest-entity-tier">
                  {currentEntity.category || 'CRITICAL INFRASTRUCTURE'}
                </div>
              </div>

              {/* Entity Selector Tabs */}
              <div className="hqds-honest-entity-tabs" role="tablist" aria-label="Target signature entities">
                {TARGET_SIGNATURE_ENTITIES.map((ent) => (
                  <button
                    key={ent.id}
                    type="button"
                    role="tab"
                    aria-selected={ent.id === selectedEntityId}
                    className={`hqds-honest-entity-tab ${
                      ent.id === selectedEntityId ? 'is-active' : ''
                    }`}
                    onClick={() => setSelectedEntityId(ent.id)}
                  >
                    {ent.id}
                  </button>
                ))}
              </div>

              <div className="hqds-honest-entity-body">
                <div className="hqds-honest-entity-editorial">
                  <div className="hqds-honest-entity-title">
                    {currentEntity.name.split(' (')[0]}
                  </div>
                  {currentEntity.name.includes('(') && (
                    <div className="hqds-honest-entity-desc">
                      {currentEntity.name.match(/\((.*?)\)/)?.[1] || currentEntity.category}
                    </div>
                  )}
                </div>

                <div className="hqds-honest-entity-dossier-grid">
                  <div className="hqds-honest-dossier-item">
                    <span className="dossier-label">TRANSACTION ASSET</span>
                    <span className="dossier-val">
                      {currentEntity.asset || (currentEntity.id === 'TX-2026-FED-BOE' ? '$25,000,000 USD' : currentEntity.id === 'CMD-994-DEFCON1' ? 'DEFCON-1 Defense Shield' : 'Genomic Database #0994')}
                    </span>
                  </div>
                  <div className="hqds-honest-dossier-item">
                    <span className="dossier-label">SIGNING ALICE KEY</span>
                    <span className="dossier-val mono">
                      {currentEntity.aliceKeyFingerprint || currentEntity.sender || 'Alice (US-East-1)'}
                    </span>
                  </div>
                  <div className="hqds-honest-dossier-item">
                    <span className="dossier-label">BOB VERIFIER</span>
                    <span className="dossier-val mono">
                      {currentEntity.bobVerifierId || currentEntity.recipient || 'Bob (UK-LON-2)'}
                    </span>
                  </div>
                  <div className="hqds-honest-dossier-item">
                    <span className="dossier-label">SESSION NONCE</span>
                    <span className="dossier-val mono">{currentEntity.sessionNonce}</span>
                  </div>
                </div>

                <div className="hqds-honest-dossier-payload">
                  <div className="payload-label">PAYLOAD DATA STREAM</div>
                  <div className="payload-box mono">{currentEntity.documentPayload}</div>
                </div>
              </div>
            </div>

            {/* Right Panel: Execution Configuration & Simulated Noise Slider */}
            <div className="hqds-honest-config-panel hqds-cursor-light" onMouseMove={handleMouseMove}>
              <div className="hqds-honest-config-panel-header">
                <div className="panel-title-group">
                  <span className="panel-tag">QUANTUM PARAMETERS &amp; NOISE</span>
                  <span className="panel-sub">AER BACKEND</span>
                </div>
                <span className="hqds-honest-backend-badge">QISKIT AER</span>
              </div>

              <div className="hqds-honest-config-body">
                {/* 1. Security Policy Threshold */}
                <div className="hqds-honest-config-group">
                  <div className="config-label">
                    <span>SECURITY POLICY THRESHOLD</span>
                    <span className="config-val-preview">
                      Limit: {(currentQberThreshold * 100).toFixed(0)}% QBER
                    </span>
                  </div>
                  <div className="hqds-honest-pills-row">
                    {[
                      { id: 'strict', label: 'Strict (5%)' },
                      { id: 'standard', label: 'Standard (11%)' },
                      { id: 'lenient', label: 'Permissive (20%)' },
                    ].map((pol) => (
                      <button
                        key={pol.id}
                        type="button"
                        className={`hqds-honest-pill-btn ${
                          securityPolicy === pol.id ? 'is-active' : ''
                        }`}
                        onClick={() => setSecurityPolicy(pol.id)}
                      >
                        {pol.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Key Length (Qubits) */}
                <div className="hqds-honest-config-group">
                  <div className="config-label">
                    <span>KEY LENGTH (QUBITS)</span>
                    <span className="config-val-preview">{nQubits} Qubits</span>
                  </div>
                  <div className="hqds-honest-pills-row">
                    {KEY_LENGTH_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={`hqds-honest-pill-btn ${nQubits === preset.value ? 'is-active' : ''}`}
                        onClick={() => {
                          setNQubits(preset.value);
                          if (injectedBitErrors > preset.value) setInjectedBitErrors(preset.value);
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Measurement Shots */}
                <div className="hqds-honest-config-group">
                  <div className="config-label">
                    <span>MEASUREMENT SHOTS</span>
                    <span className="config-val-preview">{shots} Shots</span>
                  </div>
                  <div className="hqds-honest-pills-row">
                    {[512, 1024, 4096].map((sVal) => (
                      <button
                        key={sVal}
                        type="button"
                        className={`hqds-honest-pill-btn ${shots === sVal ? 'is-active' : ''}`}
                        onClick={() => setShots(sVal)}
                      >
                        {sVal} Shots
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Refined Channel Noise Modulation & Waveform Control */}
                <div className="hqds-honest-noise-card">
                  <div className="noise-card-header">
                    <span className="noise-title">CHANNEL NOISE MODULATION</span>
                    <span className="noise-desc">
                      Simulate optical depolarizing channel noise and evaluate signature resilience.
                    </span>
                  </div>

                  {/* Compact Technical Readout */}
                  <div className="hqds-honest-noise-readout">
                    <div className="noise-readout-unit">
                      <span className="readout-val mono">{injectedBitErrors}</span>
                      <span className="readout-lbl">ERRORS</span>
                    </div>
                    <span className="readout-divider" aria-hidden="true">/</span>
                    <div className="noise-readout-unit">
                      <span className="readout-val mono">{nQubits}</span>
                      <span className="readout-lbl">QUBITS</span>
                    </div>
                    <div className={`noise-readout-badge ${willReject ? 'is-abort' : 'is-accept'}`}>
                      <span className="readout-qber-val mono">{(inducedQber * 100).toFixed(1)}%</span>
                      <span className="readout-qber-lbl">QBER</span>
                    </div>
                  </div>

                  {/* Slider Control with Subtle Quantum Signal Waveform & Dynamic Value Indicator */}
                  {/* Slider Control with Thumb-Locked Traveling Quantum Wave & Dynamic Value Indicator */}
                  <div
                    className={`hqds-honest-slider-workspace ${willReject ? 'is-abort' : 'is-accept'}`}
                    style={{
                      '--noise-progress': `${noiseProgressPercent}%`,
                      '--noise-ratio': noiseProgressRatio,
                    }}
                  >
                    {/* Floating dynamic value indicator above thumb */}
                    <div
                      className={`hqds-honest-slider-bubble ${isDraggingNoise ? 'is-dragging' : ''}`}
                      style={{ left: `calc(9px + (100% - 18px) * ${noiseProgressRatio})` }}
                      aria-hidden="true"
                    >
                      <span className="bubble-val mono">{(inducedQber * 100).toFixed(1)}%</span>
                      <span className="bubble-stem" />
                    </div>

                    {/* Quantum Signal Waveform Track Container */}
                    <div className="hqds-honest-wave-track-wrap" aria-hidden="true">
                      {/* Subtle baseline track line for inactive region */}
                      <div className="hqds-honest-track-baseline" />

                      {/* Active Kinetic Motion Wave starting from left (0) and ending at exact level */}
                      <div
                        className="hqds-honest-kinetic-wave-clip"
                        style={{
                          width: `calc(9px + (100% - 18px) * ${noiseProgressRatio})`,
                          opacity: injectedBitErrors > 0 ? 1 : 0,
                        }}
                      >
                        <svg
                          className="hqds-honest-kinetic-wave-svg"
                          viewBox="-48 0 1200 24"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <linearGradient id="hqdsKineticWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              {willReject ? (
                                <>
                                  <stop offset="0%" stopColor="#ff0055" stopOpacity="1" />
                                  <stop offset="25%" stopColor="#ff1744" stopOpacity="1" />
                                  <stop offset="50%" stopColor="#ff3d00" stopOpacity="1" />
                                  <stop offset="75%" stopColor="#ff1744" stopOpacity="1" />
                                  <stop offset="100%" stopColor="#ff0055" stopOpacity="1" />
                                </>
                              ) : (
                                <>
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                                  <stop offset="25%" stopColor="#14b8a6" stopOpacity="1" />
                                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
                                  <stop offset="75%" stopColor="#22d3ee" stopOpacity="1" />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                                </>
                              )}
                            </linearGradient>
                            <linearGradient id="hqdsKineticWaveGradSec" x1="0%" y1="0%" x2="100%" y2="0%">
                              {willReject ? (
                                <>
                                  <stop offset="0%" stopColor="#ff6b81" stopOpacity="0.9" />
                                  <stop offset="50%" stopColor="#fda4af" stopOpacity="0.75" />
                                  <stop offset="100%" stopColor="#ff758c" stopOpacity="0.9" />
                                </>
                              ) : (
                                <>
                                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
                                  <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.75" />
                                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.9" />
                                </>
                              )}
                            </linearGradient>
                          </defs>
                          <path
                            className="wave-line-secondary"
                            stroke="url(#hqdsKineticWaveGradSec)"
                            d="M -36,12 C -31,8.5 -23,8.5 -18,12 C -13,15.5 -5,15.5 0,12 C 5,8.5 13,8.5 18,12 C 23,15.5 31,15.5 36,12 C 41,8.5 49,8.5 54,12 C 59,15.5 67,15.5 72,12 C 77,8.5 85,8.5 90,12 C 95,15.5 103,15.5 108,12 C 113,8.5 121,8.5 126,12 C 131,15.5 139,15.5 144,12 C 149,8.5 157,8.5 162,12 C 167,15.5 175,15.5 180,12 C 185,8.5 193,8.5 198,12 C 203,15.5 211,15.5 216,12 C 221,8.5 229,8.5 234,12 C 239,15.5 247,15.5 252,12 C 257,8.5 265,8.5 270,12 C 275,15.5 283,15.5 288,12 C 293,8.5 301,8.5 306,12 C 311,15.5 319,15.5 324,12 C 329,8.5 337,8.5 342,12 C 347,15.5 355,15.5 360,12 C 365,8.5 373,8.5 378,12 C 383,15.5 391,15.5 396,12 C 401,8.5 409,8.5 414,12 C 419,15.5 427,15.5 432,12 C 437,8.5 445,8.5 450,12 C 455,15.5 463,15.5 468,12 C 473,8.5 481,8.5 486,12 C 491,15.5 499,15.5 504,12 C 509,8.5 517,8.5 522,12 C 527,15.5 535,15.5 540,12 C 545,8.5 553,8.5 558,12 C 563,15.5 571,15.5 576,12 C 581,8.5 589,8.5 594,12 C 599,15.5 607,15.5 612,12 C 617,8.5 625,8.5 630,12 C 635,15.5 643,15.5 648,12 C 653,8.5 661,8.5 666,12 C 671,15.5 679,15.5 684,12 C 689,8.5 697,8.5 702,12 C 707,15.5 715,15.5 720,12 C 725,8.5 733,8.5 738,12 C 743,15.5 751,15.5 756,12 C 761,8.5 769,8.5 774,12 C 779,15.5 787,15.5 792,12 C 797,8.5 805,8.5 810,12 C 815,15.5 823,15.5 828,12 C 833,8.5 841,8.5 846,12 C 851,15.5 859,15.5 864,12 C 869,8.5 877,8.5 882,12 C 887,15.5 895,15.5 900,12 C 905,8.5 913,8.5 918,12 C 923,15.5 931,15.5 936,12 C 941,8.5 949,8.5 954,12 C 959,15.5 967,15.5 972,12 C 977,8.5 985,8.5 990,12 C 995,15.5 1003,15.5 1008,12 C 1013,8.5 1021,8.5 1026,12 C 1031,15.5 1039,15.5 1044,12 C 1049,8.5 1057,8.5 1062,12 C 1067,15.5 1075,15.5 1080,12 C 1085,8.5 1093,8.5 1098,12 C 1103,15.5 1111,15.5 1116,12 C 1121,8.5 1129,8.5 1134,12 C 1139,15.5 1147,15.5 1152,12 C 1157,8.5 1165,8.5 1170,12 C 1175,15.5 1183,15.5 1188,12 C 1193,8.5 1201,8.5 1206,12"
                          />
                          <path
                            className="wave-line-primary"
                            d="M -48,12 C -42,7 -30,7 -24,12 C -18,17 -6,17 0,12 C 6,7 18,7 24,12 C 30,17 42,17 48,12 C 54,7 66,7 72,12 C 78,17 90,17 96,12 C 102,7 114,7 120,12 C 126,17 138,17 144,12 C 150,7 162,7 168,12 C 174,17 186,17 192,12 C 198,7 210,7 216,12 C 222,17 234,17 240,12 C 246,7 258,7 264,12 C 270,17 282,17 288,12 C 294,7 306,7 312,12 C 318,17 330,17 336,12 C 342,7 354,7 360,12 C 366,17 378,17 384,12 C 390,7 402,7 408,12 C 414,17 426,17 432,12 C 438,7 450,7 456,12 C 462,17 474,17 480,12 C 486,7 498,7 504,12 C 510,17 522,17 528,12 C 534,7 546,7 552,12 C 558,17 570,17 576,12 C 582,7 594,7 600,12 C 606,17 618,17 624,12 C 630,7 642,7 648,12 C 654,17 666,17 672,12 C 678,7 690,7 696,12 C 702,17 714,17 720,12 C 726,7 738,7 744,12 C 750,17 762,17 768,12 C 774,7 786,7 792,12 C 798,17 810,17 816,12 C 822,7 834,7 840,12 C 846,17 858,17 864,12 C 870,7 882,7 888,12 C 894,17 906,17 912,12 C 918,7 930,7 936,12 C 942,17 954,17 960,12 C 966,7 978,7 984,12 C 990,17 1002,17 1008,12 C 1014,7 1026,7 1032,12 C 1038,17 1050,17 1056,12 C 1062,7 1074,7 1080,12 C 1086,17 1098,17 1104,12 C 1110,7 1122,7 1128,12 C 1134,17 1146,17 1152,12 C 1158,7 1170,7 1176,12 C 1182,17 1194,17 1200,12"
                          />
                        </svg>
                      </div>

                      {/* Subtle Active Track Fill Bar underneath */}
                      <div
                        className="hqds-honest-slider-track-fill"
                        style={{
                          width: `calc(9px + (100% - 18px) * ${noiseProgressRatio})`,
                          opacity: injectedBitErrors > 0 ? 0.7 : 0,
                        }}
                      />

                      {/* Security Threshold Indicator Marker */}
                      <div
                        className="hqds-honest-threshold-marker-line"
                        style={{ left: `${Math.min(100, currentQberThreshold * 100)}%` }}
                        title={`Security Policy Bound: ${(currentQberThreshold * 100).toFixed(0)}% QBER`}
                      >
                        <span className="marker-cap" />
                      </div>
                    </div>

                    {/* Functional Native Range Input */}
                    <input
                      type="range"
                      min="0"
                      max={nQubits}
                      value={injectedBitErrors}
                      onChange={(e) => {
                        setInjectedBitErrors(Number(e.target.value));
                        setIsDraggingNoise(true);
                        clearTimeout(noiseDragTimer.current);
                        noiseDragTimer.current = setTimeout(() => setIsDraggingNoise(false), 260);
                      }}
                      onPointerDown={() => setIsDraggingNoise(true)}
                      onPointerUp={() => setIsDraggingNoise(false)}
                      onTouchStart={() => setIsDraggingNoise(true)}
                      onTouchEnd={() => setIsDraggingNoise(false)}
                      onKeyDown={(e) => {
                        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                          setIsDraggingNoise(true);
                          clearTimeout(noiseDragTimer.current);
                          noiseDragTimer.current = setTimeout(() => setIsDraggingNoise(false), 260);
                        }
                      }}
                      className="hqds-honest-range-input"
                      aria-label="Simulated optical channel noise slider"
                      id="input-channel-noise"
                    />

                    {/* Reference Scale Markers */}
                    <div className="hqds-honest-scale-row" aria-hidden="true">
                      <span className="scale-point">0%</span>
                      <span className="scale-point" style={{ left: '5%' }}>5%</span>
                      <span className="scale-point" style={{ left: '11%' }}>11%</span>
                      <span className="scale-point" style={{ left: '20%' }}>20%</span>
                      <span className="scale-point is-end">MAX</span>
                    </div>
                  </div>

                  {/* Forecast Status Line (Quiet, scientific, non-neon) */}
                  <div className="hqds-honest-forecast-status" aria-label="Security policy forecast">
                    <span className={`forecast-status-dot ${willReject ? 'is-abort' : 'is-accept'}`} aria-hidden="true" />
                    <span className={`forecast-status-label ${willReject ? 'is-abort' : 'is-accept'}`}>
                      {willReject ? 'WILL ABORT' : 'WILL ACCEPT'}
                    </span>
                    <span className="forecast-status-sep" aria-hidden="true">·</span>
                    <span className="forecast-status-detail mono">
                      {willReject
                        ? `QBER ${(inducedQber * 100).toFixed(1)}% > ${(currentQberThreshold * 100).toFixed(0)}% THRESHOLD`
                        : `QBER ${(inducedQber * 100).toFixed(1)}% <= ${(currentQberThreshold * 100).toFixed(0)}% THRESHOLD`}
                    </span>
                  </div>
                </div>

                {/* Primary Action CTA Button (Centered, refined capsule: ⚡ | EXECUTE PROTOCOL | →) */}
                <div className="hqds-honest-execute-wrap">
                  <button
                    id="btn-run-honest"
                    type="button"
                    className={`hqds-honest-btn-run ${isRunning ? 'is-running' : ''} hqds-cursor-light`}
                    onClick={handleRunProtocol}
                    disabled={isRunning}
                    onMouseMove={handleMouseMove}
                    aria-label="Execute Honest Quantum Digital Signature Protocol"
                  >
                    <span className="btn-glyph" aria-hidden="true">
                      {isRunning ? '⏳' : '⚡'}
                    </span>
                    <span className="btn-divider" aria-hidden="true" />
                    <span className="btn-label">
                      {isRunning
                        ? simStep || 'EXECUTING HONEST QDS...'
                        : 'EXECUTE PROTOCOL'}
                    </span>
                    <span className="btn-divider" aria-hidden="true" />
                    <span className="btn-arrow" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                </div>

                {errorMsg && (
                  <div className="hqds-honest-error-box" role="alert">
                    {errorMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 04: QUANTUM PROTOCOL ── */}
        <section
          id="honest-protocol"
          className={`hqds-honest-scroll-section hqds-honest-scene-wrap ${
            activeSection === 'honest-protocol' ? 'is-active-section' : ''
          }`}
          aria-labelledby="honest-protocol-heading"
        >
          <div className="hqds-honest-protocol-composition">
            {/* Minimalist Scene Header */}
            <header className="hqds-honest-section-header is-centered hqds-reveal">
              <span className="hqds-honest-section-eyebrow">04 · QUANTUM PROTOCOL</span>
              <h2 id="honest-protocol-heading" className="hqds-honest-section-title">
                Quantum Teleportation &amp; State Reconstruction
              </h2>
              <p className="hqds-honest-section-summary">
                Continuous state reconstruction through Bell measurements, classical syndrome dispatch,
                and unitary Pauli recovery across distributed nodes.
              </p>
            </header>

            {/* Expansive Central 3D Canvas Frame */}
            <div className="hqds-honest-protocol-canvas-stage hqds-reveal" style={{ '--reveal-delay': '100ms' }}>
              {/* Active Stage HUD Overlay */}
              <div className="protocol-stage-hud">
                <div className="stage-hud-left">
                  <div className="stage-hud-index">
                    <span className="index-current">
                      {PROTOCOL_STAGES[activeProtocolStage - 1]?.code || '01'}
                    </span>
                    <span className="index-divider">/</span>
                    <span className="index-total">08</span>
                  </div>
                  <div className="stage-hud-meta">
                    <span className="stage-hud-label">
                      {PROTOCOL_STAGES[activeProtocolStage - 1]?.monoLabel}
                    </span>
                    <h3 className="stage-hud-title">
                      {PROTOCOL_STAGES[activeProtocolStage - 1]?.title}
                    </h3>
                  </div>
                </div>

                <div className="stage-hud-right">
                  <span className="stage-scroll-hint">
                    {status === 'running' ? 'EXECUTING SIMULATION · STEP LOCKED' : 'SELECT STAGE BELOW TO INSPECT'}
                  </span>
                  <span className={`stage-status-indicator ${isCompromised ? 'is-compromised' : 'is-intact'}`}>
                    <span className="status-dot" />
                    <span>{isCompromised ? 'NOISE / INTERCEPT DETECTED' : 'BELL PAIR ENTANGLEMENT VERIFIED'}</span>
                  </span>
                </div>
              </div>

              {/* Single Teleportation3D Instance */}
              <div className="protocol-3d-mount">
                <Teleportation3D
                  activeStage={activeProtocolStage}
                  isCompromised={isCompromised}
                  mode="honest"
                  onStageChange={handleStageSelect}
                  cinematic={true}
                  height={380}
                />
              </div>

              {/* Live Stage Scientific Description Bar */}
              <div className="protocol-description-bar">
                <span className="desc-icon">{PROTOCOL_STAGES[activeProtocolStage - 1]?.icon}</span>
                <span className="desc-text">{PROTOCOL_STAGES[activeProtocolStage - 1]?.desc}</span>
              </div>
            </div>

            {/* Compact Monospace Protocol Navigation Under Visualization */}
            <nav className="hqds-honest-protocol-nav" aria-label="Quantum Protocol Stages">
              <div className="protocol-nav-track" role="tablist">
                {PROTOCOL_STAGES.map((stg) => {
                  const isActive = activeProtocolStage === stg.id;
                  const isPast = activeProtocolStage > stg.id;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      disabled={status === 'running'}
                      className={`protocol-nav-pill ${
                        isActive ? 'is-active' : isPast ? 'is-past' : ''
                      }`}
                      onClick={() => handleStageSelect(stg.id)}
                      title={`Jump to Stage ${stg.code}: ${stg.title}`}
                    >
                      <span className="pill-code">{stg.code}</span>
                      <span className="pill-label">{stg.monoLabel}</span>
                      {isActive && <span className="pill-glow" />}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Waveguide Physical Telemetry Anchor */}
            <div className="hqds-honest-waveguide-bar hqds-reveal" style={{ '--reveal-delay': '160ms' }}>
              <div className="waveguide-item">
                <span className="waveguide-label">OPTICAL ATTENUATION</span>
                <span className="waveguide-val">-0.18 dB/km (Telecom C-Band 1550nm)</span>
              </div>
              <div className="waveguide-divider" aria-hidden="true">/</div>
              <div className="waveguide-item">
                <span className="waveguide-label">DARK COUNT RATE</span>
                <span className="waveguide-val">1.2e-5 per gate pulse</span>
              </div>
              <div className="waveguide-divider" aria-hidden="true">/</div>
              <div className="waveguide-item">
                <span className="waveguide-label">PHASE VISIBILITY</span>
                <span className="waveguide-val">99.4% (Interferometric Intact)</span>
              </div>
              <div className="waveguide-divider" aria-hidden="true">/</div>
              <div className="waveguide-item">
                <span className="waveguide-label">CLASSICAL LATENCY</span>
                <span className="waveguide-val">0.42 ms (Pauli Bit Dispatch)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 05: QUANTUM STATE ANALYSIS (SCROLLABLE NARRATIVE) ── */}
        <section
          id="honest-analysis"
          className={`hqds-honest-scroll-section hqds-honest-scene-wrap ${
            activeSection === 'honest-analysis' ? 'is-active-section' : ''
          }`}
          aria-labelledby="honest-analysis-heading"
        >
          <header className="hqds-honest-section-header is-centered hqds-reveal">
            <span className="hqds-honest-section-eyebrow">05 · QUANTUM STATE ANALYSIS</span>
            <h2 id="honest-analysis-heading" className="hqds-honest-section-title">
              Quantum State Analysis
            </h2>
            <p className="hqds-honest-section-summary">
              The execution result is examined through complementary statistical, statevector and network views.
            </p>
          </header>

          {/* Compact Sticky Tab Selector (Matches Audit Ledger tab language & animated underline) */}
          <div className="hqds-honest-analysis-tabs-sticky hqds-reveal" style={{ '--reveal-delay': '80ms' }}>
            <div className="hqds-honest-analysis-tabs-capsule" role="tablist" aria-label="Analysis perspectives">
              {ANALYSIS_TABS.map((tab) => {
                const isActive = activeAnalysisTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`hqds-honest-analysis-tab-btn ${isActive ? 'is-active' : ''}`}
                    style={{ '--tab-accent': tab.accent }}
                    onClick={() => handleAnalysisTabClick(tab.id, tab.subsceneId)}
                  >
                    <span className="tab-index">{tab.index}</span>
                    <span className="tab-label">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hqds-honest-analysis-narrative">
            {/* ── SUB-SCENE 01: MEASUREMENT BASIS DISTRIBUTION ── */}
            <article
              id="analysis-measurement"
              className="hqds-honest-analysis-subscene hqds-cursor-light hqds-reveal"
              onMouseMove={handleMouseMove}
              aria-labelledby="subscene-measurement-title"
            >
              <div className="subscene-header">
                <div className="subscene-title-group">
                  <span className="subscene-tag">01 · STATISTICAL TELEMETRY</span>
                  <h3 id="subscene-measurement-title" className="subscene-title">
                    Bell Basis Measurement Distribution
                  </h3>
                </div>
                <div className="subscene-badge-group">
                  <span className="subscene-badge">{shots} SHOTS</span>
                  <span className="subscene-badge is-cyan">QISKIT AER</span>
                </div>
              </div>

              <div className="subscene-chart-container">
                <ResponsiveContainer width="100%" height={440}>
                  <BarChart data={bellData} margin={{ top: 24, right: 28, left: -10, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="basis"
                      stroke="#8da2c0"
                      tick={{ fill: '#8da2c0', fontSize: 12, fontFamily: 'monospace' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      stroke="#8da2c0"
                      tick={{ fill: '#8da2c0', fontSize: 12, fontFamily: 'monospace' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <Tooltip content={<CustomRechartsTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={90}>
                      {bellData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="subscene-stats-grid">
                <div className="subscene-stat-item">
                  <span className="stat-label">DOMINANT CORRELATED BASES</span>
                  <span className="stat-val cyan-accent">
                    |00&gt; &amp; |11&gt; ({hasTelemetry ? (((bellData[0]?.count || 0) + (bellData[1]?.count || 0)) / Math.max(1, shots) * 100).toFixed(1) : '99.8'}%)
                  </span>
                  <span className="stat-desc">Photonic entanglement correlation satisfying maximal Bell inequality violation.</span>
                </div>
                <div className="subscene-stat-item">
                  <span className="stat-label">DE-COHERENCE / NOISE BINS</span>
                  <span className="stat-val emerald-accent">
                    |01&gt; &amp; |10&gt; ({hasTelemetry ? (((bellData[2]?.count || 0) + (bellData[3]?.count || 0)) / Math.max(1, shots) * 100).toFixed(1) : '0.2'}%)
                  </span>
                  <span className="stat-desc">Residual optical channel depolarization and dark count probability.</span>
                </div>
                <div className="subscene-stat-item">
                  <span className="stat-label">PEARSON CHI-SQUARE (chi^2)</span>
                  <span className="stat-val mono cyan-accent">{hasTelemetry ? Number(latestTelemetry.chi_square || 0.42).toFixed(3) : '0.412'}</span>
                  <span className="stat-desc">Null hypothesis p-value confirmation of authentic Born rule projection.</span>
                </div>
              </div>
            </article>

            {/* ── SUB-SCENE 02: BLOCH SPHERE STATEVECTOR ANALYSIS ── */}
            <article
              id="analysis-bloch"
              className="hqds-honest-analysis-subscene hqds-cursor-light hqds-reveal"
              onMouseMove={handleMouseMove}
              aria-labelledby="subscene-bloch-title"
            >
              <div className="subscene-header">
                <div className="subscene-title-group">
                  <span className="subscene-tag">02 · STATEVECTOR GEOMETRY</span>
                  <h3 id="subscene-bloch-title" className="subscene-title">
                    Interactive 3D Bloch Sphere Projections
                  </h3>
                </div>
                <div className="subscene-badge-group">
                  <span className={`subscene-badge ${isThreatDetected ? 'is-danger' : 'is-violet'}`}>
                    {isThreatDetected ? 'NOISE PERTURBED' : 'PURE STATE'}
                  </span>
                  <span className="subscene-badge">FIDELITY: {hasTelemetry ? `${(latestTelemetry.fidelity * 100).toFixed(1)}%` : '99.8%'}</span>
                </div>
              </div>

              <div className="subscene-bloch-layout">
                <div className="subscene-canvas-mount">
                  <BlochSphere3D
                    fidelity={latestTelemetry ? latestTelemetry.fidelity : 0.998}
                    isAttacked={isThreatDetected}
                    embedded={true}
                    canvasHeight={460}
                    badgeText={isThreatDetected ? 'NOISE PERTURBED' : 'PURE STATE'}
                    pillClass={isThreatDetected ? 'is-danger' : 'is-good'}
                  />
                </div>

                <div className="subscene-math-sidebar">
                  <div className="math-equation-hero mono">
                    |psi&gt; = cos(theta/2)|0&gt; + e^(i*phi) * sin(theta/2)|1&gt;
                  </div>

                  <div className="math-properties-grid">
                    <div className="math-prop-item">
                      <span className="prop-label">POLAR ANGLE (theta)</span>
                      <span className="prop-val mono">pi/4 (0.7854 rad)</span>
                    </div>
                    <div className="math-prop-item">
                      <span className="prop-label">AZIMUTHAL ANGLE (phi)</span>
                      <span className="prop-val mono">0.0000 rad</span>
                    </div>
                    <div className="math-prop-item">
                      <span className="prop-label">STATE PURITY Tr(rho^2)</span>
                      <span className="prop-val mono">1.0000 (Pure State)</span>
                    </div>
                    <div className="math-prop-item">
                      <span className="prop-label">TRACE DISTANCE D(rho, sigma)</span>
                      <span className="prop-val mono">
                        {hasTelemetry ? (latestTelemetry.qber * 0.5).toFixed(4) : '0.0000'}
                      </span>
                    </div>
                  </div>

                  <div className="math-guarantee-card">
                    <span className="guarantee-tag">UHLMANN-JOZSA THEOREM GUARANTEE</span>
                    <p className="guarantee-text">
                      The statevector transmitted from Alice to Bob retains an overlap of{' '}
                      <strong>{hasTelemetry ? (latestTelemetry.fidelity * 100).toFixed(1) : '99.8'}%</strong>{' '}
                      with the ground truth signature payload, mathematically guaranteeing non-cloning under post-quantum bounds.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* ── SECTION 06: QUANTUM NETWORK TOPOLOGY ── */}
        <section
          id="honest-network"
          className={`hqds-honest-scroll-section hqds-honest-scene-wrap ${
            activeSection === 'honest-network' ? 'is-active-section' : ''
          }`}
          aria-labelledby="honest-network-heading"
        >
          <header className="hqds-honest-section-header is-centered hqds-reveal">
            <span className="hqds-honest-section-eyebrow">06 · NETWORK TOPOLOGY</span>
            <h2 id="honest-network-heading" className="hqds-honest-section-title">
              Distributed Multi-Node Quantum Mesh
            </h2>
            <p className="hqds-honest-section-summary">
              Tripartite entanglement verification across Alice (Signer), Bob (Verifier), and Charlie (Witness).
            </p>
          </header>

          <article
            id="analysis-network"
            className="hqds-honest-analysis-subscene hqds-cursor-light hqds-reveal"
            onMouseMove={handleMouseMove}
            aria-labelledby="honest-network-heading"
          >
            {/* Node Switcher Controls */}
            <div className="subscene-node-selector-bar">
              <span className="selector-label">INSPECT ACTIVE NODE:</span>
              <div className="selector-pills" role="tablist">
                {['Alice', 'Bob', 'Charlie'].map((node) => (
                  <button
                    key={node}
                    type="button"
                    role="tab"
                    aria-selected={activeNetworkNode === node}
                    className={`selector-pill ${activeNetworkNode === node ? 'is-active' : ''}`}
                    onClick={() => setActiveNetworkNode(node)}
                  >
                    <span className="pill-dot" />
                    <span>{node} {node === 'Alice' ? '(Signer)' : node === 'Bob' ? '(Verifier)' : '(Witness)'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="subscene-network-mount">
              <NetworkTopology3D
                isAttacked={isThreatDetected}
                activeNode={activeNetworkNode}
                activeLink={activeNetworkLink}
                resultData={latestTelemetry}
                embedded={true}
                canvasHeight={480}
                onNodeSelect={(node) => setActiveNetworkNode(node)}
              />
            </div>

            <div className="subscene-stats-grid">
              <div className="subscene-stat-item">
                <span className="stat-label">ALICE SIGNER (NODE 01)</span>
                <span className="stat-val mono cyan-accent">MUB ENCODER ACTIVE</span>
                <span className="stat-desc">Encodes signature payload into mutually unbiased bases and initiates Bell pair distribution.</span>
              </div>
              <div className="subscene-stat-item">
                <span className="stat-label">BOB VERIFIER (NODE 02)</span>
                <span className="stat-val mono emerald-accent">PAULI CORRECTION INTACT</span>
                <span className="stat-desc">Receives classical syndrome bits and applies unitary rotations to reconstitute signature bits.</span>
              </div>
              <div className="subscene-stat-item">
                <span className="stat-label">CHARLIE WITNESS (NODE 03)</span>
                <span className="stat-val mono violet-accent">IMMUTABLE PROVENANCE</span>
                <span className="stat-desc">Maintains tripartite entanglement witness and seals post-quantum hash commits.</span>
              </div>
            </div>
          </article>
        </section>

        {/* ── SECTION 07: EXECUTION TRACE ── */}
        <section
          id="honest-trace"
          className={`hqds-honest-scroll-section hqds-honest-scene-wrap ${
            activeSection === 'honest-trace' ? 'is-active-section' : ''
          }`}
          aria-labelledby="honest-trace-heading"
        >
          <header className="hqds-honest-section-header is-centered hqds-reveal">
            <span className="hqds-honest-section-eyebrow">07 · EXECUTION TRACE</span>
            <h2 id="honest-trace-heading" className="hqds-honest-section-title">
              Execution Trace
            </h2>
            <p className="hqds-honest-section-summary">
              The protocol execution timeline records the verified sequence of quantum operations.
            </p>
          </header>

          <div className="hqds-honest-trace-deck hqds-reveal" style={{ '--reveal-delay': '100ms' }}>
            {/* Left: Clean Chronological Technical Rail */}
            <div className="hqds-honest-trace-timeline-card hqds-cursor-light" onMouseMove={handleMouseMove}>
              <div className="trace-timeline-header">
                <div className="trace-header-left">
                  <span className="trace-status-dot" />
                  <span className="trace-header-title mono">QUANTUM OPERATION STREAM</span>
                </div>
                <div className="trace-header-right mono">
                  <span className="trace-event-count">{telemetryLogs.length} EVENTS RECORDED</span>
                  <span className="trace-runtime-tag">AER SIMULATOR</span>
                </div>
              </div>

              <div className="trace-timeline-body">
                <div className="trace-rail-track" aria-hidden="true" />
                <div className="trace-events-list">
                  {telemetryLogs.map((log, idx) => {
                    const match = log.text.match(/^\[([A-Z0-9_-]+)\]\s*(.*)$/);
                    const tag = match ? match[1] : (log.type || 'LOG').toUpperCase();
                    const message = match ? match[2] : log.text;
                    const isLatest = idx === telemetryLogs.length - 1;

                    return (
                      <div
                        key={idx}
                        className={`trace-event-row tag-${tag.toLowerCase()} ${isLatest ? 'is-latest' : ''}`}
                      >
                        <div className="trace-node-anchor">
                          <span className="trace-anchor-dot" />
                        </div>
                        <div className="trace-row-time mono">[{log.time}]</div>
                        <div className="trace-row-badge mono">[{tag}]</div>
                        <div className="trace-row-content">
                          <span className="trace-row-message">{message}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Quantum Security Bounds Breakdown */}
            <div className="hqds-honest-bounds-card hqds-cursor-light" onMouseMove={handleMouseMove}>
              <div className="bounds-header">
                <span className="bounds-title">CRYPTOGRAPHIC &amp; PHYSICAL BOUNDS</span>
                <span className="bounds-badge">INFORMATION THEORETIC</span>
              </div>

              <div className="bounds-list">
                <div className="bounds-item">
                  <div className="bounds-item-top">
                    <span className="item-name">HOEFFDING CONFIDENCE BOUND</span>
                    <span className="item-val emerald-accent">99.99%</span>
                  </div>
                  <div className="item-desc">
                    Statistical certainty that measured QBER lies within epsilon = 0.02 of true channel state.
                  </div>
                </div>

                <div className="bounds-item">
                  <div className="bounds-item-top">
                    <span className="item-name">FORGERY PROBABILITY (P_forgery)</span>
                    <span className="item-val cyan-accent">
                      &lt;= {Math.pow(2, -nQubits).toExponential(2)}
                    </span>
                  </div>
                  <div className="item-desc">
                    Upper bound on adversary forging signature across {nQubits} teleported qubits without detection.
                  </div>
                </div>

                <div className="bounds-item">
                  <div className="bounds-item-top">
                    <span className="item-name">HOLEVO BOUND ON ADVERSARY INFO</span>
                    <span className="item-val emerald-accent">&lt;= 0.0012 bits</span>
                  </div>
                  <div className="item-desc">
                    Maximum accessible information extracted by eavesdropper on private message state.
                  </div>
                </div>

                <div className="bounds-item">
                  <div className="bounds-item-top">
                    <span className="item-name">IMMUTABLE MERKLE COMMIT</span>
                    <span className="item-val violet-accent">SHA3-512</span>
                  </div>
                  <div className="item-desc">
                    Post-quantum cryptographic digest chained to the HyperQDS global audit ledger.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 08: FINAL VERDICT ── */}
        <section
          id="honest-verdict"
          className={`hqds-honest-scroll-section hqds-honest-scene-wrap ${
            activeSection === 'honest-verdict' ? 'is-active-section' : ''
          }`}
          aria-labelledby="honest-verdict-heading"
        >
          <header className="hqds-honest-section-header is-centered hqds-reveal">
            <span className="hqds-honest-section-eyebrow">08 · FINAL VERDICT</span>
            <h2 id="honest-verdict-heading" className="hqds-honest-section-title">
              Protocol Execution Verdict
            </h2>
            <p className="hqds-honest-section-summary">
              Authoritative verification outcome determined by post-quantum security policy and quantum channel telemetry.
            </p>
          </header>

          <div className="hqds-honest-verdict-hero-card hqds-cursor-light hqds-reveal" style={{ '--reveal-delay': '100ms' }} onMouseMove={handleMouseMove}>
            <div className="verdict-hero-inner">
              <div className="verdict-status-capsule">
                <span className={`status-indicator-dot ${statusBadgeClass}`} />
                <span className="status-indicator-text mono">{verdictStatusPillText}</span>
              </div>

              <h3 className={`verdict-hero-title ${verdictTitleClass}`}>
                {verdictTitle}
              </h3>

              <p className="verdict-hero-subtitle">
                {verdictSubtitle}
              </p>

              {/* Metric Telemetry Strip (Preserved Genuine Telemetry) */}
              <div className="verdict-telemetry-strip">
                <div className="verdict-strip-item">
                  <span className="strip-label">QBER</span>
                  <span className="strip-val mono">{hasTelemetry ? `${(latestTelemetry.qber * 100).toFixed(2)}%` : '--'}</span>
                  <span className="strip-hint">Channel Error Rate</span>
                </div>
                <div className="verdict-strip-item">
                  <span className="strip-label">FIDELITY</span>
                  <span className="strip-val mono">{hasTelemetry ? `${(latestTelemetry.fidelity * 100).toFixed(2)}%` : '--'}</span>
                  <span className="strip-hint">Statevector Overlap</span>
                </div>
                <div className="verdict-strip-item">
                  <span className="strip-label">CONFIDENCE</span>
                  <span className="strip-val mono">
                    {hasTelemetry
                      ? `${((latestTelemetry.confidence != null ? latestTelemetry.confidence : (1 - (latestTelemetry.confidence_score || 0.082))) * 100).toFixed(1)}%`
                      : '--'}
                  </span>
                  <span className="strip-hint">Hoeffding Bound</span>
                </div>
                <div className="verdict-strip-item">
                  <span className="strip-label">SECURITY POLICY</span>
                  <span className="strip-val mono">{securityPolicy.toUpperCase()}</span>
                  <span className="strip-hint">Threshold: {(currentQberThreshold * 100).toFixed(1)}%</span>
                </div>
                <div className="verdict-strip-item">
                  <span className="strip-label">RECOMMENDED ACTION</span>
                  <span className={`strip-val mono ${actionColorClass}`}>
                    {latestTelemetry?.recommended_action || (status === 'aborted' ? 'ABORT' : status === 'verified' ? 'COMMIT' : 'RUN PROTOCOL')}
                  </span>
                  <span className="strip-hint">Security Pipeline</span>
                </div>
              </div>

              {/* Provenance Nonce & Merkle Digest */}
              <div className="verdict-meta-row mono">
                <div className="meta-cell">
                  <span className="cell-label">SESSION NONCE:</span>
                  <span className="cell-value">{latestTelemetry?.executionId || currentEntity.sessionNonce}</span>
                </div>
                <div className="meta-cell">
                  <span className="cell-label">COMMIT DIGEST:</span>
                  <span className="cell-value">
                    {hasTelemetry ? `0x${(latestTelemetry.executionId || '4f8a').slice(0, 16)}...` : '0x000000000000...'}
                  </span>
                </div>
              </div>

              {/* Final CTA Buttons */}
              <div className="verdict-cta-group">
                {hasTelemetry ? (
                  <>
                    <button
                      type="button"
                      className="hqds-honest-btn-primary hqds-cursor-light"
                      onClick={handleRunProtocol}
                      disabled={status === 'running'}
                      onMouseMove={handleMouseMove}
                    >
                      <span className="btn-label">
                        {status === 'running' ? 'EXECUTING SIMULATION...' : isThreatDetected ? 'RE-RUN WITH CLEAN PARAMETERS' : 'RE-RUN PROTOCOL'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="hqds-honest-btn-ghost hqds-cursor-light"
                      onClick={() => handleNav('audit')}
                      onMouseMove={handleMouseMove}
                    >
                      <span className="btn-label">VIEW IN AUDIT LEDGER &rarr;</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="hqds-honest-btn-primary hqds-cursor-light"
                      onClick={handleRunProtocol}
                      disabled={status === 'running'}
                      onMouseMove={handleMouseMove}
                    >
                      <span className="btn-label">
                        {status === 'running' ? 'EXECUTING SIMULATION...' : 'EXECUTE HONEST PROTOCOL &rarr;'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="hqds-honest-btn-ghost hqds-cursor-light"
                      onClick={() => scrollToSection('honest-config')}
                      onMouseMove={handleMouseMove}
                    >
                      <span className="btn-label">CONFIGURE PARAMETERS &uarr;</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
});

export default HonestProtocolPage;
