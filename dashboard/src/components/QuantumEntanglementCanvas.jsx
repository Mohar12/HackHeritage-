/**
 * QuantumEntanglementCanvas.jsx
 * =============================
 * Liquid Brokers Visual System Port for HyperQDS.
 * Single 3D Hero Object with Material State Machine:
 * 
 * 1. Act 1 (Hero): Liquid Glass State (cryogenic teal core, luminous cyan caustics, crisp white fresnel)
 * 2. Act 2 (Problem): Wireframe / Structural State (electric blue-white line-arcs, sparse fill, decoherence turbulence)
 * 3. Act 3 (Pillars): Liquid Glass with Hue Progression:
 *    - Pillar 01: Pure Cryogenic Teal-White
 *    - Pillar 02: Teal-to-Warm Dilution Gold blend
 *    - Pillar 03: Radiant Gold-White photonic state
 * 4. Act 4 (Comparison): Split Treatment (turbulent classical wireframe on left, pristine quantum glass on right)
 * 5. Act 5 (Closing): Volumetric Smoke / Deep Violet-to-Teal blend state (anchoring behind CTA)
 * 
 * Damped spring lerp (~0.085) on all uniforms & transforms for zero stutter.
 * Passive rAF scroll tracking, devicePixelRatio capped at 1.5, reduced-motion compliant.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Vertex shader: Multi-octave wave displacement, pointer shockwaves, and dynamic normal calculation
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
  varying float vCausticCoord;

  void main() {
    vPosition = position;
    vec3 p = position;
    vec3 n = normalize(position);
    
    // 1. Viscous macro swell (liquid breathing)
    float macroSwell = sin(p.x * 0.95 + uTime * 0.85) * cos(p.y * 1.15 + uTime * 0.65) * 0.28 * uNoiseAmplitude;
    float crossSwell = sin(p.z * 1.25 - uTime * 0.75 + p.x * 0.4) * 0.18 * uNoiseAmplitude;
    
    // 2. High-frequency fluid ripples
    float ripplePhase1 = length(p.xy) * 4.2 - uTime * 3.2;
    float fluidRipple1 = sin(ripplePhase1) * 0.12 * uNoiseAmplitude;
    
    float ripplePhase2 = length(p.yz) * 5.5 + uTime * 2.8;
    float fluidRipple2 = cos(ripplePhase2) * 0.08 * uNoiseAmplitude;
    
    // 3. Pointer ripples (interactive shockwaves)
    vec3 pointerDir = normalize(vec3(uPointer.x * 3.0, uPointer.y * 3.0, 3.5));
    float distToPointer = length(n - pointerDir);
    float pointerRipple = sin(distToPointer * 16.0 - uTime * 7.0) * exp(-distToPointer * 1.9) * (0.28 * uPointerActive);
    
    // 4. Scroll impulse ripples
    float scrollShock = sin(length(p) * 6.8 - uTime * 9.0) * (uScrollVelocity * 0.55);
    
    // 5. Decoherence turbulence
    float noiseWave = sin(p.x * 3.4 + uTime * 2.8) * cos(p.z * 3.4 - uTime * 2.5) * (uTurbulence * 0.32);
    
    // Total displacement along surface normal
    float totalElevation = macroSwell + crossSwell + fluidRipple1 + fluidRipple2 + pointerRipple + scrollShock + noiseWave;
    vRippleElevation = totalElevation;
    vCausticCoord = ripplePhase1 + ripplePhase2 + pointerRipple * 4.0;
    
    vec3 displaced = p + n * totalElevation;
    
    // Normal perturbation
    vec3 tangentX = vec3(-p.y, p.x, 0.0);
    vec3 tangentY = cross(n, tangentX);
    float dTx = cos(ripplePhase1) * 0.18 + cos(distToPointer * 16.0 - uTime * 7.0) * 0.22 * uPointerActive;
    float dTy = sin(ripplePhase2) * 0.15;
    vec3 perturbedNormal = normalize(n - (tangentX * dTx + tangentY * dTy) * 0.35);
    
    vNormal = normalize(normalMatrix * perturbedNormal);
    
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    
    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader: Material State Machine with Caustics, Procedural Wireframe, and Volumetric Smoke
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
  uniform float uWireframeMix;   // Act 2 & Comparison Left: 0.0 (glass) -> 1.0 (structural line-arcs)
  uniform float uFillDensity;     // Volume fill opacity: 1.0 (opaque liquid) -> 0.25 (sparse structural)
  uniform float uSmokeMix;        // Act 5: 0.0 (liquid) -> 1.0 (volumetric smoke)
  uniform float uSplitMix;        // Act 4: 0.0 (uniform) -> 1.0 (left classical / right quantum)
  
  // Interpolated Color Tokens
  uniform vec3 uColorDeepVoid;
  uniform vec3 uColorCore;
  uniform vec3 uColorMid;
  uniform vec3 uColorBright;
  uniform vec3 uColorMintPhoton;
  uniform vec3 uColorIceWhite;
  uniform vec3 uColorWireframe;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vPosition;
  varying float vRippleElevation;
  varying float vCausticCoord;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float NdotV = max(0.0, dot(normal, viewDir));
    
    // 1. Chromatic Dispersion Fresnel
    float fresnelR = pow(1.0 - NdotV, uFresnelPower * 0.90);
    float fresnelG = pow(1.0 - NdotV, uFresnelPower * 1.10);
    float fresnelB = pow(1.0 - NdotV, uFresnelPower * 1.35);
    
    // 2. Optical Caustic Web
    float c1 = pow(abs(sin(vPosition.x * 5.2 + sin(vPosition.y * 3.8 + uTime * 1.6) + uTime * 2.2)), 14.0);
    float c2 = pow(abs(cos(vPosition.z * 4.6 - sin(vPosition.x * 3.4 - uTime * 1.4) + uTime * 1.8)), 12.0);
    float causticPattern = (c1 + c2 * 0.85);
    float rippleGlint = smoothstep(0.10, 0.28, vRippleElevation) * 0.65;
    
    // 3. Inner Core Glow
    float pulse = sin(uTime * 2.0) * 0.15 + 0.85;
    float coreDistance = length(vPosition) / 3.8;
    float coreGlow = clamp(1.0 - coreDistance, 0.0, 1.0);
    coreGlow = pow(coreGlow, 1.3) * pulse * (1.1 + uScrollVelocity * 1.8);
    
    // Internal photonic current
    float flowPhase = vPosition.y * 0.7 + vPosition.x * 0.5 + uTime * 0.8 + uScroll * 4.5;
    float internalCurrent = sin(flowPhase) * 0.5 + 0.5;
    float dualCore = sin(vPosition.x * 2.0 + uTime * 1.5) * cos(vPosition.z * 2.0 - uTime * 1.2) * 0.5 + 0.5;
    
    // 4. Color Synthesis (Liquid Glass State)
    vec3 deepBase = mix(uColorDeepVoid, uColorCore, 0.85);
    vec3 midLayer = mix(uColorCore, uColorMid, internalCurrent);
    vec3 activeLayer = mix(uColorBright, uColorMintPhoton, dualCore * (0.35 + uInternalFlux * 0.65));
    
    vec3 liquidColor = mix(deepBase, midLayer, coreGlow * 0.85 + 0.15);
    liquidColor = mix(liquidColor, activeLayer, fresnelG * 0.65 + internalCurrent * 0.35);
    
    // Specular Highlights
    vec3 lightDir = normalize(vec3(0.8, 1.4, 2.2));
    vec3 halfDir = normalize(lightDir + viewDir);
    float specBase = max(0.0, dot(normal, halfDir));
    float broadSpec = pow(specBase, 24.0) * 0.45;
    float sharpSpec = pow(specBase, 128.0) * 1.2;
    
    liquidColor += uColorMintPhoton * (causticPattern * (0.45 + uInternalFlux * 0.55));
    liquidColor += uColorIceWhite * (rippleGlint + sharpSpec);
    liquidColor += uColorBright * (broadSpec + coreGlow * 0.4);
    
    // Chromatic Dispersion Rim
    vec3 dispersionRim = vec3(
      uColorMid.r * fresnelR,
      uColorBright.g * fresnelG,
      uColorIceWhite.b * fresnelB
    ) * (1.25 * uFresnelStrength);
    liquidColor += dispersionRim;
    
    // 5. Procedural Wireframe / Structural Line-Arcs (Act 2 & Comparison)
    // Latitudinal rings
    float lat = sin(vPosition.y * 14.0 + uTime * 0.4);
    float latLine = smoothstep(0.91, 0.98, abs(lat));
    
    // Longitudinal meridian arcs
    float lonAngle = atan(vPosition.z, vPosition.x);
    float lon = sin(lonAngle * 18.0 + uTime * 0.3);
    float lonLine = smoothstep(0.89, 0.98, abs(lon));
    
    // Orbiting geodesic diagonals
    float diag = sin((vPosition.x * 0.7 + vPosition.y * 0.7 + vPosition.z * 0.7) * 9.0 - uTime * 0.6);
    float diagLine = smoothstep(0.92, 0.98, abs(diag));
    
    float wireframeRays = max(max(latLine, lonLine), diagLine * 0.75);
    vec3 wireframeGlow = uColorWireframe * (wireframeRays * 2.4 + fresnelG * 1.2);
    
    // Sparse fill structural blend
    vec3 structuralColor = mix(uColorDeepVoid * 0.5, uColorCore * 0.8, wireframeRays * 0.3);
    structuralColor += wireframeGlow;
    structuralColor += uColorIceWhite * (pow(specBase, 64.0) * wireframeRays * 1.8);
    
    // Blend Liquid Glass -> Wireframe
    vec3 finalColor = mix(liquidColor, structuralColor, uWireframeMix);
    
    // 6. Volumetric Smoke State (Act 5)
    if (uSmokeMix > 0.001) {
      float smokeDensity = sin(vPosition.x * 2.8 + uTime * 0.7) * cos(vPosition.y * 2.2 - uTime * 0.5) * 0.5 + 0.5;
      smokeDensity = pow(smokeDensity, 1.8);
      
      vec3 smokeBase = mix(uColorDeepVoid, uColorCore, 0.92);
      vec3 smokeMid = mix(uColorCore, uColorMid, smokeDensity * 0.7);
      vec3 smokeGlow = mix(smokeMid, uColorBright * 0.7, fresnelG * 0.5);
      smokeGlow += uColorMintPhoton * (causticPattern * 0.2);
      
      finalColor = mix(finalColor, smokeGlow, uSmokeMix);
    }
    
    // 7. Comparison Split Treatment (Act 4)
    if (uSplitMix > 0.001) {
      float splitEdge = smoothstep(-0.25, 0.25, vWorldPosition.x);
      
      // Left classical side: turbulent wireframe + alert stress glints
      vec3 classicalSide = structuralColor;
      float stressFlicker = sin(uTime * 18.0 + vPosition.y * 8.0) * 0.5 + 0.5;
      vec3 stressColor = vec3(0.94, 0.27, 0.27);
      classicalSide = mix(classicalSide, stressColor * (0.8 + stressFlicker * 0.4), wireframeRays * 0.45);
      
      // Right quantum side: pristine optical glass
      vec3 quantumSide = liquidColor;
      
      vec3 splitComposite = mix(classicalSide, quantumSide, splitEdge);
      finalColor = mix(finalColor, splitComposite, uSplitMix);
    }
    
    // Turbulence agitation
    if (uTurbulence > 0.2) {
      float flicker = sin(uTime * 22.0 + vPosition.y * 12.0) * (uTurbulence * 0.16);
      finalColor += uColorMintPhoton * flicker;
    }
    
    // Opacity with fill density modulation
    float baseAlpha = mix(uFillDensity * 0.88, 0.95, fresnelG);
    float alpha = uOpacity * (baseAlpha + wireframeRays * uWireframeMix * 0.5);
    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
  }
`;

// Halo vertex shader
const haloVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Halo fragment shader: Additive atmospheric glow
const haloFragmentShader = `
  uniform vec3 uGlowColor;
  uniform float uGlowIntensity;
  uniform float uPulse;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float NdotV = max(0.0, dot(normal, viewDir));
    
    float glow = pow(1.0 - NdotV, 3.2) * (0.65 + 0.35 * uPulse) * uGlowIntensity;
    gl_FragColor = vec4(uGlowColor, glow);
  }
`;

export default function QuantumEntanglementCanvas() {
  const mountRef = useRef(null);

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

    // Single large 3D hero object geometry with high resolution
    const heroGeometry = new THREE.SphereGeometry(3.6, 92, 92);

    // Initial Material State: Liquid Glass
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
        uInternalFlux: { value: 0 },
        uNoiseAmplitude: { value: prefersReducedMotion ? 0.2 : 1.0 },
        uFresnelPower: { value: 2.6 },
        uFresnelStrength: { value: 1.0 },
        uOpacity: { value: 0.94 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPointerActive: { value: 0 },
        uWireframeMix: { value: 0 },
        uFillDensity: { value: 1.0 },
        uSmokeMix: { value: 0 },
        uSplitMix: { value: 0 },
        uColorDeepVoid: { value: new THREE.Color(0x0a0b14) },
        uColorCore: { value: new THREE.Color(0x042f2e) },
        uColorMid: { value: new THREE.Color(0x0d9488) },
        uColorBright: { value: new THREE.Color(0x14b8a6) },
        uColorMintPhoton: { value: new THREE.Color(0x2dd4bf) },
        uColorIceWhite: { value: new THREE.Color(0xf0fdfa) },
        uColorWireframe: { value: new THREE.Color(0x4c6fff) },
      },
    });

    const heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
    heroMesh.position.set(0, -2.4, 0);
    rootGroup.add(heroMesh);

    // Additive corona halo glow shell
    const haloGeometry = new THREE.SphereGeometry(3.82, 48, 48);
    const haloMaterial = new THREE.ShaderMaterial({
      vertexShader: haloVertexShader,
      fragmentShader: haloFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        uGlowColor: { value: new THREE.Color(0x14b8a6) },
        uGlowIntensity: { value: 0.75 },
        uPulse: { value: 0 },
      },
    });

    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
    heroMesh.add(haloMesh);

    // Sparse background star/dust particles (35-45 count spec)
    const particleCount = 42;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      particlePositions[i * 3 + 2] = -4 - Math.random() * 14;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.085,
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.35,
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
      deepVoid: new THREE.Color(0x0a0b14),
      core: new THREE.Color(0x042f2e),
      mid: new THREE.Color(0x0d9488),
      bright: new THREE.Color(0x14b8a6),
      mint: new THREE.Color(0x2dd4bf),
      ice: new THREE.Color(0xf0fdfa),
      wireframe: new THREE.Color(0x4c6fff),
      halo: new THREE.Color(0x14b8a6),
    };

    // Color definitions for material state machine
    const stateColors = {
      // Act 1: Liquid Glass (Teal / Cyan)
      glassTeal: {
        deepVoid: new THREE.Color(0x0a0b14),
        core: new THREE.Color(0x042f2e),
        mid: new THREE.Color(0x0d9488),
        bright: new THREE.Color(0x14b8a6),
        mint: new THREE.Color(0x2dd4bf),
        ice: new THREE.Color(0xf0fdfa),
        wireframe: new THREE.Color(0x4c6fff),
        halo: new THREE.Color(0x14b8a6),
      },
      // Act 2: Wireframe Structural (Electric Blue-White)
      wireframeBlue: {
        deepVoid: new THREE.Color(0x080914),
        core: new THREE.Color(0x111c38),
        mid: new THREE.Color(0x1d4ed8),
        bright: new THREE.Color(0x3b82f6),
        mint: new THREE.Color(0x60a5fa),
        ice: new THREE.Color(0xffffff),
        wireframe: new THREE.Color(0x6c8cff),
        halo: new THREE.Color(0x4c6fff),
      },
      // Act 3 Pillar 02: Teal-Gold Blend
      pillarGoldBlend: {
        deepVoid: new THREE.Color(0x0a0b14),
        core: new THREE.Color(0x133830),
        mid: new THREE.Color(0x0d9488),
        bright: new THREE.Color(0xf59e0b),
        mint: new THREE.Color(0xfbbf24),
        ice: new THREE.Color(0xfef3c7),
        wireframe: new THREE.Color(0xf59e0b),
        halo: new THREE.Color(0xf59e0b),
      },
      // Act 3 Pillar 03: Full Gold-White
      pillarFullGold: {
        deepVoid: new THREE.Color(0x0b0a12),
        core: new THREE.Color(0x451a03),
        mid: new THREE.Color(0xb45309),
        bright: new THREE.Color(0xf59e0b),
        mint: new THREE.Color(0xfde68a),
        ice: new THREE.Color(0xffffff),
        wireframe: new THREE.Color(0xfbbf24),
        halo: new THREE.Color(0xf59e0b),
      },
      // Act 5: Smoke / Deep Violet-to-Teal
      smokeViolet: {
        deepVoid: new THREE.Color(0x080612),
        core: new THREE.Color(0x2a2140),
        mid: new THREE.Color(0x4a3b6b),
        bright: new THREE.Color(0x14b8a6),
        mint: new THREE.Color(0x8b5cf6),
        ice: new THREE.Color(0xd8b4fe),
        wireframe: new THREE.Color(0xa78bfa),
        halo: new THREE.Color(0x7c3aed),
      },
    };

    // Animation Loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Critically damped spring lerp on scroll (~0.085 per frame)
      currentScroll += (targetScroll - currentScroll) * 0.085;
      
      // Calculate scroll impulse velocity
      const instantVelocity = Math.abs(currentScroll - prevScroll) / Math.max(0.001, delta);
      scrollVelocity += (instantVelocity * 0.08 - scrollVelocity) * 0.12;
      prevScroll = currentScroll;

      // Damped pointer lerp
      mouseX += (mouseTargetX - mouseX) * 0.06;
      mouseY += (mouseTargetY - mouseY) * 0.06;

      const p = currentScroll; // Continuous normalized progress [0, 1]

      // State machine parameter targets
      let targetX = 0;
      let targetY = -2.4;
      let targetScale = 1.0;
      let targetCameraZ = 14;
      let turbulence = 0;
      let internalFlux = 0.2;
      let fresnelPower = 2.6;
      let fresnelStrength = 1.0;
      let haloIntensity = 0.75;
      let wireframeMix = 0;
      let fillDensity = 1.0;
      let smokeMix = 0;
      let splitMix = 0;

      // ─────────────────────────────────────────────────────────────
      // ACT 1: HERO (0.00 - 0.18) · Liquid Glass State (Teal Core, White Fresnel)
      // ─────────────────────────────────────────────────────────────
      if (p < 0.18) {
        const t = p / 0.18;
        targetX = 0;
        targetY = -2.4 + t * 0.4;
        targetScale = 1.0;
        targetCameraZ = 14 - t * 0.6;
        turbulence = 0.0;
        internalFlux = 0.25;
        fresnelPower = 2.6;
        fresnelStrength = 1.0;
        haloIntensity = 0.75;
        wireframeMix = 0.0;
        fillDensity = 1.0;
        smokeMix = 0.0;
        splitMix = 0.0;

        // Colors: Liquid Glass Teal
        targetColors.deepVoid.copy(stateColors.glassTeal.deepVoid);
        targetColors.core.copy(stateColors.glassTeal.core);
        targetColors.mid.copy(stateColors.glassTeal.mid);
        targetColors.bright.copy(stateColors.glassTeal.bright);
        targetColors.mint.copy(stateColors.glassTeal.mint);
        targetColors.ice.copy(stateColors.glassTeal.ice);
        targetColors.wireframe.copy(stateColors.glassTeal.wireframe);
        targetColors.halo.copy(stateColors.glassTeal.halo);
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 2: PROBLEM (0.18 - 0.38) · Wireframe / Structural State (Electric Blue-White)
      // ─────────────────────────────────────────────────────────────
      else if (p < 0.38) {
        const t = (p - 0.18) / 0.20;
        targetX = -1.0 * t;
        targetY = -2.0 + t * 0.8;
        targetScale = 0.94;
        targetCameraZ = 13.4;
        turbulence = t * 1.6;
        internalFlux = 0.85 * t;
        fresnelPower = 2.2;
        fresnelStrength = 1.25;
        haloIntensity = 0.68;
        wireframeMix = t;
        fillDensity = 1.0 - t * 0.72; // Sparse volume fill
        smokeMix = 0.0;
        splitMix = 0.0;

        // Interpolate colors towards Wireframe Electric Blue
        targetColors.deepVoid.lerpColors(stateColors.glassTeal.deepVoid, stateColors.wireframeBlue.deepVoid, t);
        targetColors.core.lerpColors(stateColors.glassTeal.core, stateColors.wireframeBlue.core, t);
        targetColors.mid.lerpColors(stateColors.glassTeal.mid, stateColors.wireframeBlue.mid, t);
        targetColors.bright.lerpColors(stateColors.glassTeal.bright, stateColors.wireframeBlue.bright, t);
        targetColors.mint.lerpColors(stateColors.glassTeal.mint, stateColors.wireframeBlue.mint, t);
        targetColors.ice.lerpColors(stateColors.glassTeal.ice, stateColors.wireframeBlue.ice, t);
        targetColors.wireframe.lerpColors(stateColors.glassTeal.wireframe, stateColors.wireframeBlue.wireframe, t);
        targetColors.halo.lerpColors(stateColors.glassTeal.halo, stateColors.wireframeBlue.halo, t);
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 3: PILLARS (0.38 - 0.72) · Liquid Glass with Hue Rotation
      // ─────────────────────────────────────────────────────────────
      else if (p < 0.72) {
        const t = (p - 0.38) / 0.34;
        targetX = 1.8 - Math.sin(t * Math.PI) * 0.4;
        targetY = -1.2 + Math.sin(t * Math.PI * 2.0) * 0.35;
        targetScale = 0.90;
        targetCameraZ = 13.6;
        turbulence = Math.max(0, 0.4 - t * 0.4);
        internalFlux = 1.0;
        fresnelPower = 3.0;
        fresnelStrength = 1.15;
        haloIntensity = 0.82;
        wireframeMix = Math.max(0, (1.0 - t * 3.0) * 0.3); // Quick recovery to glass
        fillDensity = 1.0;
        smokeMix = 0.0;
        splitMix = 0.0;

        // Sub-cycle internal hue per pillar
        if (t < 0.33) {
          // Pillar 01 (0.38 - 0.49): Cryogenic Teal-White
          const subT = t / 0.33;
          targetColors.deepVoid.lerpColors(stateColors.wireframeBlue.deepVoid, stateColors.glassTeal.deepVoid, subT);
          targetColors.core.lerpColors(stateColors.wireframeBlue.core, stateColors.glassTeal.core, subT);
          targetColors.mid.lerpColors(stateColors.wireframeBlue.mid, stateColors.glassTeal.mid, subT);
          targetColors.bright.lerpColors(stateColors.wireframeBlue.bright, stateColors.glassTeal.bright, subT);
          targetColors.mint.lerpColors(stateColors.wireframeBlue.mint, stateColors.glassTeal.mint, subT);
          targetColors.ice.copy(stateColors.glassTeal.ice);
          targetColors.wireframe.copy(stateColors.glassTeal.wireframe);
          targetColors.halo.copy(stateColors.glassTeal.halo);
        } else if (t < 0.66) {
          // Pillar 02 (0.49 - 0.60): Teal-to-Warm Dilution Gold Blend
          const subT = (t - 0.33) / 0.33;
          targetColors.deepVoid.copy(stateColors.glassTeal.deepVoid);
          targetColors.core.lerpColors(stateColors.glassTeal.core, stateColors.pillarGoldBlend.core, subT);
          targetColors.mid.lerpColors(stateColors.glassTeal.mid, stateColors.pillarGoldBlend.mid, subT);
          targetColors.bright.lerpColors(stateColors.glassTeal.bright, stateColors.pillarGoldBlend.bright, subT);
          targetColors.mint.lerpColors(stateColors.glassTeal.mint, stateColors.pillarGoldBlend.mint, subT);
          targetColors.ice.lerpColors(stateColors.glassTeal.ice, stateColors.pillarGoldBlend.ice, subT);
          targetColors.wireframe.lerpColors(stateColors.glassTeal.wireframe, stateColors.pillarGoldBlend.wireframe, subT);
          targetColors.halo.lerpColors(stateColors.glassTeal.halo, stateColors.pillarGoldBlend.halo, subT);
        } else {
          // Pillar 03 (0.60 - 0.72): Full Gold-White Photonic State
          const subT = (t - 0.66) / 0.34;
          targetColors.deepVoid.copy(stateColors.pillarGoldBlend.deepVoid);
          targetColors.core.lerpColors(stateColors.pillarGoldBlend.core, stateColors.pillarFullGold.core, subT);
          targetColors.mid.lerpColors(stateColors.pillarGoldBlend.mid, stateColors.pillarFullGold.mid, subT);
          targetColors.bright.lerpColors(stateColors.pillarGoldBlend.bright, stateColors.pillarFullGold.bright, subT);
          targetColors.mint.lerpColors(stateColors.pillarGoldBlend.mint, stateColors.pillarFullGold.mint, subT);
          targetColors.ice.copy(stateColors.pillarFullGold.ice);
          targetColors.wireframe.copy(stateColors.pillarFullGold.wireframe);
          targetColors.halo.copy(stateColors.pillarFullGold.halo);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 4: COMPARISON (0.72 - 0.88) · Split Treatment (Turbulent Wireframe vs Clean Glass)
      // ─────────────────────────────────────────────────────────────
      else if (p < 0.88) {
        const t = (p - 0.72) / 0.16;
        targetX = 1.4 - t * 1.4;
        targetY = -1.4 - t * 0.3;
        targetScale = 0.96;
        targetCameraZ = 13.8;
        turbulence = (1.0 - t) * 0.4;
        internalFlux = 0.7;
        fresnelPower = 3.2;
        fresnelStrength = 1.2;
        haloIntensity = 0.78;
        wireframeMix = 0.0;
        fillDensity = 1.0;
        smokeMix = 0.0;
        splitMix = Math.min(1.0, t * 2.2); // Activates split shader comparison

        // Transition back towards Cryogenic Optical Teal for quantum half
        targetColors.deepVoid.copy(stateColors.glassTeal.deepVoid);
        targetColors.core.lerpColors(stateColors.pillarFullGold.core, stateColors.glassTeal.core, t);
        targetColors.mid.lerpColors(stateColors.pillarFullGold.mid, stateColors.glassTeal.mid, t);
        targetColors.bright.lerpColors(stateColors.pillarFullGold.bright, stateColors.glassTeal.bright, t);
        targetColors.mint.lerpColors(stateColors.pillarFullGold.mint, stateColors.glassTeal.mint, t);
        targetColors.ice.copy(stateColors.glassTeal.ice);
        targetColors.wireframe.copy(stateColors.wireframeBlue.wireframe);
        targetColors.halo.lerpColors(stateColors.pillarFullGold.halo, stateColors.glassTeal.halo, t);
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 5: CLOSING CTA (0.88 - 1.00) · Smoke / Deep Violet-to-Teal Blend State
      // ─────────────────────────────────────────────────────────────
      else {
        const t = (p - 0.88) / 0.12;
        targetX = 0;
        targetY = -1.7 + t * 0.4; // Sits directly behind the CTA portal
        targetScale = 1.05 + t * 0.18;
        targetCameraZ = 13.8 - t * 1.2;
        turbulence = 0.0;
        internalFlux = 1.1;
        fresnelPower = 2.4;
        fresnelStrength = 0.9;
        haloIntensity = 0.72 - t * 0.12; // Dimmer, more mysterious aura
        wireframeMix = 0.0;
        fillDensity = 0.90;
        smokeMix = Math.min(1.0, t * 1.5);
        splitMix = Math.max(0.0, 1.0 - t * 3.0);

        // Interpolate into Smoke Violet
        targetColors.deepVoid.lerpColors(stateColors.glassTeal.deepVoid, stateColors.smokeViolet.deepVoid, t);
        targetColors.core.lerpColors(stateColors.glassTeal.core, stateColors.smokeViolet.core, t);
        targetColors.mid.lerpColors(stateColors.glassTeal.mid, stateColors.smokeViolet.mid, t);
        targetColors.bright.lerpColors(stateColors.glassTeal.bright, stateColors.smokeViolet.bright, t);
        targetColors.mint.lerpColors(stateColors.glassTeal.mint, stateColors.smokeViolet.mint, t);
        targetColors.ice.lerpColors(stateColors.glassTeal.ice, stateColors.smokeViolet.ice, t);
        targetColors.wireframe.copy(stateColors.smokeViolet.wireframe);
        targetColors.halo.lerpColors(stateColors.glassTeal.halo, stateColors.smokeViolet.halo, t);
      }

      // Spring-damped lerp for mesh transforms (~0.085)
      heroMesh.position.x += (targetX - heroMesh.position.x) * 0.085;
      heroMesh.position.y += (targetY - heroMesh.position.y) * 0.085;
      
      const currentScale = heroMesh.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.085;
      heroMesh.scale.set(newScale, newScale, newScale);

      camera.position.z += (targetCameraZ - camera.position.z) * 0.085;

      // Spring-damped lerp for float uniforms
      heroMaterial.uniforms.uTime.value = elapsed;
      heroMaterial.uniforms.uScroll.value = p;
      heroMaterial.uniforms.uScrollVelocity.value = Math.min(scrollVelocity, 1.5);
      heroMaterial.uniforms.uPointer.value.set(mouseX, mouseY);
      heroMaterial.uniforms.uPointerActive.value += (pointerActive - heroMaterial.uniforms.uPointerActive.value) * 0.06;

      heroMaterial.uniforms.uTurbulence.value += (turbulence - heroMaterial.uniforms.uTurbulence.value) * 0.085;
      heroMaterial.uniforms.uInternalFlux.value += (internalFlux - heroMaterial.uniforms.uInternalFlux.value) * 0.085;
      heroMaterial.uniforms.uFresnelPower.value += (fresnelPower - heroMaterial.uniforms.uFresnelPower.value) * 0.085;
      heroMaterial.uniforms.uFresnelStrength.value += (fresnelStrength - heroMaterial.uniforms.uFresnelStrength.value) * 0.085;
      heroMaterial.uniforms.uWireframeMix.value += (wireframeMix - heroMaterial.uniforms.uWireframeMix.value) * 0.085;
      heroMaterial.uniforms.uFillDensity.value += (fillDensity - heroMaterial.uniforms.uFillDensity.value) * 0.085;
      heroMaterial.uniforms.uSmokeMix.value += (smokeMix - heroMaterial.uniforms.uSmokeMix.value) * 0.085;
      heroMaterial.uniforms.uSplitMix.value += (splitMix - heroMaterial.uniforms.uSplitMix.value) * 0.085;

      haloMaterial.uniforms.uPulse.value = Math.sin(elapsed * 2.2) * 0.5 + 0.5;
      haloMaterial.uniforms.uGlowIntensity.value += (haloIntensity - haloMaterial.uniforms.uGlowIntensity.value) * 0.085;

      // Spring-damped lerp for Color uniforms
      heroMaterial.uniforms.uColorDeepVoid.value.lerp(targetColors.deepVoid, 0.085);
      heroMaterial.uniforms.uColorCore.value.lerp(targetColors.core, 0.085);
      heroMaterial.uniforms.uColorMid.value.lerp(targetColors.mid, 0.085);
      heroMaterial.uniforms.uColorBright.value.lerp(targetColors.bright, 0.085);
      heroMaterial.uniforms.uColorMintPhoton.value.lerp(targetColors.mint, 0.085);
      heroMaterial.uniforms.uColorIceWhite.value.lerp(targetColors.ice, 0.085);
      heroMaterial.uniforms.uColorWireframe.value.lerp(targetColors.wireframe, 0.085);
      haloMaterial.uniforms.uGlowColor.value.lerp(targetColors.halo, 0.085);

      // Restrained continuous rotation
      const rotSpeed = prefersReducedMotion ? 0.03 : 0.12;
      heroMesh.rotation.y = elapsed * rotSpeed + p * 2.2;
      heroMesh.rotation.x = Math.sin(elapsed * 0.3) * 0.08;

      // Dust drift
      starParticles.rotation.y = elapsed * 0.012;
      starParticles.position.y = Math.sin(elapsed * 0.25) * 0.25;

      // Mouse parallax
      if (!prefersReducedMotion) {
        rootGroup.rotation.y = mouseX * 0.12;
        rootGroup.rotation.x = -mouseY * 0.08;
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
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  );
}
