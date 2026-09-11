import React, { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';

function NetworkTopology3DComponent({
  isAttacked = false,
  activeNode: propActiveNode = 'Alice',
  activeLink = 'all',
  resultData,
  onNodeSelect,
  badgeText,
  pillClass,
  embedded = false,
  canvasHeight = 200,
}) {
  const mountRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(propActiveNode || 'Alice');

  // Synchronize internal selection with prop changes
  useEffect(() => {
    if (propActiveNode) {
      setSelectedNode(propActiveNode);
    }
  }, [propActiveNode]);

  // Keep interaction state in refs so Three.js scene is NEVER torn down on hover or selection!
  const interactionRef = useRef({
    hoveredNode,
    selectedNode,
    propActiveNode,
    activeLink,
    isAttacked,
  });

  useEffect(() => {
    interactionRef.current = {
      hoveredNode,
      selectedNode,
      propActiveNode,
      activeLink,
      isAttacked,
    };
  }, [hoveredNode, selectedNode, propActiveNode, activeLink, isAttacked]);

  // Extract live metrics from the shared resultData
  const detect = resultData?.detect;
  const sig = resultData?.sig;
  const isMalicious = Boolean(detect?.is_malicious || isAttacked);
  const qber = Number.isFinite(detect?.qber) ? detect.qber : 0.00;
  const pVal = Number.isFinite(detect?.chi2_p_value) ? detect.chi2_p_value : 0.9800;
  const fidelity = Number.isFinite(detect?.fidelity) ? detect.fidelity : (sig?.fidelity ?? 0.998);
  const nQubits = detect?.quantum_security_bounds?.n_qubits || resultData?.keys?.n_qubits || 14;
  const verdict = isMalicious ? 'ABORT' : 'COMMIT';

  const nodeDetails = {
    Alice: {
      name: 'Alice',
      title: 'Signer & Quantum Teleportation Transmitter',
      role: 'Prepares message qubit |ψ⟩ in Z-basis & executes joint Bell-State Measurement (BSM)',
      metrics: [
        { label: 'EPR Key Material', value: `${nQubits} Qubits Distributed` },
        { label: 'Signature State', value: '|ψ⟩ Pure Bell Pair (|Φ⁺⟩)' },
        { label: 'Teleportation Fidelity', value: `${(fidelity * 100).toFixed(1)}% (Uhlmann)` },
      ],
      color: '#00f2fe',
    },
    Bob: {
      name: 'Bob',
      title: 'Signature Recipient & Verification Node',
      role: 'Receives teleported state, measures in randomly chosen Pauli basis, verifies Born distribution',
      metrics: [
        { label: 'Measurement Basis', value: 'Z & X Sifting' },
        { label: 'Observed QBER', value: `${(qber * 100).toFixed(2)}%`, alert: qber > 0.11 },
        { label: 'Verdict', value: isMalicious ? 'ABORT (Compromised)' : 'ACCEPT (Verified)' },
      ],
      color: '#00e676',
    },
    Charlie: {
      name: 'Charlie',
      title: 'Arbitration Authority & Consensus Sifter',
      role: 'Resolves disputed signatures; performs public Hoeffding & Gottesman-Chuang security bound tests',
      metrics: [
        { label: 'Born χ² p-value', value: pVal.toFixed(4), alert: pVal < 0.01 },
        { label: 'G-C Forgery Bound', value: `≤ 2⁻${nQubits}` },
        { label: 'Audit Verdict', value: verdict },
      ],
      color: '#ffd600',
    },
    Eve: {
      name: 'Eve',
      title: 'Adversarial Eavesdropper (Wiretap)',
      role: 'Intercepts quantum channel; state measurement collapses Bell entanglement and triggers QBER explosion',
      metrics: [
        { label: 'Channel Disturbance', value: `${(qber * 100).toFixed(1)}% QBER Induced`, alert: true },
        { label: 'Detection Status', value: 'IMMEDIATE QUARANTINE', alert: true },
      ],
      color: '#ff1744',
    },
  };

  const displayedNodeKey = hoveredNode || selectedNode || 'Alice';
  const activeDetail = nodeDetails[displayedNodeKey] || nodeDetails.Alice;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = embedded ? canvasHeight : 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.2, 4.8);
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
    try {
      ro.observe(container);
    } catch (e) {
      return;
    }

    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // Grid plane
    const gridHelper = new THREE.GridHelper(5, 8, 0x2a3d66, 0x141e36);
    gridHelper.position.y = -0.5;
    networkGroup.add(gridHelper);

    // Helper: 3D canvas Sprite for node labels
    const createNodeLabelSprite = (text, colorStr) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = colorStr;
      ctx.font = 'bold 26px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = colorStr;
      ctx.shadowBlur = 6;
      ctx.fillText(text, 64, 24);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.65, 0.24, 1);
      return sprite;
    };

    // Node Meshes (optimized 16 segments)
    const nodeMeshes = [];
    const createNodeMesh = (name, color, pos) => {
      const geo = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 16);
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        shininess: 80,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.userData = { name, baseColor: color, basePos: pos };
      networkGroup.add(mesh);
      nodeMeshes.push(mesh);

      // Add label floating above node
      const label = createNodeLabelSprite(name, color === 0x00f2fe ? '#00f2fe' : color === 0x00e676 ? '#00e676' : color === 0xffd600 ? '#ffd600' : '#ff1744');
      label.position.set(pos[0], pos[1] + 0.38, pos[2]);
      networkGroup.add(label);

      return mesh;
    };

    createNodeMesh('Alice', 0x00f2fe, [-1.6, 0, 0]);
    createNodeMesh('Bob', 0x00e676, [1.6, 0, -1.0]);
    createNodeMesh('Charlie', 0xffd600, [1.6, 0, 1.0]);
    const eveMesh = createNodeMesh('Eve', 0xff1744, [0, 0, 0]);
    eveMesh.visible = Boolean(isAttacked);

    // Network Links
    const links = [];
    const addLink = (id, p1, p2, color = 0x00f2fe) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...p1),
        new THREE.Vector3(...p2),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: isAttacked ? 0xff1744 : color,
        transparent: true,
        opacity: 0.65,
        linewidth: 2,
      });
      const line = new THREE.Line(geo, mat);
      line.userData = { id, p1, p2, defaultColor: color };
      networkGroup.add(line);
      links.push(line);
      return line;
    };

    addLink('Alice-Bob', [-1.6, 0, 0], [1.6, 0, -1.0], 0x00f2fe);
    addLink('Alice-Charlie', [-1.6, 0, 0], [1.6, 0, 1.0], 0x38bdf8);
    addLink('Bob-Charlie', [1.6, 0, -1.0], [1.6, 0, 1.0], 0x00e676);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const light = new THREE.PointLight(0x00f2fe, 1.4, 10);
    light.position.set(0, 3, 2);
    scene.add(light);

    // Interactive Raycaster for Hover & Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getIntersectedNode = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const visibleNodes = nodeMeshes.filter((m) => m.visible);
      const intersects = raycaster.intersectObjects(visibleNodes);
      return intersects.length > 0 ? intersects[0].object.userData.name : null;
    };

    let prevHovered = null;
    const handlePointerMove = (e) => {
      const nodeName = getIntersectedNode(e);
      if (nodeName !== prevHovered) {
        prevHovered = nodeName;
        setHoveredNode(nodeName);
        renderer.domElement.style.cursor = nodeName ? 'pointer' : 'default';
      }
    };

    const handleClick = (e) => {
      const nodeName = getIntersectedNode(e);
      if (nodeName) {
        setSelectedNode(nodeName);
        if (onNodeSelect) onNodeSelect(nodeName);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    let reqId = null;
    let isDisposed = false;
    let isVisible = true;

    const animate = () => {
      if (isDisposed) return;
      if (!isVisible) {
        reqId = null;
        return; // Pause rAF loop when off-screen!
      }

      reqId = requestAnimationFrame(animate);

      // Gentle rotation of the entire network mesh
      networkGroup.rotation.y += 0.004;

      const { hoveredNode: hN, selectedNode: sN, propActiveNode: pN, activeLink: aL, isAttacked: attNow } = interactionRef.current;
      const activeName = hN || sN || pN;

      // Update Eve node visibility smoothly from ref
      if (eveMesh.visible !== Boolean(attNow)) {
        eveMesh.visible = Boolean(attNow);
      }

      // Update node emissive glow based on active selection
      nodeMeshes.forEach((mesh) => {
        const isCurrent = mesh.userData.name === activeName;
        if (isCurrent) {
          mesh.material.emissiveIntensity = 0.85;
          mesh.scale.set(1.22, 1.22, 1.22);
        } else {
          mesh.material.emissiveIntensity = 0.35;
          mesh.scale.set(1.0, 1.0, 1.0);
        }
      });

      // Update link opacities based on active link
      links.forEach((l) => {
        const matches = aL === 'all' || l.userData.id === aL || (aL && aL.includes(activeName));
        l.material.opacity = matches ? 0.95 : 0.28;
        l.material.color.setHex(attNow ? 0xff1744 : l.userData.defaultColor);
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

    return () => {
      isDisposed = true;
      observer.disconnect();
      if (reqId) cancelAnimationFrame(reqId);
      if (renderer?.domElement) {
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        renderer.domElement.removeEventListener('click', handleClick);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }

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
      <div className="network-topology-embedded" style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', minHeight: 0 }}>
        <div
          ref={mountRef}
          className="topology-canvas-mount"
          style={{
            width: '100%',
            height: `${canvasHeight}px`,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '6px',
            background: 'rgba(5, 7, 13, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        />

        {/* Compact Active Node Callout */}
        <div
          style={{
            marginTop: '8px',
            padding: '6px 10px',
            borderRadius: '6px',
            background: 'rgba(5, 7, 13, 0.65)',
            border: `1px solid ${activeDetail.color}44`,
            fontSize: '0.68rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <strong style={{ color: activeDetail.color, fontSize: '0.74rem' }}>{activeDetail.name}</strong>
            <span style={{ color: '#94a3b8', marginLeft: '6px', fontSize: '0.64rem' }}>({activeDetail.title.split(' ')[0]})</span>
          </div>
          <div style={{ color: activeDetail.metrics[0]?.alert ? '#f43f5e' : '#10b981', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.64rem', fontWeight: 700 }}>
            {activeDetail.metrics[0]?.value}
          </div>
        </div>

        {/* Interactive Node Selector Buttons */}
        <div className="topology-legend" style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', padding: '8px 4px 0 4px' }}>
          <span
            onClick={() => { setSelectedNode('Alice'); if (onNodeSelect) onNodeSelect('Alice'); }}
            style={{ cursor: 'pointer', opacity: selectedNode === 'Alice' ? 1 : 0.6, color: selectedNode === 'Alice' ? '#00f2fe' : '#94a3b8', fontWeight: selectedNode === 'Alice' ? 700 : 400 }}
          >
            ● Alice (Signer)
          </span>
          <span
            onClick={() => { setSelectedNode('Bob'); if (onNodeSelect) onNodeSelect('Bob'); }}
            style={{ cursor: 'pointer', opacity: selectedNode === 'Bob' ? 1 : 0.6, color: selectedNode === 'Bob' ? '#00e676' : '#94a3b8', fontWeight: selectedNode === 'Bob' ? 700 : 400 }}
          >
            ● Bob (Recipient)
          </span>
          <span
            onClick={() => { setSelectedNode('Charlie'); if (onNodeSelect) onNodeSelect('Charlie'); }}
            style={{ cursor: 'pointer', opacity: selectedNode === 'Charlie' ? 1 : 0.6, color: selectedNode === 'Charlie' ? '#ffd600' : '#94a3b8', fontWeight: selectedNode === 'Charlie' ? 700 : 400 }}
          >
            ● Charlie (Verifier)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="network-topology-widget">
      <div className="widget-header">
        <div>
          <span className="viz-badge">CLICK NODE TO INSPECT ROLE</span>
          <h4>Quantum QDS Network Graph</h4>
        </div>
        <span className={`pill-tag ${pillClass || (isAttacked ? 'pill-danger' : 'pill-cyan')}`}>
          {badgeText || (isAttacked ? '🚨 Rogue Interceptor Active' : '🔒 Secure Mesh Links')}
        </span>
      </div>

      <div ref={mountRef} className="topology-canvas-mount" />

      {/* Interactive Live Entity Callout Box */}
      <div
        style={{
          marginTop: '0.6rem',
          padding: '0.6rem 0.8rem',
          borderRadius: '8px',
          background: 'rgba(10, 17, 40, 0.85)',
          border: `1px solid ${activeDetail.color}44`,
          fontSize: '0.74rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <strong style={{ color: activeDetail.color, fontSize: '0.82rem' }}>
            {activeDetail.name} — {activeDetail.title}
          </strong>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            Active Mesh Node
          </span>
        </div>
        <p style={{ margin: '0 0 6px 0', color: '#cbd5e1', fontSize: '0.72rem', lineHeight: '1.4' }}>
          {activeDetail.role}
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px' }}>
          {activeDetail.metrics.map((m, idx) => (
            <div key={idx} style={{ fontSize: '0.68rem', color: m.alert ? '#ff5252' : '#94a3b8' }}>
              <span>{m.label}: </span>
              <strong style={{ color: m.alert ? '#ff5252' : '#ffffff', fontFamily: 'var(--font-mono)' }}>
                {m.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Interactive Node Buttons */}
      <div className="topology-legend" style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
        <span
          onClick={() => { setSelectedNode('Alice'); if (onNodeSelect) onNodeSelect('Alice'); }}
          style={{ cursor: 'pointer', opacity: selectedNode === 'Alice' ? 1 : 0.65 }}
        >
          <strong style={{ color: '#00f2fe' }}>Alice</strong> (Signer)
        </span>
        <span
          onClick={() => { setSelectedNode('Bob'); if (onNodeSelect) onNodeSelect('Bob'); }}
          style={{ cursor: 'pointer', opacity: selectedNode === 'Bob' ? 1 : 0.65 }}
        >
          <strong style={{ color: '#00e676' }}>Bob</strong> (Recipient)
        </span>
        <span
          onClick={() => { setSelectedNode('Charlie'); if (onNodeSelect) onNodeSelect('Charlie'); }}
          style={{ cursor: 'pointer', opacity: selectedNode === 'Charlie' ? 1 : 0.65 }}
        >
          <strong style={{ color: '#ffd600' }}>Charlie</strong> (Verifier)
        </span>
      </div>
    </div>
  );
}

export default memo(NetworkTopology3DComponent);
