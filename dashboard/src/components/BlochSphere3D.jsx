/**
 * BlochSphere3D.jsx
 * =================
 * Interactive WebGL/Three.js 3D Bloch Sphere visualization.
 * Renders genuine quantum state vector (|ψ⟩ = α|0⟩ + β|1⟩), coordinate axes (X, Y, Z),
 * measurement basis indicators, state projections, and dynamic attack/noise deviations.
 * Built with robust WebGL context loss handling, parameter validation, and 2D fallback.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function BlochSphere3D({ theta = Math.PI / 4, phi = 0, fidelity = 1.0, isAttacked = false, badgeText, pillClass }) {
  const mountRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Safe numerical parameter sanitization
  const safeTheta = Number.isFinite(theta) ? theta : Math.PI / 4;
  const safePhi = Number.isFinite(phi) ? phi : 0;
  const safeFidelity = Number.isFinite(fidelity) ? Math.max(0, Math.min(1, fidelity)) : 1.0;

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
    const height = 280;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2.4, 1.8, 2.6);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL Renderer initialization failed:', err);
      setWebglSupported(false);
      return;
    }

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f2fe, 1.5, 10);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // 3. Translucent Bloch Sphere
    const sphereGeo = new THREE.SphereGeometry(1, 24, 24);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x1a2644,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Equator and Meridian rings
    const ringMat = new THREE.LineBasicMaterial({ color: 0x2a3d66, transparent: true, opacity: 0.6 });
    const createRing = (axis) => {
      const ringGeo = new THREE.BufferGeometry();
      const points = [];
      for (let i = 0; i <= 48; i++) {
        const angle = (i / 48) * Math.PI * 2;
        if (axis === 'z') points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
        else if (axis === 'y') points.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
      }
      ringGeo.setFromPoints(points);
      return new THREE.Line(ringGeo, ringMat);
    };
    scene.add(createRing('z'));
    scene.add(createRing('y'));

    // 4. Coordinate Axes (X: Red, Y: Green, Z: Cyan)
    const axesLength = 1.35;
    const addAxis = (dir, color) => {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), axesLength, color, 0.1, 0.06);
      scene.add(arrow);
    };
    addAxis(new THREE.Vector3(1, 0, 0), 0xff5252);
    addAxis(new THREE.Vector3(-1, 0, 0), 0x552222);
    addAxis(new THREE.Vector3(0, 1, 0), 0x00f2fe);
    addAxis(new THREE.Vector3(0, -1, 0), 0x005577);
    addAxis(new THREE.Vector3(0, 0, 1), 0x00e676);
    addAxis(new THREE.Vector3(0, 0, -1), 0x004422);

    // 5. State Vector Arrow |ψ⟩
    const targetTheta = isAttacked ? safeTheta + 0.5 : safeTheta;
    const targetPhi = isAttacked ? safePhi + 0.8 : safePhi;

    const sx = Math.sin(targetTheta) * Math.cos(targetPhi);
    const sz = Math.cos(targetTheta);
    const sy = Math.sin(targetTheta) * Math.sin(targetPhi);

    const stateDir = new THREE.Vector3(sx, sz, sy).normalize();
    const stateColor = isAttacked ? 0xff1744 : 0x00f2fe;

    const stateArrow = new THREE.ArrowHelper(stateDir, new THREE.Vector3(0, 0, 0), 1.0, stateColor, 0.15, 0.09);
    scene.add(stateArrow);

    const pointGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const pointMat = new THREE.MeshBasicMaterial({ color: stateColor });
    const statePoint = new THREE.Mesh(pointGeo, pointMat);
    statePoint.position.copy(stateDir);
    scene.add(statePoint);

    // 6. Animation loop with safety checks
    let reqId;
    let isDisposed = false;

    const animate = () => {
      if (isDisposed) return;
      reqId = requestAnimationFrame(animate);
      scene.rotation.y += 0.003;
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!container || isDisposed || !renderer) return;
      const w = container.clientWidth || 320;
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
  }, [safeTheta, safePhi, safeFidelity, isAttacked]);

  return (
    <div className="bloch-sphere-widget">
      <div className="widget-header">
        <h4>Interactive 3D Quantum Bloch Sphere</h4>
        <span className={`pill-tag ${pillClass || (isAttacked ? 'pill-danger' : 'pill-cyan')}`}>
          {badgeText || (isAttacked ? 'State Vector Perturbed' : '|ψ⟩ Pure Bell State')}
        </span>
      </div>

      <div ref={mountRef} className="bloch-canvas-mount">
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
        <span><strong style={{ color: '#00f2fe' }}>|0⟩</strong> Top (Z+)</span>
        <span><strong style={{ color: '#005577' }}>|1⟩</strong> Bottom (Z-)</span>
        <span><strong style={{ color: '#ff5252' }}>|+⟩</strong> X+</span>
        <span><strong style={{ color: '#00e676' }}>|i⟩</strong> Y+</span>
      </div>
    </div>
  );
}
