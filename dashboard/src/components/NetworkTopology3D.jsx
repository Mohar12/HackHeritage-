/**
 * NetworkTopology3D.jsx
 * =====================
 * Interactive Quantum Key Distribution & Teleportation Topology Map.
 * Renders node participants (Alice, Bob, Charlie, and adversary Eve),
 * active link security status, and quantum state packet flows across the network mesh.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function NetworkTopology3D({ isAttacked = false, activeNode = 'Alice' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.2, 4.8);
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
    } catch (e) {
      return;
    }

    // Grid plane
    const gridHelper = new THREE.GridHelper(5, 10, 0x2a3d66, 0x141e36);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Nodes
    const createNodeMesh = (color, pos) => {
      const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 24);
      const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      scene.add(mesh);
      return mesh;
    };

    const alice = createNodeMesh(0x00f2fe, [-1.6, 0, 0]);
    const bob = createNodeMesh(0x00e676, [1.6, 0, -1.0]);
    const charlie = createNodeMesh(0xffd600, [1.6, 0, 1.0]);
    let eve = null;
    if (isAttacked) {
      eve = createNodeMesh(0xff1744, [0, 0, 0]);
    }

    // Network Lines
    const linkMat = new THREE.LineBasicMaterial({
      color: isAttacked ? 0xff1744 : 0x00f2fe,
      transparent: true,
      opacity: 0.7,
    });

    const addLink = (p1, p2) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...p1),
        new THREE.Vector3(...p2),
      ]);
      const line = new THREE.Line(geo, linkMat);
      scene.add(line);
      return line;
    };

    addLink([-1.6, 0, 0], [1.6, 0, -1.0]);
    addLink([-1.6, 0, 0], [1.6, 0, 1.0]);
    addLink([1.6, 0, -1.0], [1.6, 0, 1.0]);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.PointLight(0x00f2fe, 1.2, 10);
    light.position.set(0, 3, 2);
    scene.add(light);

    let reqId;
    let isDisposed = false;

    const animate = () => {
      if (isDisposed) return;
      reqId = requestAnimationFrame(animate);
      scene.rotation.y += 0.005;
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
  }, [isAttacked]);

  return (
    <div className="network-topology-widget">
      <div className="widget-header">
        <div>
          <span className="viz-badge">MESH TOPOLOGY</span>
          <h4>Quantum QDS Network Graph</h4>
        </div>
        <span className={`pill-tag ${isAttacked ? 'pill-danger' : 'pill-cyan'}`}>
          {isAttacked ? '🚨 Rogue Interceptor Active' : '🔒 Secure Mesh Links'}
        </span>
      </div>
      <div ref={mountRef} className="topology-canvas-mount" />
      <div className="topology-legend">
        <span><strong style={{ color: '#00f2fe' }}>Alice</strong> (Signer)</span>
        <span><strong style={{ color: '#00e676' }}>Bob</strong> (Recipient)</span>
        <span><strong style={{ color: '#ffd600' }}>Charlie</strong> (Verifier)</span>
      </div>
    </div>
  );
}
