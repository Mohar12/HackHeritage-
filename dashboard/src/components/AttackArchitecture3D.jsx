/**
 * AttackArchitecture3D.jsx
 * ========================
 * Physically distinct 3D visualizer for each of the 5 attack types.
 * Each attack type has a fundamentally different visual mechanism:
 *
 *  intercept_resend  — Mid-fiber interception cone + diverted particle arc (ONLY type with a channel-tap cone)
 *  depolarizing      — No attacker object; whole-fiber noise jitter cloud along the full length
 *  forgery           — No channel interception; repeated guess-pulses bouncing off Bob's node only
 *  impersonation     — Spoofed-source stream: Eve near Alice emits distorted/wrong-color particles
 *  replay            — No quantum channel attacked; old "session packet" token re-injected, rejected at Bob
 *
 * All live detection math (fidelity, QBER, confidence) flows through mathRef/phaseRef to the
 * rAF loop so the WebGL context is NEVER rebuilt on data changes — only on attackType changes.
 */

import React, { useEffect, useRef, useState, memo } from 'react';
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

// Derive composite interception intensity [0,1] from live math data
function deriveIntensity(attackData, detectData, attackType) {
  if (detectData) {
    const conf = typeof detectData.confidence === 'number' ? detectData.confidence : 0;
    const fidelity = typeof detectData.fidelity === 'number' ? detectData.fidelity : 1.0;
    return Math.min(1.0, conf * 0.7 + Math.max(0, 1.0 - fidelity) * 0.3 + (detectData.is_malicious ? 0.1 : 0));
  }
  if (attackData) {
    const qber = typeof attackData.qber === 'number' ? attackData.qber : 0;
    return Math.min(1.0, qber * 4);
  }
  return { intercept_resend: 0.45, depolarizing: 0.3, forgery: 0, impersonation: 0.35, replay: 0 }[attackType] || 0;
}

function deriveInterceptedFraction(attackData, detectData, attackType) {
  if (attackData && typeof attackData.qber === 'number' && attackData.qber > 0) {
    return Math.min(1.0, attackData.qber * 4);
  }
  if (detectData && typeof detectData.fidelity === 'number') {
    return Math.max(0, 1.0 - detectData.fidelity);
  }
  return { intercept_resend: 0.5, depolarizing: 0.25, forgery: 0, impersonation: 0.5, replay: 0 }[attackType] || 0;
}

const PARTICLE_COUNT = 32;

// Shared node positions
const ALICE_POS = [-2.2, 0, 0.3];
const BOB_POS = [2.2, 0, 0.3];
const CHARLIE_POS = [0, 0, -1.8];
const NONCE_POS = [0, 0, 1.8];
const FIBER_Y = 0.22;

function AttackArchitecture3DComponent({
  attackType = 'intercept_resend',
  isAttacked = false,
  targetEntity,
  operationPhase = 'IDLE',
  attackData,
  detectData,
}) {
  const mountRef = useRef(null);
  const [hudExpanded, setHudExpanded] = useState(true);

  // Live-changing data goes into refs — never rebuilds the WebGL context
  const phaseRef = useRef({ operationPhase, isAttacked });
  const mathRef = useRef({ attackData, detectData });

  useEffect(() => {
    phaseRef.current = { operationPhase, isAttacked };
  }, [operationPhase, isAttacked]);

  useEffect(() => {
    mathRef.current = { attackData, detectData };
  }, [attackData, detectData]);

  const info = TARGET_BREAKDOWN[attackType] || TARGET_BREAKDOWN.intercept_resend;
  const entity = targetEntity || {
    id: 'TX-2026-FED-BOE',
    name: 'Federal Reserve → Bank of England ($25M Wire)',
    sender: 'Alice (US-East-1 QKD Gateway)',
    recipient: 'Bob (UK-LON-2 QKD Gateway)',
    documentPayload: 'SWIFT-AUTH: Transfer $25,000,000 USD to Bank of England',
  };

  // The scene rebuilds ONLY when attackType changes (correct — each is a distinct physical scenario)
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
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);
    } catch (e) {
      return;
    }

    // --- SHARED SCENE ELEMENTS ---
    const grid = new THREE.GridHelper(8, 16, 0x1e3a8a, 0x091428);
    grid.position.y = -0.5;
    scene.add(grid);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const mainLight = new THREE.PointLight(0x00f2fe, 2.2, 14);
    mainLight.position.set(0, 3.5, 2);
    scene.add(mainLight);
    const alertLight = new THREE.PointLight(0xff1744, 0.5, 10);
    alertLight.position.set(0, 1.5, 0);
    scene.add(alertLight);

    // Node factory
    const makeNode = (color, pos, targeted = false) => {
      const g = new THREE.Group();
      g.position.set(...pos);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.42, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
      );
      g.add(base);
      const coreMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: targeted ? 1.0 : 0.4, roughness: 0.2 });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), coreMat);
      core.position.y = 0.22;
      g.add(core);
      if (targeted) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.48, 0.54, 32),
          new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        g.add(ring);
      }
      scene.add(g);
      return { group: g, coreMat };
    };

    const aliceNode = makeNode(0x00e5ff, ALICE_POS, attackType === 'impersonation');
    const bobNode = makeNode(0x10b981, BOB_POS, attackType === 'forgery');
    const charlieNode = makeNode(0xf59e0b, CHARLIE_POS, false);
    const nonceNode = makeNode(0x0284c7, NONCE_POS, attackType === 'replay');
    const aliceCoreMat = aliceNode.coreMat;
    const bobCoreMat = bobNode.coreMat;

    // Fiber tube (Alice→Bob quantum channel)
    const fiberCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ALICE_POS[0], FIBER_Y, ALICE_POS[2]),
      new THREE.Vector3(0, FIBER_Y, 0.3),
      new THREE.Vector3(BOB_POS[0], FIBER_Y, BOB_POS[2]),
    ]);
    const fiberMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85,
    });
    const fiberTube = new THREE.Mesh(new THREE.TubeGeometry(fiberCurve, 32, 0.035, 12, false), fiberMat);
    scene.add(fiberTube);

    // Classical dashed links
    const dashedLine = (p1, p2) => {
      const g = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const m = new THREE.LineDashedMaterial({ color: 0x475569, dashSize: 0.15, gapSize: 0.1, transparent: true, opacity: 0.5 });
      const l = new THREE.Line(g, m);
      l.computeLineDistances();
      scene.add(l);
    };
    dashedLine(new THREE.Vector3(ALICE_POS[0], 0.1, ALICE_POS[2]), new THREE.Vector3(CHARLIE_POS[0], 0.1, CHARLIE_POS[2]));
    dashedLine(new THREE.Vector3(BOB_POS[0], 0.1, BOB_POS[2]), new THREE.Vector3(CHARLIE_POS[0], 0.1, CHARLIE_POS[2]));
    dashedLine(new THREE.Vector3(BOB_POS[0], 0.1, BOB_POS[2]), new THREE.Vector3(NONCE_POS[0], 0.1, NONCE_POS[2]));

    // Bob's shield hemisphere (always present, reacts to verdict)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00e676, transparent: true, opacity: 0.2, side: THREE.DoubleSide, wireframe: true,
    });
    const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 20, 0, Math.PI), shieldMat);
    shieldMesh.rotation.y = -Math.PI / 2;
    shieldMesh.position.set(BOB_POS[0] - 0.2, FIBER_Y, BOB_POS[2]);
    scene.add(shieldMesh);

    // Solenoid shutter (Alice→Bob, only relevant for intercept_resend)
    const shutterBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.35, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.9, roughness: 0.2 })
    );
    shutterBlade.position.set(1.1, 0.45, 0.3);
    if (attackType === 'intercept_resend') {
      const shutterChassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.45, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
      );
      shutterChassis.position.set(1.1, 0.22, 0.3);
      scene.add(shutterChassis);
      scene.add(shutterBlade);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ATTACK-TYPE-SPECIFIC SCENE OBJECTS
    // ─────────────────────────────────────────────────────────────────────────

    // Shared particle material references (for loop reuse)
    const cleanMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 1.1 });
    const spoofMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.2 }); // orange = wrong states
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.1 });

    // Per-type objects (null = not applicable)
    let eveCone = null, eveConeWire = null, coneMat = null, coneWireMat = null, eveSpotlight = null;
    let noiseCloud = null, noisePositions = null;
    let particles = [];   // { mesh, phaseOffset }
    let guessParticles = []; // for forgery guess-pulses
    let replayToken = null;  // for replay token animation
    let eveSourceGroup = null; // for impersonation Eve-near-Alice source

    if (attackType === 'intercept_resend') {
      // ── INTERCEPT-RESEND: cone at fiber MIDPOINT (x=0), particle stream with diverted arc ──
      const MID = new THREE.Vector3(0, FIBER_Y, 0.3); // exact midpoint Alice↔Bob

      const eveLight = new THREE.PointLight(0xff4400, 0, 5);
      eveLight.position.set(MID.x, MID.y + 1.2, MID.z);
      scene.add(eveLight);
      eveSpotlight = eveLight;

      coneMat = new THREE.MeshStandardMaterial({
        color: 0xff3300, emissive: 0xff1100, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.75, side: THREE.DoubleSide,
      });
      eveCone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 18, 1, true), coneMat);
      // Position: above the midpoint, pointing DOWN toward fiber — never touching any node
      eveCone.position.set(MID.x, MID.y + 0.6, MID.z);
      eveCone.rotation.x = Math.PI; // tip points down
      scene.add(eveCone);

      coneWireMat = new THREE.MeshBasicMaterial({ color: 0xff6633, transparent: true, opacity: 0.3, wireframe: true });
      eveConeWire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 18, 1, true), coneWireMat);
      eveConeWire.position.copy(eveCone.position);
      eveConeWire.rotation.copy(eveCone.rotation);
      scene.add(eveConeWire);

      // Laser drop from cone tip to fiber
      const laserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(MID.x, MID.y + 0.6, MID.z),
        new THREE.Vector3(MID.x, FIBER_Y, MID.z),
      ]);
      scene.add(new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.85 })));

      // Eve HSM housing above cone
      const eveBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.14, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x1a0a00, metalness: 0.85, roughness: 0.25 })
      );
      eveBody.position.set(MID.x, MID.y + 1.22, MID.z);
      scene.add(eveBody);

      // Photon particles: two streams, intercepted fraction determined by QBER
      const particleGeo = new THREE.SphereGeometry(0.07, 8, 8);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const mesh = new THREE.Mesh(particleGeo, i < PARTICLE_COUNT * 0.4 ? redMat : cleanMat);
        scene.add(mesh);
        particles.push({ mesh, phaseOffset: i / PARTICLE_COUNT });
      }

    } else if (attackType === 'depolarizing') {
      // ── DEPOLARIZING: no attacker object — continuous noise field along entire fiber length ──
      const cloudGeo = new THREE.BufferGeometry();
      const cCount = 160;
      const cPos = new Float32Array(cCount * 3);
      for (let i = 0; i < cCount; i++) {
        cPos[i * 3] = ALICE_POS[0] + Math.random() * (BOB_POS[0] - ALICE_POS[0]);
        cPos[i * 3 + 1] = FIBER_Y - 0.1 + Math.random() * 0.65;
        cPos[i * 3 + 2] = ALICE_POS[2] - 0.15 + Math.random() * 0.55;
      }
      cloudGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
      noisePositions = cPos;
      const cloudMat = new THREE.PointsMaterial({ color: 0xd946ef, size: 0.07, transparent: true, opacity: 0.65 });
      noiseCloud = new THREE.Points(cloudGeo, cloudMat);
      scene.add(noiseCloud);

      // Clean particles still travel the fiber but with visible jitter (applied in loop)
      const particleGeo = new THREE.SphereGeometry(0.07, 8, 8);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const mesh = new THREE.Mesh(particleGeo, cleanMat.clone());
        scene.add(mesh);
        particles.push({ mesh, phaseOffset: i / PARTICLE_COUNT });
      }

    } else if (attackType === 'forgery') {
      // ── FORGERY: no channel interaction — repeated guess-pulse spheres bounce off Bob's gate ──
      // No particle stream along fiber. No cone. No Eve near Alice.
      // Show 8 small guess-attempt tokens that cycle from Eve's "pocket" toward Bob and get rejected.
      const guessGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const guessMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.9 });
      const rejMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff0000, emissiveIntensity: 1.2 });
      // Eve's "guessing station" sits above and between Alice and Bob, not on any node
      const EVE_FORGE_POS = new THREE.Vector3(0.6, 0.75, 1.4);
      for (let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(guessGeo, guessMat);
        mesh.position.copy(EVE_FORGE_POS);
        scene.add(mesh);
        guessParticles.push({ mesh, phase: i / 8, rejMat, guessMat });
      }
      // Eve's device block
      const eveDev = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.18, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x1a0a00, metalness: 0.85 })
      );
      eveDev.position.copy(EVE_FORGE_POS).setY(EVE_FORGE_POS.y + 0.22);
      scene.add(eveDev);

    } else if (attackType === 'impersonation') {
      // ── IMPERSONATION: Eve near Alice injects distorted (orange/yellow) states from source ──
      // The fiber carries spoofed states from the start — NOT mid-channel interception.
      // Show a small "Eve transmitter" near Alice, with distorted particles originating from it.
      const EVE_SOURCE = new THREE.Vector3(ALICE_POS[0] + 0.35, FIBER_Y + 0.5, ALICE_POS[2] + 0.6);

      eveSourceGroup = new THREE.Group();
      scene.add(eveSourceGroup);

      // Eve transmitter box near Alice
      const eveTx = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.18, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x2d1a00, metalness: 0.85 })
      );
      eveTx.position.copy(EVE_SOURCE);
      scene.add(eveTx);

      // Fake-state indicators on Eve's transmitter (pulsing orange rings)
      const txRing = new THREE.Mesh(
        new THREE.RingGeometry(0.26, 0.30, 24),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      );
      txRing.rotation.x = -Math.PI / 2;
      txRing.position.copy(EVE_SOURCE).setY(EVE_SOURCE.y - 0.05);
      scene.add(txRing);

      // A line from Eve's transmitter down to the fiber — representing injection point
      const injectLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([EVE_SOURCE, new THREE.Vector3(ALICE_POS[0], FIBER_Y, ALICE_POS[2])]),
        new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 })
      );
      scene.add(injectLine);

      // Spoofed-state particles: orange/yellow (wrong entanglement basis), travel the whole fiber
      const particleGeo = new THREE.SphereGeometry(0.07, 8, 8);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Mix: some look partially-distorted (red), most are orange (spoofed)
        const mat = i % 5 === 0 ? redMat : spoofMat;
        const mesh = new THREE.Mesh(particleGeo, mat);
        scene.add(mesh);
        particles.push({ mesh, phaseOffset: i / PARTICLE_COUNT });
      }

    } else if (attackType === 'replay') {
      // ── REPLAY: no quantum channel attack — a captured classical token is re-injected at Bob ──
      // The fiber itself is untouched. Show a single "captured session token" traveling from
      // a "Session #1" marker, injected toward Bob's nonce gate, then bouncing/rejected.
      const TOKEN_START = new THREE.Vector3(-0.5, FIBER_Y + 0.4, 1.1); // Eve's captured-packet storage
      replayToken = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x5b21b6, emissiveIntensity: 0.8 })
      );
      replayToken.position.copy(TOKEN_START);
      scene.add(replayToken);

      // "Session #1" capture label position (visual marker box)
      const captureBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.12, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x1e1040, metalness: 0.7 })
      );
      captureBox.position.copy(TOKEN_START);
      captureBox.position.y -= 0.25;
      scene.add(captureBox);

      // Rejection zone ring at Bob's nonce gate
      const rejectRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.03, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.8 })
      );
      rejectRing.rotation.x = -Math.PI / 2;
      rejectRing.position.set(NONCE_POS[0], FIBER_Y + 0.1, NONCE_POS[2]);
      scene.add(rejectRing);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANIMATION LOOP
    // ─────────────────────────────────────────────────────────────────────────
    let reqId = null;
    let isDisposed = false;
    let isVisible = true;
    const clock = new THREE.Clock();
    // Replay token state machine
    let replayState = 'idle'; // 'idle' | 'traveling' | 'rejecting' | 'resetting'
    let replayT = 0;
    const REPLAY_TARGET = new THREE.Vector3(NONCE_POS[0], FIBER_Y + 0.35, NONCE_POS[2]);
    const REPLAY_START = new THREE.Vector3(-0.5, FIBER_Y + 0.4, 1.1);

    const animate = () => {
      if (isDisposed) return;
      if (!isVisible) { reqId = null; return; }
      reqId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      const { operationPhase: phase, isAttacked: attacked } = phaseRef.current;
      const { attackData: aData, detectData: dData } = mathRef.current;

      const intensity = deriveIntensity(aData, dData, attackType);
      const interceptFrac = deriveInterceptedFraction(aData, dData, attackType);
      const phaseBoost = { IDLE: 0, DISPATCH: 0.08, IN_TRANSIT: 0.18, INTERCEPT: 0.55, COLLAPSE: 0.85, DEFENSE_ABORT: 1.0 }[phase] || 0;
      const effIntensity = Math.max(intensity * (attacked ? 1.0 : 0.65), phaseBoost);
      const effFrac = attacked ? interceptFrac : interceptFrac * phaseBoost;

      const isDefending = attacked || phase === 'DEFENSE_ABORT';
      alertLight.intensity = 0.3 + effIntensity * 3.5;

      // Bob shield & core reaction (universal across all attack types)
      shieldMat.color.setHex(isDefending ? 0xff1744 : 0x00e676);
      shieldMat.opacity = isDefending
        ? 0.4 + Math.sin(elapsed * 10) * 0.15
        : 0.15 + Math.sin(elapsed * 2) * 0.04;
      shieldMesh.scale.setScalar(isDefending ? 1.0 + Math.sin(elapsed * 8) * 0.06 : 1.0);
      if (isDefending) {
        const p = 0.55 + Math.sin(elapsed * 12) * 0.45;
        bobCoreMat.emissive.setRGB(p, 0, 0);
        bobCoreMat.emissiveIntensity = 0.8 + p * 0.5;
      } else {
        bobCoreMat.emissive.setHex(0x10b981);
        bobCoreMat.emissiveIntensity = 0.4;
      }

      // Scene drift
      scene.rotation.y = Math.sin(elapsed * 0.25) * 0.12;

      // ── PER-TYPE ANIMATION ──

      if (attackType === 'intercept_resend') {
        // Fiber turns red on attack/collapse
        const fAtk = attacked || phase === 'COLLAPSE';
        fiberMat.color.setHex(fAtk ? 0xf43f5e : 0x00e5ff);
        fiberMat.emissive.setHex(fAtk ? 0xf43f5e : 0x00e5ff);
        fiberMat.emissiveIntensity = fAtk ? 0.9 : 0.6;

        // Shutter
        shutterBlade.position.y = (phase === 'DEFENSE_ABORT' || attacked) ? 0.22 : 0.45;

        // Cone at x=0 (midpoint) — scale/color driven by effIntensity
        if (eveCone) {
          const cs = 0.5 + effIntensity * 1.1;
          eveCone.scale.set(cs, 0.6 + effIntensity * 0.8, cs);
          eveConeWire.scale.copy(eveCone.scale);
          const g = Math.max(0, 0.35 - effIntensity * 0.35);
          coneMat.color.setRGB(1, g, 0);
          coneMat.emissive.setRGB(0.8, g * 0.3, 0);
          coneMat.emissiveIntensity = 0.4 + effIntensity * 1.4 + Math.sin(elapsed * 5) * 0.2;
          coneMat.opacity = 0.4 + effIntensity * 0.5;
          coneWireMat.opacity = 0.15 + effIntensity * 0.4;
          eveCone.position.y = FIBER_Y + 0.6 + Math.sin(elapsed * 4.5) * 0.05;
          eveConeWire.position.y = eveCone.position.y;
        }
        if (eveSpotlight) {
          eveSpotlight.intensity = effIntensity * 2.5;
        }

        // Photon particles with intercepted-fraction arc
        const speed = 0.38;
        const fiberLen = BOB_POS[0] - ALICE_POS[0]; // 4.4
        const midX = 0; // midpoint
        particles.forEach((p, i) => {
          const shouldIntercept = i < PARTICLE_COUNT * effFrac;
          p.mesh.material = shouldIntercept ? redMat : cleanMat;
          const t = ((elapsed * speed + p.phaseOffset * fiberLen) % fiberLen) / fiberLen;
          const x = ALICE_POS[0] + t * fiberLen;

          if (phase === 'IDLE') {
            p.mesh.position.set(ALICE_POS[0], FIBER_Y, ALICE_POS[2]);
            p.mesh.visible = i === 0;
          } else {
            p.mesh.visible = true;
            if (shouldIntercept && Math.abs(x - midX) < 0.7) {
              // Arc upward through the cone at midpoint
              const arc = (x - (midX - 0.7)) / 1.4;
              const h = Math.sin(arc * Math.PI) * 0.4 * effIntensity;
              p.mesh.position.set(x, FIBER_Y + h, 0.3 + Math.sin(arc * Math.PI) * 0.1);
              p.mesh.scale.setScalar(1 + arc * (1 - arc) * 0.8);
            } else {
              p.mesh.position.set(x, FIBER_Y + Math.sin(elapsed * 8 + p.phaseOffset * 20) * 0.015, 0.3);
              p.mesh.scale.setScalar(1.0);
            }
          }
        });

      } else if (attackType === 'depolarizing') {
        // Noise jitter: both cloud and particles jitter in proportion to noiseRate / effIntensity
        const noiseAmp = 0.06 + effIntensity * 0.12;
        if (noiseCloud) {
          const pos = noiseCloud.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            pos.setX(i, noisePositions[i * 3] + (Math.random() - 0.5) * noiseAmp);
            pos.setY(i, noisePositions[i * 3 + 1] + (Math.random() - 0.5) * noiseAmp * 0.5);
          }
          pos.needsUpdate = true;
          noiseCloud.material.opacity = 0.5 + effIntensity * 0.3;
          noiseCloud.material.color.setRGB(0.85, 0.3 + effIntensity * 0.4, 1.0);
        }

        // Particles jitter in color and position along full fiber
        const speed = 0.3;
        const fiberLen = BOB_POS[0] - ALICE_POS[0];
        particles.forEach((p, i) => {
          if (phase === 'IDLE') {
            p.mesh.position.set(ALICE_POS[0], FIBER_Y, ALICE_POS[2]);
            p.mesh.visible = i === 0;
          } else {
            p.mesh.visible = true;
            const t = ((elapsed * speed + p.phaseOffset * fiberLen) % fiberLen) / fiberLen;
            const x = ALICE_POS[0] + t * fiberLen;
            // Jitter amplitude proportional to noise intensity
            const jx = (Math.random() - 0.5) * noiseAmp;
            const jy = (Math.random() - 0.5) * noiseAmp * 0.5;
            p.mesh.position.set(x + jx, FIBER_Y + jy, 0.3);
            // Color flickers toward red at high noise
            const redness = effIntensity * (Math.random() > 0.7 ? 1 : 0.3);
            p.mesh.material.color.setRGB(redness, 1.0 - redness * 0.85, 1.0 - redness * 0.6);
            p.mesh.material.emissive.setRGB(redness * 0.6, (1 - redness) * 0.6, 1.0 - redness * 0.6);
          }
        });
        // Fiber subtly pulses color
        const fCol = effIntensity > 0.3 ? 0.85 : 1.0;
        fiberMat.color.setRGB(0, fCol, fCol);

      } else if (attackType === 'forgery') {
        // Guess-pulse cycle: tokens travel from Eve's device toward Bob, rejected with flash
        const CYCLE = 1.8; // seconds per guess attempt
        const EVE_FORGE_POS = new THREE.Vector3(0.6, 0.75, 1.4);
        const BOB_GATE = new THREE.Vector3(BOB_POS[0] - 0.35, FIBER_Y + 0.15, BOB_POS[2]);
        guessParticles.forEach((gp, i) => {
          const t = ((elapsed + i * (CYCLE / guessParticles.length)) % CYCLE) / CYCLE;
          if (t < 0.5) {
            // traveling toward Bob's gate
            gp.mesh.position.lerpVectors(EVE_FORGE_POS, BOB_GATE, t * 2);
            gp.mesh.material = gp.guessMat;
            gp.mesh.scale.setScalar(1.0);
            gp.mesh.visible = phase !== 'IDLE';
          } else {
            // rejected — flash red and bounce back
            const reject = (t - 0.5) * 2; // 0..1
            const bounceBack = new THREE.Vector3().lerpVectors(BOB_GATE, EVE_FORGE_POS, reject * 0.35);
            gp.mesh.position.copy(bounceBack);
            gp.mesh.material = gp.rejMat;
            gp.mesh.scale.setScalar(1.0 + Math.sin(reject * Math.PI) * 0.4);
            gp.mesh.visible = phase !== 'IDLE';
          }
        });
        // Bob's node flashes harder during rejections (representing repeated failed verifications)
        if (phase !== 'IDLE') {
          const rejectPulse = 0.4 + Math.sin(elapsed * 18) * 0.4;
          bobCoreMat.emissive.setRGB(rejectPulse, 0.1, 0.1);
          bobCoreMat.emissiveIntensity = 0.6 + rejectPulse;
          alertLight.intensity = 0.3 + rejectPulse * 2;
        }

      } else if (attackType === 'impersonation') {
        // Spoofed-state stream: orange particles from Eve's source near Alice
        const aliceCorePulse = 0.4 + Math.sin(elapsed * 6) * 0.3;
        aliceCoreMat.emissive.setRGB(1.0, 0.45 + aliceCorePulse * 0.3, 0);
        aliceCoreMat.emissiveIntensity = 0.6 + aliceCorePulse;

        const speed = 0.38;
        const fiberLen = BOB_POS[0] - ALICE_POS[0];
        particles.forEach((p, i) => {
          if (phase === 'IDLE') {
            p.mesh.position.set(ALICE_POS[0], FIBER_Y, ALICE_POS[2]);
            p.mesh.visible = i === 0;
          } else {
            p.mesh.visible = true;
            const t = ((elapsed * speed + p.phaseOffset * fiberLen) % fiberLen) / fiberLen;
            const x = ALICE_POS[0] + t * fiberLen;
            // Add visible distortion: spoofed states wobble in both y and z axes
            const wobble = Math.sin(elapsed * 9 + p.phaseOffset * 15) * 0.06 * effIntensity;
            const zWobble = Math.cos(elapsed * 7 + p.phaseOffset * 10) * 0.04 * effIntensity;
            p.mesh.position.set(x, FIBER_Y + wobble, 0.3 + zWobble);
          }
        });
        // Fiber has an orange tinge: legitimate-looking but wrong
        const fOrange = 0.3 + effIntensity * 0.4;
        fiberMat.color.setRGB(fOrange, 0.9, 0.9);

      } else if (attackType === 'replay') {
        // Replay token animation: IDLE -> travels toward nonce gate -> bounces -> resets
        const TRAVEL_DUR = 1.4;
        const REJECT_DUR = 0.6;
        const PAUSE_DUR = 1.0;
        const TOTAL = TRAVEL_DUR + REJECT_DUR + PAUSE_DUR;

        if (phase === 'IDLE') {
          replayToken.position.copy(REPLAY_START);
          replayToken.visible = true;
          replayState = 'idle';
          replayT = 0;
        } else {
          const cycleT = elapsed % TOTAL;
          if (cycleT < TRAVEL_DUR) {
            // traveling toward nonce gate
            const t = cycleT / TRAVEL_DUR;
            replayToken.position.lerpVectors(REPLAY_START, REPLAY_TARGET, t);
            replayToken.material.color.setHex(0x7c3aed);
            replayToken.material.emissive.setHex(0x5b21b6);
            replayToken.rotation.y += 0.05;
            replayToken.scale.setScalar(1.0);
          } else if (cycleT < TRAVEL_DUR + REJECT_DUR) {
            // rejection flash: token turns red, vibrates, stops short of nonce node
            const r = (cycleT - TRAVEL_DUR) / REJECT_DUR;
            replayToken.position.copy(REPLAY_TARGET);
            replayToken.position.x += (Math.random() - 0.5) * 0.08 * (1 - r);
            replayToken.position.z += (Math.random() - 0.5) * 0.08 * (1 - r);
            replayToken.material.color.setHex(0xff1744);
            replayToken.material.emissive.setHex(0xff0000);
            replayToken.scale.setScalar(1.0 + Math.sin(r * Math.PI * 6) * 0.3);
            // Nonce node pulses
            nonceNode.coreMat.emissive.setHex(0xff1744);
            nonceNode.coreMat.emissiveIntensity = 1.2;
          } else {
            // reset back to start
            const r = (cycleT - TRAVEL_DUR - REJECT_DUR) / PAUSE_DUR;
            if (r > 0.5) {
              replayToken.position.lerpVectors(REPLAY_TARGET, REPLAY_START, (r - 0.5) * 2);
            } else {
              replayToken.position.copy(REPLAY_TARGET);
            }
            replayToken.material.color.setHex(0x7c3aed);
            replayToken.material.emissive.setHex(0x5b21b6);
            replayToken.scale.setScalar(1.0);
            // Reset nonce node
            nonceNode.coreMat.emissive.setHex(0x0284c7);
            nonceNode.coreMat.emissiveIntensity = 0.4;
          }
        }
        // Physics are clean for replay — fiber stays neutral
        fiberMat.color.setHex(0x00e5ff);
        fiberMat.emissive.setHex(0x00e5ff);
        fiberMat.emissiveIntensity = 0.6;
      }

      if (renderer && scene && camera) renderer.render(scene, camera);
    };

    // IntersectionObserver: pause when off-screen
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = Boolean(entries[0]?.isIntersecting);
        if (isVisible && !isDisposed && !reqId) animate();
      },
      { threshold: 0.05 }
    );
    observer.observe(container);
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
      observer.disconnect();
      if (reqId) cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
      if (renderer) {
        if (renderer.domElement && container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [attackType]); // Rebuild ONLY when attack type changes — all live data via refs

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

      <div ref={mountRef} className="attack-arch-canvas-mount" />

      <div className="signature-target-pill">
        <span className="pill-pulse-red" />
        <span>ATTACKED ENTITY: <strong>{entity.name}</strong></span>
        <code className="pill-code">Hash: {entity.payloadHash ? entity.payloadHash.slice(0, 10) : '0x9f4a...'}</code>
      </div>

      <div className="arch-node-legend">
        <span className="legend-item"><span className="dot cyan" /><strong>Alice</strong> (QSP &amp; EPR Source)</span>
        <span className="legend-item"><span className="dot green" /><strong>Bob</strong> (Born χ² Verifier)</span>
        <span className="legend-item"><span className="dot gold" /><strong>Charlie</strong> (Arbitrator)</span>
        <span className="legend-item"><span className="dot purple" /><strong>Nonce Registry</strong></span>
        <span className="legend-item danger"><span className="dot red" />
          <strong>Eve</strong> (
          {attackType === 'intercept_resend' && 'Mid-Channel Tap'}
          {attackType === 'depolarizing' && 'Ambient Noise Field'}
          {attackType === 'forgery' && 'Blind Guess Station'}
          {attackType === 'impersonation' && 'Spoofed Source'}
          {attackType === 'replay' && 'Replayed Token'}
          )
        </span>
      </div>

      {/* Live Detection Math Readout (only when results are available) */}
      {detectData && (
        <div className="live-math-readout">
          <span className="lmr-item">
            <span className="lmr-label">Fidelity</span>
            <span className="lmr-val" style={{ color: detectData.fidelity < 0.85 ? '#f43f5e' : '#10b981' }}>
              {typeof detectData.fidelity === 'number' ? (detectData.fidelity * 100).toFixed(1) : '--'}%
            </span>
          </span>
          {typeof attackData?.qber === 'number' && (
            <span className="lmr-item">
              <span className="lmr-label">QBER</span>
              <span className="lmr-val" style={{ color: attackData.qber > 0.11 ? '#f43f5e' : '#10b981' }}>
                {(attackData.qber * 100).toFixed(1)}%
              </span>
            </span>
          )}
          {typeof detectData.confidence === 'number' && (
            <span className="lmr-item">
              <span className="lmr-label">Confidence</span>
              <span className="lmr-val" style={{ color: detectData.confidence > 0.8 ? '#f43f5e' : '#f59e0b' }}>
                {(detectData.confidence * 100).toFixed(1)}%
              </span>
            </span>
          )}
          <span className="lmr-item">
            <span className="lmr-label">Verdict</span>
            <span className="lmr-val" style={{ color: detectData.is_malicious ? '#f43f5e' : '#10b981' }}>
              {detectData.is_malicious ? 'ATTACK DETECTED' : 'CLEAN'}
            </span>
          </span>
        </div>
      )}

      <div className="target-hud-box">
        <div className="hud-title-bar" onClick={() => setHudExpanded(!hudExpanded)}>
          <span className="hud-icon">🛡️</span>
          <span className="hud-heading">Target Component: <strong>{info.targetName}</strong></span>
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

export default memo(AttackArchitecture3DComponent);
