/**
 * ScalableCluster3D.jsx
 * =====================
 * High-Throughput 3D Quantum Computing Cluster & Batch Engine Visualizer.
 * Dedicated specifically to Tab 3 (Scalable Workload Engine N = 1 … 100,000).
 * Displays:
 *  - Parallel QPU Blade Server Racks (QPU-01 through QPU-04 / Aer Core 0–3)
 *  - 28-Qubit Superconducting Transmon Array (4 rows × 7 cols = 28 qubits)
 *  - 14 Resonant Bell-Pair Entanglement Arcs (14 pairs per 28-qubit hardware circuit)
 *  - Round-Robin multi-core batch processing loop parameterized by N and throughput
 *  - Real-time thermal noise (p) and adversarial perturbation effects (color shift, jitter, flicker)
 *  - Synchronized QPU core indicator pulsing.
 */

import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

function ScalableCluster3DComponent({
  numSamples = 100,
  batchesExecuted = 8,
  throughput = 450,
  attackType = 'none',
  noiseRate = 0.02,
  status = 'idle',
}) {
  const mountRef = useRef(null);
  const rackContainerRef = useRef(null);

  // References to keep animation loop in sync with props without tearing down WebGL context
  const paramsRef = useRef({
    numSamples,
    throughput,
    attackType,
    noiseRate,
    status,
  });

  useEffect(() => {
    paramsRef.current = {
      numSamples,
      throughput,
      attackType,
      noiseRate,
      status,
    };
  }, [numSamples, throughput, attackType, noiseRate, status]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = 300;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060913, 0.05);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.1, 5.2);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);
    } catch (e) {
      return;
    }

    // Grid Floor
    const grid = new THREE.GridHelper(10, 16, 0x1e3a8a, 0x0f172a);
    grid.position.y = -0.6;
    scene.add(grid);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const cyanLight = new THREE.PointLight(0x00f2fe, 2.0, 14);
    cyanLight.position.set(-2, 3, 2);
    scene.add(cyanLight);

    const topLight = new THREE.PointLight(0x00e5ff, 1.8, 14);
    topLight.position.set(0, 3, 2);
    scene.add(topLight);

    const alertPointLight = new THREE.PointLight(0xff1744, 0, 10);
    alertPointLight.position.set(0, 2.5, 0);
    scene.add(alertPointLight);

    // Superconducting Cryostat Multi-Layer QPU Ground Shield
    const cryoChassis = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.8, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x070c18, metalness: 0.9, roughness: 0.25 })
    );
    cryoChassis.position.y = -0.6;
    scene.add(cryoChassis);

    // Gold-Plated Cryogenic Sapphire Interposer Die
    const dieGeo = new THREE.BoxGeometry(4.2, 0.12, 3.2);
    const dieMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      metalness: 0.85,
      roughness: 0.2,
    });
    const dieMesh = new THREE.Mesh(dieGeo, dieMat);
    dieMesh.position.y = -0.36;
    scene.add(dieMesh);

    // Silicon Substrate
    const subGeo = new THREE.BoxGeometry(3.8, 0.08, 2.8);
    const subMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.7,
      roughness: 0.35,
    });
    const siliconSubstrate = new THREE.Mesh(subGeo, subMat);
    siliconSubstrate.position.y = -0.26;
    scene.add(siliconSubstrate);

    // =========================================================================
    // 28-Qubit Transmon Lattice (4 rows × 7 columns = 28 Physical Qubits)
    // Optimized with 4 shared quadrant materials instead of 28 separate allocations
    // =========================================================================
    const transmonGroup = new THREE.Group();
    scene.add(transmonGroup);

    const transmonGrid = [];
    const rows = 4;
    const cols = 7;
    const padGeo = new THREE.BoxGeometry(0.18, 0.035, 0.18);

    // 4 shared materials for the 4 QPU cores
    const coreMaterials = [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x003355,
      emissiveIntensity: 0.3,
    }));

    const sharedMeanderMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = -1.35 + c * 0.45;
        const cz = -0.66 + r * 0.44;

        const qPad = new THREE.Mesh(padGeo, coreMaterials[r]);
        qPad.position.set(cx, -0.19, cz);
        transmonGroup.add(qPad);

        // Transmon CPW Readout Resonator line
        const meanderPts = [
          new THREE.Vector3(cx, -0.19, cz),
          new THREE.Vector3(cx, -0.19, cz + 0.12),
          new THREE.Vector3(cx + 0.08, -0.19, cz + 0.12),
          new THREE.Vector3(cx + 0.08, -0.19, cz + 0.18),
        ];
        const meanderLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(meanderPts),
          sharedMeanderMat
        );
        transmonGroup.add(meanderLine);

        transmonGrid.push({
          row: r,
          col: c,
          x: cx,
          z: cz,
          mesh: qPad,
          material: coreMaterials[r],
          quadrant: r, // Row maps directly to QPU Core 0..3
        });
      }
    }

    // =========================================================================
    // 14 Resonant Bell-Pair Entanglement Arcs (14 Pairs per 28-qubit Circuit)
    // Connecting Transmon Pairs across the 4 QPU Sectors
    // =========================================================================
    const bellPairPairs = [
      // Row 0 (QPU-01: Aer Core 0)
      { a: [0, 0], b: [0, 1], core: 0 },
      { a: [0, 2], b: [0, 3], core: 0 },
      { a: [0, 4], b: [0, 5], core: 0 },
      // Row 1 (QPU-02: Aer Core 1)
      { a: [1, 0], b: [1, 1], core: 1 },
      { a: [1, 2], b: [1, 3], core: 1 },
      { a: [1, 4], b: [1, 5], core: 1 },
      { a: [0, 6], b: [1, 6], core: 1 }, // vertical bus pair
      // Row 2 (QPU-03: Aer Core 2)
      { a: [2, 0], b: [2, 1], core: 2 },
      { a: [2, 2], b: [2, 3], core: 2 },
      { a: [2, 4], b: [2, 5], core: 2 },
      // Row 3 (QPU-04: Aer Core 3)
      { a: [3, 0], b: [3, 1], core: 3 },
      { a: [3, 2], b: [3, 3], core: 3 },
      { a: [3, 4], b: [3, 5], core: 3 },
      { a: [2, 6], b: [3, 6], core: 3 }, // vertical bus pair
    ];

    const arcGroup = new THREE.Group();
    scene.add(arcGroup);

    const arcObjects = bellPairPairs.map((pair, idx) => {
      const qA = transmonGrid.find((q) => q.row === pair.a[0] && q.col === pair.a[1]);
      const qB = transmonGrid.find((q) => q.row === pair.b[0] && q.col === pair.b[1]);

      const p0 = new THREE.Vector3(qA.x, -0.17, qA.z);
      const p1 = new THREE.Vector3(qB.x, -0.17, qB.z);
      const mid = new THREE.Vector3(
        (p0.x + p1.x) / 2,
        -0.17 + 0.32 + (idx % 3) * 0.05,
        (p0.z + p1.z) / 2
      );

      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
      const samplePts = curve.getPoints(12);
      const geo = new THREE.BufferGeometry().setFromPoints(samplePts);

      const mat = new THREE.LineBasicMaterial({
        color: 0xffd600, // Gold entanglement link
        transparent: true,
        opacity: 0.85,
        linewidth: 2,
      });

      const line = new THREE.Line(geo, mat);
      arcGroup.add(line);

      // Entangled EPR Flying Photon Packets traveling along the arc
      const photonGeo = new THREE.SphereGeometry(0.028, 8, 8);
      const photonMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
      const photonMesh = new THREE.Mesh(photonGeo, photonMat);
      arcGroup.add(photonMesh);

      return {
        curve,
        geo,
        mat,
        photonMesh,
        photonMat,
        core: pair.core,
        baseP0: p0,
        baseMid: mid,
        baseP1: p1,
        index: idx,
      };
    });

    // =========================================================================
    // Perimeter Microwave Readout SMA Pins and Gold Wirebonds
    // =========================================================================
    const pinGroup = new THREE.Group();
    scene.add(pinGroup);

    const wireMeshes = [];
    const numPins = 12;

    for (let p = 0; p < numPins; p++) {
      const angle = (p / numPins) * Math.PI * 2;
      const px = Math.cos(angle) * 2.3;
      const pz = Math.sin(angle) * 1.8;

      const smaPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.45, 12),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.2 })
      );
      smaPin.position.set(px, -0.15, pz);
      pinGroup.add(smaPin);

      // Gold wirebond connecting SMA pin to chip package
      const wirePts = [
        new THREE.Vector3(px, 0.05, pz),
        new THREE.Vector3(px * 0.75, 0.18, pz * 0.75),
        new THREE.Vector3(px * 0.6, -0.19, pz * 0.6),
      ];
      const wireCurve = new THREE.CatmullRomCurve3(wirePts);
      const wireGeo = new THREE.TubeGeometry(wireCurve, 12, 0.012, 6, false);
      const wireMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      pinGroup.add(wireMesh);
      wireMeshes.push({ wireMesh, wireMat, wireCurve });
    }

    // =========================================================================
    // Animation Loop: Driven by Real Sample Scale N, Batch Count & Noise Rate
    // =========================================================================
    let reqId = null;
    let isDisposed = false;
    let isVisible = true;
    let clock = new THREE.Clock();
    let lastCoreReported = -1;

    const animate = () => {
      if (isDisposed) return;
      if (!isVisible) {
        reqId = null;
        return; // Suspend rAF loop when off-screen
      }
      reqId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const currentParams = paramsRef.current;

      const N = Math.max(1, Number(currentParams.numSamples) || 100);
      const totalBatches = Math.ceil(N / 14);
      const isAdversarial = currentParams.attackType && currentParams.attackType !== 'none';
      const rawNoise = currentParams.noiseRate !== '' && currentParams.noiseRate !== undefined
        ? Number(currentParams.noiseRate)
        : 0.02;
      const effNoise = isAdversarial ? Math.max(rawNoise, 0.18) : rawNoise;
      const noiseIntensity = Math.min(1.0, Math.max(0.0, effNoise * 3.5));

      // Scaling cycle speed with throughput (samples/sec) & batch magnitude
      const secondsPerBatch = Math.max(
        0.035,
        Math.min(1.4, 2.2 / Math.pow(totalBatches, 0.68))
      );
      const runMultiplier = currentParams.status === 'running' ? 1.8 : 1.0;
      const effectiveBatchRate = (1.0 / secondsPerBatch) * runMultiplier;

      // Current batch index cycling through 0 ... totalBatches - 1
      const totalBatchProgress = elapsed * effectiveBatchRate;
      const currentBatchIdx = Math.floor(totalBatchProgress) % totalBatches;
      const intraBatchProg = totalBatchProgress - Math.floor(totalBatchProgress);

      // Round-robin distribution across QPU Cores 0, 1, 2, 3
      const currentActiveCore = currentBatchIdx % 4;

      // Update rack indicator pills directly in DOM to avoid React re-render cycle churn
      if (currentActiveCore !== lastCoreReported) {
        lastCoreReported = currentActiveCore;
        if (rackContainerRef.current) {
          const pills = rackContainerRef.current.children;
          for (let i = 0; i < pills.length; i++) {
            pills[i].classList.toggle('active-qpu', i === currentActiveCore);
          }
        }
      }

      // Gentle cryogenic chip inspection tilt
      scene.rotation.y = Math.sin(elapsed * 0.22) * 0.14;
      scene.rotation.x = 0.08 + Math.cos(elapsed * 0.18) * 0.04;

      // Alert point light flare when noise is high or attack is active
      if (noiseIntensity > 0.1) {
        alertPointLight.intensity = noiseIntensity * (0.8 + Math.sin(elapsed * 12.0) * 0.4);
      } else {
        alertPointLight.intensity = 0;
      }

      // Update 4 QPU Core shared materials instead of 28 separate allocations
      for (let r = 0; r < 4; r++) {
        const mat = coreMaterials[r];
        const isCoreActive = r === currentActiveCore;
        const padPulse = (Math.sin(elapsed * 5.0 * runMultiplier + r * 0.5) + 1.0) / 2.0;

        if (noiseIntensity > 0.1) {
          const glitch = Math.random() < noiseIntensity * 0.3;
          if (glitch) {
            mat.color.setHex(0xff1744);
            mat.emissive.setHex(0xaa0022);
            mat.emissiveIntensity = 0.8;
          } else {
            mat.color.setRGB(
              0.2 + noiseIntensity * 0.7,
              0.7 * (1.0 - noiseIntensity),
              0.9 * (1.0 - noiseIntensity * 0.8)
            );
            mat.emissive.setRGB(noiseIntensity * 0.4, 0.1, 0.2);
            mat.emissiveIntensity = isCoreActive ? 0.7 : 0.2;
          }
        } else {
          if (isCoreActive) {
            mat.color.setRGB(0.0, 0.95, 1.0);
            mat.emissive.setRGB(0.0, 0.35, 0.55);
            mat.emissiveIntensity = 0.6 + padPulse * 0.4;
          } else {
            mat.color.setRGB(0.0, 0.55 + padPulse * 0.25, 0.85);
            mat.emissive.setRGB(0.0, 0.1, 0.25);
            mat.emissiveIntensity = 0.2;
          }
        }
      }

      // Update 14 Resonant Bell-Pair Entanglement Arcs
      arcObjects.forEach((arc) => {
        const isArcCoreActive = arc.core === currentActiveCore;

        // Position flying photon packets along the curve
        const photonT = (intraBatchProg + arc.index * 0.1) % 1.0;
        const photonPos = arc.curve.getPoint(photonT);
        arc.photonMesh.position.copy(photonPos);

        // Path Jitter on vertices when noise is present
        if (noiseIntensity > 0.05) {
          const positions = arc.geo.attributes.position;
          const count = positions.count;
          const jitterScale = noiseIntensity * 0.035;

          for (let j = 1; j < count - 1; j++) {
            const orig = arc.curve.getPoint(j / (count - 1));
            const jx = orig.x + (Math.random() - 0.5) * jitterScale;
            const jy = orig.y + (Math.random() - 0.5) * jitterScale;
            const jz = orig.z + (Math.random() - 0.5) * jitterScale;
            positions.setXYZ(j, jx, jy, jz);
          }
          positions.needsUpdate = true;

          arc.mat.color.setRGB(1.0, 0.3, 0.1);
          arc.mat.opacity = 0.3;
          arc.photonMat.color.setHex(0xff0000);
          arc.photonMesh.visible = Math.random() > 0.2;
        } else {
          // Reset arc geometry to smooth curve
          const positions = arc.geo.attributes.position;
          const count = positions.count;
          for (let j = 0; j < count; j++) {
            const orig = arc.curve.getPoint(j / (count - 1));
            positions.setXYZ(j, orig.x, orig.y, orig.z);
          }
          positions.needsUpdate = true;

          arc.mat.color.setHex(isArcCoreActive ? 0x00f2fe : 0xffd600);
          arc.mat.opacity = isArcCoreActive ? 0.95 : 0.4;
          arc.photonMat.color.setHex(0x00f2fe);
          arc.photonMesh.visible = true;
        }
      });

      // Perimeter Wirebonds microwave transmission pulse
      wireMeshes.forEach((w, wIdx) => {
        const wirePulse = Math.sin(elapsed * 4.0 + wIdx * 0.5);
        if (noiseIntensity > 0.2) {
          w.wireMat.color.setHex(wirePulse > 0 ? 0xf59e0b : 0xd97706);
        } else {
          w.wireMat.color.setHex(wirePulse > 0.4 ? 0xfde047 : 0xd97706);
        }
      });

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

  return (
    <div className="scalable-cluster-3d-card">
      <div className="cluster-header">
        <div className="header-badge-row">
          <span className="viz-badge success">PARALLEL QUANTUM CLUSTER ENGINE</span>
          <span className="target-location-tag">
            ⚡ SCALE: <strong>{Number(numSamples).toLocaleString()} Samples</strong>
          </span>
        </div>
        <h4>High-Throughput Distributed QDS Verification Mesh</h4>
        <p className="arch-sub-desc">
          Concurrent 28-qubit hardware circuits partitioned into 14 Bell-pair batch pipelines.
        </p>
      </div>

      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="cluster-canvas-mount" />

      {/* Cluster Node Rack Indicators */}
      <div ref={rackContainerRef} className="cluster-rack-indicators">
        <div className="rack-pill active-qpu">
          <span className="dot cyan" />
          <span><strong>QPU-01</strong> [Aer Core 0]</span>
        </div>
        <div className="rack-pill">
          <span className="dot cyan" />
          <span><strong>QPU-02</strong> [Aer Core 1]</span>
        </div>
        <div className="rack-pill purple-qpu">
          <span className="dot purple" />
          <span><strong>QPU-03</strong> [Aer Core 2]</span>
        </div>
        <div className="rack-pill purple-qpu">
          <span className="dot purple" />
          <span><strong>QPU-04</strong> [Aer Core 3]</span>
        </div>
      </div>

      {/* Scalability HUD Breakdown */}
      <div className="cluster-hud-grid">
        <div className="cluster-stat-card">
          <span className="c-stat-label">Hardware Circuit Cap:</span>
          <strong className="c-stat-val">28 Qubits</strong>
          <small>Statevector bounded simulation</small>
        </div>
        <div className="cluster-stat-card">
          <span className="c-stat-label">Batch Partitioning:</span>
          <strong className="c-stat-val">14 Pairs / Circuit</strong>
          <small>Logical protocol slicing</small>
        </div>
        <div className="cluster-stat-card">
          <span className="c-stat-label">Throughput Metric:</span>
          <strong className="c-stat-val success-text">{throughput} samples/sec</strong>
          <small>Vectorized NumPy Born engine</small>
        </div>
        <div className="cluster-stat-card">
          <span className="c-stat-label">Memory Complexity:</span>
          <strong className="c-stat-val">O(1) Streaming</strong>
          <small>Non-blocking asynchronous batches</small>
        </div>
      </div>
    </div>
  );
}

export default memo(ScalableCluster3DComponent);
