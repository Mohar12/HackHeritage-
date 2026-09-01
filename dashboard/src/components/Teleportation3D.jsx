/**
 * Teleportation3D.jsx
 * ===================
 * 3D Visualization of the complete 8-stage Quantum Teleportation and QDS Verification Pipeline.
 * Visualizes Alice -> Flying EPR Channels -> Bob -> Charlie with Pauli corrections,
 * entanglement bridges, Bell measurements, classical channels, and detection status.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const STAGES = [
  { id: 1, name: 'EPR Pair Distribution', desc: 'Bell pair (|Φ⁺⟩) generated via H + CNOT on Aer simulator' },
  { id: 2, name: 'Message State Preparation', desc: 'Alice encodes signature state |ψ⟩' },
  { id: 3, name: 'Bell-State Measurement', desc: 'Alice measures joint state on Bell basis (q0, q1)' },
  { id: 4, name: 'Classical Bit Transmission', desc: 'Classical correction bits (c0, c1) sent over public channel' },
  { id: 5, name: 'Conditional Pauli Correction', desc: 'Bob/Charlie apply (X^c1 · Z^c0) to recover state' },
  { id: 6, name: 'Teleported State Verification', desc: 'Projective measurement in Alice declared bases' },
  { id: 7, name: 'Statistical Threat Detection', desc: 'QBER vs BB84 (0.11) & χ² Born rule validation' },
  { id: 8, name: 'Audit Ledger Hash-Chain', desc: 'Immutable post-quantum audit record committed' },
];

export default function Teleportation3D({ activeStage = 1, isCompromised = false }) {
  const mountRef = useRef(null);
  const [currentStage, setCurrentStage] = useState(activeStage);

  useEffect(() => {
    setCurrentStage(activeStage);
  }, [activeStage]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 3.5, 5.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Node geometries: Alice (Left), Bob (Right-Up), Charlie (Right-Down)
    const nodeMatAlice = new THREE.MeshPhongMaterial({ color: 0x00f2fe, emissive: 0x003344 });
    const nodeMatBob = new THREE.MeshPhongMaterial({ color: 0x00e676, emissive: 0x003322 });
    const nodeMatCharlie = new THREE.MeshPhongMaterial({ color: 0xffd600, emissive: 0x332b00 });
    const nodeMatEve = new THREE.MeshPhongMaterial({ color: 0xff1744, emissive: 0x440011 });

    const createNode = (mat, pos) => {
      const geo = new THREE.SphereGeometry(0.28, 24, 24);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      scene.add(mesh);
      return mesh;
    };

    const aliceNode = createNode(nodeMatAlice, [-2.0, 0, 0]);
    const bobNode = createNode(nodeMatBob, [1.8, 0.8, -0.6]);
    const charlieNode = createNode(nodeMatCharlie, [1.8, -0.8, 0.6]);
    const eveNode = isCompromised ? createNode(nodeMatEve, [0, 1.2, 0]) : null;

    // Channel lines
    const lineMatQuantum = new THREE.LineDashedMaterial({
      color: isCompromised ? 0xff1744 : 0x00f2fe,
      dashSize: 0.15,
      gapSize: 0.08,
      linewidth: 2,
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

    createChannel([-2.0, 0, 0], [1.8, 0.8, -0.6], lineMatQuantum);
    createChannel([-2.0, 0, 0], [1.8, -0.8, 0.6], lineMatQuantum);
    if (isCompromised) {
      createChannel([-2.0, 0, 0], [0, 1.2, 0], lineMatQuantum);
      createChannel([0, 1.2, 0], [1.8, 0.8, -0.6], lineMatQuantum);
    }

    // Flying Qubit particle
    const photonGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const photonMat = new THREE.MeshBasicMaterial({ color: isCompromised ? 0xff1744 : 0xffffff });
    const photon = new THREE.Mesh(photonGeo, photonMat);
    scene.add(photon);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.PointLight(0x00f2fe, 1.2, 10);
    light.position.set(0, 3, 2);
    scene.add(light);

    let progress = 0;
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      progress = (progress + 0.015) % 1.0;

      photon.position.x = -2.0 + progress * 3.8;
      photon.position.y = 0.0 + progress * 0.8 + (Math.sin(progress * Math.PI) * 0.3);
      photon.position.z = 0.0 - progress * 0.6;

      scene.rotation.y = Math.sin(Date.now() * 0.0005) * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 480;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isCompromised]);

  return (
    <div className="teleportation-widget">
      <div className="widget-header">
        <h4>3D Teleportation Protocol &amp; Verification Flow</h4>
        <span className={`pill-tag ${isCompromised ? 'pill-danger' : 'pill-green'}`}>
          {isCompromised ? '🚨 Channel Intercepted' : '🔒 Quantum Entanglement Secure'}
        </span>
      </div>

      <div ref={mountRef} className="teleportation-canvas-mount" />

      {/* Stage Flow Indicator */}
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
        <strong>Stage {currentStage}: {STAGES[currentStage - 1].name}</strong> — {STAGES[currentStage - 1].desc}
      </div>
    </div>
  );
}
