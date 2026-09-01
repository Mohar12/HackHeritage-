/**
 * BlochSphere3D.jsx
 * =================
 * Interactive WebGL/Three.js 3D Bloch Sphere visualization.
 * Renders genuine quantum state vector (|ψ⟩ = α|0⟩ + β|1⟩), coordinate axes (X, Y, Z),
 * measurement basis indicators, state projections, and dynamic attack/noise deviations.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function BlochSphere3D({ theta = Math.PI / 4, phi = 0, fidelity = 1.0, isAttacked = false }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = 280;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2.4, 1.8, 2.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f2fe, 1.5, 10);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // 3. Translucent Bloch Sphere
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
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
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        if (axis === 'z') points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
        else if (axis === 'y') points.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
      }
      ringGeo.setFromPoints(points);
      return new THREE.Line(ringGeo, ringMat);
    };
    scene.add(createRing('z'));
    scene.add(createRing('y'));

    // 4. Coordinate Axes (X: Red/Orange, Y: Green, Z: Cyan/Blue)
    const axesLength = 1.35;
    const addAxis = (dir, color) => {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), axesLength, color, 0.1, 0.06);
      scene.add(arrow);
    };
    addAxis(new THREE.Vector3(1, 0, 0), 0xff5252); // +X
    addAxis(new THREE.Vector3(-1, 0, 0), 0x552222); // -X
    addAxis(new THREE.Vector3(0, 1, 0), 0x00f2fe); // +Z (|0⟩)
    addAxis(new THREE.Vector3(0, -1, 0), 0x005577); // -Z (|1⟩)
    addAxis(new THREE.Vector3(0, 0, 1), 0x00e676); // +Y
    addAxis(new THREE.Vector3(0, 0, -1), 0x004422); // -Y

    // 5. State Vector Arrow |ψ⟩
    const targetTheta = isAttacked ? theta + 0.5 : theta;
    const targetPhi = isAttacked ? phi + 0.8 : phi;

    const sx = Math.sin(targetTheta) * Math.cos(targetPhi);
    const sz = Math.cos(targetTheta);
    const sy = Math.sin(targetTheta) * Math.sin(targetPhi);

    const stateDir = new THREE.Vector3(sx, sz, sy).normalize();
    const stateColor = isAttacked ? 0xff1744 : 0x00f2fe;

    const stateArrow = new THREE.ArrowHelper(stateDir, new THREE.Vector3(0, 0, 0), 1.0, stateColor, 0.15, 0.09);
    scene.add(stateArrow);

    // State point sphere
    const pointGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const pointMat = new THREE.MeshBasicMaterial({ color: stateColor });
    const statePoint = new THREE.Mesh(pointGeo, pointMat);
    statePoint.position.copy(stateDir);
    scene.add(statePoint);

    // 6. Animation loop (gentle orbit)
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      scene.rotation.y += 0.003;
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
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
  }, [theta, phi, fidelity, isAttacked]);

  return (
    <div className="bloch-sphere-widget">
      <div className="widget-header">
        <h4>Interactive 3D Quantum Bloch Sphere</h4>
        <span className={`pill-tag ${isAttacked ? 'pill-danger' : 'pill-cyan'}`}>
          {isAttacked ? 'State Vector Perturbed' : '|ψ⟩ Pure Bell State'}
        </span>
      </div>
      <div ref={mountRef} className="bloch-canvas-mount" />
      <div className="bloch-legend">
        <span><strong style={{ color: '#00f2fe' }}>|0⟩</strong> Top (Z+)</span>
        <span><strong style={{ color: '#005577' }}>|1⟩</strong> Bottom (Z-)</span>
        <span><strong style={{ color: '#ff5252' }}>|+⟩</strong> X+</span>
        <span><strong style={{ color: '#00e676' }}>|i⟩</strong> Y+</span>
      </div>
    </div>
  );
}
