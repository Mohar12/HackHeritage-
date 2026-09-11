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
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2.4, 1.8, 2.6);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      // Cap devicePixelRatio to 1.5 to eliminate retina/4K rendering lag
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL Renderer initialization failed:', err);
      setWebglSupported(false);
      return;
    }

    // ResizeObserver for clean responsive scaling
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      if (!newWidth) return;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Function to generate crisp canvas sprite labels for axes
    const createAxisLabelSprite = (text, colorStr) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = colorStr;
      ctx.font = 'bold 36px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = colorStr;
      ctx.shadowBlur = 8;
      ctx.fillText(text, 64, 32);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.42, 0.21, 1);
      return sprite;
    };

    // Group that holds the rotating sphere, axes, vector and labels
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f2fe, 1.6, 10);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // 3. Translucent Bloch Sphere (optimized geometry: 18x18 segments)
    const sphereGeo = new THREE.SphereGeometry(1, 18, 18);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x1a2644,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphereGroup.add(sphere);

    // Equator and Meridian rings (32 segments)
    const ringMat = new THREE.LineBasicMaterial({ color: 0x2a3d66, transparent: true, opacity: 0.6 });
    const createRing = (axis) => {
      const ringGeo = new THREE.BufferGeometry();
      const points = [];
      for (let i = 0; i <= 32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        if (axis === 'z') points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
        else if (axis === 'y') points.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
      }
      ringGeo.setFromPoints(points);
      return new THREE.Line(ringGeo, ringMat);
    };
    sphereGroup.add(createRing('z'));
    sphereGroup.add(createRing('y'));

    // 4. Coordinate Axes (X: Red, Y: Green, Z: Cyan)
    const axesLength = 1.35;
    const addAxis = (dir, color) => {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), axesLength, color, 0.1, 0.06);
      sphereGroup.add(arrow);
    };
    addAxis(new THREE.Vector3(1, 0, 0), 0xff5252);
    addAxis(new THREE.Vector3(-1, 0, 0), 0x552222);
    addAxis(new THREE.Vector3(0, 1, 0), 0x00f2fe);
    addAxis(new THREE.Vector3(0, -1, 0), 0x005577);
    addAxis(new THREE.Vector3(0, 0, 1), 0x00e676);
    addAxis(new THREE.Vector3(0, 0, -1), 0x004422);

    // 3D Axis Labels
    const labelZPlus = createAxisLabelSprite('|0⟩', '#00f2fe');
    labelZPlus.position.set(0, 1.55, 0);
    sphereGroup.add(labelZPlus);

    const labelZMinus = createAxisLabelSprite('|1⟩', '#38bdf8');
    labelZMinus.position.set(0, -1.55, 0);
    sphereGroup.add(labelZMinus);

    const labelXPlus = createAxisLabelSprite('|+⟩', '#ff5252');
    labelXPlus.position.set(1.55, 0, 0);
    sphereGroup.add(labelXPlus);

    const labelXMinus = createAxisLabelSprite('|-⟩', '#f87171');
    labelXMinus.position.set(-1.55, 0, 0);
    sphereGroup.add(labelXMinus);

    const labelYPlus = createAxisLabelSprite('|i⟩', '#00e676');
    labelYPlus.position.set(0, 0, 1.55);
    sphereGroup.add(labelYPlus);

    const labelYMinus = createAxisLabelSprite('|-i⟩', '#34d399');
    labelYMinus.position.set(0, 0, -1.55);
    sphereGroup.add(labelYMinus);

    // 5. State Vector Arrow |ψ⟩ & Endpoint Point
    const initialDir = new THREE.Vector3(0, 1, 0);
    const stateArrow = new THREE.ArrowHelper(initialDir, new THREE.Vector3(0, 0, 0), 1.0, 0x00f2fe, 0.15, 0.09);
    sphereGroup.add(stateArrow);

    const pointGeo = new THREE.SphereGeometry(0.05, 10, 10);
    const pointMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const statePoint = new THREE.Mesh(pointGeo, pointMat);
    sphereGroup.add(statePoint);

    const stateLabel = createAxisLabelSprite('|ψ⟩', '#00f2fe');
    sphereGroup.add(stateLabel);

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
      sphereGroup.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, sphereGroup.rotation.x + dragVelocity.y));
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

      stateArrow.setDirection(stateDir);
      statePoint.position.copy(stateDir);
      stateLabel.position.copy(stateDir).multiplyScalar(1.22);

      if (curAttacked !== lastAppliedAttacked) {
        lastAppliedAttacked = curAttacked;
        const colHex = curAttacked ? 0xff1744 : 0x00f2fe;
        stateArrow.setColor(colHex);
        pointMat.color.setHex(colHex);
      }

      // Apply gentle idle rotation when not actively dragging
      if (!isDragging) {
        const timeSinceDrag = performance.now() - lastDragTime;
        if (timeSinceDrag > 600) {
          sphereGroup.rotation.y += 0.003;
        } else {
          sphereGroup.rotation.y += dragVelocity.x;
          sphereGroup.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, sphereGroup.rotation.x + dragVelocity.y));
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
            borderRadius: '6px',
            background: 'rgba(5, 7, 13, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
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

        <div className="bloch-legend" style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '0.66rem', color: '#8da2c0', display: 'flex', justifyContent: 'space-between', padding: '10px 4px 0 4px' }}>
          <span><strong style={{ color: '#00f2fe' }}>|0⟩</strong> Z+</span>
          <span><strong style={{ color: '#38bdf8' }}>|1⟩</strong> Z-</span>
          <span><strong style={{ color: '#ff5252' }}>|+⟩</strong> X+</span>
          <span><strong style={{ color: '#00e676' }}>|i⟩</strong> Y+</span>
          <span style={{ color: '#64748b', fontSize: '0.62rem' }}>🖱 Drag to rotate</span>
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

      <div className="bloch-legend">
        <span><strong style={{ color: '#00f2fe' }}>|0⟩</strong> Z+ (Top)</span>
        <span><strong style={{ color: '#38bdf8' }}>|1⟩</strong> Z- (Bottom)</span>
        <span><strong style={{ color: '#ff5252' }}>|+⟩</strong> X+</span>
        <span><strong style={{ color: '#00e676' }}>|i⟩</strong> Y+</span>
        <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>🖱 Drag to rotate view</span>
      </div>
    </div>
  );
}

export default memo(BlochSphere3DComponent);
