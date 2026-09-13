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
      color: '#f43f5e',
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
      color: '#ef4444',
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
      color: '#e11d48',
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
    const height = canvasHeight || (embedded ? 200 : 340);

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
      const newHeight = container.clientHeight || height;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    const ro = new ResizeObserver(handleResize);
    try {
      ro.observe(container);
    } catch (e) {
      return;
    }

    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // Grid plane in deep red/obsidian
    const gridHelper = new THREE.GridHelper(5, 8, 0x5c1422, 0x22050b);
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

    // Node Meshes (optimized 16 segments in Red Spectrum)
    const nodeMeshes = [];
    const createNodeMesh = (name, color, pos) => {
      const geo = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 16);
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        shininess: 80,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.userData = { name, baseColor: color, basePos: pos };
      networkGroup.add(mesh);
      nodeMeshes.push(mesh);

      // Add label floating above node (Crisp High-Contrast White Text)
      const label = createNodeLabelSprite(name, '#ffffff');
      label.position.set(pos[0], pos[1] + 0.38, pos[2]);
      networkGroup.add(label);

      return mesh;
    };

    createNodeMesh('Alice', 0xf43f5e, [-1.6, 0, 0]);
    createNodeMesh('Bob', 0xef4444, [1.6, 0, -1.0]);
    createNodeMesh('Charlie', 0xe11d48, [1.6, 0, 1.0]);
    const eveMesh = createNodeMesh('Eve', 0xff1744, [0, 0, 0]);
    eveMesh.visible = Boolean(isAttacked);

    // Network Links in Red Spectrum
    const links = [];
    const addLink = (id, p1, p2, color = 0xf43f5e) => {
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

    addLink('Alice-Bob', [-1.6, 0, 0], [1.6, 0, -1.0], 0xf43f5e);
    addLink('Alice-Charlie', [-1.6, 0, 0], [1.6, 0, 1.0], 0xe11d48);
    addLink('Bob-Charlie', [1.6, 0, -1.0], [1.6, 0, 1.0], 0xfb7185);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const light = new THREE.PointLight(0xff2438, 1.6, 10);
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
      <div className="network-topology-embedded">
        <div
          ref={mountRef}
          className="topology-canvas-mount"
          style={{ height: `${canvasHeight}px` }}
        />

        {/* Compact Active Node Callout */}
        <div className="topology-node-callout">
          <div>
            <strong className="topology-node-name" style={{ color: activeDetail.color }}>{activeDetail.name}</strong>
            <span className="topology-node-sub">({activeDetail.title.split(' ')[0]})</span>
          </div>
          <div className={`topology-node-metric-val ${activeDetail.metrics[0]?.alert ? 'is-alert' : 'is-nominal'}`}>
            {activeDetail.metrics[0]?.value}
          </div>
        </div>

        {/* Interactive Node Selector Buttons */}
        <div className="topology-legend">
          <span
            onClick={() => { setSelectedNode('Alice'); if (onNodeSelect) onNodeSelect('Alice'); }}
            className={`topology-node-btn is-node-alice ${selectedNode === 'Alice' ? 'is-selected' : ''}`}
          >
            ● Alice (Signer)
          </span>
          <span
            onClick={() => { setSelectedNode('Bob'); if (onNodeSelect) onNodeSelect('Bob'); }}
            className={`topology-node-btn is-node-bob ${selectedNode === 'Bob' ? 'is-selected' : ''}`}
          >
            ● Bob (Recipient)
          </span>
          <span
            onClick={() => { setSelectedNode('Charlie'); if (onNodeSelect) onNodeSelect('Charlie'); }}
            className={`topology-node-btn is-node-charlie ${selectedNode === 'Charlie' ? 'is-selected' : ''}`}
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
          {badgeText || (isAttacked ? 'ROGUE INTERCEPTOR ACTIVE' : 'SECURE MESH LINKS')}
        </span>
      </div>

      <div ref={mountRef} className="topology-canvas-mount" />

      {/* Interactive Live Entity Callout Box */}
      <div className="topology-node-callout-full">
        <div className="topology-node-callout-full-header">
          <strong className="topology-node-callout-full-title" style={{ color: activeDetail.color }}>
            {activeDetail.name} — {activeDetail.title}
          </strong>
          <span className="topology-node-callout-full-sub">
            Active Mesh Node
          </span>
        </div>
        <p className="topology-node-callout-full-role">
          {activeDetail.role}
        </p>
        <div className="topology-node-callout-full-metrics">
          {activeDetail.metrics.map((m, idx) => (
            <div key={idx} className={`topology-node-metric-item ${m.alert ? 'is-alert' : ''}`}>
              <span>{m.label}: </span>
              <strong className={`topology-node-metric-num ${m.alert ? 'is-alert' : ''}`}>
                {m.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Interactive Node Buttons */}
      <div className="topology-legend">
        <span
          onClick={() => { setSelectedNode('Alice'); if (onNodeSelect) onNodeSelect('Alice'); }}
          className={`topology-node-btn is-node-alice ${selectedNode === 'Alice' ? 'is-selected' : ''}`}
        >
          <strong>Alice</strong> (Signer)
        </span>
        <span
          onClick={() => { setSelectedNode('Bob'); if (onNodeSelect) onNodeSelect('Bob'); }}
          className={`topology-node-btn is-node-bob ${selectedNode === 'Bob' ? 'is-selected' : ''}`}
        >
          <strong>Bob</strong> (Recipient)
        </span>
        <span
          onClick={() => { setSelectedNode('Charlie'); if (onNodeSelect) onNodeSelect('Charlie'); }}
          className={`topology-node-btn is-node-charlie ${selectedNode === 'Charlie' ? 'is-selected' : ''}`}
        >
          <strong>Charlie</strong> (Verifier)
        </span>
      </div>
    </div>
  );
}

export default memo(NetworkTopology3DComponent);
