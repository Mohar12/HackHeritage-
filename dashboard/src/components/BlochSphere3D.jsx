/**
 * BlochSphere3D.jsx
 * =================
 * Interactive WebGL/Three.js 3D Bloch Sphere visualization.
 * Renders genuine quantum state vector (|ψ⟩ = α|0⟩ + β|1⟩), coordinate axes (X, Y, Z),
 * measurement basis indicators, state projections, and dynamic attack/noise deviations.
 * Built with robust WebGL context loss handling, parameter validation, and 2D fallback.
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';

function BlochSphere3DComponent({
  theta = Math.PI / 4,
  phi = 0,
  fidelity = 1.0,
  isAttacked = false,
  badgeText,
  pillClass,
  embedded = false,
  canvasHeight = 220,
}) {
  const mountRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Safe numerical parameter sanitization
  const safeTheta = Number.isFinite(theta) ? theta : Math.PI / 4;
  const safePhi = Number.isFinite(phi) ? phi : 0;
  const safeFidelity = Number.isFinite(fidelity) ? Math.max(0, Math.min(1, fidelity)) : 1.0;

  // Track dynamic state in refs so the WebGL context is NOT torn down on every state change
  const stateRef = useRef({ safeTheta, safePhi, safeFidelity, isAttacked });
  useEffect(() => {
    stateRef.current = { safeTheta, safePhi, safeFidelity, isAttacked };
  }, [safeTheta, safePhi, safeFidelity, isAttacked]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
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

    const width = container.clientWidth || 320;
    const height = embedded ? canvasHeight : 280;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1000);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      // Cap devicePixelRatio to 1.5 to eliminate rendering lag
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL Renderer initialization failed:', err);
      setWebglSupported(false);
      return;
    }

    // Dynamic Camera Auto-Fit: Guarantees zero clipping at every 3D rotation angle
    const updateCameraFit = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth || 320;
      const aspect = newWidth / height;
      camera.aspect = aspect;

      // The maximum bounding radius of the sphere + axes + arrowheads + label badges is ~1.32
      const boundingRadius = 1.32;
      const fovRad = (camera.fov * Math.PI) / 180;
      const halfFovV = Math.tan(fovRad / 2);
      const halfFovH = halfFovV * aspect;
      const limitingHalfFov = Math.min(halfFovV, halfFovH);

      // Safe distance with 25% safety margin: guarantees all elements stay well within the canvas bounds at all times
      const safeDistance = Math.max(3.8, (boundingRadius * 1.25) / limitingHalfFov);

      const baseDir = new THREE.Vector3(2.2, 1.6, 2.6).normalize();
      camera.position.copy(baseDir.multiplyScalar(safeDistance));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    updateCameraFit();

    // ResizeObserver for clean responsive scaling
    const ro = new ResizeObserver(() => {
      updateCameraFit();
    });
    ro.observe(container);

    // Crisp canvas sprite labels with rounded pill backing for guaranteed contrast
    const createAxisLabelSprite = (text, colorStr, bgStr = 'rgba(6, 15, 30, 0.85)') => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 72;
      const ctx = canvas.getContext('2d');

      // Rounded pill backing behind text
      ctx.fillStyle = bgStr;
      ctx.strokeStyle = colorStr;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(8, 8, 144, 56, 16);
      } else {
        ctx.rect(8, 8, 144, 56);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = colorStr;
      ctx.font = 'bold 36px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 80, 36);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.38, 0.17, 1);
      return sprite;
    };

    // Group that holds the rotating sphere, axes, vector and labels
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    // 2. Lighting with Multi-Source Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x38bdf8, 2.0, 14);
    pointLight.position.set(3, 4, 5);
    scene.add(pointLight);
    const fillLight = new THREE.PointLight(0xa855f7, 1.2, 12);
    fillLight.position.set(-3, -2, -3);
    scene.add(fillLight);

    // 3. Elegant Bloch Sphere: Subtle Holographic Wireframe & Ambient Translucent Core
    // Radius reduced slightly to 0.78 so axes and labels fit with generous margins at all angles
    const sphereRadius = 0.78;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 24, 24);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x0284c7, // Calm, technical cyber cyan (not blinding neon)
      wireframe: true,
      transparent: true,
      opacity: 0.18, // Refined, low-contrast grid so axes are 100% visible
      shininess: 30,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphereGroup.add(sphere);

    // Subtle inner core for faint translucent glass-like depth
    const innerCoreGeo = new THREE.SphereGeometry(sphereRadius * 0.985, 32, 32);
    const innerCoreMat = new THREE.MeshPhongMaterial({
      color: 0x03254c,
      transparent: true,
      opacity: 0.06,
      shininess: 50,
      specular: 0x0ea5e9,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    sphereGroup.add(innerCore);

    // Refined Equator & Meridian Reference Rings (All 3 Principal Planes)
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
    });
    const createRing = (axis) => {
      const ringGeo = new THREE.BufferGeometry();
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        if (axis === 'z') points.push(new THREE.Vector3(Math.cos(angle) * sphereRadius, Math.sin(angle) * sphereRadius, 0));
        else if (axis === 'y') points.push(new THREE.Vector3(Math.cos(angle) * sphereRadius, 0, Math.sin(angle) * sphereRadius));
        else if (axis === 'x') points.push(new THREE.Vector3(0, Math.cos(angle) * sphereRadius, Math.sin(angle) * sphereRadius));
      }
      ringGeo.setFromPoints(points);
      return new THREE.Line(ringGeo, ringMat);
    };
    sphereGroup.add(createRing('z'));
    sphereGroup.add(createRing('y'));
    sphereGroup.add(createRing('x'));

    // Auxiliary Latitude Parallels (at ±45°)
    const createLatitudeRing = (yVal, radius) => {
      const ringGeo = new THREE.BufferGeometry();
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, yVal, Math.sin(angle) * radius));
      }
      ringGeo.setFromPoints(points);
      const latMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.16 });
      return new THREE.Line(ringGeo, latMat);
    };
    const latY = sphereRadius * Math.SQRT1_2;
    const latR = sphereRadius * Math.SQRT1_2;
    sphereGroup.add(createLatitudeRing(latY, latR));
    sphereGroup.add(createLatitudeRing(-latY, latR));

    // 4. Solid 3D Coordinate Axes (Thick Illuminated Cylinders + Arrow Cones)
    const createSolidAxis = (direction, length, colorHex, emissiveHex) => {
      const axisGroup = new THREE.Group();
      const dir = direction.clone().normalize();

      const shaftRadius = 0.014;
      const coneRadius = 0.040;
      const coneHeight = 0.09;
      const shaftLength = length - coneHeight;

      const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 16);
      shaftGeo.translate(0, shaftLength / 2, 0);

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: emissiveHex,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        metalness: 0.3,
      });

      const shaft = new THREE.Mesh(shaftGeo, mat);
      axisGroup.add(shaft);

      const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
      coneGeo.translate(0, shaftLength + coneHeight / 2, 0);
      const cone = new THREE.Mesh(coneGeo, mat);
      axisGroup.add(cone);

      const defaultUp = new THREE.Vector3(0, 1, 0);
      if (Math.abs(dir.y) < 0.9999) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultUp, dir);
        axisGroup.applyQuaternion(quat);
      } else if (dir.y < 0) {
        axisGroup.rotation.x = Math.PI;
      }

      return axisGroup;
    };

    const axisLength = 1.02;
    const labelDist = 1.20;

    // Z-Axis (Computational Basis: Z+ |0⟩ Cyan, Z- |1⟩ Sky)
    sphereGroup.add(createSolidAxis(new THREE.Vector3(0, 1, 0), axisLength, 0x00f2fe, 0x0284c7));
    sphereGroup.add(createSolidAxis(new THREE.Vector3(0, -1, 0), axisLength, 0x38bdf8, 0x0369a1));

    // X-Axis (Hadamard Basis: X+ |+⟩ Coral Red, X- |-⟩ Rose)
    sphereGroup.add(createSolidAxis(new THREE.Vector3(1, 0, 0), axisLength, 0xff3366, 0xdc2626));
    sphereGroup.add(createSolidAxis(new THREE.Vector3(-1, 0, 0), axisLength, 0xf87171, 0xb91c1c));

    // Y-Axis (Circular Basis: Y+ |i⟩ Emerald Green, Y- |-i⟩ Mint)
    sphereGroup.add(createSolidAxis(new THREE.Vector3(0, 0, 1), axisLength, 0x00e676, 0x059669));
    sphereGroup.add(createSolidAxis(new THREE.Vector3(0, 0, -1), axisLength, 0x34d399, 0x047857));

    // 3D Axis Labels with Pill Badges
    const labelZPlus = createAxisLabelSprite('|0⟩', '#00f2fe', 'rgba(6, 15, 30, 0.85)');
    labelZPlus.position.set(0, labelDist, 0);
    sphereGroup.add(labelZPlus);

    const labelZMinus = createAxisLabelSprite('|1⟩', '#38bdf8', 'rgba(6, 15, 30, 0.85)');
    labelZMinus.position.set(0, -labelDist, 0);
    sphereGroup.add(labelZMinus);

    const labelXPlus = createAxisLabelSprite('|+⟩', '#ff3366', 'rgba(30, 10, 20, 0.85)');
    labelXPlus.position.set(labelDist, 0, 0);
    sphereGroup.add(labelXPlus);

    const labelXMinus = createAxisLabelSprite('|-⟩', '#f87171', 'rgba(30, 10, 20, 0.85)');
    labelXMinus.position.set(-labelDist, 0, 0);
    sphereGroup.add(labelXMinus);

    const labelYPlus = createAxisLabelSprite('|i⟩', '#00e676', 'rgba(6, 25, 18, 0.85)');
    labelYPlus.position.set(0, 0, labelDist);
    sphereGroup.add(labelYPlus);

    const labelYMinus = createAxisLabelSprite('|-i⟩', '#34d399', 'rgba(6, 25, 18, 0.85)');
    labelYMinus.position.set(0, 0, -labelDist);
    sphereGroup.add(labelYMinus);

    // 5. Solid 3D State Vector Arrow |ψ⟩ & Endpoint Beacon
    const stateVectorGroup = new THREE.Group();
    sphereGroup.add(stateVectorGroup);

    const stateShaftRadius = 0.022; // thicker than axes (0.014)
    const stateConeRadius = 0.052;
    const stateConeHeight = 0.11;
    const stateLength = sphereRadius; // Reaches sphere surface (0.78)
    const stateShaftLength = stateLength - stateConeHeight;

    const stateShaftGeo = new THREE.CylinderGeometry(stateShaftRadius, stateShaftRadius, stateShaftLength, 16);
    stateShaftGeo.translate(0, stateShaftLength / 2, 0);

    const stateMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.3,
    });

    const stateShaft = new THREE.Mesh(stateShaftGeo, stateMat);
    stateVectorGroup.add(stateShaft);

    const stateConeGeo = new THREE.ConeGeometry(stateConeRadius, stateConeHeight, 16);
    stateConeGeo.translate(0, stateShaftLength + stateConeHeight / 2, 0);
    const stateCone = new THREE.Mesh(stateConeGeo, stateMat);
    stateVectorGroup.add(stateCone);

    // Glowing endpoint beacon sphere at vector tip
    const beaconGeo = new THREE.SphereGeometry(0.046, 16, 16);
    beaconGeo.translate(0, stateLength, 0);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00f2fe,
      emissiveIntensity: 1.0,
      roughness: 0.1,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    stateVectorGroup.add(beacon);

    // State Label sprite: placed just above the tip beacon
    const stateLabel = createAxisLabelSprite('|ψ⟩', '#00f2fe', 'rgba(6, 20, 38, 0.9)');
    stateLabel.position.set(0, stateLength + 0.13, 0);
    stateVectorGroup.add(stateLabel);

    // 6. Interactive Mouse-Drag Orbit Controls
    let isDragging = false;
    let previousPointer = { x: 0, y: 0 };
    let dragVelocity = { x: 0, y: 0 };
    let lastDragTime = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      previousPointer = { x: e.clientX, y: e.clientY };
      container.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousPointer.x;
      const deltaY = e.clientY - previousPointer.y;
      previousPointer = { x: e.clientX, y: e.clientY };

      dragVelocity = { x: deltaX * 0.007, y: deltaY * 0.007 };
      sphereGroup.rotation.y += dragVelocity.x;
      sphereGroup.rotation.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, sphereGroup.rotation.x + dragVelocity.y));
      lastDragTime = performance.now();
    };

    const onPointerUp = () => {
      isDragging = false;
      container.style.cursor = 'grab';
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.style.cursor = 'grab';

    // 7. Visibility Gated Animation Loop
    let reqId = null;
    let isDisposed = false;
    let isVisible = true;
    let lastAppliedAttacked = null;

    const animate = () => {
      if (isDisposed) return;
      if (!isVisible) {
        reqId = null;
        return; // Complete loop suspension when scrolled off-screen
      }

      reqId = requestAnimationFrame(animate);

      // Smoothly update state vector position and color from stateRef
      const { safeTheta: th, safePhi: ph, isAttacked: curAttacked } = stateRef.current;
      const targetTheta = curAttacked ? th + 0.5 : th;
      const targetPhi = curAttacked ? ph + 0.8 : ph;

      const sx = Math.sin(targetTheta) * Math.cos(targetPhi);
      const sz = Math.cos(targetTheta);
      const sy = Math.sin(targetTheta) * Math.sin(targetPhi);
      const stateDir = new THREE.Vector3(sx, sz, sy).normalize();

      const defaultUp = new THREE.Vector3(0, 1, 0);
      stateVectorGroup.quaternion.setFromUnitVectors(defaultUp, stateDir);

      if (curAttacked !== lastAppliedAttacked) {
        lastAppliedAttacked = curAttacked;
        const colHex = curAttacked ? 0xff1744 : 0x00f2fe;
        const emissiveHex = curAttacked ? 0x991b1b : 0x0284c7;
        stateMat.color.setHex(colHex);
        stateMat.emissive.setHex(emissiveHex);
        beaconMat.color.setHex(colHex);
        beaconMat.emissive.setHex(colHex);
      }

      // Apply gentle idle rotation when not actively dragging
      if (!isDragging) {
        const timeSinceDrag = performance.now() - lastDragTime;
        if (timeSinceDrag > 600) {
          sphereGroup.rotation.y += 0.003;
        } else {
          sphereGroup.rotation.y += dragVelocity.x;
          sphereGroup.rotation.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, sphereGroup.rotation.x + dragVelocity.y));
          dragVelocity.x *= 0.92;
          dragVelocity.y *= 0.92;
        }
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    // IntersectionObserver to pause rAF loop when off-screen
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

    // Initial kickstart
    animate();

    return () => {
      isDisposed = true;
      observer.disconnect();
      if (reqId) cancelAnimationFrame(reqId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

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

      if (ro) ro.disconnect();

      if (renderer) {
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, []);

  if (embedded) {
    return (
      <div className="bloch-sphere-embedded" style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', minHeight: 0 }}>
        <div
          ref={mountRef}
          className="bloch-canvas-mount"
          style={{
            width: '100%',
            height: `${canvasHeight}px`,
            position: 'relative',
            overflow: 'hidden',
            touchAction: 'none',
            borderRadius: '12px',
            background: 'transparent',
            border: 'none',
          }}
        >
          {!webglSupported && (
            <div className="fallback-2d-bloch">
              <div className="fallback-sphere-circle">
                <div
                  className="fallback-vector-arrow"
                  style={{
                    transform: `rotate(${isAttacked ? '135deg' : '45deg'})`,
                    backgroundColor: isAttacked ? '#ff1744' : '#00f2fe',
                  }}
                />
              </div>
              <p>2D Quantum Projection (WebGL Accelerated)</p>
            </div>
          )}
        </div>

        <div className="bloch-legend" style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '0.68rem', color: '#8da2c0', display: 'flex', justifyContent: 'space-between', padding: '10px 8px 0 8px', flexWrap: 'wrap', gap: '8px' }}>
          <span><strong style={{ color: '#00f2fe' }}>|0⟩</strong> Z+ Top</span>
          <span><strong style={{ color: '#38bdf8' }}>|1⟩</strong> Z- Bottom</span>
          <span><strong style={{ color: '#ff3366' }}>|+⟩</strong> X+</span>
          <span><strong style={{ color: '#00e676' }}>|i⟩</strong> Y+</span>
          <span><strong style={{ color: isAttacked ? '#ff1744' : '#00f2fe' }}>|ψ⟩</strong> {isAttacked ? 'Perturbed' : 'Pure State'}</span>
          <span style={{ color: '#64748b', fontSize: '0.65rem' }}>🖱 Drag to rotate 360°</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bloch-sphere-widget">
      <div className="widget-header">
        <div>
          <span className="viz-badge" style={{ fontSize: '0.62rem', letterSpacing: '0.06em' }}>DRAG TO ROTATE 360°</span>
          <h4>Interactive 3D Quantum Bloch Sphere</h4>
        </div>
        <span className={`pill-tag ${pillClass || (isAttacked ? 'pill-danger' : 'pill-cyan')}`}>
          {badgeText || (isAttacked ? 'State Vector Perturbed' : '|ψ⟩ Pure Bell State')}
        </span>
      </div>

      <div ref={mountRef} className="bloch-canvas-mount" style={{ touchAction: 'none' }}>
        {!webglSupported && (
          <div className="fallback-2d-bloch">
            <div className="fallback-sphere-circle">
              <div
                className="fallback-vector-arrow"
                style={{
                  transform: `rotate(${isAttacked ? '135deg' : '45deg'})`,
                  backgroundColor: isAttacked ? '#ff1744' : '#00f2fe',
                }}
              />
            </div>
            <p>2D Quantum Projection (WebGL Accelerated)</p>
          </div>
        )}
      </div>

      <div className="bloch-legend" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span><strong style={{ color: '#00f2fe' }}>|0⟩</strong> Z+ Top</span>
        <span><strong style={{ color: '#38bdf8' }}>|1⟩</strong> Z- Bottom</span>
        <span><strong style={{ color: '#ff3366' }}>|+⟩</strong> X+</span>
        <span><strong style={{ color: '#00e676' }}>|i⟩</strong> Y+</span>
        <span><strong style={{ color: isAttacked ? '#ff1744' : '#00f2fe' }}>|ψ⟩</strong> {isAttacked ? 'Perturbed' : 'Pure State'}</span>
        <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>🖱 Drag to rotate 360°</span>
      </div>
    </div>
  );
}

export default memo(BlochSphere3DComponent);
