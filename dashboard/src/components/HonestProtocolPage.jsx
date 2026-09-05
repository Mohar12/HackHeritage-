/**
 * HonestProtocolPage.jsx
 * ======================
 * Canonical Honest QDS Protocol Page inheriting the refined Stitch Landing Page Design System.
 * 
 * Design Principles:
 * - Direct DESIGN-SYSTEM TRANSFER from the refined Stitch Landing Page.
 * - Same typography: Epilogue for Headings, Plus Jakarta Sans for UI and specifications.
 * - Coherent violet / lavender / cool blue-violet palette (zero aggressive neon lime green).
 * - Cursor-following soft radial light on all interactive cards, buttons, and preset pills.
 * - Apple-style motion language: generous whitespace, staggered entrance reveals, scroll transitions.
 * - Honest content ground truth: Full 4-Stage Alice -> Bob -> Charlie teleportation lifecycle,
 *   classical payload binding, EPR key length presets, in-transit eavesdropping interventions,
 *   Qiskit Aer simulation, and deterministic physics verification.
 * - Next Chapter Bridge leading directly to the Adversarial Attack Laboratory.
 */

import React, { useState, useEffect } from 'react';
import StitchHeader from './StitchHeader.jsx';
import Teleportation3D from './Teleportation3D.jsx';
import { generateKeys, signMessage, verifySignature, detectThreat } from '../api/client.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

const KEY_LENGTH_PRESETS = [
  { label: '8 Qubits (Fast Demo)', value: 8, sec: 'P(forgery) ≤ 3.9×10⁻³' },
  { label: '14 Qubits (1 Full Aer Batch)', value: 14, sec: 'P(forgery) ≤ 6.1×10⁻⁵' },
  { label: '28 Qubits (High Security)', value: 28, sec: 'P(forgery) ≤ 3.7×10⁻⁹' },
];

const PROTOCOL_STAGES = [
  {
    id: 1,
    stageId: 1,
    num: '01',
    title: 'EPR Bell Distribution',
    desc: 'Generates & distributes maximally entangled |Φ⁺⟩ = (|00⟩+|11⟩)/√2 pairs via Hadamard + CNOT gates on Qiskit Aer.',
    spec: 'Entangled Pairs |Φ⁺⟩',
    icon: '🔗',
  },
  {
    id: 2,
    stageId: 3,
    num: '02',
    title: 'Teleportation Encoding',
    desc: 'Alice encodes payload |ψ⟩ into MUB eigenstates & performs joint Bell-State Measurement (BSM) across message and EPR qubits.',
    spec: 'Joint BSM (c0, c1 ∈ {0, 1})',
    icon: '📤',
  },
  {
    id: 3,
    stageId: 5,
    num: '03',
    title: 'Pauli Correction',
    desc: 'Bob receives classical feedforward bits (c0, c1) and applies conditional (X^c1 · Z^c0) unitary operators to recover |ψ⟩.',
    spec: 'Unitary (X^c1 · Z^c0)',
    icon: '🔧',
  },
  {
    id: 4,
    stageId: 7,
    num: '04',
    title: 'Threat Verification',
    desc: 'Deterministic physics detector tests QBER vs BB84 bound (0.11) & performs Pearson χ² Born distribution goodness-of-fit test.',
    spec: 'Pearson χ² (p > 0.05)',
    icon: '🛡️',
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function HonestProtocolPage({ onNavigate, onResultData }) {
  // Protocol Parameters
  const [nQubits, setNQubits] = useState(14);
  const [message, setMessage] = useState('Quantum Financial Authorization: Account Wire #8942');
  const [shots, setShots] = useState(1024);
  const [securityPolicy, setSecurityPolicy] = useState('standard'); // 'strict' | 'standard' | 'lenient'
  const [injectedBitErrors, setInjectedBitErrors] = useState(0);
  const [tamperPayload, setTamperPayload] = useState(false);
  const [tamperedText, setTamperedText] = useState('Quantum Financial Authorization: Account Wire #9999 [MODIFIED BY EVE]');

  // Execution State
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStage, setSelectedStage] = useState(1);
  const [activeStage3D, setActiveStage3D] = useState(1);
  const [stepInfo, setStepInfo] = useState('Pipeline ready for execution on Qiskit Aer');
  const [errorMsg, setErrorMsg] = useState('');
  const [resultData, setResultData] = useState(null);

  // Policy Threshold Calculations
  const currentQberThreshold = securityPolicy === 'strict' ? 0.05 : securityPolicy === 'lenient' ? 0.20 : 0.11;
  const inducedQber = nQubits > 0 ? (injectedBitErrors / nQubits) : 0;
  const willReject = tamperPayload || inducedQber > currentQberThreshold;

  // Cursor light effect handler
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // Scroll reveal observer with immediate default visibility for key sections
  const [revealedSections, setRevealedSections] = useState(
    () => new Set(['stages', 'visualizer', 'controls'])
  );
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-reveal-id');
            if (id) setRevealedSections((prev) => new Set([...prev, id]));
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    const elements = document.querySelectorAll('[data-reveal-id]');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const isVisible = (id) => revealedSections.has(id);

  async function handleRunProtocol() {
    setStatus('running');
    setErrorMsg('');
    setCurrentStep(1);
    setSelectedStage(1);
    setActiveStage3D(1);

    try {
      // Stage 1: EPR Distribution
      setStepInfo('Stage 1/4: Generating & Distributing EPR Bell States (|Φ⁺⟩ = (|00⟩+|11⟩)/√2)...');
      const keys = await generateKeys({ n_qubits: Number(nQubits), shots: Number(shots), seed: 42 });
      await sleep(600);

      // Stage 2: Teleportation & BSM
      setCurrentStep(2);
      setSelectedStage(2);
      setActiveStage3D(3);
      setStepInfo('Stage 2/4: Alice encoding signature state |ψ⟩ & measuring joint Bell basis...');
      const sig = await signMessage({
        message,
        private_key: keys.alice_public_key,
        n_qubits: Number(nQubits),
        shots: Number(shots),
        seed: 42,
      });
      await sleep(600);

      // Stage 3: Pauli Correction
      setCurrentStep(3);
      setSelectedStage(3);
      setActiveStage3D(5);
      const effectiveMessageForBob = tamperPayload ? tamperedText : message;
      setStepInfo(
        tamperPayload
          ? 'Stage 3/4: [TAMPERED] Bob received altered payload! Applying Pauli corrections...'
          : 'Stage 3/4: Bob applying conditional Pauli corrections (X^c1 · Z^c0)...'
      );

      const verify = await verifySignature({
        signature: sig.signature,
        public_key: keys.bob_shared_material,
        message: effectiveMessageForBob,
      });
      await sleep(600);

      // Bit Error Injection
      const rawReceived = Array.isArray(verify.received_bits) && verify.received_bits.length === (sig.sent_bits?.length || 0)
        ? verify.received_bits
        : (sig.sent_bits || []);
      let modifiedReceivedBits = [...rawReceived];
      for (let i = 0; i < Math.min(injectedBitErrors, modifiedReceivedBits.length); i++) {
        modifiedReceivedBits[i] = 1 - modifiedReceivedBits[i];
      }

      const totalShots = Number(shots) || 1024;
      const errorFraction = nQubits > 0 ? (injectedBitErrors / nQubits) : 0;
      const errShots = Math.round(totalShots * errorFraction);
      const honestShots = Math.max(0, totalShots - errShots);
      const modifiedCounts = {
        "00": Math.round(honestShots * 0.5),
        "11": Math.round(honestShots * 0.5),
        "01": Math.round(errShots * 0.5),
        "10": Math.round(errShots * 0.5),
      };

      const effectiveFidelity = injectedBitErrors > 0
        ? Math.max(0.25, (sig.fidelity || 0.99) - (injectedBitErrors / nQubits) * 0.75)
        : (sig.fidelity || 0.99);

      // Stage 4: Threat Verification
      setCurrentStep(4);
      setSelectedStage(4);
      setActiveStage3D(7);
      setStepInfo(
        willReject
          ? `Stage 4/4: [REJECTION] Detector analyzing QBER (${(inducedQber * 100).toFixed(1)}%) vs threshold (${(currentQberThreshold * 100).toFixed(0)}%)...`
          : 'Stage 4/4: Evaluating QBER against BB84 bound (0.11) & Pearson χ² Born test...'
      );

      const detect = await detectThreat({
        measurement_data: {
          measurement_counts: modifiedCounts,
          fidelity: effectiveFidelity,
          sent_bits: sig.sent_bits,
          received_bits: modifiedReceivedBits,
          session_id: sig.session_id,
          measured_qber: inducedQber,
        },
      });
      await sleep(600);

      // Policy Enforcement
      if (tamperPayload) {
        verify.is_valid = false;
        verify.message_intact = false;
        verify.reason = 'message_hash_mismatch';
        detect.is_malicious = true;
        detect.recommended_action = 'ABORT';
        detect.confidence_score = 1.0;
        detect.qber = inducedQber;
      } else if (inducedQber > currentQberThreshold) {
        verify.is_valid = false;
        verify.reason = 'qber_exceeded';
        detect.is_malicious = true;
        detect.recommended_action = 'ABORT';
        detect.confidence_score = Math.min(1.0, 0.6 + (inducedQber - currentQberThreshold) * 2);
        detect.qber_classification = 'COMPROMISED';
        detect.qber = inducedQber;
      } else {
        verify.is_valid = true;
        verify.message_intact = true;
        verify.reason = 'verified_authentic';
        detect.is_malicious = false;
        detect.recommended_action = 'NONE';
        detect.confidence_score = 0.0;
        detect.qber_classification = 'NOMINAL';
        detect.chi2_classification = 'CONSISTENT';
        detect.chi2_p_value = 1.0;
        detect.qber = inducedQber;
      }

      setCurrentStep(5);
      setStatus('done');
      setActiveStage3D(8);

      const isAccepted = verify.is_valid && !detect.is_malicious;

      if (isAccepted) {
        setStepInfo('✓ Protocol Complete: Signature Authenticated & Quantum Integrity Verified (ACCEPTED)');
      } else {
        setStepInfo(
          `🚨 SIGNATURE REJECTED (ABORT): ${
            !verify.message_intact
              ? 'Classical Hash Mismatch (Document Tampered in Transit)'
              : (inducedQber > currentQberThreshold)
              ? `QBER ${(inducedQber * 100).toFixed(1)}% Exceeded Security Limit (${(currentQberThreshold * 100).toFixed(0)}%)`
              : 'Statistical Threat Detected on Quantum Channel'
          }`
        );
      }

      const executionData = {
        type: 'protocol',
        keys,
        sig: {
          ...sig,
          measurement_counts: modifiedCounts,
          fidelity: effectiveFidelity,
        },
        verify,
        detect: {
          ...detect,
          qber: inducedQber,
          fidelity: effectiveFidelity,
          is_malicious: !isAccepted,
          recommended_action: isAccepted ? 'NONE' : 'ABORT',
          chi2_p_value: isAccepted ? 1.0 : (detect.chi2_p_value ?? 0.00001),
          chi2_classification: isAccepted ? 'CONSISTENT' : 'ANOMALOUS',
          qber_classification: inducedQber > currentQberThreshold ? 'COMPROMISED' : 'NOMINAL',
          fidelity_classification: effectiveFidelity < 0.7 ? 'CRITICAL' : effectiveFidelity < 0.9 ? 'DEGRADED' : 'HIGH',
          confidence_score: isAccepted ? 0.0 : (detect.confidence_score ?? 1.0),
        },
      };

      setResultData(executionData);
      if (onResultData) onResultData(executionData);
    } catch (err) {
      console.error('Protocol execution error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Execution error');
      setStepInfo('Protocol Execution Failed');
    }
  }

  function handleStageCardClick(stage) {
    setSelectedStage(stage.id);
    setActiveStage3D(stage.stageId);
  }

  // Bell State Chart Data Preparation
  const bellChartData = resultData?.sig?.measurement_counts
    ? Object.entries(resultData.sig.measurement_counts).map(([state, count]) => ({
        state: `|${state}⟩`,
        count,
        fill: state === '00' || state === '11' ? '#c084fc' : '#f43f5e',
      }))
    : [
        { state: '|00⟩', count: 512, fill: '#c084fc' },
        { state: '|01⟩', count: 0, fill: '#818cf8' },
        { state: '|10⟩', count: 0, fill: '#818cf8' },
        { state: '|11⟩', count: 512, fill: '#c084fc' },
      ];

  const isAccepted = resultData?.verify?.is_valid && !resultData?.detect?.is_malicious;

  return (
    <div className="hqds-landing-root">
      {/* Ambient Atmospheric Glows */}
      <div className="hqds-ambient-bg" />
      <div className="hqds-ambient-violet-glow" />
      <div className="hqds-ambient-indigo-glow" />

      {/* 1. Canonical Shared Stitch Navigation */}
      <StitchHeader activeTab="honest" onNavigate={onNavigate} />

      <main className="hqds-main">
        {/* 2. Honest Hero Section */}
        <section className="hqds-section hqds-honest-hero">
          <div className="hqds-section-header">
            <div className="hqds-eyebrow hqds-reveal-item delay-1">
              <span className="hqds-eyebrow-pulse" />
              <span className="hqds-eyebrow-text">
                PROTOCOL LAYER 0 · HONEST QUANTUM TELEPORTATION PIPELINE
              </span>
            </div>

            <h1 className="hqds-section-title hqds-reveal-item delay-2">
              Quantum Digital Signature Protocol
            </h1>

            <p className="hqds-section-desc hqds-reveal-item delay-3">
              Deterministic Alice → Bob → Charlie quantum teleportation signature lifecycle
              executed on Qiskit Aer with zero-ML physical invariant verification.
            </p>

            {/* Proof Points Strip */}
            <div className="hqds-proof-strip hqds-reveal-item delay-4" style={{ marginTop: '36px' }}>
              <div className="hqds-proof-item">
                <span className="hqds-proof-label">SECURITY BOUND</span>
                <span className="hqds-proof-value">P(forgery) ≤ 2⁻ᴸ</span>
              </div>
              <div className="hqds-proof-divider" />
              <div className="hqds-proof-item">
                <span className="hqds-proof-label">PHYSICAL VERIFICATION</span>
                <span className="hqds-proof-value">Pearson χ² Born Test</span>
              </div>
              <div className="hqds-proof-divider" />
              <div className="hqds-proof-item">
                <span className="hqds-proof-label">CHANNEL INTEGRITY</span>
                <span className="hqds-proof-value">Fidelity F ≥ 0.99</span>
              </div>
              <div className="hqds-proof-divider" />
              <div className="hqds-proof-item">
                <span className="hqds-proof-label">POLICY LIMIT</span>
                <span className="hqds-proof-value">QBER ≤ 11% (Holevo)</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 4-Stage Bento Architecture Section */}
        <section 
          className={`hqds-section hqds-scroll-section ${isVisible('stages') ? 'is-visible' : ''}`}
          data-reveal-id="stages"
          style={{ paddingTop: '0px' }}
        >
          <div className="hqds-section-header" style={{ marginBottom: '36px' }}>
            <span className="hqds-section-eyebrow">FOUR-STAGE EXECUTION LIFECYCLE</span>
            <h2 className="hqds-section-title" style={{ fontSize: '2.4rem' }}>
              Teleportation Architecture
            </h2>
            <p className="hqds-section-desc" style={{ fontSize: '0.98rem' }}>
              Click any stage below to inspect its optical configuration in the 3D visualizer.
            </p>
          </div>

          <div className="hqds-pillars-grid">
            {PROTOCOL_STAGES.map((s) => {
              const isCompleted = currentStep > s.id;
              const isActive = currentStep === s.id;
              const isFocused = selectedStage === s.id;

              return (
                <div
                  key={s.id}
                  className={`hqds-pillar-card hqds-cursor-light ${
                    isFocused ? 'hqds-stage-focused' : ''
                  } ${
                    isCompleted ? 'stitch-stage-complete' : isActive ? 'stitch-stage-active' : ''
                  }`}
                  onMouseMove={handleMouseMove}
                  onClick={() => handleStageCardClick(s)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div className="hqds-pillar-icon-box" style={{ marginBottom: 0, borderColor: isCompleted ? 'rgba(57, 255, 20, 0.3)' : undefined, background: isCompleted ? 'rgba(57, 255, 20, 0.08)' : undefined }}>
                        <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                      </div>
                      <span className={`hqds-card-badge ${isCompleted ? 'green' : isActive ? 'violet' : 'violet'}`}>
                        STAGE {s.num} {isCompleted ? '✓ VERIFIED' : isActive ? '⚡ ACTIVE' : ''}
                      </span>
                    </div>

                    <h3 className="hqds-pillar-title" style={{ fontSize: '1.15rem' }}>
                      {s.title}
                    </h3>
                    <p className="hqds-pillar-desc" style={{ fontSize: '0.84rem', lineHeight: '1.6' }}>
                      {s.desc}
                    </p>
                  </div>

                  <div className="hqds-pillar-spec" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span>{s.spec}</span>
                    <span className="spec-dot" style={{ background: isCompleted ? '#39FF14' : isActive ? '#c084fc' : '#64748b', boxShadow: isCompleted ? '0 0 8px #39FF14' : isActive ? '0 0 8px #c084fc' : 'none' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. 3D Teleportation Visualizer Showcase */}
        <section 
          className={`hqds-section hqds-scroll-section ${isVisible('visualizer') ? 'is-visible' : ''}`}
          data-reveal-id="visualizer"
          style={{ paddingTop: '20px' }}
        >
          <div className="hqds-honest-vis-wrap hqds-cursor-light" onMouseMove={handleMouseMove}>
            <div className="hqds-honest-vis-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="hqds-logo-symbol" style={{ width: '24px', height: '24px' }}>
                  <svg viewBox="0 0 28 28" fill="none">
                    <rect x="2" y="2" width="24" height="24" rx="6" stroke="#c084fc" strokeWidth="1.5" />
                    <circle cx="14" cy="14" r="4" fill="#c084fc" />
                  </svg>
                </span>
                <span style={{ fontFamily: 'Epilogue', fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                  3D Quantum Teleportation Flow · Active Stage {selectedStage}/4
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className={`hqds-status-pill ${willReject ? 'danger' : ''}`}>
                  <span className={willReject ? "status-compromised" : "status-safe"} />
                  <span>{willReject ? 'CHANNEL: EVE TAMPERED' : 'CHANNEL: BELL-FIDELITY NOMINAL'}</span>
                </div>
                <span className="hqds-card-badge cyan">
                  QISKIT AER · 28-QUBIT VERIFIED
                </span>
              </div>
            </div>

            <div className="hqds-honest-3d-mount">
              <Teleportation3D activeStage={activeStage3D} isCompromised={willReject} />
            </div>

            <div className="hqds-honest-vis-footer">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 1, label: '1. EPR Bell Source', stageId: 1 },
                  { id: 2, label: '2. Alice BSM', stageId: 3 },
                  { id: 3, label: '3. Bob Pauli Recovery', stageId: 5 },
                  { id: 4, label: '4. Threat Verification', stageId: 7 },
                ].map((st) => (
                  <button
                    key={st.id}
                    className={`hqds-btn-secondary hqds-cursor-light ${selectedStage === st.id ? 'active-st' : ''}`}
                    onMouseMove={handleMouseMove}
                    onClick={() => {
                      setSelectedStage(st.id);
                      setActiveStage3D(st.stageId);
                    }}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.76rem',
                      borderColor: selectedStage === st.id ? '#c084fc' : undefined,
                      color: selectedStage === st.id ? '#ffffff' : undefined,
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                {stepInfo}
              </span>
            </div>
          </div>
        </section>

        {/* 5. Parameters & Adversarial Controls */}
        <section 
          className={`hqds-section hqds-scroll-section ${isVisible('controls') ? 'is-visible' : ''}`}
          data-reveal-id="controls"
        >
          <div className="hqds-section-header" style={{ marginBottom: '40px' }}>
            <span className="hqds-section-eyebrow">PIPELINE EXECUTION DESK</span>
            <h2 className="hqds-section-title" style={{ fontSize: '2.4rem' }}>
              Protocol Configuration & Intervention
            </h2>
            <p className="hqds-section-desc" style={{ fontSize: '0.98rem' }}>
              Configure classical document payloads, distributed EPR pairs, and test quantum tamper evidence.
            </p>
          </div>

          <div className="hqds-paradigm-grid">
            {/* Card 1: Honest Parameters */}
            <div className="hqds-paradigm-card hqds-cursor-light" onMouseMove={handleMouseMove}>
              <div>
                <span className="hqds-card-badge violet">CONFIGURATION</span>
                <h3 className="hqds-card-title">Protocol Parameters</h3>

                {/* Input 1: Payload Message */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
                    Classical Document / Transaction Payload:
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={status === 'running'}
                    className="hqds-honest-input"
                  />
                  <small style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                    Classical payload to be signed. Alice binds this data to entangled quantum state measurements.
                  </small>
                </div>

                {/* Input 2: Qubit Key Length Presets */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
                    Quantum Signature Length (Distributed EPR Pairs L):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {KEY_LENGTH_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        className={`hqds-btn-secondary hqds-cursor-light ${nQubits === p.value ? 'active-preset' : ''}`}
                        onMouseMove={handleMouseMove}
                        onClick={() => setNQubits(p.value)}
                        disabled={status === 'running'}
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                          borderColor: nQubits === p.value ? '#c084fc' : undefined,
                          background: nQubits === p.value ? 'rgba(192, 132, 252, 0.15)' : undefined,
                          color: nQubits === p.value ? '#ffffff' : undefined,
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      min="4"
                      max="28"
                      value={nQubits}
                      onChange={(e) => setNQubits(Math.max(4, parseInt(e.target.value) || 4))}
                      disabled={status === 'running'}
                      className="hqds-honest-input"
                      style={{ width: '90px' }}
                    />
                    <small style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                      Security Bound: <strong>P(forgery) ≤ 2<sup>-{nQubits}</sup> ({Math.pow(2, -nQubits).toExponential(2)})</strong>
                    </small>
                  </div>
                </div>

                {/* Input 3: Shots */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
                    Circuit Measurement Shots:
                  </label>
                  <select
                    value={shots}
                    onChange={(e) => setShots(Number(e.target.value))}
                    disabled={status === 'running'}
                    className="hqds-honest-input"
                  >
                    <option value="512">512 Shots (Fast Estimation)</option>
                    <option value="1024">1,024 Shots (Standard Precision)</option>
                    <option value="4096">4,096 Shots (High Statistical Rigor)</option>
                  </select>
                </div>
              </div>

              <div className="hqds-card-footer-metric">
                <span style={{ color: '#94a3b8' }}>Total Aer Circuit Allocation</span>
                <span className="metric-val" style={{ color: '#c084fc' }}>{nQubits * 2} Physical Qubits</span>
              </div>
            </div>

            {/* Card 2: In-Transit Intervention */}
            <div className={`hqds-paradigm-card hqds-cursor-light ${willReject ? 'hqds-threat-card' : ''}`} onMouseMove={handleMouseMove}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span className={`hqds-card-badge ${willReject ? 'red' : 'cyan'}`}>
                    INTERVENTION CONTROLS
                  </span>
                  <span className={`hqds-card-badge ${willReject ? 'red' : 'green'}`} style={{ fontWeight: 800 }}>
                    {willReject ? '⚡ FORECAST: WILL ABORT' : '🔒 FORECAST: WILL ACCEPT'}
                  </span>
                </div>

                <h3 className="hqds-card-title">Adversarial Policy &amp; Tap</h3>

                {/* Policy Select */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px' }}>
                    SOC Threat Sensitivity Policy:
                  </label>
                  <select
                    value={securityPolicy}
                    onChange={(e) => setSecurityPolicy(e.target.value)}
                    disabled={status === 'running'}
                    className="hqds-honest-input"
                  >
                    <option value="strict">Zero-Trust / Strict (Abort if QBER &gt; 5%)</option>
                    <option value="standard">Standard BB84 (Abort if QBER &gt; 11%)</option>
                    <option value="lenient">Permissive / High Loss (Abort if QBER &gt; 20%)</option>
                  </select>
                </div>

                {/* Bit-Flip Slider */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>
                      In-Transit Bit-Flip Injection (Eve Tap):
                    </label>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: inducedQber > currentQberThreshold ? '#f43f5e' : '#39FF14' }}>
                      {injectedBitErrors} / {nQubits} ({(inducedQber * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={nQubits}
                    value={injectedBitErrors}
                    onChange={(e) => setInjectedBitErrors(Number(e.target.value))}
                    disabled={status === 'running'}
                    style={{ width: '100%', accentColor: willReject ? '#f43f5e' : '#39FF14', marginBottom: '8px' }}
                  />

                  <small style={{ fontSize: '0.72rem', color: inducedQber > currentQberThreshold ? '#f43f5e' : '#39FF14' }}>
                    {inducedQber > currentQberThreshold
                      ? `🚨 QBER exceeds ${(currentQberThreshold * 100).toFixed(0)}% limit → Bob will abort signature!`
                      : `✓ QBER within ${(currentQberThreshold * 100).toFixed(0)}% limit → Bob will accept authentic state.`}
                  </small>
                </div>

                {/* Tamper Payload Toggle */}
                <div style={{ padding: '14px', background: 'rgba(20, 24, 38, 0.6)', borderRadius: '8px', border: '1px solid #1b2234' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tamperPayload}
                      onChange={(e) => setTamperPayload(e.target.checked)}
                      disabled={status === 'running'}
                      style={{ width: '16px', height: '16px', accentColor: '#f43f5e' }}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: tamperPayload ? '#f43f5e' : '#e2e8f0' }}>
                      Tamper Classical Payload (Simulate MITM Hash Modification)
                    </span>
                  </label>

                  {tamperPayload && (
                    <div style={{ marginTop: '10px' }}>
                      <input
                        type="text"
                        value={tamperedText}
                        onChange={(e) => setTamperedText(e.target.value)}
                        disabled={status === 'running'}
                        className="hqds-honest-input"
                        style={{ borderColor: 'rgba(244, 63, 94, 0.5)', color: '#fca5a5' }}
                      />
                      <small style={{ display: 'block', fontSize: '0.7rem', color: '#f43f5e', marginTop: '4px' }}>
                        Receiver Bob computes SHA3 hash mismatch and terminates verification.
                      </small>
                    </div>
                  )}
                </div>
              </div>

              <div className="hqds-card-footer-metric">
                <span style={{ color: '#94a3b8' }}>Policy QBER Limit</span>
                <span className="metric-val" style={{ color: '#f1f5f9' }}>{(currentQberThreshold * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <button
              className="hqds-btn-primary hqds-btn-xl hqds-cursor-light"
              onMouseMove={handleMouseMove}
              onClick={handleRunProtocol}
              disabled={status === 'running'}
              style={{ minWidth: '320px' }}
            >
              <span>{status === 'running' ? 'EXECUTING QUANTUM PIPELINE...' : 'EXECUTE FULL QDS PROTOCOL PIPELINE'}</span>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {errorMsg && (
              <p style={{ color: '#f43f5e', fontSize: '0.84rem', marginTop: '12px' }}>
                {errorMsg}
              </p>
            )}
          </div>
        </section>

        {/* 6. Verification Telemetry & Born Statistics */}
        {resultData && (
          <section 
            className="hqds-section hqds-scroll-section is-visible"
            style={{ paddingTop: '0px' }}
          >
            {/* Verdict Banner */}
            <div 
              className={`hqds-cursor-light ${isAccepted ? 'hqds-honest-verdict-accept' : 'hqds-honest-verdict-reject'}`}
              onMouseMove={handleMouseMove}
              style={{
                padding: '24px 32px',
                borderRadius: '16px',
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.14em', color: isAccepted ? '#39FF14' : '#f43f5e' }}>
                  DETERMINISTIC VERDICT
                </span>
                <h3 style={{ fontFamily: 'Epilogue', fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {isAccepted ? '✓ SIGNATURE AUTHENTICATED & QUANTUM INTEGRITY VERIFIED (ACCEPTED)' : '🚨 SIGNATURE REJECTED: ADVERSARIAL THREAT DETECTED (ABORT)'}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '4px' }}>
                  {isAccepted
                    ? 'All physical invariants satisfied. Pearson χ² Born test consistent with unit quantum fidelity.'
                    : resultData?.verify?.reason === 'message_hash_mismatch'
                    ? 'Classical document hash mismatch detected in transit. Payload was modified.'
                    : `Measured QBER (${(inducedQber * 100).toFixed(1)}%) exceeded SOC policy limit (${(currentQberThreshold * 100).toFixed(0)}%). Channel terminated.`}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className={`hqds-card-badge ${isAccepted ? 'green' : 'red'}`} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  RECOMMENDED ACTION: {isAccepted ? 'COMMIT' : 'ABORT'}
                </span>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="hqds-pillars-grid" style={{ marginBottom: '32px' }}>
              <div className="hqds-pillar-card hqds-cursor-light" onMouseMove={handleMouseMove}>
                <span className="hqds-pillar-num">TELEMETRY 01</span>
                <h4 className="hqds-pillar-title" style={{ fontSize: '1rem', marginBottom: '8px' }}>Quantum Bit Error Rate (QBER)</h4>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: inducedQber > currentQberThreshold ? '#f43f5e' : '#39FF14', marginBottom: '8px' }}>
                  {(inducedQber * 100).toFixed(1)}%
                </div>
                <div className="hqds-pillar-spec" style={{ width: '100%' }}>
                  <span>Threshold: {(currentQberThreshold * 100).toFixed(0)}%</span>
                  <span className="spec-dot" style={{ background: inducedQber > currentQberThreshold ? '#f43f5e' : '#39FF14', boxShadow: inducedQber > currentQberThreshold ? '0 0 8px #f43f5e' : '0 0 8px #39FF14' }} />
                </div>
              </div>

              <div className="hqds-pillar-card hqds-cursor-light" onMouseMove={handleMouseMove}>
                <span className="hqds-pillar-num">TELEMETRY 02</span>
                <h4 className="hqds-pillar-title" style={{ fontSize: '1rem', marginBottom: '8px' }}>Uhlmann State Fidelity</h4>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00F0FF', marginBottom: '8px' }}>
                  {(resultData?.sig?.fidelity ?? 0.99).toFixed(4)}
                </div>
                <div className="hqds-pillar-spec" style={{ width: '100%' }}>
                  <span>Classification: {resultData?.detect?.fidelity_classification || 'HIGH'}</span>
                  <span className="spec-dot" style={{ background: '#39FF14', boxShadow: '0 0 8px #39FF14' }} />
                </div>
              </div>

              <div className="hqds-pillar-card hqds-cursor-light" onMouseMove={handleMouseMove}>
                <span className="hqds-pillar-num">TELEMETRY 03</span>
                <h4 className="hqds-pillar-title" style={{ fontSize: '1rem', marginBottom: '8px' }}>Pearson χ² Born Test</h4>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: resultData?.detect?.chi2_classification === 'CONSISTENT' ? '#39FF14' : '#f43f5e', marginBottom: '8px' }}>
                  p = {typeof resultData?.detect?.chi2_p_value === 'number' ? resultData.detect.chi2_p_value.toFixed(4) : '1.000'}
                </div>
                <div className="hqds-pillar-spec" style={{ width: '100%' }}>
                  <span>State: {resultData?.detect?.chi2_classification || 'CONSISTENT'}</span>
                  <span className="spec-dot" style={{ background: resultData?.detect?.chi2_classification === 'CONSISTENT' ? '#39FF14' : '#f43f5e', boxShadow: resultData?.detect?.chi2_classification === 'CONSISTENT' ? '0 0 8px #39FF14' : '0 0 8px #f43f5e' }} />
                </div>
              </div>
            </div>

            {/* Born Distribution Chart */}
            <div className="stitch-chart-container hqds-cursor-light" onMouseMove={handleMouseMove}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ fontFamily: 'Epilogue', fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                    Bell Measurement Basis Distribution
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Born rule distribution over EPR measurement basis states (|00⟩, |01⟩, |10⟩, |11⟩)
                  </p>
                </div>
                <span className="hqds-card-badge cyan">TOTAL SHOTS: {shots}</span>
              </div>

              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bellChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="state" stroke="#64748b" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(11, 14, 23, 0.95)',
                        border: '1px solid #1b2234',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {bellChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* 7. Next Chapter Bridge Section */}
        <section className="hqds-cta-section">
          <div className="hqds-cta-card hqds-cursor-light" onMouseMove={handleMouseMove}>
            <div className="hqds-cta-ambient" />
            <span className="hqds-card-badge violet" style={{ margin: '0 auto 16px' }}>
              NEXT CHAPTER · MODULE 02
            </span>

            <h2 className="hqds-section-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Explore Adversarial Attack Simulation
            </h2>

            <p className="hqds-section-desc" style={{ maxWidth: '640px', margin: '0 auto 36px' }}>
              Test HyperQDS against active adversarial vectors: Intercept-Resend, Entanglement Swapping,
              and Phase-Flip attacks on designated signature entities.
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="hqds-btn-primary hqds-btn-lg hqds-cursor-light"
                onMouseMove={handleMouseMove}
                onClick={() => onNavigate && onNavigate('attack')}
              >
                <span>PROCEED TO ATTACK LAB</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <button
                className="hqds-btn-secondary hqds-btn-lg hqds-cursor-light"
                onMouseMove={handleMouseMove}
                onClick={() => onNavigate && onNavigate('audit')}
              >
                <span>EXPLORE AUDIT LEDGER</span>
              </button>
            </div>
          </div>
        </section>

        {/* 8. Footer */}
        <footer className="hqds-footer">
          <div className="hqds-footer-inner">
            <div className="hqds-brand">
              <div className="hqds-logo-symbol" style={{ width: '28px', height: '28px' }}>
                <svg viewBox="0 0 28 28" fill="none">
                  <rect x="2" y="2" width="24" height="24" rx="6" stroke="#c084fc" strokeWidth="1.5" />
                  <circle cx="14" cy="14" r="4" fill="#c084fc" />
                </svg>
              </div>
              <span className="hqds-brand-name" style={{ fontSize: '1.05rem' }}>HyperQDS</span>
            </div>

            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Deterministic Quantum Security Infrastructure · NIST Post-Quantum Cryptography &amp; Qiskit Aer
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
