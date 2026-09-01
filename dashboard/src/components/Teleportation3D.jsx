/**
 * Teleportation3D.jsx
 * ===================
 * Complete 8-stage 3D Quantum Teleportation and QDS Verification Pipeline Visualizer:
 *  - Models Alice, Bob, and Charlie as quantum optical nodes with optical fiber links
 *  - Distinguishes Quantum Entanglement Beams (cyan/magenta) from Classical Pauli Bits (amber)
 *  - Interactive Bell-State Measurement (BSM) convergence and conditional Pauli correction gates (X^c1 · Z^c0)
 *  - Full WebGL context safety and 2D animated fallback.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const STAGES = [
  { id: 1, name: 'EPR Pair Distribution', desc: 'Bell pair (|Φ⁺⟩) generated via H + CNOT on Aer simulator' },
  { id: 2, name: 'Message State Preparation', desc: 'Alice encodes signature state |ψ⟩ = α|0⟩ + β|1⟩' },
  { id: 3, name: 'Bell-State Measurement (BSM)', desc: 'Alice measures joint state on Bell basis (q0, q1)' },
  { id: 4, name: 'Classical Bit Transmission', desc: 'Classical correction bits (c0, c1) sent over public channel' },
  { id: 5, name: 'Conditional Pauli Correction', desc: 'Bob/Charlie apply (X^c1 · Z^c0) to recover state' },
  { id: 6, name: 'Teleported State Verification', desc: 'Projective measurement in Alice declared bases' },
  { id: 7, name: 'Statistical Threat Detection', desc: 'QBER vs BB84 bound (0.11) & χ² Born test' },
  { id: 8, name: 'Immutable Audit Ledger Commit', desc: 'SHA-256 hash-chained post-quantum record committed' },
];

export default function Teleportation3D({ activeStage = 1, isCompromised = false }) {
  const mountRef = useRef(null);
  const [currentStage, setCurrentStage] = useState(activeStage);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    setCurrentStage(Math.max(1, Math.min(8, activeStage || 1)));
  }, [activeStage]);

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
    const height = 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 3.8, 5.8);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL initialization failed in Teleportation3D:', err);
      setWebglSupported(false);
      return;
    }

    // Node Materials
    const nodeMatAlice = new THREE.MeshPhongMaterial({ color: 0x00f2fe, emissive: 0x003344 });
    const nodeMatBob = new THREE.MeshPhongMaterial({ color: 0x00e676, emissive: 0x003322 });
    const nodeMatCharlie = new THREE.MeshPhongMaterial({ color: 0xffd600, emissive: 0x332b00 });
    const nodeMatEve = new THREE.MeshPhongMaterial({ color: 0xff1744, emissive: 0x440011 });

    const createNode = (mat, pos, label) => {
      const group = new THREE.Group();
      const geo = new THREE.SphereGeometry(0.32, 24, 24);
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      // Add a ring halo
      const ringGeo = new THREE.RingGeometry(0.38, 0.44, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: mat.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      group.position.set(...pos);
      scene.add(group);
      return group;
    };

    const aliceNode = createNode(nodeMatAlice, [-2.2, 0, 0], 'Alice');
    const bobNode = createNode(nodeMatBob, [2.0, 0.8, -0.6], 'Bob');
    const charlieNode = createNode(nodeMatCharlie, [2.0, -0.8, 0.6], 'Charlie');
    let eveNode = null;
    if (isCompromised) {
      eveNode = createNode(nodeMatEve, [0, 1.3, 0], 'Eve');
    }

    // Channels: Quantum Entanglement Beam (Cyan/Magenta) vs Classical Bits Channel (Amber)
    const lineMatQuantum = new THREE.LineDashedMaterial({
      color: isCompromised ? 0xff1744 : 0x00f2fe,
      dashSize: 0.18,
      gapSize: 0.08,
      linewidth: 2,
    });

    const lineMatClassical = new THREE.LineBasicMaterial({
      color: 0xffd600,
      transparent: true,
      opacity: 0.5,
    });

    const createChannel = (p1, p2, mat) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...p1),
        new THREE.Vector3(...p2),
      ]);
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      scene.add(line);
      return line;
    };

    createChannel([-2.2, 0, 0], [2.0, 0.8, -0.6], lineMatQuantum);
    createChannel([-2.2, 0, 0], [2.0, -0.8, 0.6], lineMatQuantum);
    createChannel([-2.2, -0.3, 0], [2.0, 0.5, -0.6], lineMatClassical); // Classical Pauli channel

    if (isCompromised) {
      createChannel([-2.2, 0, 0], [0, 1.3, 0], lineMatQuantum);
      createChannel([0, 1.3, 0], [2.0, 0.8, -0.6], lineMatQuantum);
    }

    // Flying Qubit particle
    const photonGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const photonMat = new THREE.MeshBasicMaterial({ color: isCompromised ? 0xff1744 : 0x00f2fe });
    const photon = new THREE.Mesh(photonGeo, photonMat);
    scene.add(photon);

    // Flying Classical Bit particle (Amber)
    const bitGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const bitMat = new THREE.MeshBasicMaterial({ color: 0xffd600 });
    const classicalBit = new THREE.Mesh(bitGeo, bitMat);
    scene.add(classicalBit);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.PointLight(0x00f2fe, 1.4, 10);
    light.position.set(0, 3, 2);
    scene.add(light);

    let progress = 0;
    let reqId;
    let isDisposed = false;

    const animate = () => {
      if (isDisposed) return;
      reqId = requestAnimationFrame(animate);
      progress = (progress + 0.015) % 1.0;

      // Animate Quantum Photon (Alice -> Bob)
      photon.position.x = -2.2 + progress * 4.2;
      photon.position.y = 0.0 + progress * 0.8 + (Math.sin(progress * Math.PI) * 0.35);
      photon.position.z = 0.0 - progress * 0.6;

      // Animate Classical Bit (delayed)
      const bitProgress = (progress + 0.5) % 1.0;
      classicalBit.position.x = -2.2 + bitProgress * 4.2;
      classicalBit.position.y = -0.3 + bitProgress * 0.8;
      classicalBit.position.z = 0.0 - bitProgress * 0.6;
      classicalBit.rotation.x += 0.05;
      classicalBit.rotation.y += 0.05;

      scene.rotation.y = Math.sin(Date.now() * 0.0004) * 0.18;
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
          <h4>Alice $\rightarrow$ Bob $\rightarrow$ Charlie Optical Pipeline</h4>
        </div>
        <span className={`pill-tag ${isCompromised ? 'pill-danger' : 'pill-green'}`}>
          {isCompromised ? '🚨 Channel Intercepted by Eve' : '🔒 Entangled Bell Pair Validated'}
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
            onClick={() => setCurrentStage(s.id)}
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
