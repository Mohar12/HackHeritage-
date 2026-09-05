/**
 * QuantumEntanglementCanvas.jsx
 * =============================
 * Liquid Brokers Visual System & Cinematic Quantum Fluid Model.
 * 
 * Upgraded 3D Sphere Specifications:
 * - Massive perceived scale (1.45x radius 4.8, 128x128 high subdivision)
 * - 75–85% dense visual body (dark liquid metal / deep water absorption base)
 * - Broad, slow, continuous liquid waves covering the entire globe
 * - Colored torchlight reflection with stretched wave-ridge highlights
 * - Narrative color progression: Deep Violet/Indigo -> Muted Magenta -> Dark Burgundy/Crimson
 * - Synchronized reflection response to active Pillar (01 / 02 / 03)
 * - Controlled end-of-scroll recession as user reaches the closing CTA and footer
 * - Time-aware exponential damping for 60Hz/120Hz/144Hz consistency
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Vertex shader: Broad, slow, continuous liquid waves and surface normal perturbation
const fluidVertexShader = `
  uniform float uTime;
  uniform float uScroll;
  uniform float uScrollVelocity;
  uniform float uTurbulence;
  uniform float uInternalFlux;
  uniform vec2 uPointer;
  uniform float uPointerActive;
  uniform float uNoiseAmplitude;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vPosition;
  varying float vRippleElevation;
  varying float vWaveRidge;

  void main() {
    vPosition = position;
    vec3 p = position;
    vec3 n = normalize(position);
    
    // Slow cinematic wave time (calm, majestic deep water)
    float t = uTime * 0.26;
    
    // 1. Primary macro wave (broad wavelength traversing diagonally across sphere)
    float phase1 = (p.x * 0.36 + p.y * 0.44 + p.z * 0.28) - t * 0.92;
    float wave1 = sin(phase1) * 0.36 * uNoiseAmplitude;
    
    // 2. Broad secondary wave (wrapping around the sphere in opposing direction)
    float phase2 = (p.z * 0.42 - p.x * 0.38 + p.y * 0.22) + t * 0.72;
    float wave2 = sin(phase2) * 0.25 * uNoiseAmplitude;
    
    // 3. Equatorial deep water surge (slow breathing deformation)
    float phase3 = sin(p.x * 0.22 + t * 0.52) * cos(p.z * 0.26 - t * 0.42);
    float wave3 = phase3 * 0.22 * uNoiseAmplitude;
    
    // 4. Smooth continuous crest wave
    float phase4 = length(p.xy) * 0.72 - t * 0.62;
    float wave4 = cos(phase4 + p.z * 0.28) * 0.14 * uNoiseAmplitude;
    
    // 5. Very subtle micro detail (organic liquid tension)
    float phase5 = (p.x * 1.15 + p.y * 0.95 - p.z * 0.85) - t * 1.15;
    float wave5 = sin(phase5) * 0.035 * uNoiseAmplitude;
    
    // 6. Interactive pointer wake (expanding liquid ripple)
    vec3 pointerDir = normalize(vec3(uPointer.x * 2.5, uPointer.y * 2.5, 3.5));
    float distToPointer = length(n - pointerDir);
    float pointerWave = sin(distToPointer * 5.2 - uTime * 1.5) * exp(-distToPointer * 1.1) * (0.18 * uPointerActive);
    
    // 7. Viscous scroll mass inertia
    float scrollSurge = sin(p.y * 0.75 + t * 0.85) * (uScrollVelocity * 0.22);
    
    // Total displacement along normal
    float totalElevation = wave1 + wave2 + wave3 + wave4 + wave5 + pointerWave + scrollSurge;
    vRippleElevation = totalElevation;
    vWaveRidge = totalElevation;
    
    vec3 displaced = p + n * totalElevation;
    
    // Accurate normal perturbation for metallic reflections across waves
    vec3 tangentX = vec3(-p.y, p.x, 0.0);
    vec3 tangentY = cross(n, tangentX);
    float dTx = cos(phase1) * 0.28 + cos(phase2) * (-0.20) + cos(distToPointer * 5.2 - uTime * 1.5) * 0.15 * uPointerActive;
    float dTy = cos(phase1) * 0.24 + cos(phase2) * 0.18;
    vec3 perturbedNormal = normalize(n - (tangentX * dTx + tangentY * dTy) * 0.42);
    
    vNormal = normalize(normalMatrix * perturbedNormal);
    
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    
    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader: Dark liquid-metal / Water with colored torchlight reflection
const fluidFragmentShader = `
  uniform float uTime;
  uniform float uScroll;
  uniform float uScrollVelocity;
  uniform float uTurbulence;
  uniform float uInternalFlux;
  uniform float uFresnelPower;
  uniform float uFresnelStrength;
  uniform float uOpacity;
  
  // State Machine Blend Weights
  uniform float uWireframeMix;
  uniform float uFillDensity;
  uniform float uSmokeMix;
  uniform float uSplitMix;
  
  // Interpolated Color Tokens
  uniform vec3 uColorDeepVoid;
  uniform vec3 uColorCore;
  uniform vec3 uColorMid;
  uniform vec3 uColorBright;
  uniform vec3 uColorTorchGlint; // Colored torch reflection
  uniform vec3 uColorSpecGlint;  // Sharp specular glint
  uniform vec3 uColorRim;        // Edge reflection tint
  uniform vec3 uColorWireframe;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vPosition;
  varying float vRippleElevation;
  varying float vWaveRidge;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float NdotV = max(0.0, dot(normal, viewDir));
    
    // 1. Primary Colored Torch Light Source (Sweeping angled light across dark water)
    vec3 lightDir1 = normalize(vec3(0.95, 1.25, 1.65));
    vec3 halfDir1 = normalize(lightDir1 + viewDir);
    float NdotH1 = max(0.0, dot(normal, halfDir1));
    
    // Sharp specular wave-ridge glint
    float sharpSpec1 = pow(NdotH1, 140.0) * 2.8;
    // Mid-tier curved wave reflection (stretched across wave ridges)
    float midSpec1 = pow(NdotH1, 38.0) * 1.15;
    
    // 2. Secondary Opposing Torch (Catch light from opposite quadrant)
    vec3 lightDir2 = normalize(vec3(-1.3, -0.65, 1.15));
    vec3 halfDir2 = normalize(lightDir2 + viewDir);
    float NdotH2 = max(0.0, dot(normal, halfDir2));
    float secondarySpec = pow(NdotH2, 64.0) * 0.95;
    
    // 3. Fresnel Reflectance (Water-like grazing reflection)
    float fresnel = pow(1.0 - NdotV, uFresnelPower);
    
    // 4. Wave Ridge vs Trough Lighting:
    // Wave ridges catch bright torch reflection; troughs remain deep, dark liquid
    float ridgeFactor = smoothstep(-0.15, 0.32, vWaveRidge);
    float troughShadow = smoothstep(0.12, -0.22, vWaveRidge);
    
    // 5. Dark Liquid-Metal Base
    // Center facing camera is deep near-black liquid
    vec3 liquidBase = mix(uColorDeepVoid, uColorCore, 0.85);
    liquidBase = mix(liquidBase, uColorMid, (1.0 - troughShadow * 0.6) * 0.35);
    
    // 6. Colored Torch Reflection Synthesis
    // Torch reflection bends around wave curvature
    vec3 torchReflection = uColorTorchGlint * (midSpec1 * (0.6 + 0.6 * ridgeFactor));
    // Bright specular highlight at the wave apex
    torchReflection += uColorSpecGlint * (sharpSpec1 + secondarySpec * 0.7);
    
    // Secondary rim reflection along silhouette
    vec3 rimLight = mix(uColorRim, uColorTorchGlint, 0.45) * (fresnel * 1.35 * uFresnelStrength);
    
    // Internal liquid luminescence (subtle optical depth)
    float corePulse = (sin(uTime * 0.8) * 0.12 + 0.88);
    float internalDepth = clamp(1.0 - length(vPosition) / 4.8, 0.0, 1.0);
    vec3 internalGlow = uColorMid * (pow(internalDepth, 1.8) * corePulse * 0.4);
    
    // Combine Metallic / Water Surface
    vec3 metallicSurface = liquidBase + torchReflection + rimLight + internalGlow;
    
    // 7. Procedural Structural Line-Arcs (Act 2 Problem & Comparison Left)
    float lat = sin(vPosition.y * 12.0 + uTime * 0.25);
    float latLine = smoothstep(0.92, 0.985, abs(lat));
    float lonAngle = atan(vPosition.z, vPosition.x);
    float lon = sin(lonAngle * 16.0 + uTime * 0.2);
    float lonLine = smoothstep(0.90, 0.985, abs(lon));
    float diag = sin((vPosition.x * 0.6 + vPosition.y * 0.6 + vPosition.z * 0.6) * 8.0 - uTime * 0.35);
    float diagLine = smoothstep(0.93, 0.985, abs(diag));
    float wireframeRays = max(max(latLine, lonLine), diagLine * 0.75);
    
    vec3 wireframeGlow = uColorWireframe * (wireframeRays * 2.2 + fresnel * 1.1);
    vec3 structuralColor = mix(uColorDeepVoid * 0.4, uColorCore * 0.7, wireframeRays * 0.3) + wireframeGlow;
    structuralColor += uColorSpecGlint * (sharpSpec1 * 0.8);
    
    vec3 finalColor = mix(metallicSurface, structuralColor, uWireframeMix);
    
    // 8. Volumetric Smoke State (Closing Act)
    if (uSmokeMix > 0.001) {
      float smokeDensity = sin(vPosition.x * 2.2 + uTime * 0.4) * cos(vPosition.y * 1.8 - uTime * 0.3) * 0.5 + 0.5;
      vec3 smokeGlow = mix(uColorDeepVoid, uColorTorchGlint * 0.65, pow(smokeDensity, 1.6) * fresnel);
      finalColor = mix(finalColor, smokeGlow, uSmokeMix);
    }
    
    // 9. Comparison Split Treatment (Act 4)
    if (uSplitMix > 0.001) {
      float splitEdge = smoothstep(-0.25, 0.25, vWorldPosition.x);
      vec3 classicalSide = structuralColor;
      float stressFlicker = sin(uTime * 14.0 + vPosition.y * 6.0) * 0.5 + 0.5;
      vec3 stressColor = vec3(0.85, 0.22, 0.22);
      classicalSide = mix(classicalSide, stressColor * 0.75, wireframeRays * 0.45);
      vec3 splitComposite = mix(classicalSide, metallicSurface, splitEdge);
      finalColor = mix(finalColor, splitComposite, uSplitMix);
    }
    
    // 10. Opacity: 75–85% Solid Visual Presence with subtle translucent rim
    float baseAlpha = mix(0.82 * uFillDensity, 0.94, fresnel * 0.8);
    float alpha = uOpacity * clamp(baseAlpha + wireframeRays * uWireframeMix * 0.3, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Halo vertex shader: Camera-facing planar billboard coordinates for ambient light pool
const haloVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Halo fragment shader: Soft radial ambient light pool (bright center falling off smoothly to edge)
const haloFragmentShader = `
  uniform vec3 uGlowColor;
  uniform float uGlowIntensity;
  uniform float uPulse;

  varying vec2 vUv;

  void main() {
    float dist = length(vUv - vec2(0.5)) * 2.0; // 0.0 at center, 1.0 at outer circle
    if (dist > 1.0) discard;
    
    // Soft wide atmospheric ambient light pool falloff (no hollow ring)
    float pool = pow(clamp(1.0 - dist, 0.0, 1.0), 2.2);
    float glow = pool * (0.80 + 0.20 * uPulse) * uGlowIntensity;
    gl_FragColor = vec4(uGlowColor, glow);
  }
`;

export default function QuantumEntanglementCanvas({ activePillar = '01' }) {
  const mountRef = useRef(null);
  const activePillarRef = useRef(activePillar);

  useEffect(() => {
    activePillarRef.current = activePillar;
  }, [activePillar]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 14);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      // Hard cap devicePixelRatio at 1.5
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL init failed:', e);
      return;
    }

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Massive 3D hero object geometry (scale increased by 1.45x: radius 4.8, 128x128 subdivision)
    const heroGeometry = new THREE.SphereGeometry(4.8, 128, 128);

    // Initial Material State: Deep Violet Liquid Metal
    const heroMaterial = new THREE.ShaderMaterial({
      vertexShader: fluidVertexShader,
      fragmentShader: fluidFragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uScrollVelocity: { value: 0 },
        uTurbulence: { value: 0 },
        uInternalFlux: { value: 0.2 },
        uNoiseAmplitude: { value: prefersReducedMotion ? 0.2 : 1.0 },
        uFresnelPower: { value: 2.8 },
        uFresnelStrength: { value: 1.1 },
        uOpacity: { value: 0.94 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPointerActive: { value: 0 },
        uWireframeMix: { value: 0 },
        uFillDensity: { value: 1.0 },
        uSmokeMix: { value: 0 },
        uSplitMix: { value: 0 },
        uColorDeepVoid: { value: new THREE.Color(0x080711) },
        uColorCore: { value: new THREE.Color(0x111027) },
        uColorMid: { value: new THREE.Color(0x19163a) },
        uColorBright: { value: new THREE.Color(0x34245f) },
        uColorTorchGlint: { value: new THREE.Color(0x5a3fa8) },
        uColorSpecGlint: { value: new THREE.Color(0xa78bfa) },
        uColorRim: { value: new THREE.Color(0x6c5ce7) },
        uColorWireframe: { value: new THREE.Color(0x4c6fff) },
      },
    });

    const heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
    heroMesh.position.set(0, -2.8, 0);
    rootGroup.add(heroMesh);

    // Additive wide ambient light pool halo (1.65x blob radius, decoupled from blob spin)
    const haloGeometry = new THREE.PlaneGeometry(16, 16);
    const haloMaterial = new THREE.ShaderMaterial({
      vertexShader: haloVertexShader,
      fragmentShader: haloFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uGlowColor: { value: new THREE.Color(0x34245f) },
        uGlowIntensity: { value: 0.72 },
        uPulse: { value: 0 },
      },
    });

    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
    haloMesh.position.set(0, -2.8, -0.8);
    rootGroup.add(haloMesh);

    // Sparse background star/dust particles (35-45 count spec)
    const particleCount = 42;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 32;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      particlePositions[i * 3 + 2] = -4 - Math.random() * 14;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      color: 0x818cf8,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starParticles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(starParticles);

    // Passive scroll tracking
    let targetScroll = 0;
    let currentScroll = 0;
    let prevScroll = 0;
    let scrollVelocity = 0;

    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      targetScroll = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Mouse pointer interaction & parallax
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let pointerActive = 0;
    let pointerIdleTimer;

    const handlePointerMove = (e) => {
      if (prefersReducedMotion) return;
      mouseTargetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTargetY = -(e.clientY / window.innerHeight) * 2 + 1;
      pointerActive = 1.0;
      clearTimeout(pointerIdleTimer);
      pointerIdleTimer = setTimeout(() => {
        pointerActive = 0.0;
      }, 1800);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Resize
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Target state objects for smooth lerping
    const targetColors = {
      deepVoid: new THREE.Color(0x080711),
      core: new THREE.Color(0x111027),
      mid: new THREE.Color(0x19163a),
      bright: new THREE.Color(0x34245f),
      torchGlint: new THREE.Color(0x5a3fa8),
      specGlint: new THREE.Color(0xa78bfa),
      rim: new THREE.Color(0x6c5ce7),
      wireframe: new THREE.Color(0x4c6fff),
      halo: new THREE.Color(0x34245f),
    };

    // Color definitions for material state machine (Violet -> Magenta -> Burgundy progression)
    const stateColors = {
      // Act 1: Hero · Deep Violet / Indigo
      heroViolet: {
        deepVoid: new THREE.Color(0x080711),
        core: new THREE.Color(0x111027),
        mid: new THREE.Color(0x19163a),
        bright: new THREE.Color(0x34245f),
        torchGlint: new THREE.Color(0x5a3fa8),
        specGlint: new THREE.Color(0xa78bfa),
        rim: new THREE.Color(0x6c5ce7),
        wireframe: new THREE.Color(0x4c6fff),
        halo: new THREE.Color(0x34245f),
      },
      // Act 2: Problem · Wireframe Structural Blue-Violet
      problemBlue: {
        deepVoid: new THREE.Color(0x080711),
        core: new THREE.Color(0x0d1326),
        mid: new THREE.Color(0x182247),
        bright: new THREE.Color(0x2e3e75),
        torchGlint: new THREE.Color(0x4c6fff),
        specGlint: new THREE.Color(0x93c5fd),
        rim: new THREE.Color(0x60a5fa),
        wireframe: new THREE.Color(0x60a5fa),
        halo: new THREE.Color(0x253366),
      },
      // Act 3: Pillars (Dynamic sync based on active pillar)
      pillarP1: {
        // Pillar 01: Cyan-Indigo Bell Invariant
        deepVoid: new THREE.Color(0x080711),
        core: new THREE.Color(0x0f172a),
        mid: new THREE.Color(0x1e1b4b),
        bright: new THREE.Color(0x312e81),
        torchGlint: new THREE.Color(0x4f46e5),
        specGlint: new THREE.Color(0x818cf8),
        rim: new THREE.Color(0x2dd4bf),
        wireframe: new THREE.Color(0x6366f1),
        halo: new THREE.Color(0x3730a3),
      },
      pillarP2: {
        // Pillar 02: Violet / Muted Magenta Chi-Square
        deepVoid: new THREE.Color(0x080711),
        core: new THREE.Color(0x1b0f2e),
        mid: new THREE.Color(0x2e1065),
        bright: new THREE.Color(0x581c87),
        torchGlint: new THREE.Color(0x713a67),
        specGlint: new THREE.Color(0xc084fc),
        rim: new THREE.Color(0xa855f7),
        wireframe: new THREE.Color(0xd946ef),
        halo: new THREE.Color(0x4c1d95),
      },
      pillarP3: {
        // Pillar 03: Dark Crimson / Burgundy Unitary Correction
        deepVoid: new THREE.Color(0x080711),
        core: new THREE.Color(0x220815),
        mid: new THREE.Color(0x3b0716),
        bright: new THREE.Color(0x4c0519),
        torchGlint: new THREE.Color(0x6a293d),
        specGlint: new THREE.Color(0xfb7185),
        rim: new THREE.Color(0xf43f5e),
        wireframe: new THREE.Color(0xe11d48),
        halo: new THREE.Color(0x4a1f2d),
      },
      // Act 4: Comparison · Burgundy / Crimson vs Classical
      comparisonCrimson: {
        deepVoid: new THREE.Color(0x080711),
        core: new THREE.Color(0x1e0713),
        mid: new THREE.Color(0x3b0716),
        bright: new THREE.Color(0x50071c),
        torchGlint: new THREE.Color(0x6a293d),
        specGlint: new THREE.Color(0xfda4af),
        rim: new THREE.Color(0xe11d48),
        wireframe: new THREE.Color(0xe11d48),
        halo: new THREE.Color(0x4a1f2d),
      },
      // Act 5: Closing · Deep Ruby settling into dark void
      closingRuby: {
        deepVoid: new THREE.Color(0x05040a),
        core: new THREE.Color(0x14050d),
        mid: new THREE.Color(0x220715),
        bright: new THREE.Color(0x35151f),
        torchGlint: new THREE.Color(0x4a1f2d),
        specGlint: new THREE.Color(0xbe185d),
        rim: new THREE.Color(0x6a293d),
        wireframe: new THREE.Color(0x9f1239),
        halo: new THREE.Color(0x2b0c18),
      },
    };

    // Animation Loop with Time-Aware Delta Damping
    let animId;
    let lastTime = performance.now();
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsed = clock.getElapsedTime();

      // Time-aware exponential damping for scroll follow (~0.085 at 60fps)
      const scrollDampingFactor = 1.0 - Math.exp(-5.2 * delta);
      currentScroll += (targetScroll - currentScroll) * scrollDampingFactor;
      
      // Calculate scroll impulse velocity
      const instantVelocity = Math.abs(currentScroll - prevScroll) / Math.max(0.001, delta);
      scrollVelocity += (instantVelocity * 0.08 - scrollVelocity) * (1.0 - Math.exp(-7.0 * delta));
      prevScroll = currentScroll;

      // Damped pointer lerp
      const pointerFactor = 1.0 - Math.exp(-4.0 * delta);
      mouseX += (mouseTargetX - mouseX) * pointerFactor;
      mouseY += (mouseTargetY - mouseY) * pointerFactor;

      const p = currentScroll; // Continuous normalized progress [0, 1]
      const currentPillar = activePillarRef.current;

      // State machine parameter targets
      let targetX = 0;
      let targetY = -2.8;
      let targetScale = 1.0;
      let targetCameraZ = 14;
      let turbulence = 0;
      let internalFlux = 0.2;
      let fresnelPower = 2.8;
      let fresnelStrength = 1.1;
      let haloIntensity = 0.72;
      let wireframeMix = 0;
      let fillDensity = 1.0;
      let smokeMix = 0;
      let splitMix = 0;
      let noiseAmplitude = prefersReducedMotion ? 0.2 : 1.0;

      // ─────────────────────────────────────────────────────────────
      // ACT 1: HERO (0.00 - 0.18) · Deep Violet Liquid Metal
      // ─────────────────────────────────────────────────────────────
      if (p < 0.18) {
        const t = p / 0.18;
        targetX = 0;
        targetY = -2.8 + t * 0.4;
        targetScale = 1.0;
        targetCameraZ = 14 - t * 0.6;
        turbulence = 0.0;
        internalFlux = 0.25;
        fresnelPower = 2.8;
        fresnelStrength = 1.1;
        haloIntensity = 0.72;
        wireframeMix = 0.0;
        fillDensity = 1.0;
        smokeMix = 0.0;
        splitMix = 0.0;

        targetColors.deepVoid.copy(stateColors.heroViolet.deepVoid);
        targetColors.core.copy(stateColors.heroViolet.core);
        targetColors.mid.copy(stateColors.heroViolet.mid);
        targetColors.bright.copy(stateColors.heroViolet.bright);
        targetColors.torchGlint.copy(stateColors.heroViolet.torchGlint);
        targetColors.specGlint.copy(stateColors.heroViolet.specGlint);
        targetColors.rim.copy(stateColors.heroViolet.rim);
        targetColors.wireframe.copy(stateColors.heroViolet.wireframe);
        targetColors.halo.copy(stateColors.heroViolet.halo);
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 2: PROBLEM (0.18 - 0.38) · Wireframe / Structural State
      // ─────────────────────────────────────────────────────────────
      else if (p < 0.38) {
        const t = (p - 0.18) / 0.20;
        targetX = -1.2 * t;
        targetY = -2.4 + t * 0.7;
        targetScale = 0.95;
        targetCameraZ = 13.6;
        turbulence = t * 1.4;
        internalFlux = 0.85 * t;
        fresnelPower = 2.4;
        fresnelStrength = 1.25;
        haloIntensity = 0.65;
        wireframeMix = t;
        fillDensity = 1.0 - t * 0.72;
        smokeMix = 0.0;
        splitMix = 0.0;

        targetColors.deepVoid.lerpColors(stateColors.heroViolet.deepVoid, stateColors.problemBlue.deepVoid, t);
        targetColors.core.lerpColors(stateColors.heroViolet.core, stateColors.problemBlue.core, t);
        targetColors.mid.lerpColors(stateColors.heroViolet.mid, stateColors.problemBlue.mid, t);
        targetColors.bright.lerpColors(stateColors.heroViolet.bright, stateColors.problemBlue.bright, t);
        targetColors.torchGlint.lerpColors(stateColors.heroViolet.torchGlint, stateColors.problemBlue.torchGlint, t);
        targetColors.specGlint.lerpColors(stateColors.heroViolet.specGlint, stateColors.problemBlue.specGlint, t);
        targetColors.rim.lerpColors(stateColors.heroViolet.rim, stateColors.problemBlue.rim, t);
        targetColors.wireframe.lerpColors(stateColors.heroViolet.wireframe, stateColors.problemBlue.wireframe, t);
        targetColors.halo.lerpColors(stateColors.heroViolet.halo, stateColors.problemBlue.halo, t);
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 3: PILLARS (0.38 - 0.72) · Liquid Metallic with Active Pillar Sync
      // ─────────────────────────────────────────────────────────────
      else if (p < 0.72) {
        const t = (p - 0.38) / 0.34;
        targetX = 1.8 - Math.sin(t * Math.PI) * 0.4;
        targetY = -1.6 + Math.sin(t * Math.PI * 2.0) * 0.35;
        targetScale = 0.92;
        targetCameraZ = 13.8;
        turbulence = 0.0;
        internalFlux = 0.6;
        fresnelPower = 3.0;
        fresnelStrength = 1.2;
        haloIntensity = 0.75;
        wireframeMix = 0.0;
        fillDensity = 1.0;
        smokeMix = 0.0;
        splitMix = 0.0;

        // Dynamic sync to active selected pillar (01 / 02 / 03)
        let pillarState = stateColors.pillarP1;
        if (currentPillar === '02') {
          pillarState = stateColors.pillarP2;
        } else if (currentPillar === '03') {
          pillarState = stateColors.pillarP3;
        }

        targetColors.deepVoid.copy(pillarState.deepVoid);
        targetColors.core.copy(pillarState.core);
        targetColors.mid.copy(pillarState.mid);
        targetColors.bright.copy(pillarState.bright);
        targetColors.torchGlint.copy(pillarState.torchGlint);
        targetColors.specGlint.copy(pillarState.specGlint);
        targetColors.rim.copy(pillarState.rim);
        targetColors.wireframe.copy(pillarState.wireframe);
        targetColors.halo.copy(pillarState.halo);
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 4: COMPARISON (0.72 - 0.88) · Split Treatment
      // ─────────────────────────────────────────────────────────────
      else if (p < 0.88) {
        const t = (p - 0.72) / 0.16;
        targetX = 1.4 - t * 1.4;
        targetY = -1.8 - t * 0.3;
        targetScale = 0.96;
        targetCameraZ = 14.0;
        turbulence = (1.0 - t) * 0.3;
        internalFlux = 0.7;
        fresnelPower = 3.0;
        fresnelStrength = 1.2;
        haloIntensity = 0.72;
        wireframeMix = 0.0;
        fillDensity = 1.0;
        smokeMix = 0.0;
        splitMix = Math.min(1.0, t * 2.2);

        targetColors.deepVoid.copy(stateColors.comparisonCrimson.deepVoid);
        targetColors.core.copy(stateColors.comparisonCrimson.core);
        targetColors.mid.copy(stateColors.comparisonCrimson.mid);
        targetColors.bright.copy(stateColors.comparisonCrimson.bright);
        targetColors.torchGlint.copy(stateColors.comparisonCrimson.torchGlint);
        targetColors.specGlint.copy(stateColors.comparisonCrimson.specGlint);
        targetColors.rim.copy(stateColors.comparisonCrimson.rim);
        targetColors.wireframe.copy(stateColors.problemBlue.wireframe);
        targetColors.halo.copy(stateColors.comparisonCrimson.halo);
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 5: CLOSING & FOOTER (0.88 - 1.00) · Smooth Recession
      // ─────────────────────────────────────────────────────────────
      else {
        const t = (p - 0.88) / 0.12;
        targetX = 0;
        // As scroll approaches 1.0, globe recedes and sinks into the deep void behind footer
        targetY = -2.2 - t * 0.8;
        targetScale = 0.96 - t * 0.24; // recedes to ~0.72
        targetCameraZ = 14.0 + t * 1.2; // steps back in z
        turbulence = 0.0;
        internalFlux = 0.5 - t * 0.3;
        fresnelPower = 2.4;
        fresnelStrength = 0.8 - t * 0.3;
        haloIntensity = 0.65 - t * 0.38; // dims gracefully to 0.27
        wireframeMix = 0.0;
        fillDensity = 0.88;
        smokeMix = Math.min(1.0, t * 1.4);
        splitMix = Math.max(0.0, 1.0 - t * 3.0);
        noiseAmplitude = (prefersReducedMotion ? 0.2 : 1.0) * (1.0 - t * 0.38); // ripples calm down

        targetColors.deepVoid.lerpColors(stateColors.comparisonCrimson.deepVoid, stateColors.closingRuby.deepVoid, t);
        targetColors.core.lerpColors(stateColors.comparisonCrimson.core, stateColors.closingRuby.core, t);
        targetColors.mid.lerpColors(stateColors.comparisonCrimson.mid, stateColors.closingRuby.mid, t);
        targetColors.bright.lerpColors(stateColors.comparisonCrimson.bright, stateColors.closingRuby.bright, t);
        targetColors.torchGlint.lerpColors(stateColors.comparisonCrimson.torchGlint, stateColors.closingRuby.torchGlint, t);
        targetColors.specGlint.lerpColors(stateColors.comparisonCrimson.specGlint, stateColors.closingRuby.specGlint, t);
        targetColors.rim.lerpColors(stateColors.comparisonCrimson.rim, stateColors.closingRuby.rim, t);
        targetColors.wireframe.copy(stateColors.closingRuby.wireframe);
        targetColors.halo.lerpColors(stateColors.comparisonCrimson.halo, stateColors.closingRuby.halo, t);
      }

      // Time-aware exponential damping for mesh transforms
      const transformFactor = 1.0 - Math.exp(-5.2 * delta);
      heroMesh.position.x += (targetX - heroMesh.position.x) * transformFactor;
      heroMesh.position.y += (targetY - heroMesh.position.y) * transformFactor;
      
      const currentScale = heroMesh.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * transformFactor;
      heroMesh.scale.set(newScale, newScale, newScale);

      // Decoupled Ambient Halo Pool: positions behind blob, breathes smoothly
      haloMesh.position.set(heroMesh.position.x, heroMesh.position.y, heroMesh.position.z - 0.8);
      const breathe = Math.sin(elapsed * 1.2) * 0.035;
      const haloScale = newScale * (1.62 + breathe);
      haloMesh.scale.set(haloScale, haloScale, haloScale);

      camera.position.z += (targetCameraZ - camera.position.z) * transformFactor;

      // Uniform updates with exponential damping
      const uniformFactor = 1.0 - Math.exp(-6.5 * delta);
      heroMaterial.uniforms.uTime.value = elapsed;
      heroMaterial.uniforms.uScroll.value = p;
      heroMaterial.uniforms.uScrollVelocity.value = Math.min(scrollVelocity, 1.5);
      heroMaterial.uniforms.uNoiseAmplitude.value += (noiseAmplitude - heroMaterial.uniforms.uNoiseAmplitude.value) * uniformFactor;
      heroMaterial.uniforms.uPointer.value.set(mouseX, mouseY);
      heroMaterial.uniforms.uPointerActive.value += (pointerActive - heroMaterial.uniforms.uPointerActive.value) * pointerFactor;

      heroMaterial.uniforms.uTurbulence.value += (turbulence - heroMaterial.uniforms.uTurbulence.value) * uniformFactor;
      heroMaterial.uniforms.uInternalFlux.value += (internalFlux - heroMaterial.uniforms.uInternalFlux.value) * uniformFactor;
      heroMaterial.uniforms.uFresnelPower.value += (fresnelPower - heroMaterial.uniforms.uFresnelPower.value) * uniformFactor;
      heroMaterial.uniforms.uFresnelStrength.value += (fresnelStrength - heroMaterial.uniforms.uFresnelStrength.value) * uniformFactor;
      heroMaterial.uniforms.uWireframeMix.value += (wireframeMix - heroMaterial.uniforms.uWireframeMix.value) * uniformFactor;
      heroMaterial.uniforms.uFillDensity.value += (fillDensity - heroMaterial.uniforms.uFillDensity.value) * uniformFactor;
      heroMaterial.uniforms.uSmokeMix.value += (smokeMix - heroMaterial.uniforms.uSmokeMix.value) * uniformFactor;
      heroMaterial.uniforms.uSplitMix.value += (splitMix - heroMaterial.uniforms.uSplitMix.value) * uniformFactor;

      haloMaterial.uniforms.uPulse.value = Math.sin(elapsed * 1.8) * 0.5 + 0.5;
      haloMaterial.uniforms.uGlowIntensity.value += (haloIntensity - haloMaterial.uniforms.uGlowIntensity.value) * uniformFactor;

      // Time-aware lerp for Color uniforms
      const colorFactor = 1.0 - Math.exp(-6.5 * delta);
      heroMaterial.uniforms.uColorDeepVoid.value.lerp(targetColors.deepVoid, colorFactor);
      heroMaterial.uniforms.uColorCore.value.lerp(targetColors.core, colorFactor);
      heroMaterial.uniforms.uColorMid.value.lerp(targetColors.mid, colorFactor);
      heroMaterial.uniforms.uColorBright.value.lerp(targetColors.bright, colorFactor);
      heroMaterial.uniforms.uColorTorchGlint.value.lerp(targetColors.torchGlint, colorFactor);
      heroMaterial.uniforms.uColorSpecGlint.value.lerp(targetColors.specGlint, colorFactor);
      heroMaterial.uniforms.uColorRim.value.lerp(targetColors.rim, colorFactor);
      heroMaterial.uniforms.uColorWireframe.value.lerp(targetColors.wireframe, colorFactor);
      haloMaterial.uniforms.uGlowColor.value.lerp(targetColors.halo, colorFactor);

      // Slow, majestic continuous rotation
      const rotSpeed = prefersReducedMotion ? 0.02 : 0.07;
      heroMesh.rotation.y = elapsed * rotSpeed + p * 1.6;
      heroMesh.rotation.x = Math.sin(elapsed * 0.22) * 0.06;

      // Dust drift
      starParticles.rotation.y = elapsed * 0.008;
      starParticles.position.y = Math.sin(elapsed * 0.2) * 0.2;

      // Mouse parallax
      if (!prefersReducedMotion) {
        rootGroup.rotation.y = mouseX * 0.08;
        rootGroup.rotation.x = -mouseY * 0.05;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(pointerIdleTimer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      heroGeometry.dispose();
      heroMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();

      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="hqds-webgl-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  );
}
