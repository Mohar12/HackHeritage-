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
    
    // 7. Option A: Faceted Crystalline Surface (Replacing Grid/Wireframe Lines)
    // Flat-shaded triangular and polygonal crystal facets catching light individually
    vec3 crystalCoord = vPosition * 1.65;
    vec3 iCrystal = floor(crystalCoord);
    vec3 fCrystal = fract(crystalCoord);
    
    float minFacetDist = 10.0;
    vec3 facetCenter = vec3(0.0);
    vec3 facetId = vec3(0.0);
    
    for (int cx = -1; cx <= 1; cx++) {
      for (int cy = -1; cy <= 1; cy++) {
        for (int cz = -1; cz <= 1; cz++) {
          vec3 neighbor = vec3(float(cx), float(cy), float(cz));
          vec3 seed = iCrystal + neighbor;
          vec3 jitter = sin(vec3(
            dot(seed, vec3(127.1, 311.7, 74.7)),
            dot(seed, vec3(269.5, 183.3, 246.1)),
            dot(seed, vec3(113.5, 271.9, 124.6))
          )) * 43758.5453;
          vec3 facetPt = neighbor + fract(jitter) * 0.65 + 0.18;
          vec3 diff = facetPt - fCrystal;
          float distSq = dot(diff, diff);
          if (distSq < minFacetDist) {
            minFacetDist = distSq;
            facetCenter = seed + facetPt;
            facetId = fract(jitter);
          }
        }
      }
    }
    
    // Discrete planar facet normal for flat-shaded crystal facets
    vec3 flatFacetNormal = normalize(facetCenter - vec3(0.0));
    vec3 facetPerturb = normalize((facetId - 0.5) * 1.6 + flatFacetNormal * 0.4);
    vec3 shardViewNormal = normalize(normal + facetPerturb * 0.75);
    
    // Angular directional lighting across triangular facets
    vec3 facetLightDir1 = normalize(vec3(0.85, 1.1, 1.4));
    vec3 facetLightDir2 = normalize(vec3(-1.1, -0.5, 1.1));
    float facetDiff1 = max(0.0, dot(shardViewNormal, facetLightDir1));
    float facetDiff2 = max(0.0, dot(shardViewNormal, facetLightDir2));
    
    // Razor-sharp specular flashes per individual crystal facet
    vec3 halfVecF = normalize(facetLightDir1 + viewDir);
    float facetSpec = pow(max(0.0, dot(shardViewNormal, halfVecF)), 42.0) * (facetId.x * 0.75 + 0.45);
    
    // Facet interior refraction and soft boundary bevel
    float facetEdge = smoothstep(0.015, 0.16, minFacetDist);
    
    // Cool Blue-White Photonic Ice Crystalline Color
    vec3 iceFacetColor = mix(uColorWireframe, vec3(0.88, 0.96, 1.0), facetId.y * 0.7);
    vec3 crystalBase = mix(uColorDeepVoid * 0.35, iceFacetColor * (0.35 + facetDiff1 * 0.45 + facetDiff2 * 0.25), facetEdge);
    vec3 crystallineSurface = crystalBase + vec3(0.96, 0.98, 1.0) * (facetSpec * 2.6) + (iceFacetColor * fresnel * 0.92);
    crystallineSurface += uColorSpecGlint * (travelingWaveGlint1 * 0.45);
    
    vec3 finalColor = mix(metallicSurface, crystallineSurface, uWireframeMix);
    
    // 8. Volumetric Smoke State (Closing Act)
    if (uSmokeMix > 0.001) {
      float smokeDensity = sin(vPosition.x * 2.2 + uTime * 0.4) * cos(vPosition.y * 1.8 - uTime * 0.3) * 0.5 + 0.5;
      vec3 smokeGlow = mix(uColorDeepVoid, uColorTorchGlint * 0.65, pow(smokeDensity, 1.6) * fresnel);
      finalColor = mix(finalColor, smokeGlow, uSmokeMix);
    }
    
    // 9. Comparison Split Treatment (Act 4)
    if (uSplitMix > 0.001) {
      float splitEdge = smoothstep(-0.25, 0.25, vWorldPosition.x);
      vec3 classicalSide = crystallineSurface;
      float stressFlicker = sin(uTime * 14.0 + vPosition.y * 6.0) * 0.5 + 0.5;
      vec3 stressColor = vec3(0.88, 0.2, 0.2);
      classicalSide = mix(classicalSide, stressColor * 0.82, (1.0 - facetEdge) * 0.6 + facetDiff1 * 0.35);
      vec3 splitComposite = mix(classicalSide, metallicSurface, splitEdge);
      finalColor = mix(finalColor, splitComposite, uSplitMix);
    }
    
    // 10. Opacity: 75–85% Solid Visual Presence with subtle translucent rim
    float baseAlpha = mix(0.82 * uFillDensity, 0.94, fresnel * 0.8);
    float alpha = uOpacity * clamp(baseAlpha + (facetSpec * 0.5 + 0.15) * uWireframeMix * 0.3, 0.0, 1.0);
    
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
      let pillarState = stateColors.pillarP1;
      if (currentPillar === '02') {
        pillarState = stateColors.pillarP2;
      } else if (currentPillar === '03') {
        pillarState = stateColors.pillarP3;
      }

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
        const smoothT = t * t * (3.0 - 2.0 * t);
        targetX = 1.4 - smoothT * 1.4;
        targetY = -1.8 - smoothT * 0.3;
        targetScale = 0.96;
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
        if (p < 0.81) {
          const sIn = (p - 0.72) / 0.09;
          splitMix = sIn * sIn * (3.0 - 2.0 * sIn);
        } else {
          const sOut = Math.max(0.0, 1.0 - (p - 0.81) / 0.09);
          splitMix = sOut * sOut * (3.0 - 2.0 * sOut);
        }

        targetColors.deepVoid.lerpColors(pillarState.deepVoid, stateColors.comparisonCrimson.deepVoid, smoothT);
        targetColors.core.lerpColors(pillarState.core, stateColors.comparisonCrimson.core, smoothT);
        targetColors.mid.lerpColors(pillarState.mid, stateColors.comparisonCrimson.mid, smoothT);
        targetColors.bright.lerpColors(pillarState.bright, stateColors.comparisonCrimson.bright, smoothT);
        targetColors.torchGlint.lerpColors(pillarState.torchGlint, stateColors.comparisonCrimson.torchGlint, smoothT);
        targetColors.specGlint.lerpColors(pillarState.specGlint, stateColors.comparisonCrimson.specGlint, smoothT);
        targetColors.rim.lerpColors(pillarState.rim, stateColors.comparisonCrimson.rim, smoothT);
        targetColors.wireframe.lerpColors(pillarState.wireframe, stateColors.problemBlue.wireframe, smoothT);
        targetColors.halo.lerpColors(pillarState.halo, stateColors.comparisonCrimson.halo, smoothT);
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 5: CLOSING & FOOTER (0.88 - 1.00) · Smooth Recession
      // ─────────────────────────────────────────────────────────────
      else {
        const t = (p - 0.88) / 0.12;
        const smoothT = t * t * (3.0 - 2.0 * t);
        targetX = 0;
        // As scroll approaches 1.0, globe recedes and sinks into the deep void behind footer
        targetY = -2.1 - smoothT * 0.9;
        targetScale = 0.96 - smoothT * 0.24; // recedes to ~0.72
        targetCameraZ = 14.0 + smoothT * 1.2; // steps back in z
        turbulence = 0.0;
        internalFlux = 0.5 - smoothT * 0.3;
        fresnelPower = 2.4;
        fresnelStrength = 0.8 - smoothT * 0.3;
        haloIntensity = 0.65 - smoothT * 0.38; // dims gracefully to 0.27
        wireframeMix = 0.0;
        fillDensity = 0.88;
        smokeMix = Math.min(1.0, smoothT * 1.4);

        // Seamless continuation: finish dissolving any residual grid into solid ruby sphere by p = 0.90
        if (p < 0.90) {
          const sOut = Math.max(0.0, 1.0 - (p - 0.81) / 0.09);
          splitMix = sOut * sOut * (3.0 - 2.0 * sOut);
        } else {
          splitMix = 0.0;
        }

        noiseAmplitude = (prefersReducedMotion ? 0.2 : 1.0) * (1.0 - smoothT * 0.38); // ripples calm down

        targetColors.deepVoid.lerpColors(stateColors.comparisonCrimson.deepVoid, stateColors.closingRuby.deepVoid, smoothT);
        targetColors.core.lerpColors(stateColors.comparisonCrimson.core, stateColors.closingRuby.core, smoothT);
        targetColors.mid.lerpColors(stateColors.comparisonCrimson.mid, stateColors.closingRuby.mid, smoothT);
        targetColors.bright.lerpColors(stateColors.comparisonCrimson.bright, stateColors.closingRuby.bright, smoothT);
        targetColors.torchGlint.lerpColors(stateColors.comparisonCrimson.torchGlint, stateColors.closingRuby.torchGlint, smoothT);
        targetColors.specGlint.lerpColors(stateColors.comparisonCrimson.specGlint, stateColors.closingRuby.specGlint, smoothT);
        targetColors.rim.lerpColors(stateColors.comparisonCrimson.rim, stateColors.closingRuby.rim, smoothT);
        targetColors.wireframe.lerpColors(stateColors.problemBlue.wireframe, stateColors.closingRuby.wireframe, smoothT);
        targetColors.halo.lerpColors(stateColors.comparisonCrimson.halo, stateColors.closingRuby.halo, smoothT);
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
