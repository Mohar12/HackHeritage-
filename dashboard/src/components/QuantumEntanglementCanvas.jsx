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
    
    // Dynamic traveling wave time (calm, distinct traveling water ripples)
    float t = uTime * 0.85;
    
    // 1. Primary traveling wavefront traversing across the sphere
    float wPhase1 = (p.x * 0.95 + p.y * 1.15 + p.z * 0.85) - t * 1.35;
    float wave1 = sin(wPhase1) * 0.22 * uNoiseAmplitude;
    
    // 2. Counter-propagating wave ripple (cross-wave interference like real water)
    float wPhase2 = (p.z * 1.12 - p.x * 0.98 + p.y * 0.76) + t * 1.15;
    float wave2 = sin(wPhase2) * 0.16 * uNoiseAmplitude;
    
    // 3. Spherical harmonic concentric ripples
    float wPhase3 = length(p) * 1.85 - t * 1.55;
    float wave3 = cos(wPhase3 + p.y * 0.65) * 0.12 * uNoiseAmplitude;
    
    // 4. Trochoidal wave steepness (peaked wave crests and broader troughs)
    float waveSteepness = pow(sin(wPhase1) * 0.5 + 0.5, 2.2) * 0.16 * uNoiseAmplitude;
    
    // 5. Subtle micro-surface tension capillary ripple
    float wPhase5 = (p.x * 2.2 - p.z * 2.1 + p.y * 1.9) - t * 2.1;
    float wave5 = sin(wPhase5) * 0.04 * uNoiseAmplitude;
    
    // 6. Interactive pointer wake (expanding liquid ripple)
    vec3 pointerDir = normalize(vec3(uPointer.x * 2.5, uPointer.y * 2.5, 3.5));
    float distToPointer = length(n - pointerDir);
    float pointerWave = sin(distToPointer * 5.2 - uTime * 1.5) * exp(-distToPointer * 1.1) * (0.18 * uPointerActive);
    
    // 7. Viscous scroll mass inertia
    float scrollSurge = sin(p.y * 0.75 + t * 0.85) * (uScrollVelocity * 0.22);
    
    // Total physical surface displacement along normal
    float totalElevation = (wave1 + wave2 + wave3 + waveSteepness + wave5) + pointerWave + scrollSurge;
    vRippleElevation = totalElevation;
    vWaveRidge = totalElevation;
    
    vec3 displaced = p + n * totalElevation;
    
    // Accurate normal perturbation so metallic reflections track real surface ripples
    vec3 tangentX = vec3(-p.y, p.x, 0.0);
    vec3 tangentY = cross(n, tangentX);
    float dTx = cos(wPhase1) * 0.32 + cos(wPhase2) * (-0.24) + cos(distToPointer * 5.2 - uTime * 1.5) * 0.15 * uPointerActive;
    float dTy = cos(wPhase1) * 0.28 + cos(wPhase2) * 0.22;
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
    
    // 1. Wave Ridge vs Trough Lighting:
    // Wave ridges catch bright torch reflection; troughs remain deep, dark liquid
    float ridgeFactor = smoothstep(-0.15, 0.32, vWaveRidge);
    float troughShadow = smoothstep(0.12, -0.22, vWaveRidge);

    // 2. Primary Traveling Wave Reflection Highlight
    // Replaces the single moving bright torch/flashlight point with soft traveling wave ripples
    float waveTravelingPhase1 = (vPosition.x * 0.42 + vPosition.y * 0.48 + vPosition.z * 0.32) - uTime * 0.38;
    float waveBand1 = sin(waveTravelingPhase1) * 0.5 + 0.5;
    float travelingWaveGlint1 = pow(waveBand1, 3.2) * smoothstep(-0.12, 0.28, vWaveRidge);
    
    // 3. Secondary Counter-Propagating Wave Reflection Ripple
    float waveTravelingPhase2 = (vPosition.z * 0.45 - vPosition.x * 0.38 + vPosition.y * 0.28) + uTime * 0.32;
    float waveBand2 = sin(waveTravelingPhase2) * 0.5 + 0.5;
    float travelingWaveGlint2 = pow(waveBand2, 3.6) * smoothstep(-0.08, 0.30, vWaveRidge);
    
    // 4. Stretched curved wave-ridge illumination (anisotropic reflection across normal curvature)
    vec3 lightDirBroad = normalize(vec3(0.85, 1.1, 1.45));
    vec3 halfDirBroad = normalize(lightDirBroad + viewDir);
    float NdotHBroad = max(0.0, dot(normal, halfDirBroad));
    float ridgeReflection = pow(NdotHBroad, 16.0) * 0.75 * smoothstep(-0.10, 0.26, vWaveRidge);
    
    // Compound traveling wave reflection highlight
    float totalWaveHighlight = (travelingWaveGlint1 * 1.15 + travelingWaveGlint2 * 0.8 + ridgeReflection * 0.5) * (0.35 + 0.65 * ridgeFactor);
    
    // 5. Fresnel Reflectance (Water-like grazing reflection)
    float fresnel = pow(1.0 - NdotV, uFresnelPower);
    
    // 6. Dark Liquid-Metal Base
    // Center facing camera is deep near-black liquid
    vec3 liquidBase = mix(uColorDeepVoid, uColorCore, 0.85);
    liquidBase = mix(liquidBase, uColorMid, (1.0 - troughShadow * 0.6) * 0.35);
    
    // 6. Colored Wave Reflection Synthesis (Continuous wave sheen instead of flashlight dot)
    vec3 torchReflection = uColorTorchGlint * totalWaveHighlight;
    torchReflection += uColorSpecGlint * (travelingWaveGlint1 * 0.85 + travelingWaveGlint2 * 0.55);
    
    // Secondary rim reflection along silhouette
    vec3 rimLight = mix(uColorRim, uColorTorchGlint, 0.45) * (fresnel * 1.35 * uFresnelStrength);
    
    // Internal liquid luminescence (subtle optical depth)
    float corePulse = (sin(uTime * 0.8) * 0.12 + 0.88);
    float internalDepth = clamp(1.0 - length(vPosition) / 4.8, 0.0, 1.0);
    vec3 internalGlow = uColorMid * (pow(internalDepth, 1.8) * corePulse * 0.4);
    
    // Combine Metallic / Water Surface
    vec3 metallicSurface = liquidBase + torchReflection + rimLight + internalGlow;
    
    // 7. Flowing Metallic Liquid State (Act 2 Problem & Detection Mechanism: Zero Grid Lines)
    // Smooth reflective liquid-metal surface with moving highlights in the cool blue-white tone family
    float flowTraveling1 = sin((vPosition.x * 0.72 + vPosition.y * 1.08 - vPosition.z * 0.82) * 1.6 - uTime * 1.35) * 0.5 + 0.5;
    float flowTraveling2 = cos((vPosition.z * 0.88 - vPosition.x * 0.65 + vPosition.y * 0.72) * 1.9 + uTime * 1.15) * 0.5 + 0.5;
    float fluidMetallicSheen = pow(flowTraveling1 * flowTraveling2, 2.2);
    
    // High-gloss specular highlight bands catching moving illumination
    vec3 lightDirCool = normalize(vec3(0.65, 0.95, 1.25));
    vec3 halfDirCool = normalize(lightDirCool + viewDir);
    float NdotHCool = max(0.0, dot(normal, halfDirCool));
    float fluidSpecular = pow(NdotHCool, 22.0) * 1.35;
    
    // Cool photonic ice / metallic liquid surface synthesis (Zero grid lines)
    vec3 fluidLiquidBase = mix(uColorDeepVoid, uColorCore, 0.75);
    fluidLiquidBase = mix(fluidLiquidBase, uColorMid, 0.45);
    vec3 fluidReflection = uColorTorchGlint * (fluidMetallicSheen * 1.5 + totalWaveHighlight * 0.85);
    fluidReflection += uColorSpecGlint * (fluidSpecular + travelingWaveGlint1 * 1.1);
    vec3 fluidRim = uColorRim * (pow(1.0 - NdotV, 2.0) * 1.65 * uFresnelStrength);
    vec3 flowingMetallicLiquid = fluidLiquidBase + fluidReflection + fluidRim + internalGlow * 0.8;
    
    vec3 finalColor = mix(metallicSurface, flowingMetallicLiquid, uWireframeMix);
    
    // 8. Volumetric Smoke State (Closing Act)
    if (uSmokeMix > 0.001) {
      float smokeDensity = sin(vPosition.x * 2.2 + uTime * 0.4) * cos(vPosition.y * 1.8 - uTime * 0.3) * 0.5 + 0.5;
      vec3 smokeGlow = mix(uColorDeepVoid, uColorTorchGlint * 0.65, pow(smokeDensity, 1.6) * fresnel);
      finalColor = mix(finalColor, smokeGlow, uSmokeMix);
    }
    
    // 9. Comparison Split Treatment (Act 4): Smooth liquid split, no grid lines
    if (uSplitMix > 0.001) {
      float splitEdge = smoothstep(-0.25, 0.25, vWorldPosition.x);
      vec3 classicalSide = flowingMetallicLiquid;
      float stressFlicker = sin(uTime * 14.0 + vPosition.y * 6.0) * 0.5 + 0.5;
      vec3 stressColor = vec3(0.85, 0.22, 0.22);
      classicalSide = mix(classicalSide, stressColor * 0.65, (1.0 - NdotV) * 0.4 + stressFlicker * 0.15);
      vec3 splitComposite = mix(classicalSide, metallicSurface, splitEdge);
      finalColor = mix(finalColor, splitComposite, uSplitMix);
    }
    
    // 10. Opacity: 75–85% Solid Visual Presence with subtle translucent rim
    float baseAlpha = mix(0.82 * uFillDensity, 0.94, fresnel * 0.8);
    float alpha = uOpacity * clamp(baseAlpha, 0.0, 1.0);
    
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

const QuantumEntanglementCanvas = React.memo(function QuantumEntanglementCanvas({ activePillar = '01', activeDimension = 0, threatAlert = 0, threatAttackType = null }) {
  const mountRef = useRef(null);
  const activePillarRef = useRef(activePillar);
  const activeDimensionRef = useRef(activeDimension);

  useEffect(() => {
    activePillarRef.current = activePillar;
  }, [activePillar]);

  useEffect(() => {
    activeDimensionRef.current = activeDimension;
  }, [activeDimension]);

  const threatAlertRef = useRef(threatAlert);

  useEffect(() => {
    threatAlertRef.current = threatAlert;
  }, [threatAlert]);

  const threatAttackTypeRef = useRef(threatAttackType);

  useEffect(() => {
    threatAttackTypeRef.current = threatAttackType;
  }, [threatAttackType]);

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

    // Massive 3D hero object geometry (calibrated for hero composition balance: radius 4.45, 128x128 subdivision)
    const heroGeometry = new THREE.SphereGeometry(4.45, 128, 128);

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
        uColorSpecGlint: { value: new THREE.Color(0xa7f3d0) },
        uColorRim: { value: new THREE.Color(0x2dd4bf) },
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

    // Minimum virtual scroll-height floor. This is calibrated to roughly match
    // the landing page's own natural scrollable height, so on the landing page
    // itself this Math.max is a no-op (real docHeight already exceeds it) and
    // nothing changes there. On shorter pages (Attack Lab, Honest Protocol,
    // Scalable Engine, Audit Ledger), this floor prevents scroll progress from
    // being computed against a tiny denominator, which previously caused (a)
    // large p-jumps per scroll tick (non-smooth motion) and (b) p reaching the
    // Act 5 "closing dissolve" state after only a small amount of scrolling on
    // short pages (the blob appearing to vanish prematurely).
    const MIN_VIRTUAL_SCROLL_HEIGHT = 4200;

    let cachedDocHeight = Math.max(
      MIN_VIRTUAL_SCROLL_HEIGHT,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const updateDocHeight = () => {
      cachedDocHeight = Math.max(
        MIN_VIRTUAL_SCROLL_HEIGHT,
        document.documentElement.scrollHeight - window.innerHeight
      );
    };
    window.addEventListener('resize', updateDocHeight, { passive: true });

    // Also watch for content-driven height changes (not just browser window
    // resizes) -- e.g. a telemetry panel or results section appearing after
    // a user action changes document.documentElement.scrollHeight without
    // firing a native "resize" event. Without this, cachedDocHeight can go
    // stale and cause p to jump or reach 1.0 prematurely on pages whose
    // content grows after mount.
    let resizeObserverRaf = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeObserverRaf) return;
      resizeObserverRaf = requestAnimationFrame(() => {
        resizeObserverRaf = null;
        updateDocHeight();
      });
    });
    resizeObserver.observe(document.body);

    const handleScroll = () => {
      targetScroll = Math.min(1, Math.max(0, window.scrollY / cachedDocHeight));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    updateDocHeight();
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
        specGlint: new THREE.Color(0xa7f3d0),
        rim: new THREE.Color(0x2dd4bf),
        wireframe: new THREE.Color(0x4c6fff),
        halo: new THREE.Color(0x34245f),
      },
      // Act 2: Problem · Flowing Metallic Liquid (Cool Blue-White Photonic Ice : Zero Grid Lines)
      problemBlue: {
        deepVoid: new THREE.Color(0x060b18),
        core: new THREE.Color(0x0a1428),
        mid: new THREE.Color(0x132247),
        bright: new THREE.Color(0x1e3a6e),
        torchGlint: new THREE.Color(0x60a5fa),
        specGlint: new THREE.Color(0xe0f2fe),
        rim: new THREE.Color(0x93c5fd),
        wireframe: new THREE.Color(0x38bdf8),
        halo: new THREE.Color(0x1a2b58),
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
      // Act 4: Dimension Tabs Color States (5 distinct quantum verification states)
      dimensionStates: [
        // 0: Detection Mechanism (Optical Cyan and Born-Rule Wavefunction)
        {
          deepVoid: new THREE.Color(0x060f18),
          core: new THREE.Color(0x0a1c28),
          mid: new THREE.Color(0x0f2d3d),
          bright: new THREE.Color(0x134e4a),
          torchGlint: new THREE.Color(0x0d9488),
          specGlint: new THREE.Color(0x5eead4),
          rim: new THREE.Color(0x2dd4bf),
          wireframe: new THREE.Color(0x14b8a6),
          halo: new THREE.Color(0x115e59),
        },
        // 1: Adversarial Noise (Electric Cobalt and Noise Dissipation)
        {
          deepVoid: new THREE.Color(0x060b18),
          core: new THREE.Color(0x0b1736),
          mid: new THREE.Color(0x172554),
          bright: new THREE.Color(0x1e3a8a),
          torchGlint: new THREE.Color(0x2563eb),
          specGlint: new THREE.Color(0x93c5fd),
          rim: new THREE.Color(0x38bdf8),
          wireframe: new THREE.Color(0x60a5fa),
          halo: new THREE.Color(0x1e40af),
        },
        // 2: Statistical Model (Radiant Violet and Chi-Square Hypothesis Testing)
        {
          deepVoid: new THREE.Color(0x080711),
          core: new THREE.Color(0x1e0c2e),
          mid: new THREE.Color(0x3b0764),
          bright: new THREE.Color(0x581c87),
          torchGlint: new THREE.Color(0x7e22ce),
          specGlint: new THREE.Color(0xd8b4fe),
          rim: new THREE.Color(0xc084fc),
          wireframe: new THREE.Color(0xa855f7),
          halo: new THREE.Color(0x6b21a8),
        },
        // 3: Post-Quantum Longevity (Solar Amber / Gold)
        {
          deepVoid: new THREE.Color(0x0e0902),
          core: new THREE.Color(0x331e05),
          mid: new THREE.Color(0x78350f),
          bright: new THREE.Color(0xd97706),
          torchGlint: new THREE.Color(0xfbbf24),
          specGlint: new THREE.Color(0xfef3c7),
          rim: new THREE.Color(0xb45309),
          wireframe: new THREE.Color(0xf59e0b),
          halo: new THREE.Color(0x451a03),
        },
        // 4: Detection Latency (Vivid Crimson and Sub-millisecond Pauli Bound)
        {
          deepVoid: new THREE.Color(0x100206),
          core: new THREE.Color(0x3b0814),
          mid: new THREE.Color(0x881337),
          bright: new THREE.Color(0xe11d48),
          torchGlint: new THREE.Color(0xff3355),
          specGlint: new THREE.Color(0xffccd5),
          rim: new THREE.Color(0xbe123c),
          wireframe: new THREE.Color(0xff385c),
          halo: new THREE.Color(0x4c0519),
        },
      ],
      // Act 4: Comparison fallback
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
      // Attack Lab: one distinct crimson/red shade per attack type, so the blob
      // communicates WHICH attack is active, not just that one is happening.
      // All 5 are calibrated to similar perceived intensity/brightness so no
      // single attack type reads as more or less severe than another.
      threatColorsByType: {
        intercept_resend: {
          // Pure saturated red -- channel interception, most "classic" attack red
          deepVoid: new THREE.Color(0x140204),
          core: new THREE.Color(0x40060f),
          mid: new THREE.Color(0x8a0f1f),
          bright: new THREE.Color(0xe01e2f),
          torchGlint: new THREE.Color(0xff2438),
          specGlint: new THREE.Color(0xffb3ba),
          rim: new THREE.Color(0xff4d5a),
          wireframe: new THREE.Color(0xff1e2f),
          halo: new THREE.Color(0x6e0f1c),
        },
        depolarizing: {
          // Warm orange-red -- environmental noise/decoherence, not an active adversary
          deepVoid: new THREE.Color(0x140702),
          core: new THREE.Color(0x401505),
          mid: new THREE.Color(0x8a3208),
          bright: new THREE.Color(0xe0570f),
          torchGlint: new THREE.Color(0xff6a24),
          specGlint: new THREE.Color(0xffd0b3),
          rim: new THREE.Color(0xff8a4d),
          wireframe: new THREE.Color(0xff5e1e),
          halo: new THREE.Color(0x6e2c0f),
        },
        forgery: {
          // Crimson-magenta -- identity/signature forgery
          deepVoid: new THREE.Color(0x120210),
          core: new THREE.Color(0x3d0638),
          mid: new THREE.Color(0x830f6e),
          bright: new THREE.Color(0xd91ea8),
          torchGlint: new THREE.Color(0xff24bd),
          specGlint: new THREE.Color(0xffb3e8),
          rim: new THREE.Color(0xff4dd0),
          wireframe: new THREE.Color(0xff1eb8),
          halo: new THREE.Color(0x6e0f5e),
        },
        impersonation: {
          // Deep rose-red -- spoofed identity, slightly cooler than pure red
          deepVoid: new THREE.Color(0x140208),
          core: new THREE.Color(0x400620),
          mid: new THREE.Color(0x8a0f46),
          bright: new THREE.Color(0xe01e78),
          torchGlint: new THREE.Color(0xff248a),
          specGlint: new THREE.Color(0xffb3d0),
          rim: new THREE.Color(0xff4da0),
          wireframe: new THREE.Color(0xff1e8a),
          halo: new THREE.Color(0x6e0f3c),
        },
        replay: {
          // Deep blood-red / maroon -- stale/reused signature, darker and heavier
          deepVoid: new THREE.Color(0x110203),
          core: new THREE.Color(0x38070c),
          mid: new THREE.Color(0x701018),
          bright: new THREE.Color(0xa8202a),
          torchGlint: new THREE.Color(0xc22834),
          specGlint: new THREE.Color(0xf0a8ae),
          rim: new THREE.Color(0xd6404a),
          wireframe: new THREE.Color(0xb81e28),
          halo: new THREE.Color(0x520d13),
        },
      },
    };

    // Animation Loop with Time-Aware Delta Damping & Tab Visibility Pausing
    let animId;
    let lastTime = performance.now();
    const clock = new THREE.Clock();
    let isVisible = !document.hidden;

    const handleVisibilityChange = () => {
      const currentlyVisible = !document.hidden;
      if (currentlyVisible && !isVisible) {
        isVisible = true;
        lastTime = performance.now();
        animId = requestAnimationFrame(animate);
      } else if (!currentlyVisible) {
        isVisible = false;
        cancelAnimationFrame(animId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = () => {
      if (!isVisible) return;
      animId = requestAnimationFrame(animate);

      try {
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        const elapsed = clock.getElapsedTime();

        // Time-aware exponential damping for scroll follow (tight, responsive, zero perceptible lag)
        const scrollDampingFactor = 1.0 - Math.exp(-22.0 * delta);
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
        let pillarState = stateColors.pillarP1;
        if (currentPillar === '02') {
          pillarState = stateColors.pillarP2;
        } else if (currentPillar === '03') {
          pillarState = stateColors.pillarP3;
        }

        const currentDimension = typeof activeDimensionRef.current === 'number' ? activeDimensionRef.current : 0;
        const dimensionState = stateColors.dimensionStates[currentDimension] || stateColors.dimensionStates[0];

        // State machine parameter targets (gentle, contained shifts per Stage 2)
        let targetX = 0;
        let targetY = -2.8;
        let targetScale = 1.0;
        let targetCameraZ = 14.0;
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
          targetY = -2.8 + t * 0.2;
          targetScale = 1.0;
          targetCameraZ = 14.0;
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
          targetX = 0;
          targetY = -2.6 + t * 0.15;
          targetScale = 0.98;
          targetCameraZ = 14.0;
          turbulence = t * 1.4;
          internalFlux = 0.85 * t;
          fresnelPower = 2.4;
          fresnelStrength = 1.25;
          haloIntensity = 0.65;
          wireframeMix = t;
          fillDensity = 1.0;
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
          targetX = 0;
          targetY = -2.45 + Math.sin(t * Math.PI) * 0.12;
          targetScale = 0.98;
          targetCameraZ = 14.0;
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
        // ACT 4: COMPARISON (0.72 - 0.92) · Structured Dimension Sync
        else if (p < 0.92) {
          const t = (p - 0.72) / 0.20;
          const smoothT = t * t * (3.0 - 2.0 * t);
          targetX = 0;
          targetY = -2.45 - smoothT * 0.10;
          targetScale = 0.98;
          targetCameraZ = 14.0;
          turbulence = (1.0 - smoothT) * 0.25;
          internalFlux = 0.7;
          fresnelPower = 3.0;
          fresnelStrength = 1.2;
          haloIntensity = 0.72;
          wireframeMix = 0.0;
          fillDensity = 1.0;
          smokeMix = 0.0;

          // Smooth continuous bell curve: peaks in middle of Act 4 and dissolves gracefully
          if (p < 0.82) {
            const sIn = (p - 0.72) / 0.10;
            splitMix = sIn * sIn * (3.0 - 2.0 * sIn);
          } else {
            const sOut = Math.max(0.0, 1.0 - (p - 0.82) / 0.10);
            splitMix = sOut * sOut * (3.0 - 2.0 * sOut);
          }

          // Direct synchronization to active dimension color state (replicates Act 3 pillar logic)
          targetColors.deepVoid.copy(dimensionState.deepVoid);
          targetColors.core.copy(dimensionState.core);
          targetColors.mid.copy(dimensionState.mid);
          targetColors.bright.copy(dimensionState.bright);
          targetColors.torchGlint.copy(dimensionState.torchGlint);
          targetColors.specGlint.copy(dimensionState.specGlint);
          targetColors.rim.copy(dimensionState.rim);
          targetColors.wireframe.copy(dimensionState.wireframe);
          targetColors.halo.copy(dimensionState.halo);
        }
        // ─────────────────────────────────────────────────────────────
        // ACT 5: CLOSING & FOOTER (0.92 - 1.00) · Smooth Recession
        // ─────────────────────────────────────────────────────────────
        else {
          const t = (p - 0.92) / 0.08;
          const smoothT = t * t * (3.0 - 2.0 * t);
          targetX = 0;
          // As scroll approaches 1.0, globe recedes and sinks gently into the deep void behind footer
          targetY = -2.55 - smoothT * 0.25;
          targetScale = 0.98 - smoothT * 0.06; // settles gently to ~0.92
          targetCameraZ = 14.0;
          turbulence = 0.0;
          internalFlux = 0.5 - smoothT * 0.3;
          fresnelPower = 2.4;
          fresnelStrength = 0.8 - smoothT * 0.3;
          haloIntensity = 0.65 - smoothT * 0.38; // dims gracefully to 0.27
          wireframeMix = 0.0;
          fillDensity = 0.88;
          smokeMix = Math.min(1.0, smoothT * 1.4);
          splitMix = 0.0;
          noiseAmplitude = (prefersReducedMotion ? 0.2 : 1.0) * (1.0 - smoothT * 0.38); // ripples calm down

          targetColors.deepVoid.lerpColors(dimensionState.deepVoid, stateColors.closingRuby.deepVoid, smoothT);
          targetColors.core.lerpColors(dimensionState.core, stateColors.closingRuby.core, smoothT);
          targetColors.mid.lerpColors(dimensionState.mid, stateColors.closingRuby.mid, smoothT);
          targetColors.bright.lerpColors(dimensionState.bright, stateColors.closingRuby.bright, smoothT);
          targetColors.torchGlint.lerpColors(dimensionState.torchGlint, stateColors.closingRuby.torchGlint, smoothT);
          targetColors.specGlint.lerpColors(dimensionState.specGlint, stateColors.closingRuby.specGlint, smoothT);
          targetColors.rim.lerpColors(dimensionState.rim, stateColors.closingRuby.rim, smoothT);
          targetColors.wireframe.lerpColors(stateColors.problemBlue.wireframe, stateColors.closingRuby.wireframe, smoothT);
          targetColors.halo.lerpColors(dimensionState.halo, stateColors.closingRuby.halo, smoothT);
        }

        // Attack Lab threat alert overlay: blend the just-computed act-based
        // targetColors further toward the attack-type-specific alert palette,
        // scaled by threatAlertRef.current (0 = no change, 1 = full crimson).
        // This runs AFTER the act-based color logic so it layers on top of
        // whatever the scroll state currently is.
        const alertAmount = Math.max(0, Math.min(1, threatAlertRef.current));
        if (alertAmount > 0.001) {
          const requestedType = threatAttackTypeRef.current;
          const alert =
            (requestedType && stateColors.threatColorsByType[requestedType]) ||
            stateColors.threatColorsByType.intercept_resend;

          // Defensive guard: only attempt the blend if `alert` actually has all
          // required color properties. If the palette definition is somehow
          // incomplete (missing key, typo, etc.), skip blending this frame
          // instead of throwing -- the act-based scroll color still renders
          // normally, so the blob never disappears, it just temporarily won't
          // show the red alert tint until the underlying data issue is fixed.
          const hasAllAlertColors =
            alert &&
            alert.deepVoid && alert.core && alert.mid && alert.bright &&
            alert.torchGlint && alert.specGlint && alert.rim &&
            alert.wireframe && alert.halo;

          if (hasAllAlertColors) {
            targetColors.deepVoid.lerp(alert.deepVoid, alertAmount);
            targetColors.core.lerp(alert.core, alertAmount);
            targetColors.mid.lerp(alert.mid, alertAmount);
            targetColors.bright.lerp(alert.bright, alertAmount);
            targetColors.torchGlint.lerp(alert.torchGlint, alertAmount);
            targetColors.specGlint.lerp(alert.specGlint, alertAmount);
            targetColors.rim.lerp(alert.rim, alertAmount);
            targetColors.wireframe.lerp(alert.wireframe, alertAmount);
            targetColors.halo.lerp(alert.halo, alertAmount);
          } else if (!animate._loggedMissingPalette) {
            console.warn(
              `QuantumEntanglementCanvas: threat color palette for attack type "${requestedType}" is missing or incomplete -- falling back to no alert tint for this frame.`
            );
            animate._loggedMissingPalette = true;
          }
        }

        // Layer a slow, subtle sinusoidal drift on top of the scroll-driven transform (Stage 3)
        const driftX = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.55) * 0.08;
        const driftY = prefersReducedMotion ? 0 : Math.cos(elapsed * 0.80) * 0.09;
        const finalTargetX = targetX + driftX;
        const finalTargetY = targetY + driftY;

        // Time-aware exponential damping for mesh transforms (routed through damped spring, zero lag)
        const transformFactor = 1.0 - Math.exp(-14.0 * delta);
        heroMesh.position.x += (finalTargetX - heroMesh.position.x) * transformFactor;
        heroMesh.position.y += (finalTargetY - heroMesh.position.y) * transformFactor;
        
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
        // Subtle breathing intensity boost during an active threat alert -- slow
        // (0.9Hz), gentle amplitude, never strobing. Fades in/out with alertAmount
        // itself so it never appears or disappears abruptly.
        if (alertAmount > 0.001) {
          const alertPulse = 0.5 + 0.5 * Math.sin(elapsed * 1.8);
          haloMaterial.uniforms.uGlowIntensity.value += alertAmount * (0.18 + alertPulse * 0.12);
        }

        // When a threat alert is active, use a faster color-response rate so the
        // blob keeps up with the attack's own phase transitions (which happen on
        // a ~600ms cadence) instead of perpetually lagging behind a moving target,
        // which is what previously read as the animation being "stuck." When no
        // alert is active, fall back to the original slower, cinematic rate used
        // for scroll-driven Act transitions -- unchanged from before.
        const baseColorRate = 6.5;
        const alertColorRate = 13.0;
        const effectiveColorRate = baseColorRate + (alertColorRate - baseColorRate) * alertAmount;
        const colorFactor = 1.0 - Math.exp(-effectiveColorRate * delta);
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
      } catch (err) {
        // Log once per distinct error message so a persistent bug doesn't
        // spam the console 60 times a second, but always surface it so it's
        // discoverable and fixable.
        if (!animate._lastErrorMsg || animate._lastErrorMsg !== err.message) {
          console.error('QuantumEntanglementCanvas animate() frame error (animation continues):', err);
          animate._lastErrorMsg = err.message;
        }
      }
    };


    animate();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animId);
      clearTimeout(pointerIdleTimer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', updateDocHeight);

      resizeObserver.disconnect();
      if (resizeObserverRaf) cancelAnimationFrame(resizeObserverRaf);

      heroGeometry.dispose();
      heroMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();

      scene.traverse((child) => {
        if (child.isMesh || child.isPoints) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

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
});

export default QuantumEntanglementCanvas;

