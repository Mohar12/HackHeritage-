/**
 * Teleportation3D.jsx
 * ===================
 * Dynamic, Stage-Aware 3D Quantum Teleportation and QDS Visualizer:
 *  - Genuinely transforms 3D animations and particle streams across all 8 pipeline stages:
 *    Stage 1: Central EPR Source distributes twin entangled photons (|Φ⁺⟩) to Alice & Bob
 *    Stage 2: Alice encodes signature state |ψ⟩ into MUB eigenstate bases (preparation halo)
 *    Stage 3: Joint Bell-State Measurement (BSM) radial burst at Alice's detector
 *    Stage 4: Classical channel transmits Pauli correction bits (c0, c1) from Alice to Bob
 *    Stage 5: Bob applies conditional (X^c1 · Z^c0) unitary operators via dynamic Pauli gate ring
 *    Stage 6: Teleported state sifting sweep matching projective measurement bases
 *    Stage 7: Statistical threat detection:
 *             - SAFE: Emerald green verification wave expands cleanly across channel
 *             - COMPROMISED: Channel glitches, flashes crimson red with alert strobe
 *    Stage 8: Immutable audit ledger commit:
 *             - SAFE: Glowing emerald cryptographic hash seal
 *             - COMPROMISED: Crimson abort quarantine lock
 *  - Auto Play continuously cycles through all 8 stages with real particle motion.
 *  - Manual stage selection smoothly animates the chosen stage.
 */

import React, { useEffect, useRef, useState, memo } from 'react';
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

function Teleportation3DComponent({
  activeStage = 1,
  isCompromised = false,
  mode = 'attack',
  onStageChange,
  cinematic = false,
  height: customHeight,
}) {
  const mountRef = useRef(null);
  const [currentStage, setCurrentStage] = useState(activeStage);
  const [isPlaying, setIsPlaying] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  const stageRef = useRef(activeStage);
  const isPlayingRef = useRef(isPlaying);
  const isCompromisedRef = useRef(isCompromised);
  const modeRef = useRef(mode);
  const progressRef = useRef(0.0);

  // Synchronize stageRef whenever activeStage prop changes
  useEffect(() => {
    const s = Math.max(1, Math.min(8, activeStage || 1));
    setCurrentStage(s);
    stageRef.current = s;
    progressRef.current = 0.0;
  }, [activeStage]);

  // Auto-play animation cycle (advances every 1.8s)
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStage((prev) => {
        const next = prev >= 8 ? 1 : prev + 1;
        stageRef.current = next;
        progressRef.current = 0.0;
        if (onStageChange) onStageChange(next);
        return next;
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [isPlaying, onStageChange]);

  useEffect(() => {
    isCompromisedRef.current = isCompromised;
  }, [isCompromised]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  function handleSelectStage(stageId) {
    setCurrentStage(stageId);
    stageRef.current = stageId;
    progressRef.current = 0.0;
    if (onStageChange) onStageChange(stageId);
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
    const height = customHeight || (cinematic ? 460 : 270);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 3.6, 6.2);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL init failed:', err);
      setWebglSupported(false);
      return;
    }

    // Laboratory Quantum Optics Materials
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

    const createNode = (mat, pos, radius = 0.28) => {
      const group = new THREE.Group();

      // Precision Anodized Aluminum Mount
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = -radius - 0.25;
      group.add(post);

      // Optics Housing
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
      group.lensMesh = lens;

      // Alignment Reticle Ring
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

    const aliceNode = createNode(matAlice, [-2.4, 0.2, 0]);
    const bobNode = createNode(matBob, [2.2, 0.8, -0.6]);
    const charlieNode = createNode(matCharlie, [2.2, -0.8, 0.6]);
    const eprNode = createNode(matEPR, [0, -1.1, 0], 0.24);

    // High-Resolution Canvas Text Sprite Label Generator
    const createTextSprite = (initialText, initialColor = '#ffffff', fontSize = 30) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      let currentText = initialText;
      let currentColor = initialColor;

      const renderCanvas = (txt, clr, bg = 'rgba(5, 8, 16, 0.94)', borderClr = clr) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // High-contrast HUD pill
        ctx.fillStyle = bg;
        ctx.strokeStyle = borderClr;
        ctx.lineWidth = 5;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(14, 16, canvas.width - 28, canvas.height - 32, 24);
        } else {
          ctx.rect(14, 16, canvas.width - 28, canvas.height - 32);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Outfit", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = clr;
        ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
      };

      renderCanvas(initialText, initialColor);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.55, 0.38, 1);

      sprite.updateText = (newText, newColor, newBg, newBorder) => {
        if (newText === currentText && newColor === currentColor && !newBg) return;
        currentText = newText;
        currentColor = newColor;
        renderCanvas(newText, newColor, newBg, newBorder);
        texture.needsUpdate = true;
      };
      return sprite;
    };

    // In-Scene Character Role Labels (Positioned cleanly above optics apertures)
    const labelAlice = createTextSprite('ALICE (Signer)', '#c084fc');
    labelAlice.position.set(-2.4, 0.72, 0);
    scene.add(labelAlice);

    const labelBob = createTextSprite('BOB (Verifier)', '#818cf8');
    labelBob.position.set(2.2, 1.35, -0.6);
    scene.add(labelBob);

    const labelCharlie = createTextSprite('CHARLIE (Witness)', '#d8b4fe');
    labelCharlie.position.set(2.2, -0.28, 0.6);
    scene.add(labelCharlie);

    const labelEPR = createTextSprite('EPR SOURCE (|Φ⁺⟩)', '#a855f7', 28);
    labelEPR.position.set(0, -0.65, 0);
    scene.add(labelEPR);

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

    // Primary Quantum Channel (Alice -> Bob): Multi-segment for physical in-transit noise jitter
    const NUM_CHANNEL_SEGMENTS = 16;
    const pAlice = new THREE.Vector3(-2.4, 0.2, 0);
    const pBob = new THREE.Vector3(2.2, 0.8, -0.6);
    const lineQuantumGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array((NUM_CHANNEL_SEGMENTS + 1) * 3);
    for (let i = 0; i <= NUM_CHANNEL_SEGMENTS; i++) {
      const t = i / NUM_CHANNEL_SEGMENTS;
      linePositions[i * 3] = pAlice.x + t * (pBob.x - pAlice.x);
      linePositions[i * 3 + 1] = pAlice.y + t * (pBob.y - pAlice.y);
      linePositions[i * 3 + 2] = pAlice.z + t * (pBob.z - pAlice.z);
    }
    lineQuantumGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineQuantumMat = new THREE.LineDashedMaterial({
      color: 0x00e5ff,
      dashSize: 0.18,
      gapSize: 0.09,
      linewidth: 2,
      transparent: true,
      opacity: 0.55,
    });
    const lineQuantum = new THREE.Line(lineQuantumGeo, lineQuantumMat);
    lineQuantum.computeLineDistances();
    scene.add(lineQuantum);

    // Classical Pauli Correction Channel (Alice -> Bob)
    const lineClassical = createChannel([-2.4, -0.1, 0], [2.2, 0.5, -0.6], 0xf59e0b, false);
    // EPR Entanglement Distribution Channels
    const lineEPRtoAlice = createChannel([0, -1.1, 0], [-2.4, 0.2, 0], 0x0284c7, true);
    const lineEPRtoBob = createChannel([0, -1.1, 0], [2.2, 0.8, -0.6], 0x0284c7, true);

    // Eve Wiretap Apparatus (For Attack Lab Mode)
    const eveGroup = new THREE.Group();
    const eveNode = createNode(matEve, [0, 1.2, 0], 0.32);
    eveGroup.add(eveNode);
    const clampGeo = new THREE.BoxGeometry(0.5, 0.25, 0.4);
    const clampMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
    const clamp = new THREE.Mesh(clampGeo, clampMat);
    clamp.position.set(0, 1.05, 0);
    eveGroup.add(clamp);
    const eveBeam1 = createChannel([-2.4, 0.2, 0], [0, 1.2, 0], 0xf43f5e, true);
    const eveBeam2 = createChannel([0, 1.2, 0], [2.2, 0.8, -0.6], 0xf43f5e, true);
    eveGroup.add(eveBeam1);
    eveGroup.add(eveBeam2);
    eveGroup.visible = false;
    scene.add(eveGroup);

    // --- STAGE-SPECIFIC 3D OBJECTS ---

    // STAGE 1: Twin Entangled EPR Photons
    const eprPhoton1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    const eprPhoton2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe })
    );
    scene.add(eprPhoton1);
    scene.add(eprPhoton2);

    // STAGE 2: Alice Message State Preparation (|ψ⟩)
    const prepPhoton = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe })
    );
    const prepHaloGeo = new THREE.RingGeometry(0.2, 0.38, 32);
    const prepHaloMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const prepHalo = new THREE.Mesh(prepHaloGeo, prepHaloMat);
    prepHalo.rotation.x = Math.PI / 2;
    scene.add(prepPhoton);
    scene.add(prepHalo);

    // STAGE 3: Bell-State Measurement (BSM) Flash & Dual Projection
    const bsmFlashGeo = new THREE.RingGeometry(0.1, 0.45, 32);
    const bsmFlashMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const bsmFlashRing = new THREE.Mesh(bsmFlashGeo, bsmFlashMat);
    bsmFlashRing.position.set(-2.4, 0.2, 0);
    bsmFlashRing.rotation.x = Math.PI / 2;
    const bsmPhoton1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    const bsmPhoton2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe })
    );
    scene.add(bsmFlashRing);
    scene.add(bsmPhoton1);
    scene.add(bsmPhoton2);

    // STAGE 4: Classical Bit Packets (c0, c1)
    const classicalBit1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.11, 0.11),
      new THREE.MeshBasicMaterial({ color: 0xffd600 })
    );
    const classicalBit2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.11, 0.11),
      new THREE.MeshBasicMaterial({ color: 0xffa000 })
    );
    scene.add(classicalBit1);
    scene.add(classicalBit2);

    // STAGE 5: Bob's Pauli Correction Unitary Gate (X^c1 · Z^c0)
    const pauliGateGeo = new THREE.TorusGeometry(0.46, 0.035, 16, 32);
    const pauliGateMat = new THREE.MeshBasicMaterial({ color: 0x00e676, wireframe: true });
    const pauliGate = new THREE.Mesh(pauliGateGeo, pauliGateMat);
    pauliGate.position.set(2.2, 0.8, -0.6);
    scene.add(pauliGate);

    // STAGE 6: Teleported State Sifting Photon
    const siftingPhoton = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    scene.add(siftingPhoton);

    // STAGE 7: Threat Detection Sweeps (Safe Shield vs Compromised Glitch at Bob's Verifier Node)
    const shieldGeo = new THREE.RingGeometry(0.1, 0.22, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    shieldRing.position.set(2.2, 0.8, -0.6);
    shieldRing.rotation.y = -Math.PI / 4;
    scene.add(shieldRing);

    const alertRingGeo = new THREE.RingGeometry(0.15, 0.35, 32);
    const alertRingMat = new THREE.MeshBasicMaterial({
      color: 0xff1744,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const threatAlertRing = new THREE.Mesh(alertRingGeo, alertRingMat);
    threatAlertRing.position.set(2.2, 0.8, -0.6);
    threatAlertRing.rotation.y = -Math.PI / 4;
    scene.add(threatAlertRing);

    // STAGE 8: Immutable Audit Ledger Commit (Anchored Directly Above Bob, the Verifier)
    const ledgerGroup = new THREE.Group();
    const ledgerBlockGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const ledgerBlockMat = new THREE.MeshStandardMaterial({
      color: 0x00e676,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: false,
    });
    const ledgerBlock = new THREE.Mesh(ledgerBlockGeo, ledgerBlockMat);
    ledgerGroup.add(ledgerBlock);

    const ledgerRingGeo = new THREE.TorusGeometry(0.34, 0.025, 16, 32);
    const ledgerRingMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, wireframe: true });
    const ledgerRing = new THREE.Mesh(ledgerRingGeo, ledgerRingMat);
    ledgerRing.rotation.x = Math.PI / 2;
    ledgerGroup.add(ledgerRing);
    // Positioned directly above Bob's node [2.2, 0.8, -0.6], NOT floating at (0, -0.25, 0.6)
    ledgerGroup.position.set(2.2, 1.45, -0.6);
    scene.add(ledgerGroup);

    // Dynamic Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const mainLight = new THREE.PointLight(0x00f2fe, 1.8, 12);
    mainLight.position.set(0, 3, 2);
    scene.add(mainLight);

    // Threat Alert Strobe focused specifically at Bob's verifier aperture
    const threatAlertLight = new THREE.PointLight(0xff1744, 0, 10);
    threatAlertLight.position.set(2.2, 1.2, -0.6);
    scene.add(threatAlertLight);

    let reqId = null;
    let isDisposed = false;
    let isVisible = true;

    // Primary 60FPS Render & Physical Animation Loop
    const animate = () => {
      if (isDisposed) return;
      if (!isVisible) {
        reqId = null;
        return; // Suspend rAF loop when off-screen
      }
      reqId = requestAnimationFrame(animate);

      const stage = stageRef.current || 1;
      const isCompromisedNow = isCompromisedRef.current;
      const isHonestMode = modeRef.current === 'honest';

      // Advance dynamic progress smoothly
      progressRef.current = (progressRef.current + 0.012) % 1.0;
      const progress = progressRef.current;

      // Base idle rotations
      if (aliceNode?.ringMesh) aliceNode.ringMesh.rotation.z += 0.02;
      if (bobNode?.ringMesh) bobNode.ringMesh.rotation.z += 0.02;
      if (charlieNode?.ringMesh) charlieNode.ringMesh.rotation.z += 0.02;
      if (eprNode?.ringMesh) eprNode.ringMesh.rotation.z += 0.03;

      // Attack Lab Eve Wiretap Visibility
      if (!isHonestMode && isCompromisedNow) {
        eveGroup.visible = true;
      } else {
        eveGroup.visible = false;
      }

      // Hide all stage-specific items initially each frame
      eprPhoton1.visible = false;
      eprPhoton2.visible = false;
      prepPhoton.visible = false;
      prepHalo.visible = false;
      bsmFlashRing.visible = false;
      bsmPhoton1.visible = false;
      bsmPhoton2.visible = false;
      classicalBit1.visible = false;
      classicalBit2.visible = false;
      pauliGate.visible = false;
      siftingPhoton.visible = false;
      shieldRing.visible = false;
      threatAlertRing.visible = false;
      ledgerGroup.visible = false;
      threatAlertLight.intensity = 0;

      // ==========================================
      // Quantum Channel Animation (Alice -> Bob)
      // Cause and effect: If channel is noisy/compromised, animate real-time vertex jitter and degraded red warning
      // ==========================================
      const posAttr = lineQuantumGeo.attributes.position;
      const nowTime = Date.now() * 0.005;
      for (let i = 0; i <= NUM_CHANNEL_SEGMENTS; i++) {
        const t = i / NUM_CHANNEL_SEGMENTS;
        const x0 = pAlice.x + t * (pBob.x - pAlice.x);
        const y0 = pAlice.y + t * (pBob.y - pAlice.y);
        const z0 = pAlice.z + t * (pBob.z - pAlice.z);

        if (isCompromisedNow) {
          // Bell-curve envelope: 0 at node anchors, maximum in transit
          const env = Math.sin(t * Math.PI);
          const jX = Math.sin(i * 1.7 + nowTime * 6.0) * 0.04 * env;
          const jY = Math.cos(i * 2.1 + nowTime * 7.5) * 0.06 * env;
          const jZ = Math.sin(i * 1.3 + nowTime * 5.5) * 0.04 * env;
          posAttr.setXYZ(i, x0 + jX, y0 + jY, z0 + jZ);
        } else {
          posAttr.setXYZ(i, x0, y0, z0);
        }
      }
      posAttr.needsUpdate = true;
      lineQuantum.computeLineDistances();

      // Optical beam degradation visual treatment
      if (isCompromisedNow) {
        const flicker = Math.sin(Date.now() * 0.035) > -0.15;
        lineQuantum.material.color.setHex(flicker ? 0xff1744 : 0xf43f5e);
        lineQuantum.material.opacity = flicker ? 0.85 : 0.25;
      } else {
        lineQuantum.material.color.setHex(0x00e5ff);
        lineQuantum.material.opacity = 0.55;
      }

      // Neutral role maintenance for Charlie (Witness) & Alice (Signer)
      if (charlieNode?.lensMesh) charlieNode.lensMesh.material.color.setHex(0xd8b4fe);
      if (charlieNode?.ringMesh) charlieNode.ringMesh.material.color.setHex(0xd8b4fe);
      if (aliceNode?.lensMesh) aliceNode.lensMesh.material.color.setHex(0xc084fc);
      if (aliceNode?.ringMesh) aliceNode.ringMesh.material.color.setHex(0xc084fc);

      // ==========================================
      // STAGE 1: EPR Pair Distribution
      // ==========================================
      if (stage === 1) {
        eprPhoton1.visible = true;
        eprPhoton2.visible = true;

        // EPR Photon 1: [0, -1.1, 0] -> Alice [-2.4, 0.2, 0]
        eprPhoton1.position.x = 0 + progress * (-2.4);
        eprPhoton1.position.y = -1.1 + progress * 1.3;
        eprPhoton1.position.z = 0;

        // EPR Photon 2: [0, -1.1, 0] -> Bob [2.2, 0.8, -0.6]
        eprPhoton2.position.x = 0 + progress * 2.2;
        eprPhoton2.position.y = -1.1 + progress * 1.9;
        eprPhoton2.position.z = 0 + progress * (-0.6);

        eprNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 4) * 0.18);
      }

      // ==========================================
      // STAGE 2: Message State Preparation (|ψ⟩)
      // ==========================================
      else if (stage === 2) {
        prepPhoton.visible = true;
        prepHalo.visible = true;

        // Pulsing preparation packet at Alice's aperture
        prepPhoton.position.set(-2.4, 0.2 + Math.sin(progress * Math.PI * 4) * 0.12 + 0.35, 0);
        prepHalo.position.set(-2.4, 0.55, 0);
        prepHalo.scale.setScalar(0.7 + Math.sin(progress * Math.PI * 2) * 0.4);
        prepHalo.rotation.z += 0.06;

        if (aliceNode?.ringMesh) aliceNode.ringMesh.rotation.z += 0.08;
        aliceNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.12);
      }

      // ==========================================
      // STAGE 3: Bell-State Measurement (BSM)
      // ==========================================
      else if (stage === 3) {
        bsmFlashRing.visible = true;
        bsmPhoton1.visible = true;
        bsmPhoton2.visible = true;

        // Two photons converge into joint Alice BSM detector
        const conv = Math.min(1.0, progress * 1.4);
        bsmPhoton1.position.set(-2.4, 0.6 - conv * 0.38, 0);
        bsmPhoton2.position.set(-2.4, -0.15 + conv * 0.37, 0);

        // Flash expands as particles merge
        const flashScale = 0.2 + progress * 2.6;
        bsmFlashRing.scale.set(flashScale, flashScale, flashScale);
        bsmFlashMat.opacity = Math.max(0, 0.95 - progress * 0.9);

        aliceNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 4) * 0.16);
      }

      // ==========================================
      // STAGE 4: Classical Bit Transmission (c0, c1)
      // ==========================================
      else if (stage === 4) {
        classicalBit1.visible = true;
        classicalBit2.visible = true;

        if (isCompromisedNow) {
          classicalBit1.material.color.setHex(0xff1744);
          classicalBit2.material.color.setHex(0xf59e0b);
        } else {
          classicalBit1.material.color.setHex(0xffd600);
          classicalBit2.material.color.setHex(0xffa000);
        }

        // Packet 1: Alice -> Bob
        const bitJitterY = isCompromisedNow ? Math.sin(progress * Math.PI * 12) * 0.05 : 0;
        classicalBit1.position.x = -2.4 + progress * 4.6;
        classicalBit1.position.y = -0.1 + progress * 0.6 + bitJitterY;
        classicalBit1.position.z = 0.0 - progress * 0.6;
        classicalBit1.rotation.x += 0.08;
        classicalBit1.rotation.y += 0.06;

        // Packet 2: Follows behind
        const prog2 = Math.max(0, (progress - 0.18 + 1.0) % 1.0);
        classicalBit2.position.x = -2.4 + prog2 * 4.6;
        classicalBit2.position.y = -0.1 + prog2 * 0.6 - bitJitterY;
        classicalBit2.position.z = 0.0 - prog2 * 0.6;
        classicalBit2.rotation.x -= 0.06;
        classicalBit2.rotation.z += 0.08;
      }

      // ==========================================
      // STAGE 5: Conditional Pauli Correction (X^c1 · Z^c0)
      // ==========================================
      else if (stage === 5) {
        pauliGate.visible = true;

        // Dynamic 3-axis unitary Pauli operator rotation
        pauliGate.rotation.x += 0.07;
        pauliGate.rotation.y += 0.09;
        pauliGate.rotation.z += 0.05;

        const gateScale = 1.0 + Math.sin(progress * Math.PI * 2) * 0.35;
        pauliGate.scale.set(gateScale, gateScale, gateScale);
        bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 4) * 0.14);
      }

      // ==========================================
      // STAGE 6: Teleported State Sifting
      // ==========================================
      else if (stage === 6) {
        siftingPhoton.visible = true;

        if (isCompromisedNow) {
          siftingPhoton.material.color.setHex(0xff1744);
        } else {
          siftingPhoton.material.color.setHex(0x00e5ff);
        }

        // Sifting scan traversing Alice declared bases to Bob
        const siftingParam = Math.sin(progress * Math.PI);
        const siftingJitter = isCompromisedNow ? (Math.sin(progress * Math.PI * 16) * 0.04) : 0;
        siftingPhoton.position.x = -2.4 + siftingParam * 4.6;
        siftingPhoton.position.y = 0.2 + siftingParam * 0.6 + siftingJitter;
        siftingPhoton.position.z = 0.0 - siftingParam * 0.6;

        aliceNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.1);
        bobNode.scale.setScalar(1.0 + Math.cos(progress * Math.PI * 2) * 0.1);
      }

      // ==========================================
      // STAGE 7: Statistical Threat Detection (AT BOB'S VERIFIER NODE)
      // ==========================================
      else if (stage === 7) {
        if (!isCompromisedNow) {
          // SAFE: Calm expanding emerald green security shield anchored to Bob
          shieldRing.visible = true;
          const shieldScale = 1.0 + progress * 4.2;
          shieldRing.scale.set(shieldScale, shieldScale, shieldScale);
          shieldMat.opacity = Math.max(0, 0.85 - progress * 0.8);
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.12);

          if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0x00e676);
          if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0x818cf8);
          labelBob.updateText('BOB: VERIFIED (QBER < 11%)', '#00e676', 'rgba(7, 11, 20, 0.90)', '#00e676');
        } else {
          // COMPROMISED: Threat alert ring expanding specifically from Bob's position [2.2, 0.8, -0.6]
          threatAlertRing.visible = true;
          const alertScale = 0.6 + progress * 4.8;
          threatAlertRing.scale.set(alertScale, alertScale, alertScale);
          alertRingMat.opacity = Math.max(0, 1.0 - progress * 0.9);

          const glitch = Math.sin(Date.now() * 0.04) > 0;
          threatAlertLight.intensity = glitch ? 4.2 : 0.8;

          // Bob node specifically pulses and flashes crimson red (the entity issuing the abort)
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 8) * 0.22);
          if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0xff1744);
          if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0xff1744);
          labelBob.updateText('🚨 BOB: ABORT (QBER > Limit)', '#ff1744', 'rgba(35, 0, 8, 0.94)', '#ff1744');
        }
      }

      // ==========================================
      // STAGE 8: Immutable Audit Ledger Commit (ANCHORED TO BOB'S VERIFIER NODE)
      // ==========================================
      else if (stage === 8) {
        ledgerGroup.visible = true;

        if (!isCompromisedNow) {
          // SAFE: Emerald green cryptographic commit anchored above Bob
          ledgerBlockMat.color.setHex(0x00e676);
          ledgerRingMat.color.setHex(0x00f2fe);
          ledgerRing.rotation.y += 0.04;
          ledgerRing.rotation.x = Math.PI / 2;
          ledgerGroup.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.08);
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.08);

          if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0x00e676);
          if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0x818cf8);
          labelBob.updateText('BOB: LEDGER COMMITTED', '#00e676', 'rgba(7, 11, 20, 0.90)', '#00e676');
        } else {
          // COMPROMISED: Crimson red abort quarantine block anchored directly above Bob
          ledgerBlockMat.color.setHex(0xff1744);
          ledgerRingMat.color.setHex(0xff1744);
          ledgerRing.rotation.z += 0.08;
          ledgerGroup.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 6) * 0.14);
          threatAlertLight.intensity = 2.4;

          // Bob node locked in red abort state
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 4) * 0.14);
          if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0xff1744);
          if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0xff1744);
          labelBob.updateText('🚨 BOB: QUARANTINE ABORT', '#ff1744', 'rgba(35, 0, 8, 0.94)', '#ff1744');
        }
      }

      // Default label & node colors for Bob when in stages 1-6
      if (stage < 7) {
        if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0x818cf8);
        if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0x818cf8);
        if (isCompromisedNow) {
          labelBob.updateText('BOB (Verifier · ALERT)', '#f43f5e', 'rgba(25, 5, 12, 0.88)', '#f43f5e');
        } else {
          labelBob.updateText('BOB (Verifier)', '#818cf8', 'rgba(7, 11, 20, 0.88)', '#818cf8');
        }
      }

      // Subtle camera orbit for laboratory depth
      scene.rotation.y = Math.sin(Date.now() * 0.0003) * 0.12;

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    // IntersectionObserver to pause loop when scrolled out of view
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = Boolean(entry && entry.isIntersecting);
        if (isVisible && !isDisposed && !reqId) {
          animate();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

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
      observer.disconnect();
      if (reqId) cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);

      // Deep GPU Resource Disposal
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
          }
        }
      });

      if (renderer) {
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, []);

  const isHonest = mode === 'honest';

  if (cinematic) {
    return (
      <div className="teleportation-widget is-cinematic">
        <div ref={mountRef} className="teleportation-canvas-mount cinematic-mount">
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
      </div>
    );
  }

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
            {isCompromised
              ? (isHonest ? '🚨 Noise Limit Exceeded (ABORT)' : '🚨 Channel Intercepted by Eve')
              : '🔒 Entangled Bell Pair Validated'}
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
        <strong>Stage {currentStage}: {STAGES[currentStage - 1]?.name || 'Protocol Verification'}</strong> · {STAGES[currentStage - 1]?.desc || ''}
      </div>
    </div>
  );
}

export default memo(Teleportation3DComponent);
