/**
 * AttackArchitecture3D.jsx
 * ========================
 * Interactive 3D Adversarial Quantum Attack Architecture Visualizer.
 * Fully synchronized with simulation operations:
 *  - Phased Execution: DISPATCH -> IN_TRANSIT -> INTERCEPT -> COLLAPSE -> DEFENSE_ABORT
 *  - Displays the exact target signature entity (e.g. Federal Reserve $25M Wire,
 *    DoD Satellite Lockdown, National Genomic Vault) with live payload inspection.
 *  - Renders physical architecture: Alice (Signer/QSP), Bob (Verifier/Born Rule),
 *    Charlie (Arbitrator), Optical Fiber Waveguide, and Session Nonce Registry.
 *  - Eve's probe dynamically intercepts the targeted component in real time.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const TARGET_BREAKDOWN = {
  intercept_resend: {
    targetName: 'Quantum Optical Fiber Waveguide (Alice → Bob)',
    componentType: 'Physical Fiber Core / Flying Photons',
    adversaryMethod: 'Eve attaches an optical beam-splitter tap to intercept & measure flying qubits in random bases (X or Z).',
    physicalLaw: 'Heisenberg Uncertainty Principle: Measurement collapses entanglement state (|Φ⁺⟩ → |00⟩ or |11⟩).',
    defenseTrigger: 'Bob detects ~25% QBER across parity sifting (violates BB84 bound ε = 0.11) → Immediate ABORT.',
    targetLocation: 'Mid-Channel Optical Fiber Link',
  },
  depolarizing: {
    targetName: 'Physical Fiber Environment (Thermal & Birefringence Noise)',
    componentType: 'Optical Medium / Environmental Bath',
    adversaryMethod: 'Uniform environmental thermal noise and phase drift perturbing quantum states without active hacker.',
    physicalLaw: 'Superoperator: (1 − p)ρ + (p/3) ∑ᵢ σᵢ ρ σᵢ induces mixed-state density matrix degradation.',
    defenseTrigger: 'Uhlmann state fidelity drops below 85% threshold (warns of degraded fiber or passive disruption).',
    targetLocation: 'Distributed Across Optical Cable',
  },
  forgery: {
    targetName: 'Alice\'s Private Key Store & Bob Signature Ingestion Gate',
    componentType: 'Cryptographic EPR Key Store',
    adversaryMethod: 'Eve blindly guesses Alice\'s quantum signature without possessing the entangled key pairs.',
    physicalLaw: 'Gottesman-Chuang Bound: Forgery success probability is strictly bounded by P(forgery) ≤ 2⁻ᴸ.',
    defenseTrigger: 'Bob compares signature against his EPR verification keys; rejects fake signature with zero valid match.',
    targetLocation: 'Bob Verification Ingestion Port',
  },
  impersonation: {
    targetName: 'Alice\'s Cryptographic Identity & Entangled State Generator',
    componentType: 'Quantum State Preparation (QSP) Node',
    adversaryMethod: 'Eve transmits separable product states (|0⟩ ⊗ |1⟩) while spoofing Alice\'s credentials.',
    physicalLaw: 'Quantum Born Rule: Separable product states cannot reproduce the joint Bell-state measurement statistics.',
    defenseTrigger: 'Bob\'s Pearson χ² test detects massive statistical distribution anomaly (p < 0.0001) → Spoof Flagged.',
    targetLocation: 'Alice Node Identity Gateway',
  },
  replay: {
    targetName: 'Cryptographic Session Nonce Registry & Audit Database',
    componentType: 'Temporal Authentication Layer',
    adversaryMethod: 'Eve captures a genuine signature from Session #1 and attempts re-submission in Session #2.',
    physicalLaw: 'Quantum No-Cloning Theorem & Session Nonce Freshness: Collapsed quantum states cannot be re-measured.',
    defenseTrigger: 'Bob verifies single-use cryptographic nonce and detects stale state re-measurement → Replay Rejected.',
    targetLocation: 'Session Nonce Ledger & Timestamp Filter',
  },
};

export default function AttackArchitecture3D({
  attackType = 'intercept_resend',
  isAttacked = false,
  targetEntity,
  operationPhase = 'IDLE',
  attackData,
  detectData,
}) {
  const mountRef = useRef(null);
  const [hudExpanded, setHudExpanded] = useState(true);

  const info = TARGET_BREAKDOWN[attackType] || TARGET_BREAKDOWN.intercept_resend;
  const entity = targetEntity || {
    id: 'TX-2026-FED-BOE',
    name: 'Federal Reserve → Bank of England ($25M Wire)',
    sender: 'Alice (US-East-1 QKD Gateway)',
    recipient: 'Bob (UK-LON-2 QKD Gateway)',
    documentPayload: 'SWIFT-AUTH: Transfer $25,000,000 USD to Bank of England',
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = 310;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.06);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.6, 5.4);
    camera.lookAt(0, 0.1, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
    } catch (e) {
      return;
    }

    // Grid Plane
    const grid = new THREE.GridHelper(8, 16, 0x1e3a8a, 0x091428);
    grid.position.y = -0.5;
    scene.add(grid);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const mainLight = new THREE.PointLight(0x00f2fe, 2.2, 14);
    mainLight.position.set(0, 3.5, 2);
    scene.add(mainLight);

    const redAlertLight = new THREE.PointLight(0xff1744, isAttacked || operationPhase === 'COLLAPSE' ? 3.5 : 0.8, 10);
    redAlertLight.position.set(0, 1.5, 0);
    scene.add(redAlertLight);

    // Node Helper
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    const makeNode = (name, color, pos, isTargeted = false) => {
      const g = new THREE.Group();
      g.position.set(...pos);

      // Chassis
      const baseGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.2, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.3,
        metalness: 0.8,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      g.add(base);

      // Core sphere
      const coreGeo = new THREE.SphereGeometry(0.24, 24, 24);
      const coreMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: isTargeted ? 1.0 : 0.4,
        roughness: 0.2,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.22;
      g.add(core);

      // Pulsing Target Ring
      if (isTargeted) {
        const ringGeo = new THREE.RingGeometry(0.48, 0.54, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xff1744,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        g.add(ring);
      }

      nodeGroup.add(g);
      return g;
    };

    // Target Quantum Optical Fiber Line with Micro-Bend Clamp & Solenoid Shutter
    const isAliceTargeted = attackType === 'impersonation';
    const isBobTargeted = attackType === 'forgery';
    const isFiberTargeted = attackType === 'intercept_resend' || attackType === 'depolarizing';
    const isNonceTargeted = attackType === 'replay';

    const aliceNode = makeNode('Alice QDS Node', 0x00e5ff, [-2.2, 0, 0.3], isAliceTargeted);
    const bobNode = makeNode('Bob QDS Node', 0x10b981, [2.2, 0, 0.3], isBobTargeted);
    const charlieNode = makeNode('Charlie Arbiter', 0xf59e0b, [0, 0, -1.8], false);
    const nonceNode = makeNode('Immutable Nonce HSM', 0x0284c7, [0, 0, 1.8], isNonceTargeted);

    // Precision Single-Mode Silica Core Fiber
    const fiberPoints = [
      new THREE.Vector3(-2.2, 0.22, 0.3),
      new THREE.Vector3(0, 0.22, 0.3),
      new THREE.Vector3(2.2, 0.22, 0.3),
    ];
    const fiberCurve = new THREE.CatmullRomCurve3(fiberPoints);
    const fiberGeo = new THREE.TubeGeometry(fiberCurve, 32, 0.035, 12, false);
    const fiberMat = new THREE.MeshStandardMaterial({
      color: isFiberTargeted && (isAttacked || operationPhase === 'COLLAPSE') ? 0xf43f5e : 0x00e5ff,
      emissive: isFiberTargeted && (isAttacked || operationPhase === 'COLLAPSE') ? 0xf43f5e : 0x00e5ff,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    const fiberTube = new THREE.Mesh(fiberGeo, fiberMat);
    scene.add(fiberTube);

    // Physical Automated Optical Solenoid Shutter (Triggered on ABORT)
    const shutterChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.45, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
    );
    shutterChassis.position.set(1.1, 0.22, 0.3);
    scene.add(shutterChassis);

    const shutterBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.35, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.9, roughness: 0.2 })
    );
    shutterBlade.position.set(1.1, (operationPhase === 'DEFENSE_ABORT' || isAttacked) ? 0.22 : 0.45, 0.3);
    scene.add(shutterBlade);

    // Classical communication links
    const dashedLine = (p1, p2) => {
      const g = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const m = new THREE.LineDashedMaterial({
        color: 0x475569,
        dashSize: 0.15,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.Line(g, m);
      line.computeLineDistances();
      scene.add(line);
      return line;
    };
    dashedLine(new THREE.Vector3(-2.2, 0.1, 0.3), new THREE.Vector3(0, 0.1, -1.8));
    dashedLine(new THREE.Vector3(2.2, 0.1, 0.3), new THREE.Vector3(0, 0.1, -1.8));
    dashedLine(new THREE.Vector3(2.2, 0.1, 0.3), new THREE.Vector3(0, 0.1, 1.8));

    // Adversary "Eve" Model: Physical Optical Micro-Bend Piezo Wiretap Clamp
    const eveGroup = new THREE.Group();
    scene.add(eveGroup);

    let eveTargetPos = new THREE.Vector3(0, 0.22, 0.3); // default mid-fiber tap
    if (attackType === 'impersonation') eveTargetPos.set(-2.2, 0.65, 0.3);
    if (attackType === 'forgery') eveTargetPos.set(1.6, 0.65, 0.3);
    if (attackType === 'replay') eveTargetPos.set(0, 0.65, 1.8);
    if (attackType === 'depolarizing') eveTargetPos.set(0, 0.95, 0.3);

    // Precision Micro-Bend Piezo Actuator Housing
    const eveBodyGeo = new THREE.BoxGeometry(0.45, 0.32, 0.38);
    const eveBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.25,
    });
    const eveProbe = new THREE.Mesh(eveBodyGeo, eveBodyMat);
    eveProbe.position.copy(eveTargetPos);
    if (attackType !== 'depolarizing') {
      eveGroup.add(eveProbe);
    }

    // Interception Laser Beam
    const laserMat = new THREE.LineBasicMaterial({
      color: 0xff1744,
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      eveTargetPos,
      new THREE.Vector3(eveTargetPos.x, 0.22, eveTargetPos.z),
    ]);
    const laserBeam = new THREE.Line(laserGeo, laserMat);
    if (attackType === 'intercept_resend' || operationPhase === 'INTERCEPT') {
      eveGroup.add(laserBeam);
    }

    // Flying Signature Packet (Single Concentrated Quantum Envelope)
    const packetGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const packetMat = new THREE.MeshStandardMaterial({
      color: isAttacked || operationPhase === 'COLLAPSE' ? 0xff1744 : 0x00f2fe,
      emissive: isAttacked || operationPhase === 'COLLAPSE' ? 0xff1744 : 0x00f2fe,
      emissiveIntensity: 1.2,
    });
    const sigPacket = new THREE.Mesh(packetGeo, packetMat);
    sigPacket.position.set(-2.2, 0.22, 0.3);
    scene.add(sigPacket);

    // Dynamic Swirling Noise Cloud
    let noiseCloud = null;
    if (attackType === 'depolarizing') {
      const cloudGeo = new THREE.BufferGeometry();
      const cCount = 120;
      const cPos = new Float32Array(cCount * 3);
      for (let i = 0; i < cCount; i++) {
        cPos[i * 3] = -1.8 + Math.random() * 3.6;
        cPos[i * 3 + 1] = 0.0 + Math.random() * 0.8;
        cPos[i * 3 + 2] = -0.1 + Math.random() * 0.8;
      }
      cloudGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
      const cloudMat = new THREE.PointsMaterial({
        color: 0xd946ef,
        size: 0.08,
        transparent: true,
        opacity: 0.7,
      });
      noiseCloud = new THREE.Points(cloudGeo, cloudMat);
      scene.add(noiseCloud);
    }

    // Bob Firewall Shield Mesh
    let shieldMesh = null;
    const shieldGeo = new THREE.SphereGeometry(0.58, 20, 20, 0, Math.PI);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: isAttacked || operationPhase === 'DEFENSE_ABORT' ? 0xff1744 : 0x00e676,
      transparent: true,
      opacity: isAttacked || operationPhase === 'DEFENSE_ABORT' ? 0.65 : 0.25,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.rotation.y = -Math.PI / 2;
    shieldMesh.position.set(2.0, 0.22, 0.3);
    scene.add(shieldMesh);

    let reqId;
    let isDisposed = false;
    let clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      reqId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Gentle camera orbit
      scene.rotation.y = Math.sin(elapsed * 0.25) * 0.12;

      // Eve probe pulsates
      if (eveProbe) {
        eveProbe.rotation.x += 0.02;
        eveProbe.rotation.y += 0.03;
        eveProbe.position.y = eveTargetPos.y + Math.sin(elapsed * 4) * 0.06;
      }

      // Synchronized Packet Position based on operationPhase
      if (operationPhase === 'IDLE') {
        sigPacket.position.set(-2.2, 0.22, 0.3);
        sigPacket.scale.setScalar(1.0);
      } else if (operationPhase === 'DISPATCH') {
        sigPacket.position.x = -2.2 + Math.min(1.0, elapsed * 1.5);
        sigPacket.scale.setScalar(1.2);
      } else if (operationPhase === 'IN_TRANSIT') {
        sigPacket.position.x = -1.2 + Math.sin(elapsed * 3) * 0.8;
      } else if (operationPhase === 'INTERCEPT') {
        sigPacket.position.x = eveTargetPos.x;
        sigPacket.scale.setScalar(1.4);
      } else if (operationPhase === 'COLLAPSE') {
        sigPacket.position.x = 0.8;
        sigPacket.position.y = 0.22 + (Math.random() - 0.5) * 0.15;
      } else if (operationPhase === 'DEFENSE_ABORT') {
        sigPacket.position.x = 1.6;
        sigPacket.scale.setScalar(0.7);
        shieldMesh.scale.setScalar(1.2 + Math.sin(elapsed * 8) * 0.1);
      } else {
        // Continuous gentle loop if idle
        const t = (elapsed * 0.4) % 1;
        sigPacket.position.x = -2.2 + t * 4.4;
      }

      // Noise Cloud
      if (noiseCloud) {
        noiseCloud.rotation.y += 0.01;
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!container || isDisposed || !renderer) return;
      const w = container.clientWidth || 480;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (renderer) {
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, [attackType, isAttacked, operationPhase]);

  return (
    <div className="attack-architecture-3d-card liquid-glass">
      <div className="attack-arch-header">
        <div className="header-badge-row">
          <span className="viz-badge danger">ADVERSARIAL ATTACK ARCHITECTURE</span>
          <span className="target-location-tag">
            🎯 TARGET: <strong>{info.targetLocation}</strong>
          </span>
        </div>
        <h4>Synchronized Targeted Interception Mesh</h4>
        <p className="arch-sub-desc">
          Live 3D topology tracing Eve's probe wiretapping <strong>{entity.id}</strong>.
        </p>
      </div>

      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="attack-arch-canvas-mount" />

      {/* Target Signature Packet Badge */}
      <div className="signature-target-pill">
        <span className="pill-pulse-red" />
        <span>ATTACKED ENTITY: <strong>{entity.name}</strong></span>
        <code className="pill-code">Hash: {entity.payloadHash ? entity.payloadHash.slice(0, 10) : '0x9f4a...'}</code>
      </div>

      {/* Node Legend */}
      <div className="arch-node-legend">
        <span className="legend-item">
          <span className="dot cyan" />
          <strong>Alice</strong> (QSP &amp; EPR Source)
        </span>
        <span className="legend-item">
          <span className="dot green" />
          <strong>Bob</strong> (Born χ² Verifier)
        </span>
        <span className="legend-item">
          <span className="dot gold" />
          <strong>Charlie</strong> (Arbitrator)
        </span>
        <span className="legend-item">
          <span className="dot purple" />
          <strong>Nonce Registry</strong>
        </span>
        <span className="legend-item danger">
          <span className="dot red" />
          <strong>Eve Probe</strong> (Targeted Wiretap)
        </span>
      </div>

      {/* Explicit Target Breakdown HUD */}
      <div className="target-hud-box">
        <div className="hud-title-bar" onClick={() => setHudExpanded(!hudExpanded)}>
          <span className="hud-icon">🛡️</span>
          <span className="hud-heading">
            Target Component: <strong>{info.targetName}</strong>
          </span>
          <span className="hud-toggle">{hudExpanded ? '▲' : '▼'}</span>
        </div>

        {hudExpanded && (
          <div className="hud-content-grid">
            <div className="hud-field">
              <span className="hud-label">Subsystem Category:</span>
              <span className="hud-val">{info.componentType}</span>
            </div>
            <div className="hud-field">
              <span className="hud-label">Adversary Action:</span>
              <span className="hud-val danger-text">{info.adversaryMethod}</span>
            </div>
            <div className="hud-field">
              <span className="hud-label">Governing Physical Law:</span>
              <span className="hud-val code-font">{info.physicalLaw}</span>
            </div>
            <div className="hud-field">
              <span className="hud-label">Bob's Defensive Response:</span>
              <span className="hud-val safe-text">{info.defenseTrigger}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
