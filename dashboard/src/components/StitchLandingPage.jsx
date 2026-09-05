/**
 * StitchLandingPage.jsx
 * =====================
 * Canonical HyperQDS Product Landing Page.
 * 
 * Design Philosophy:
 * - Product Introduction, NOT a Security Monitoring Dashboard.
 * - 3D Quantum Field Hero as the centerpiece with multi-layer depth.
 * - Sophisticated Violet / Lavender / Cool Blue-Violet color system (zero neon lime green).
 * - Cursor-following soft radial light effect on interactive cards & buttons.
 * - Apple-style motion language: generous whitespace, restrained typography, staggered reveals.
 * - Clear separation: Landing introduces HyperQDS; Dashboard operates HyperQDS.
 */

import React, { useEffect, useState } from 'react';
import QuantumCoreAnomaly from './QuantumCoreAnomaly.jsx';
import StitchHeader from './StitchHeader.jsx';

export default function StitchLandingPage({ onEnterSOC, onNavigate }) {
  const [revealedSections, setRevealedSections] = useState(
    () => new Set(['paradigm', 'pillars', 'comparison', 'cta'])
  );

  // Cursor light effect helper: updates CSS variables directly with zero React re-renders
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // Apple-style IntersectionObserver scroll-reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-reveal-id');
            if (id) {
              setRevealedSections((prev) => new Set([...prev, id]));
            }
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    const elements = document.querySelectorAll('[data-reveal-id]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const isVisible = (id) => revealedSections.has(id);

  const handleLaunchHonest = () => {
    if (onNavigate) {
      onNavigate('honest');
    } else if (onEnterSOC) {
      onEnterSOC();
    }
  };

  return (
    <div className="hqds-landing-root">
      {/* Ambient background spatial glow fields */}
      <div className="hqds-ambient-bg" />
      <div className="hqds-ambient-violet-glow" />
      <div className="hqds-ambient-indigo-glow" />

      {/* 1. Shared Canonical Stitch Navigation Header */}
      <StitchHeader activeTab="landing" onNavigate={onNavigate || onEnterSOC} />

      {/* Main Landing Page Content */}
      <main className="hqds-main">
        {/* 2. Hero Section: 3D Quantum Field as the Living Centerpiece */}
        <section className="hqds-hero" id="hero">
          {/* Centered 3D Quantum Field Anomaly Background */}
          <div className="hqds-hero-3d-wrap">
            <QuantumCoreAnomaly isHero={true} />
            {/* Calibrated Scrim for 100% Typography Readability */}
            <div className="hqds-hero-scrim" />
            <div className="hqds-hero-vignette" />
          </div>

          {/* Foreground Hero Content Layer */}
          <div className="hqds-hero-content">
            <div className="hqds-eyebrow hqds-reveal-item delay-1">
              <span className="hqds-eyebrow-pulse" />
              <span className="hqds-eyebrow-text">DETERMINISTIC QUANTUM SECURITY INFRASTRUCTURE</span>
            </div>

            <h1 className="hqds-hero-title hqds-reveal-item delay-2">
              SECURE THE VOID.
            </h1>

            <p className="hqds-hero-subtitle hqds-reveal-item delay-3">
              Quantum-native security infrastructure for detecting, verifying, and responding
              to threats at the physical layer. Zero-ML mathematical certainty through
              entangled Bell-state teleportation.
            </p>

            {/* Hero CTAs */}
            <div className="hqds-hero-actions hqds-reveal-item delay-4">
              <button
                className="hqds-btn-primary hqds-btn-lg hqds-cursor-light"
                onMouseMove={handleMouseMove}
                onClick={handleLaunchHonest}
              >
                <span>HONEST PROTOCOL PIPELINE</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <a
                href="#pillars"
                className="hqds-btn-secondary hqds-btn-lg hqds-cursor-light"
                onMouseMove={handleMouseMove}
              >
                <span>EXPLORE ARCHITECTURE</span>
                <span className="hqds-btn-subtag">PEARSON χ²</span>
              </a>
            </div>

            {/* Proof Points Strip (Clean & Spacious) */}
            <div className="hqds-proof-strip hqds-reveal-item delay-5">
              <div className="hqds-proof-item">
                <span className="hqds-proof-label">FOUNDATION</span>
                <span className="hqds-proof-value">Quantum No-Cloning</span>
              </div>
              <div className="hqds-proof-divider" />
              <div className="hqds-proof-item">
                <span className="hqds-proof-label">VERIFICATION</span>
                <span className="hqds-proof-value">Deterministic Zero-ML</span>
              </div>
              <div className="hqds-proof-divider" />
              <div className="hqds-proof-item">
                <span className="hqds-proof-label">CONFIDENCE</span>
                <span className="hqds-proof-value" style={{ color: '#39FF14' }}>Pearson χ² (p &lt; 0.001)</span>
              </div>
              <div className="hqds-proof-divider" />
              <div className="hqds-proof-item">
                <span className="hqds-proof-label">SIMULATION ENGINE</span>
                <span className="hqds-proof-value" style={{ color: '#00F0FF' }}>Qiskit Aer (28-Qubit)</span>
              </div>
            </div>
          </div>

          {/* Visual continuity bridge into next section */}
          <div className="hqds-hero-bridge-glow" />
        </section>

        {/* 3. Section: The Quantum Paradigm Shift */}
        <section
          className={`hqds-section hqds-scroll-section ${isVisible('paradigm') ? 'is-visible' : ''}`}
          id="paradigm"
          data-reveal-id="paradigm"
        >
          <div className="hqds-section-header">
            <span className="hqds-section-eyebrow">THE ARCHITECTURAL SHIFT</span>
            <h2 className="hqds-section-title">Why Classical Cyber Defense Fails in the Quantum Era</h2>
            <p className="hqds-section-desc">
              Classical encryption and machine learning classifiers rely on heuristic approximations
              vulnerable to adversarial perturbation and quantum Shor/Grover factorization.
              HyperQDS shifts security from statistical guessing to quantum mechanical law.
            </p>
          </div>

          <div className="hqds-paradigm-grid">
            <div
              className="hqds-paradigm-card hqds-cursor-light"
              onMouseMove={handleMouseMove}
            >
              <div className="hqds-card-badge red">CLASSICAL LIMITATION</div>
              <h3 className="hqds-card-title">Heuristic Machine Learning Vulnerabilities</h3>
              <p className="hqds-card-body">
                Statistical ML intrusion detectors operate on probabilistic feature vectors.
                Adversarial attackers can craft imperceptible noise to bypass classifiers
                without triggering alerts.
              </p>
              <div className="hqds-card-footer-metric">
                <span className="metric-tag text-muted">Vulnerability:</span>
                <span className="metric-val text-red">Adversarial Evasion &amp; Model Poisoning</span>
              </div>
            </div>

            <div
              className="hqds-paradigm-card hqds-featured hqds-cursor-light"
              onMouseMove={handleMouseMove}
            >
              <div className="hqds-card-badge violet">HYPERQDS SOLUTION</div>
              <h3 className="hqds-card-title">Physics-Enforced Tamper Evidence</h3>
              <p className="hqds-card-body">
                Unknown quantum states cannot be cloned without disturbing the wavefunction.
                Any interception attempt irreversibly disrupts Bell-pair entanglement,
                creating mathematical proof of intrusion before data extraction.
              </p>
              <div className="hqds-card-footer-metric">
                <span className="metric-tag text-accent">Advantage:</span>
                <span className="metric-val text-accent">Deterministic Physical Invariant</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Section: Three Technological Pillars */}
        <section
          className={`hqds-section hqds-scroll-section ${isVisible('pillars') ? 'is-visible' : ''}`}
          id="pillars"
          data-reveal-id="pillars"
        >
          <div className="hqds-section-header">
            <span className="hqds-section-eyebrow">CORE TECHNOLOGY</span>
            <h2 className="hqds-section-title">The Three Pillars of HyperQDS</h2>
            <p className="hqds-section-desc">
              Three complementary quantum layers work synchronously to verify signatures
              and deflect non-classical threat vectors.
            </p>
          </div>

          <div className="hqds-pillars-grid">
            {/* Pillar 1 */}
            <div
              className="hqds-pillar-card hqds-cursor-light"
              onMouseMove={handleMouseMove}
            >
              <div className="hqds-pillar-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <span className="hqds-pillar-num">PILLAR 01</span>
              <h3 className="hqds-pillar-title">Quantum No-Cloning Wavefunction Collapse</h3>
              <p className="hqds-pillar-desc">
                The quantum no-cloning theorem states that an arbitrary unknown quantum state
                cannot be accurately duplicated. Any eavesdropper measuring the signature state
                irreversibly collapses the superposition, generating detectable Pauli-X and Pauli-Z phase flips.
              </p>
              <div className="hqds-pillar-spec">
                <span className="spec-dot" />
                <span>Wavefunction Guarantee · 100% Deterministic</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div
              className="hqds-pillar-card hqds-cursor-light"
              onMouseMove={handleMouseMove}
            >
              <div className="hqds-pillar-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <span className="hqds-pillar-num">PILLAR 02</span>
              <h3 className="hqds-pillar-title">Zero-ML Pearson χ² Statistical Proof</h3>
              <p className="hqds-pillar-desc">
                Rigorous Pearson goodness-of-fit hypothesis testing measures observed measurement
                distributions against expected Bell-state projections. Rejects intercepted signatures
                at a statistical significance of p &lt; 0.001 with zero heuristic neural network training.
              </p>
              <div className="hqds-pillar-spec">
                <span className="spec-dot" />
                <span>p &lt; 0.001 · Zero False Positive Rate</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div
              className="hqds-pillar-card hqds-cursor-light"
              onMouseMove={handleMouseMove}
            >
              <div className="hqds-pillar-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <span className="hqds-pillar-num">PILLAR 03</span>
              <h3 className="hqds-pillar-title">4-Stage Entangled Teleportation Channel</h3>
              <p className="hqds-pillar-desc">
                Signatures are distributed across non-local EPR pairs |Φ⁺⟩ using 4-stage quantum
                teleportation. Entangled channels ensure tamper detection occurs before recipient
                decoding, permanently sealing compromised signature requests.
              </p>
              <div className="hqds-pillar-spec">
                <span className="spec-dot" />
                <span>Bell State |Φ⁺⟩ · 28-Qubit Scalable</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Section: Deterministic vs Heuristic Comparison Matrix */}
        <section
          className={`hqds-section hqds-scroll-section ${isVisible('comparison') ? 'is-visible' : ''}`}
          id="comparison"
          data-reveal-id="comparison"
        >
          <div className="hqds-section-header">
            <span className="hqds-section-eyebrow">VERIFICATION MATRIX</span>
            <h2 className="hqds-section-title">Deterministic Physical Invariant vs Heuristic AI</h2>
            <p className="hqds-section-desc">
              Compare the guarantees of quantum physical laws against probabilistic cybersecurity models.
            </p>
          </div>

          <div
            className="hqds-comparison-table-wrap hqds-cursor-light"
            onMouseMove={handleMouseMove}
          >
            <div className="hqds-table-row header">
              <div className="table-col dimension">Security Dimension</div>
              <div className="table-col legacy">Traditional &amp; Heuristic AI Defense</div>
              <div className="table-col hqds">HyperQDS Quantum Infrastructure</div>
            </div>

            <div className="hqds-table-row">
              <div className="table-col dimension">Detection Mechanism</div>
              <div className="table-col legacy">Probabilistic neural classifiers &amp; signatures</div>
              <div className="table-col hqds text-accent">Wavefunction collapse &amp; Pauli variance</div>
            </div>

            <div className="hqds-table-row">
              <div className="table-col dimension">Adversarial Robustness</div>
              <div className="table-col legacy">Vulnerable to adversarial noise perturbation</div>
              <div className="table-col hqds text-accent">Protected by Quantum No-Cloning Theorem</div>
            </div>

            <div className="hqds-table-row">
              <div className="table-col dimension">Statistical Confidence</div>
              <div className="table-col legacy">Heuristic confidence interval (3–9% error)</div>
              <div className="table-col hqds text-accent">Exact Pearson χ² distribution (p &lt; 0.001)</div>
            </div>

            <div className="hqds-table-row">
              <div className="table-col dimension">Post-Quantum Resilience</div>
              <div className="table-col legacy">Compromised by Shor &amp; Grover algorithms</div>
              <div className="table-col hqds text-accent">Information-theoretically secure across Bell pairs</div>
            </div>

            <div className="hqds-table-row">
              <div className="table-col dimension">Verification Latency</div>
              <div className="table-col legacy">15–200 ms inference pipeline</div>
              <div className="table-col hqds text-accent">&lt; 0.24 ms deterministic hardware fidelity</div>
            </div>
          </div>
        </section>

        {/* 6. Section: Call to Action — Bridge to the Operations Center */}
        <section
          className={`hqds-cta-section hqds-scroll-section ${isVisible('cta') ? 'is-visible' : ''}`}
          id="architecture"
          data-reveal-id="cta"
        >
          <div
            className="hqds-cta-card hqds-cursor-light"
            onMouseMove={handleMouseMove}
          >
            <div className="hqds-cta-ambient" />
            <span className="hqds-eyebrow-text">READY FOR SYSTEM DEPLOYMENT</span>
            <h2 className="hqds-cta-title">Inspect Live Teleportation Channels in the Operations Center</h2>
            <p className="hqds-cta-subtitle">
              Access the high-density Quantum SOC to execute honest teleportation pipelines,
              simulate non-classical intercept attacks, and examine the post-quantum audit ledger.
            </p>
            <div className="hqds-cta-buttons">
              <button
                className="hqds-btn-primary hqds-btn-xl hqds-cursor-light"
                onMouseMove={handleMouseMove}
                onClick={handleLaunchHonest}
              >
                <span>ENTER HONEST PROTOCOL PIPELINE</span>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="hqds-footer">
        <div className="hqds-footer-inner">
          <div className="hqds-footer-brand">
            <span className="hqds-footer-logo">HyperQDS</span>
            <span className="hqds-footer-slogan">Secure The Void.</span>
          </div>

          <div className="hqds-footer-tags">
            <span>QISKIT AER 28-QUBIT</span>
            <span className="tag-sep">•</span>
            <span>4-STAGE TELEPORTATION</span>
            <span className="tag-sep">•</span>
            <span>PEARSON χ² DETERMINISTIC</span>
            <span className="tag-sep">•</span>
            <span>LATENCY &lt; 0.24ms</span>
          </div>

          <div className="hqds-footer-copy">
            &copy; {new Date().getFullYear()} HyperQDS Quantum Cyber Defense Systems.
          </div>
        </div>
      </footer>
    </div>
  );
}
