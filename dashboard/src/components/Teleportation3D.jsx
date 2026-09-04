/**
 * Teleportation3D.jsx
 * ===================
 * Dynamic, Stage-Aware 3D Quantum Teleportation and QDS Visualizer:
 *  - Genuinely transforms 3D animations and particle streams based on the active pipeline stage
 *  - Stage 1: Central EPR Source generates entangled Bell pairs (|Φ⁺⟩), firing twin photons to Alice & Bob
 *  - Stage 2: Alice encodes signature state |ψ⟩, performs joint Bell-State Measurement (BSM)
 *  - Stage 3: Classical channel carries correction bits (c0, c1); Bob applies dynamic Pauli X/Z gate rotations
 *  - Stage 4+: Quantum verification sweep — emerald green security shield or crimson Eve alert
 *  - Interactive playback controls: Auto-cycle, manual stage navigation, WebGL fallback.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const STAGES = [
  { id: 1, name: 'EPR Pair Distribution', desc: 'Central EPR source distributes entangled twin photons (|Φ⁺⟩) to Alice & Bob' },
  { id: 2, name: 'Message State Preparation', desc: 'Alice encodes signature state |ψ⟩ into MUB eigenstate bases' },
  { id: 3, name: 'Bell-State Measurement (BSM)', desc: 'Alice performs joint projective measurement on message & EPR qubits' },
  { id: 4, name: 'Classical Bit Transmission', desc: 'Classical Pauli correction bits (c0, c1) sent over classical channel' },
  { id: 5, name: 'Conditional Pauli Correction', desc: 'Bob applies conditional (X^c1 · Z^c0) unitary operators to recover |ψ⟩' },
  { id: 6, name: 'Teleported State Sifting', desc: 'Projective measurements in Alice declared bases yield raw key bits' },
  { id: 7, name: 'Statistical Threat Detection', desc: 'QBER tested vs BB84 bound (0.11) & Pearson χ² Born test verifies authenticity' },
  { id: 8, name: 'Immutable Audit Ledger Commit', desc: 'SHA3-512 post-quantum cryptographic hash committed to immutable ledger' },
];

export default function Teleportation3D({ activeStage = 1, isCompromised = false }) {
  const mountRef = useRef(null);
  const [currentStage, setCurrentStage] = useState(activeStage);
  const [isPlaying, setIsPlaying] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const stageRef = useRef(activeStage);

  // Synchronize stageRef whenever activeStage prop or currentStage state changes
  useEffect(() => {
    const s = Math.max(1, Math.min(8, activeStage || 1));
    setCurrentStage(s);
    stageRef.current = s;
  }, [activeStage]);

  // Auto-play animation cycle
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStage((prev) => {
        const next = prev >= 8 ? 1 : prev + 1;
        stageRef.current = next;
        return next;
      });
    }, 1600);
    return () => clearInterval(timer);
  }, [isPlaying]);

  function handleSelectStage(stageId) {
    setCurrentStage(stageId);
    stageRef.current = stageId;
  }

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch (e) {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 540;
    const height = 270;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 3.6, 6.2);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL init failed:', err);
      setWebglSupported(false);
      return;
    }

    // Authentic Laboratory Quantum Optics Materials (Refined Stitch Palette)
    const matAlice = new THREE.MeshStandardMaterial({ color: 0xc084fc, metalness: 0.8, roughness: 0.25 });
    const matBob = new THREE.MeshStandardMaterial({ color: 0x818cf8, metalness: 0.8, roughness: 0.25 });
    const matCharlie = new THREE.MeshStandardMaterial({ color: 0xd8b4fe, metalness: 0.8, roughness: 0.25 });
    const matEPR = new THREE.MeshStandardMaterial({ color: 0x7e22ce, metalness: 0.8, roughness: 0.25 });
    const matEve = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.8, roughness: 0.25 });

    // Optical Breadboard Base
    const tableGeo = new THREE.BoxGeometry(7.2, 0.15, 3.6);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x070b14, metalness: 0.9, roughness: 0.3 });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -1.6;
    scene.add(tableMesh);

    const holeGrid = new THREE.GridHelper(6.8, 24, 0x818cf8, 0x111624);
    holeGrid.position.y = -1.52;
    scene.add(holeGrid);

    const createNode = (mat, pos, label, radius = 0.28) => {
      const group = new THREE.Group();
      
      // Precision Anodized Aluminum Cylinder Mount
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = -radius - 0.25;
      group.add(post);

      // Optics Housing (Hexagonal / Beveled Prism Enclosure)
      const housingGeo = new THREE.CylinderGeometry(radius, radius * 1.1, radius * 0.9, 8);
      const housingMat = new THREE.MeshStandardMaterial({ color: 0x0b1329, metalness: 0.85, roughness: 0.3 });
      const housing = new THREE.Mesh(housingGeo, housingMat);
      group.add(housing);

      // Laser Aperture Glass Lens
      const lensGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, 0.05, 24);
      const lensMat = new THREE.MeshBasicMaterial({ color: mat.color });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.y = radius * 0.46;
      group.add(lens);

      // Alignment Reticle / Reticle Ring
      const ringGeo = new THREE.RingGeometry(radius * 1.15, radius * 1.35, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: mat.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      group.ringMesh = ring;

      group.position.set(...pos);
      scene.add(group);
      return group;
    };

    const aliceNode = createNode(matAlice, [-2.4, 0.2, 0], 'Alice');
    const bobNode = createNode(matBob, [2.2, 0.8, -0.6], 'Bob');
    const charlieNode = createNode(matCharlie, [2.2, -0.8, 0.6], 'Charlie');
    const eprNode = createNode(matEPR, [0, -1.1, 0], 'EPR BBO Crystal', 0.24);

    // Channels Factory Helper
    const createChannel = (p1, p2, color, dashed = false) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...p1),
        new THREE.Vector3(...p2),
      ]);
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.18, gapSize: 0.09, linewidth: 2 })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      if (dashed) line.computeLineDistances();
      scene.add(line);
      return line;
    };

    let eveNode = null;
    let eveBeam1 = null;
    let eveBeam2 = null;
    let eveAlertLight = null;

    if (isCompromised) {
      // Eve's Precision Optical Micro-Bend Wiretap Bench
      eveNode = createNode(matEve, [0, 1.2, 0], 'Eve Wiretap Bench', 0.32);

      // Warning wiretap clamp frame
      const clampGeo = new THREE.BoxGeometry(0.5, 0.25, 0.4);
      const clampMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
      const clamp = new THREE.Mesh(clampGeo, clampMat);
      clamp.position.y = -0.15;
      eveNode.add(clamp);

      // Crimson interception lasers connecting Alice-Eve and Eve-Bob
      eveBeam1 = createChannel([-2.4, 0.2, 0], [0, 1.2, 0], 0xf43f5e, true);
      eveBeam2 = createChannel([0, 1.2, 0], [2.2, 0.8, -0.6], 0xf43f5e, true);

      // Red alert point light
      eveAlertLight = new THREE.PointLight(0xf43f5e, 2.5, 8);
      eveAlertLight.position.set(0, 1.4, 0);
      scene.add(eveAlertLight);
    }

    // 1. Quantum Channel Alice -> Bob (Red if compromised)
    const lineQuantum = createChannel([-2.4, 0.2, 0], [2.2, 0.8, -0.6], isCompromised ? 0xf43f5e : 0x00e5ff, true);
    // 2. Classical Pauli Channel Alice -> Bob
    const lineClassical = createChannel([-2.4, -0.1, 0], [2.2, 0.5, -0.6], 0xf59e0b, false);
    // 3. EPR Entanglement channels from EPR source
    const lineEPRtoAlice = createChannel([0, -1.1, 0], [-2.4, 0.2, 0], 0x0284c7, true);
    const lineEPRtoBob = createChannel([0, -1.1, 0], [2.2, 0.8, -0.6], 0x0284c7, true);

    // --- Dynamic Stage Particles ---
    // Twin Entangled Photons (Stage 1)
    const eprPhoton1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    const eprPhoton2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    scene.add(eprPhoton1);
    scene.add(eprPhoton2);

    // Flying Quantum Signature Photon (Stage 2 & 3)
    const quantumPhoton = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 16),
      new THREE.MeshBasicMaterial({ color: isCompromised ? 0xff1744 : 0x00f2fe })
    );
    scene.add(quantumPhoton);

    // Flying Classical Bit Packets (Stage 4 & 5)
    const classicalBit = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffd600 })
    );
    scene.add(classicalBit);

    // Bob's Pauli Correction Gate Ring (Stage 5)
    const pauliGateGeo = new THREE.TorusGeometry(0.46, 0.03, 16, 32);
    const pauliGateMat = new THREE.MeshBasicMaterial({ color: 0x00e676, wireframe: true });
    const pauliGate = new THREE.Mesh(pauliGateGeo, pauliGateMat);
    pauliGate.position.set(2.2, 0.8, -0.6);
    scene.add(pauliGate);

    // Security Verification Wave / Shield (Stage 7 & 8)
    const shieldGeo = new THREE.RingGeometry(0.1, 0.2, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: isCompromised ? 0xff1744 : 0x00e676,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    shieldRing.position.set(2.2, 0.8, -0.6);
    scene.add(shieldRing);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const pointLight = new THREE.PointLight(0x00f2fe, 1.8, 12);
    pointLight.position.set(0, 3, 2);
    scene.add(pointLight);

    let progress = 0;
    let reqId;
    let isDisposed = false;

    const animate = () => {
      if (isDisposed) return;
      reqId = requestAnimationFrame(animate);

      const stage = stageRef.current || 1;
      progress = (progress + 0.016) % 1.0;

      // Base rotations
      if (aliceNode?.ringMesh) aliceNode.ringMesh.rotation.z += 0.02;
      if (bobNode?.ringMesh) bobNode.ringMesh.rotation.z += 0.02;
      if (eprNode?.ringMesh) eprNode.ringMesh.rotation.z += 0.03;

      // --- STAGE-SPECIFIC 3D BEHAVIORS ---

      // STAGE 1: EPR Pair Distribution (Source -> Alice & Bob)
      if (stage === 1) {
        eprPhoton1.visible = true;
        eprPhoton2.visible = true;
        quantumPhoton.visible = false;
        classicalBit.visible = false;
        pauliGate.visible = false;
        shieldRing.visible = false;

        // EPR Photon 1: [0, -1.3, 0] -> Alice [-2.4, 0.2, 0]
        eprPhoton1.position.x = 0 + progress * (-2.4);
        eprPhoton1.position.y = -1.3 + progress * 1.5;
        eprPhoton1.position.z = 0;

        // EPR Photon 2: [0, -1.3, 0] -> Bob [2.2, 0.8, -0.6]
        eprPhoton2.position.x = 0 + progress * 2.2;
        eprPhoton2.position.y = -1.3 + progress * 2.1;
        eprPhoton2.position.z = 0 + progress * (-0.6);

        eprNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 4) * 0.15);
      }
      // STAGE 2 & 3: Message Encoding & Teleportation (Alice BSM -> Flying Photon)
      else if (stage === 2 || stage === 3) {
        eprPhoton1.visible = false;
        eprPhoton2.visible = false;
        quantumPhoton.visible = true;
        classicalBit.visible = false;
        pauliGate.visible = false;
        shieldRing.visible = false;

        if (isCompromised && eveNode) {
          // Diverted interception trajectory: Alice -> Eve -> Bob
          if (progress < 0.5) {
            const f = progress / 0.5;
            quantumPhoton.position.x = -2.4 + f * 2.4;
            quantumPhoton.position.y = 0.2 + f * 1.0;
            quantumPhoton.position.z = 0;
            quantumPhoton.material.color.setHex(0x00e5ff);
          } else {
            const f = (progress - 0.5) / 0.5;
            quantumPhoton.position.x = 0 + f * 2.2;
            quantumPhoton.position.y = 1.2 - f * 0.4;
            quantumPhoton.position.z = 0 - f * 0.6;
            quantumPhoton.material.color.setHex(0xf43f5e); // Corrupted / Wiretapped state
          }
        } else {
          // Normal honest direct quantum channel
          quantumPhoton.position.x = -2.4 + progress * 4.6;
          quantumPhoton.position.y = 0.2 + progress * 0.6 + Math.sin(progress * Math.PI) * 0.4;
          quantumPhoton.position.z = 0.0 - progress * 0.6;
          quantumPhoton.material.color.setHex(0x00e5ff);
        }

        aliceNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.18);
      }
      // STAGE 4 & 5: Classical Pauli Bit Transmission & Bob Correction
      else if (stage === 4 || stage === 5) {
        eprPhoton1.visible = false;
        eprPhoton2.visible = false;
        quantumPhoton.visible = false;
        classicalBit.visible = true;
        pauliGate.visible = true;
        shieldRing.visible = false;

        // Classical bit: Alice -> Bob
        classicalBit.position.x = -2.4 + progress * 4.6;
        classicalBit.position.y = -0.1 + progress * 0.6;
        classicalBit.position.z = 0.0 - progress * 0.6;
        classicalBit.rotation.x += 0.06;
        classicalBit.rotation.y += 0.06;

        // Bob's Pauli Correction gate ring expands & spins
        pauliGate.rotation.x += 0.04;
        pauliGate.rotation.y += 0.05;
        const gateScale = 1.0 + (progress * 0.5);
        pauliGate.scale.set(gateScale, gateScale, gateScale);
      }
      // STAGE 6, 7 & 8: Verification & Threat Detection Sweep
      else {
        eprPhoton1.visible = false;
        eprPhoton2.visible = false;
        quantumPhoton.visible = false;
        classicalBit.visible = false;
        pauliGate.visible = false;
        shieldRing.visible = true;

        // Verification shield wave expanding
        const shieldScale = 1.0 + progress * 4.0;
        shieldRing.scale.set(shieldScale, shieldScale, shieldScale);
        shieldMat.opacity = Math.max(0, 0.8 - progress * 0.8);

        if (isCompromised && eveNode) {
          eveNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 6) * 0.25);
          scene.rotation.y = Math.sin(Date.now() * 0.002) * 0.15;
        } else {
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.1);
        }
      }

      // Gentle camera orbit
      scene.rotation.y = Math.sin(Date.now() * 0.0003) * 0.12;

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!container || isDisposed || !renderer) return;
      const w = container.clientWidth || 540;
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
  }, [isCompromised]);

  return (
    <div className="teleportation-widget">
      <div className="widget-header">
        <div>
          <span className="viz-badge">3D QUANTUM TELEPORTATION ENGINE</span>
          <h4>Alice → Bob → Charlie Optical Pipeline</h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-preset"
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸ Pause' : '▶ Auto Play'}
          </button>
          <span className={`pill-tag ${isCompromised ? 'pill-danger' : 'pill-green'}`}>
            {isCompromised ? '🚨 Channel Intercepted by Eve' : '🔒 Entangled Bell Pair Validated'}
          </span>
        </div>
      </div>

      {/* Live Stage Banner Overlay */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.4rem 0.8rem',
          background: 'rgba(0, 242, 254, 0.08)',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          borderRadius: '6px',
          marginBottom: '0.5rem',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 800 }}>
          ACTIVE STAGE {currentStage}/8: {STAGES[currentStage - 1]?.name}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          Click any stage below to inspect 3D flow
        </span>
      </div>

      <div ref={mountRef} className="teleportation-canvas-mount">
        {!webglSupported && (
          <div className="fallback-2d-teleport">
            <div className="node alice-node">Alice (Signer)</div>
            <div className={`quantum-bridge ${isCompromised ? 'compromised' : 'secure'}`}>
              ~~~~ Flying EPR Entanglement Channel ~~~~
            </div>
            <div className="node bob-node">Bob &amp; Charlie (Verifiers)</div>
          </div>
        )}
      </div>

      {/* Dynamic 8-Stage Timeline */}
      <div className="stages-timeline">
        {STAGES.map((s) => (
          <div
            key={s.id}
            className={`stage-step ${s.id === currentStage ? 'active' : s.id < currentStage ? 'passed' : ''}`}
            onClick={() => handleSelectStage(s.id)}
            title="Click to view stage animation"
          >
            <span className="step-num">{s.id}</span>
            <span className="step-name">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="stage-description">
        <strong>Stage {currentStage}: {STAGES[currentStage - 1]?.name || 'Protocol Verification'}</strong> — {STAGES[currentStage - 1]?.desc || ''}
      </div>
    </div>
  );
}
