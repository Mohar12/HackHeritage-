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
    const height = customHeight || (cinematic ? 540 : 270);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 3.2, 5.8);
    camera.lookAt(0, -0.1, 0);

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

    // Laboratory Quantum Optics Materials with Distinct Signature Colors
    const matAlice = new THREE.MeshStandardMaterial({ color: 0x00f2fe, metalness: 0.82, roughness: 0.22 }); // Electric Cyan
    const matBob = new THREE.MeshStandardMaterial({ color: 0x00e676, metalness: 0.82, roughness: 0.22 }); // Neon Emerald
    const matCharlie = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.82, roughness: 0.22 }); // Solar Amber
    const matEPR = new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.82, roughness: 0.22 }); // Quantum Violet
    const matEve = new THREE.MeshStandardMaterial({ color: 0xff1744, metalness: 0.85, roughness: 0.25 }); // Crimson Red

    // Precision Circular Quantum Optical Bench (Centered vertically in stage)
    const benchGroup = new THREE.Group();
    const tableTopY = -1.14;

    // Solid dark titanium breadboard base
    const benchGeo = new THREE.CylinderGeometry(3.65, 3.8, 0.14, 64);
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0x060a14,
      metalness: 0.9,
      roughness: 0.28,
    });
    const benchMesh = new THREE.Mesh(benchGeo, benchMat);
    benchMesh.position.y = tableTopY - 0.07;
    benchGroup.add(benchMesh);

    // Beveled outer ring with subtle cyan accent
    const rimGeo = new THREE.TorusGeometry(3.66, 0.035, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.2,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = tableTopY;
    benchGroup.add(rimMesh);

    // Holographic concentric alignment metric rings on bench surface
    const createBenchRing = (r, colorHex, opacity) => {
      const geo = new THREE.RingGeometry(r - 0.015, r + 0.015, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: opacity,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = tableTopY + 0.003;
      benchGroup.add(ring);
      return ring;
    };
    createBenchRing(1.1, 0x00f2fe, 0.22);
    createBenchRing(2.1, 0x38bdf8, 0.16);
    createBenchRing(3.1, 0x818cf8, 0.24);

    // High-precision optical breadboard grid
    const holeGrid = new THREE.GridHelper(5.8, 28, 0x00f2fe, 0x0f1c38);
    holeGrid.position.y = tableTopY + 0.004;
    if (holeGrid.material) {
      holeGrid.material.transparent = true;
      holeGrid.material.opacity = 0.32;
    }
    benchGroup.add(holeGrid);
    scene.add(benchGroup);

    // Node Factory Helper
    const createNode = (mat, pos, radius = 0.28, signatureColor = 0x00f2fe) => {
      const group = new THREE.Group();
      const postHeight = Math.max(0.1, pos[1] - tableTopY - radius * 0.45);

      // Precision Anodized Aluminum Mount anchored to the breadboard
      const postGeo = new THREE.CylinderGeometry(0.05, 0.06, postHeight, 16);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.25 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = -radius * 0.45 - postHeight / 2;
      group.add(post);

      // Base collar clamp
      const collarGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.04, 16);
      const collarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.y = -radius * 0.45 - postHeight + 0.02;
      group.add(collar);

      // Optics Housing
      const housingGeo = new THREE.CylinderGeometry(radius, radius * 1.12, radius * 0.85, 16);
      const housingMat = new THREE.MeshStandardMaterial({ color: 0x0b1329, metalness: 0.85, roughness: 0.3 });
      const housing = new THREE.Mesh(housingGeo, housingMat);
      group.add(housing);

      // Laser Aperture Glass Lens (emissive glow with signature color)
      const lensGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, 0.06, 24);
      const lensMat = new THREE.MeshStandardMaterial({
        color: signatureColor,
        emissive: signatureColor,
        emissiveIntensity: 0.45,
        metalness: 0.2,
        roughness: 0.1,
      });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.y = radius * 0.44;
      group.add(lens);
      group.lensMesh = lens;

      // Alignment Reticle Ring
      const ringGeo = new THREE.RingGeometry(radius * 1.18, radius * 1.42, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: signatureColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      group.ringMesh = ring;

      group.position.set(...pos);
      scene.add(group);
      return group;
    };

    // Four distinct quantum network nodes
    const aliceNode = createNode(matAlice, [-2.4, 0.2, 0], 0.28, 0x00f2fe);
    const bobNode = createNode(matBob, [2.2, 0.8, -0.6], 0.28, 0x00e676);
    const charlieNode = createNode(matCharlie, [2.2, -0.55, 0.6], 0.28, 0xf59e0b);
    const eprNode = createNode(matEPR, [0, -0.55, 0], 0.24, 0xa855f7);

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

    // In-Scene Character Role Labels matching node signature colors
    const labelAlice = createTextSprite('ALICE (Signer)', '#00f2fe');
    labelAlice.position.set(-2.4, 0.76, 0);
    scene.add(labelAlice);

    const labelBob = createTextSprite('BOB (Verifier)', '#00e676');
    labelBob.position.set(2.2, 1.38, -0.6);
    scene.add(labelBob);

    const labelCharlie = createTextSprite('CHARLIE (Witness)', '#f59e0b');
    labelCharlie.position.set(2.2, -0.05, 0.6);
    scene.add(labelCharlie);

    const labelEPR = createTextSprite('EPR SOURCE (|Φ⁺⟩)', '#a855f7', 28);
    labelEPR.position.set(0, -0.08, 0);
    scene.add(labelEPR);

    // 3D Volumetric Sinusoidal Waveguide Geometry Generator
    const buildWavyTubeGeometry = (p1, p2, waveCount = 6, amplitude = 0.08, radius = 0.018, segments = 60, radialSegments = 8) => {
      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);
      const dir = new THREE.Vector3().subVectors(v2, v1);
      dir.normalize();

      // Compute orthonormal frame: normal tilted ~30 deg for optimal 3D perspective
      const up = new THREE.Vector3(0, 1, 0);
      let horizontalNormal = new THREE.Vector3().crossVectors(dir, up);
      if (horizontalNormal.lengthSq() < 0.001) {
        horizontalNormal = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1));
      }
      horizontalNormal.normalize();

      const normal = new THREE.Vector3()
        .addScaledVector(horizontalNormal, 0.85)
        .addScaledVector(up, 0.35)
        .normalize();
      const binormal = new THREE.Vector3().crossVectors(dir, normal).normalize();

      const numRings = segments + 1;
      const numRadial = radialSegments + 1;
      const positions = new Float32Array(numRings * numRadial * 3);
      const indices = [];

      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < radialSegments; j++) {
          const a = i * numRadial + j;
          const b = (i + 1) * numRadial + j;
          const c = (i + 1) * numRadial + (j + 1);
          const d = i * numRadial + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(indices);

      geometry.updateWave = (phase) => {
        const pos = geometry.attributes.position.array;
        let ptr = 0;
        for (let i = 0; i <= segments; i++) {
          const s = i / segments;
          // Smooth sine envelope: 0 at nodes, maximum in center
          const env = Math.sin(s * Math.PI);
          const wave = Math.sin(s * Math.PI * 2 * waveCount - phase) * amplitude * env;

          const cx = v1.x + s * (v2.x - v1.x) + normal.x * wave;
          const cy = v1.y + s * (v2.y - v1.y) + normal.y * wave;
          const cz = v1.z + s * (v2.z - v1.z) + normal.z * wave;

          for (let j = 0; j <= radialSegments; j++) {
            const theta = (j / radialSegments) * Math.PI * 2;
            const cosT = Math.cos(theta) * radius;
            const sinT = Math.sin(theta) * radius;

            pos[ptr++] = cx + normal.x * cosT + binormal.x * sinT;
            pos[ptr++] = cy + normal.y * cosT + binormal.y * sinT;
            pos[ptr++] = cz + normal.z * cosT + binormal.z * sinT;
          }
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
      };

      geometry.updateWave(0);
      return { geometry, v1, v2, normal, waveCount, amplitude };
    };

    // Helper to construct a complete wavy waveguide (emissive core + translucent sheath)
    const createWavyWaveguide = (p1, p2, colorHex, waveCount = 6, amplitude = 0.08, coreRadius = 0.018, sheathRadius = 0.038) => {
      const group = new THREE.Group();

      const coreObj = buildWavyTubeGeometry(p1, p2, waveCount, amplitude, coreRadius, 60, 8);
      const coreMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.92,
      });
      const coreMesh = new THREE.Mesh(coreObj.geometry, coreMat);
      group.add(coreMesh);

      const sheathObj = buildWavyTubeGeometry(p1, p2, waveCount, amplitude, sheathRadius, 60, 8);
      const sheathMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
      const sheathMesh = new THREE.Mesh(sheathObj.geometry, sheathMat);
      group.add(sheathMesh);

      scene.add(group);

      return {
        group,
        coreMesh,
        coreMat,
        sheathMesh,
        sheathMat,
        update: (phase) => {
          coreObj.geometry.updateWave(phase);
          sheathObj.geometry.updateWave(phase);
        },
        getPointAt: (t, phase = 0) => {
          const s = Math.max(0, Math.min(1, t));
          const env = Math.sin(s * Math.PI);
          const wave = Math.sin(s * Math.PI * 2 * waveCount - phase) * amplitude * env;
          return new THREE.Vector3(
            coreObj.v1.x + s * (coreObj.v2.x - coreObj.v1.x) + coreObj.normal.x * wave,
            coreObj.v1.y + s * (coreObj.v2.y - coreObj.v1.y) + coreObj.normal.y * wave,
            coreObj.v1.z + s * (coreObj.v2.z - coreObj.v1.z) + coreObj.normal.z * wave
          );
        }
      };
    };

    // Primary 3D Volumetric Sinusoidal Waveguides (Wave-like carrier links)
    const waveguideQuantum = createWavyWaveguide([-2.4, 0.2, 0], [2.2, 0.8, -0.6], 0x00f2fe, 7.5, 0.085, 0.02, 0.044);
    const waveguideClassical = createWavyWaveguide([-2.4, -0.05, 0], [2.2, 0.55, -0.6], 0xf59e0b, 6.5, 0.07, 0.015, 0.035);
    const waveguideEPRtoAlice = createWavyWaveguide([0, -0.55, 0], [-2.4, 0.2, 0], 0x818cf8, 4.5, 0.075, 0.018, 0.04);
    const waveguideEPRtoBob = createWavyWaveguide([0, -0.55, 0], [2.2, 0.8, -0.6], 0x00e676, 4.5, 0.075, 0.018, 0.04);

    // Eve Wiretap Apparatus (For Attack Lab Mode)
    const eveGroup = new THREE.Group();
    const eveNode = createNode(matEve, [0, 1.2, 0], 0.32, 0xff1744);
    eveGroup.add(eveNode);
    const clampGeo = new THREE.BoxGeometry(0.5, 0.25, 0.4);
    const clampMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
    const clamp = new THREE.Mesh(clampGeo, clampMat);
    clamp.position.set(0, 1.05, 0);
    eveGroup.add(clamp);
    const eveBeam1 = createWavyWaveguide([-2.4, 0.2, 0], [0, 1.2, 0], 0xff1744, 4, 0.07, 0.016, 0.036);
    const eveBeam2 = createWavyWaveguide([0, 1.2, 0], [2.2, 0.8, -0.6], 0xff1744, 4, 0.07, 0.016, 0.036);
    eveGroup.add(eveBeam1.group);
    eveGroup.add(eveBeam2.group);
    eveGroup.visible = false;
    scene.add(eveGroup);

    // --- STAGE-SPECIFIC 3D OBJECTS ---

    // STAGE 1: Twin Entangled EPR Photons
    const eprPhoton1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    const eprPhoton2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe })
    );
    scene.add(eprPhoton1);
    scene.add(eprPhoton2);

    // STAGE 2: Alice Message State Preparation (|ψ⟩)
    const prepPhoton = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe })
    );
    const prepHaloGeo = new THREE.RingGeometry(0.2, 0.38, 32);
    const prepHaloMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
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
    const bitGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const bitMat1 = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const bitMat2 = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const classicalBit1 = new THREE.Mesh(bitGeo, bitMat1);
    const classicalBit2 = new THREE.Mesh(bitGeo, bitMat2);
    scene.add(classicalBit1);
    scene.add(classicalBit2);

    // STAGE 5: Conditional Pauli Correction Unitary Operator Ring (Bob)
    const pauliGeo = new THREE.TorusGeometry(0.38, 0.035, 16, 32);
    const pauliMat = new THREE.MeshBasicMaterial({ color: 0x00e676, wireframe: true });
    const pauliGate = new THREE.Mesh(pauliGeo, pauliMat);
    pauliGate.position.set(2.2, 0.8, -0.6);
    scene.add(pauliGate);

    // STAGE 6: Teleported State Sifting Probe
    const siftingGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const siftingMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });
    const siftingPhoton = new THREE.Mesh(siftingGeo, siftingMat);
    scene.add(siftingPhoton);

    // STAGE 7: Statistical Threat Verification Ring (Bob)
    const shieldGeo = new THREE.RingGeometry(0.2, 0.42, 32);
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
    ledgerGroup.position.set(2.2, 1.45, -0.6);
    scene.add(ledgerGroup);

    // Dynamic Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const mainLight = new THREE.PointLight(0x00f2fe, 1.8, 14);
    mainLight.position.set(0, 3.2, 2.4);
    scene.add(mainLight);

    // Threat Alert Strobe focused specifically at Bob's verifier aperture
    const threatAlertLight = new THREE.PointLight(0xff1744, 0, 10);
    threatAlertLight.position.set(2.2, 1.2, -0.6);
    scene.add(threatAlertLight);

    let reqId = null;
    let isDisposed = false;
    let isVisible = true;

    // Primary 60FPS Render & Smooth Physical Animation Loop
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

      // Advance dynamic progress smoothly (~2.3s per complete cycle at 60fps)
      progressRef.current = (progressRef.current + 0.0072) % 1.0;
      const progress = progressRef.current;
      const easeProg = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Sinusoidal smooth ease

      // Smooth idle orbital rotations
      if (aliceNode?.ringMesh) aliceNode.ringMesh.rotation.z += 0.015;
      if (bobNode?.ringMesh) bobNode.ringMesh.rotation.z += 0.015;
      if (charlieNode?.ringMesh) charlieNode.ringMesh.rotation.z += 0.015;
      if (eprNode?.ringMesh) eprNode.ringMesh.rotation.z += 0.02;

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

      // Dynamic Wavy Waveguide Undulation (Continuous traveling wave propagation)
      const wavePhase = Date.now() * 0.0036;
      waveguideQuantum.update(wavePhase);
      waveguideClassical.update(wavePhase * 0.88);
      waveguideEPRtoAlice.update(wavePhase);
      waveguideEPRtoBob.update(wavePhase);
      if (!isHonestMode && isCompromisedNow) {
        eveBeam1.update(wavePhase * 1.15);
        eveBeam2.update(wavePhase * 1.15);
      }

      // Dynamic Quantum Waveguide state
      if (waveguideQuantum) {
        if (isCompromisedNow) {
          const flicker = Math.sin(Date.now() * 0.03) > -0.2;
          waveguideQuantum.coreMat.color.setHex(flicker ? 0xff1744 : 0xf43f5e);
          waveguideQuantum.sheathMat.color.setHex(0xff1744);
          waveguideQuantum.sheathMat.opacity = flicker ? 0.35 : 0.12;
        } else {
          waveguideQuantum.coreMat.color.setHex(0x00f2fe);
          waveguideQuantum.sheathMat.color.setHex(0x00f2fe);
          waveguideQuantum.sheathMat.opacity = 0.22 + Math.sin(Date.now() * 0.003) * 0.06;
        }
      }

      // Maintain signature node colors
      if (aliceNode?.lensMesh) aliceNode.lensMesh.material.color.setHex(0x00f2fe);
      if (aliceNode?.ringMesh) aliceNode.ringMesh.material.color.setHex(0x00f2fe);
      if (charlieNode?.lensMesh) charlieNode.lensMesh.material.color.setHex(0xf59e0b);
      if (charlieNode?.ringMesh) charlieNode.ringMesh.material.color.setHex(0xf59e0b);
      if (eprNode?.lensMesh) eprNode.lensMesh.material.color.setHex(0xa855f7);
      if (eprNode?.ringMesh) eprNode.ringMesh.material.color.setHex(0xa855f7);

      // ==========================================
      // STAGE 1: EPR Pair Distribution
      // ==========================================
      if (stage === 1) {
        eprPhoton1.visible = true;
        eprPhoton2.visible = true;

        // EPR Photons ride the wavy links from central source to nodes
        eprPhoton1.position.copy(waveguideEPRtoAlice.getPointAt(easeProg, wavePhase));
        eprPhoton2.position.copy(waveguideEPRtoBob.getPointAt(easeProg, wavePhase));

        eprNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.04);
      }

      // ==========================================
      // STAGE 2: Message State Preparation (|ψ⟩)
      // ==========================================
      else if (stage === 2) {
        prepPhoton.visible = true;
        prepHalo.visible = true;

        // Smooth preparation packet at Alice's aperture
        prepPhoton.position.set(-2.4, 0.2 + Math.sin(progress * Math.PI * 2) * 0.06 + 0.35, 0);
        prepHalo.position.set(-2.4, 0.55, 0);
        prepHalo.scale.setScalar(0.85 + Math.sin(progress * Math.PI * 2) * 0.15);
        prepHalo.rotation.z += 0.02;

        if (aliceNode?.ringMesh) aliceNode.ringMesh.rotation.z += 0.04;
        aliceNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.04);
      }

      // ==========================================
      // STAGE 3: Bell-State Measurement (BSM)
      // ==========================================
      else if (stage === 3) {
        bsmFlashRing.visible = true;
        bsmPhoton1.visible = true;
        bsmPhoton2.visible = true;

        // Two photons converge into joint Alice BSM detector
        const conv = Math.min(1.0, progress * 1.3);
        bsmPhoton1.position.set(-2.4, 0.55 - conv * 0.35, 0);
        bsmPhoton2.position.set(-2.4, -0.15 + conv * 0.35, 0);

        // Flash expands as particles merge
        const flashScale = 0.3 + progress * 2.2;
        bsmFlashRing.scale.set(flashScale, flashScale, flashScale);
        bsmFlashMat.opacity = Math.max(0, 0.9 - progress * 0.85);

        aliceNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.04);
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
          classicalBit1.material.color.setHex(0xf59e0b);
          classicalBit2.material.color.setHex(0xfbbf24);
        }

        // Packet 1: Rides along classical wavy channel
        classicalBit1.position.copy(waveguideClassical.getPointAt(easeProg, wavePhase * 0.88));
        classicalBit1.rotation.x += 0.04;
        classicalBit1.rotation.y += 0.03;

        // Packet 2: Follows behind along classical wavy channel
        const prog2 = Math.max(0, (progress - 0.2 + 1.0) % 1.0);
        const easeProg2 = 0.5 - 0.5 * Math.cos(prog2 * Math.PI);
        classicalBit2.position.copy(waveguideClassical.getPointAt(easeProg2, wavePhase * 0.88));
        classicalBit2.rotation.x -= 0.03;
        classicalBit2.rotation.z += 0.04;
      }

      // ==========================================
      // STAGE 5: Conditional Pauli Correction (X^c1 · Z^c0)
      // ==========================================
      else if (stage === 5) {
        pauliGate.visible = true;

        // Smooth 3-axis unitary Pauli operator rotation
        pauliGate.rotation.x += 0.04;
        pauliGate.rotation.y += 0.05;
        pauliGate.rotation.z += 0.03;

        const gateScale = 1.0 + Math.sin(progress * Math.PI * 2) * 0.12;
        pauliGate.scale.set(gateScale, gateScale, gateScale);
        bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.04);
      }

      // ==========================================
      // STAGE 6: Teleported State Sifting
      // ==========================================
      else if (stage === 6) {
        siftingPhoton.visible = true;

        if (isCompromisedNow) {
          siftingPhoton.material.color.setHex(0xff1744);
        } else {
          siftingPhoton.material.color.setHex(0x00e676);
        }

        // Sifting scan traversing Alice declared bases to Bob along quantum wavy channel
        const siftingParam = Math.sin(progress * Math.PI);
        siftingPhoton.position.copy(waveguideQuantum.getPointAt(siftingParam, wavePhase));

        aliceNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.03);
        bobNode.scale.setScalar(1.0 + Math.cos(progress * Math.PI * 2) * 0.03);
      }

      // ==========================================
      // STAGE 7: Statistical Threat Detection (AT BOB'S VERIFIER NODE)
      // ==========================================
      else if (stage === 7) {
        if (!isCompromisedNow) {
          // SAFE: Calm expanding emerald green security shield anchored to Bob
          shieldRing.visible = true;
          const shieldScale = 1.0 + progress * 3.2;
          shieldRing.scale.set(shieldScale, shieldScale, shieldScale);
          shieldMat.opacity = Math.max(0, 0.85 - progress * 0.8);
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.04);

          if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0x00e676);
          if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0x00e676);
          labelBob.updateText('BOB: VERIFIED (QBER < 11%)', '#00e676', 'rgba(7, 11, 20, 0.90)', '#00e676');
        } else {
          // COMPROMISED: Threat alert ring expanding specifically from Bob's position [2.2, 0.8, -0.6]
          threatAlertRing.visible = true;
          const alertScale = 0.8 + progress * 3.6;
          threatAlertRing.scale.set(alertScale, alertScale, alertScale);
          alertRingMat.opacity = Math.max(0, 0.95 - progress * 0.9);

          const glitch = Math.sin(Date.now() * 0.04) > 0;
          threatAlertLight.intensity = glitch ? 3.0 : 0.6;

          // Bob node pulses crimson red
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 4) * 0.06);
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
          ledgerRing.rotation.y += 0.03;
          ledgerRing.rotation.x = Math.PI / 2;
          ledgerGroup.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.05);
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 2) * 0.04);

          if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0x00e676);
          if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0x00e676);
          labelBob.updateText('BOB: LEDGER COMMITTED', '#00e676', 'rgba(7, 11, 20, 0.90)', '#00e676');
        } else {
          // COMPROMISED: Crimson red abort quarantine block anchored directly above Bob
          ledgerBlockMat.color.setHex(0xff1744);
          ledgerRingMat.color.setHex(0xff1744);
          ledgerRing.rotation.z += 0.05;
          ledgerGroup.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 4) * 0.06);
          threatAlertLight.intensity = 2.0;

          // Bob node locked in red abort state
          bobNode.scale.setScalar(1.0 + Math.sin(progress * Math.PI * 4) * 0.06);
          if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0xff1744);
          if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0xff1744);
          labelBob.updateText('🚨 BOB: QUARANTINE ABORT', '#ff1744', 'rgba(35, 0, 8, 0.94)', '#ff1744');
        }
      }

      // Default label & node colors for Bob when in stages 1-6
      if (stage < 7) {
        if (bobNode?.lensMesh) bobNode.lensMesh.material.color.setHex(0x00e676);
        if (bobNode?.ringMesh) bobNode.ringMesh.material.color.setHex(0x00e676);
        if (isCompromisedNow) {
          labelBob.updateText('BOB (Verifier · ALERT)', '#f43f5e', 'rgba(25, 5, 12, 0.88)', '#f43f5e');
        } else {
          labelBob.updateText('BOB (Verifier)', '#00e676', 'rgba(7, 11, 20, 0.88)', '#00e676');
        }
      }

      // Subtle camera orbit for laboratory depth
      scene.rotation.y = Math.sin(Date.now() * 0.00025) * 0.09;

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
      const h = container.clientHeight || customHeight || (cinematic ? 540 : 270);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      observer.disconnect();
      resizeObserver.disconnect();
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
