/**
 * QuantumCoreAnomaly.jsx
 * ======================
 * Interactive WebGL / Three.js 3D Quantum Anomaly for the HyperQDS Hero.
 * 
 * Refined Quantum Palette:
 * - Base: Deep near-black void core
 * - Primary Accent: Refined violet / lavender (#D8B4FE, #C084FC)
 * - Secondary Accent: Cool blue-violet / subtle indigo (#818CF8, #6366F1)
 * - Highlight: Restrained white/lavender glow (zero neon green)
 * 
 * Multi-layer Spatial Depth:
 * - Foreground: Subtle floating quantum particles spanning viewport breadth
 * - Middle: Simplex noise deformed quantum anomaly with fresnel rim
 * - Background: Volumetric luminous aura + subtle ambient flux rings
 * - Smooth scroll-linked depth and damped pointer parallax
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Vertex Shader with organic fluid spherical noise displacement
const vertexShader = `
  uniform float uTime;
  uniform float uDistortion;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  // GLSL Simplex Noise implementation
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    // Organic harmonic wave displacement
    float n1 = snoise(position * 1.5 + vec3(uTime * 0.32));
    float n2 = snoise(position * 2.8 - vec3(uTime * 0.5)) * 0.45;
    vNoise = n1 + n2;

    vec3 newPos = position + normal * (vNoise * uDistortion);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

// Fragment Shader: Refined Violet, Cool Blue-Violet, and Restrained Lavender Highlights
const fragmentShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  void main() {
    // Fresnel calculation for rim glow
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.4);

    // Premium Color Palette:
    // Deep Near-Black -> Rich Violet -> Soft Lavender -> Cool Blue-Violet
    vec3 voidCore = vec3(0.02, 0.015, 0.04);
    vec3 richViolet = vec3(0.38, 0.16, 0.65);       // #6129A6
    vec3 softLavender = vec3(0.78, 0.62, 0.98);      // #C79EFA
    vec3 coolBlueViolet = vec3(0.50, 0.58, 0.96);   // #8094F5

    float pulse = 0.5 + 0.5 * sin(uTime * 1.1);
    float innerGradient = clamp((vNoise + 0.6) * 0.85, 0.0, 1.0);

    vec3 baseCore = mix(voidCore, richViolet, innerGradient);
    vec3 mantle = mix(baseCore, softLavender, fresnel * 0.85);
    vec3 finalGlow = mix(mantle, coolBlueViolet, pow(fresnel, 3.5) * 0.35 * pulse);

    gl_FragColor = vec4(finalGlow, 0.92);
  }
`;

export default function QuantumCoreAnomaly({ isHero = true, className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (isHero ? 780 : 380);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.1, isHero ? 3.1 : 3.4);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL init error:', e);
      return;
    }

    // 1. Quantum Anomaly Core Mesh with Custom Noise Shader
    const coreRadius = isHero ? 1.2 : 1.05;
    const coreGeo = new THREE.IcosahedronGeometry(coreRadius, 54);
    const coreUniforms = {
      uTime: { value: 0.0 },
      uDistortion: { value: isHero ? 0.30 : 0.26 },
    };
    const coreMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: coreUniforms,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const anomalyMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(anomalyMesh);

    // 2. Volumetric Outer Luminous Aura (Additive Soft Violet Halo)
    const auraRadius = coreRadius * 1.25;
    const auraGeo = new THREE.SphereGeometry(auraRadius, 32, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x6129a6,
      transparent: true,
      opacity: isHero ? 0.22 : 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    scene.add(auraMesh);

    // 3. Subtle Cool Blue-Violet Equatorial Flux Ring
    const ringGeo = new THREE.TorusGeometry(auraRadius * 1.1, 0.009, 16, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });
    const fluxRing = new THREE.Mesh(ringGeo, ringMat);
    fluxRing.rotation.x = Math.PI / 3.2;
    scene.add(fluxRing);

    // 4. Multi-layer Floating Quantum Particle Field
    const pCount = isHero ? 140 : 80;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pSpeed = new Float32Array(pCount);
    const pRadius = new Float32Array(pCount);
    const pAngle = new Float32Array(pCount);
    const pYOffset = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
      pRadius[i] = (isHero ? 1.35 : 1.15) + Math.random() * (isHero ? 1.1 : 0.6);
      pAngle[i] = Math.random() * Math.PI * 2;
      pSpeed[i] = 0.25 + Math.random() * 0.55;
      pYOffset[i] = (Math.random() - 0.5) * (isHero ? 1.4 : 0.7);
      pPos[i * 3] = Math.cos(pAngle[i]) * pRadius[i];
      pPos[i * 3 + 1] = pYOffset[i];
      pPos[i * 3 + 2] = Math.sin(pAngle[i]) * pRadius[i];
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xd8b4fe,
      size: isHero ? 0.035 : 0.03,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Pointer Parallax State
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      if (prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * (isHero ? 0.35 : 0.25);
      targetY = y * (isHero ? 0.25 : 0.2);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Scroll-Linked Depth & Scale State
    let targetScrollY = 0;
    let currentScrollY = 0;

    const handleScroll = () => {
      if (prefersReducedMotion) return;
      targetScrollY = window.scrollY || document.documentElement.scrollTop;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    let reqId;
    let isDisposed = false;
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      reqId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update shader uniforms
      coreUniforms.uTime.value = prefersReducedMotion ? elapsed * 0.15 : elapsed;

      // Ambient rotation of anomaly and flux elements
      const rotSpeed = prefersReducedMotion ? 0.03 : 0.14;
      anomalyMesh.rotation.y = elapsed * rotSpeed;
      anomalyMesh.rotation.z = Math.sin(elapsed * rotSpeed * 0.7) * 0.06;
      auraMesh.rotation.y = -elapsed * (rotSpeed * 0.7);
      fluxRing.rotation.z = elapsed * (rotSpeed * 0.4);
      fluxRing.rotation.y = Math.sin(elapsed * rotSpeed * 0.3) * 0.15;

      // Subtle breathing pulse
      const pulse = 1.0 + Math.sin(elapsed * 1.4) * 0.035;
      auraMesh.scale.set(pulse, pulse, pulse);

      // Orbiting particles
      const posArray = pGeo.attributes.position.array;
      for (let i = 0; i < pCount; i++) {
        pAngle[i] += delta * pSpeed[i] * (prefersReducedMotion ? 0.2 : 1.0);
        posArray[i * 3] = Math.cos(pAngle[i]) * pRadius[i];
        posArray[i * 3 + 1] = pYOffset[i] + Math.sin(pAngle[i] * 1.8) * 0.06;
        posArray[i * 3 + 2] = Math.sin(pAngle[i]) * pRadius[i];
      }
      pGeo.attributes.position.needsUpdate = true;
      particles.rotation.y = elapsed * (rotSpeed * 0.5);

      // Damped pointer parallax
      mouseX += (targetX - mouseX) * 0.045;
      mouseY += (targetY - mouseY) * 0.045;

      // Apple-style smooth scroll-linked depth & positioning
      currentScrollY += (targetScrollY - currentScrollY) * 0.055;

      if (isHero) {
        // Recede in depth gracefully with scroll
        const scrollOffsetY = currentScrollY * 0.0012;
        const scrollOffsetZ = currentScrollY * 0.0007;
        const scrollScale = Math.max(0.78, 1.0 - currentScrollY * 0.00028);

        camera.position.x = mouseX;
        camera.position.y = 0.1 + mouseY - scrollOffsetY;
        camera.position.z = 3.1 + scrollOffsetZ;
        camera.lookAt(0, -scrollOffsetY * 0.4, 0);

        anomalyMesh.scale.setScalar(scrollScale);
        auraMesh.scale.setScalar(pulse * scrollScale);
      } else {
        camera.position.x = mouseX;
        camera.position.y = mouseY;
        camera.lookAt(0, 0, 0);
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!container || isDisposed || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || (isHero ? 780 : 380);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      isDisposed = true;
      cancelAnimationFrame(reqId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (renderer) {
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, [isHero]);

  return (
    <div
      ref={mountRef}
      className={`quantum-core-anomaly-mount ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
}
