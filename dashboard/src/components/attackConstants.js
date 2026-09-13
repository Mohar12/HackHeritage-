/**
 * attackConstants.js
 * ==================
 * Single Source of Truth for Attack Lab Adversarial Entities, Vectors, and 3D Canvas Mappings.
 */

export const TARGET_SIGNATURE_ENTITIES = [
  {
    id: 'TX-2026-FED-BOE',
    name: 'Federal Reserve → Bank of England ($25M Wire Settlement)',
    category: 'Critical Financial Infrastructure',
    sender: 'Alice (US-East-1 QKD Gateway)',
    recipient: 'Bob (UK-LON-2 QKD Gateway)',
    documentPayload: 'SWIFT-AUTH: Transfer $25,000,000 USD to Bank of England [Settlement Acc #GB89-4402]',
    payloadHash: '0x9f4a81b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
    sessionNonce: '0x7b2f489a',
    keyBits: '1100101011110001010110100110',
  },
  {
    id: 'CMD-994-DEFCON1',
    name: 'DoD SATCOM (Orbital Perimeter Lockdown Command)',
    category: 'Defense / National Security',
    sender: 'Alice (US-NORAD-Secure-01)',
    recipient: 'Bob (US-SPACECOM-Polar-04)',
    documentPayload: 'CMD-EXEC: DEFCON-1 Orbital Defense Shield Perimeter Lockout [AUTH-LEVEL-OMEGA]',
    payloadHash: '0xd81e9204fbca10982345ef01a92c348719283746',
    sessionNonce: '0x3c99a14d',
    keyBits: '0111010010101110001101011100',
  },
  {
    id: 'HLTH-771-GENOME',
    name: 'National Genomic Vault (Master Vault Decryption Key)',
    category: 'Sovereign Biomedical Intelligence',
    sender: 'Alice (NIH-BioVault-East)',
    recipient: 'Bob (CDC-Genome-Center-Atlanta)',
    documentPayload: 'VAULT-UNLOCK: Decrypt Sovereign Genomic Database Slice #0994 [Access: RESTRICTED]',
    payloadHash: '0x44289a01be9c87f1234901827364510293847561',
    sessionNonce: '0x88f1e29c',
    keyBits: '1010011101010011110010101001',
  },
];

export const ATTACK_VECTORS = [
  {
    value: 'intercept_resend',
    label: 'Intercept-Resend (EPR Collapse)',
    targetSubsystem: 'Optical Fiber Link [Alice → Bob]',
    desc: 'Eve measures flying qubits in random Pauli bases (X or Z), collapsing Bell entanglement and inducing ~25% QBER (violates BB84 bound ε = 0.11).',
  },
  {
    value: 'depolarizing',
    label: 'Depolarizing Channel Noise',
    targetSubsystem: 'Fiber Core & Ambient Quantum Environment',
    desc: 'Models uniform environmental thermal decoherence: (1 − p)ρ + (p/3) ∑ᵢ σᵢ ρ σᵢ. Reduces Uhlmann fidelity without active eavesdropper.',
  },
  {
    value: 'forgery',
    label: 'Signature Forgery (Blind Guessing)',
    targetSubsystem: 'Alice\'s Private EPR Key Store & Signature Ingestion',
    desc: 'Eve attempts to forge Alice\'s signature without private EPR key material. Probability of successful forgery is bounded by P(forgery) ≤ 2⁻ᴸ.',
  },
  {
    value: 'impersonation',
    label: 'Alice Impersonation (Spoofed States)',
    targetSubsystem: 'Alice\'s Identity & Quantum State Preparation Node',
    desc: 'Eve transmits unentangled product states claiming to be Alice. Produces severe Pearson χ² Born distribution skew (p < 0.0001).',
  },
  {
    value: 'replay',
    label: 'Signature Replay Attack',
    targetSubsystem: 'Session Nonce Registry & Audit Timestamp Channel',
    desc: 'Eve captures a valid signature from Session A and attempts re-submission in Session B. Rejected via session nonce and state non-reuse.',
  },
];

export const ATTACK_CANVAS_CONFIG = {
  intercept_resend: { pillar: '03', dimension: 4, label: 'Intercept-Resend', accentColor: '#ff1744' },
  depolarizing:      { pillar: '03', dimension: 4, label: 'Depolarizing Noise', accentColor: '#ef4444' },
  forgery:          { pillar: '03', dimension: 4, label: 'Bell State Forgery', accentColor: '#e11d48' },
  impersonation:    { pillar: '03', dimension: 4, label: 'Alice Impersonation', accentColor: '#fb7185' },
  replay:           { pillar: '03', dimension: 4, label: 'Session Replay', accentColor: '#f43f5e' },
};

export const ATTACK_TO_PILLAR = {
  intercept_resend: '03',
  depolarizing: '01',
  forgery: '02',
  impersonation: '02',
  replay: '01',
};

export const ATTACK_TO_DIMENSION = {
  intercept_resend: 4,
  depolarizing: 0,
  forgery: 2,
  impersonation: 3,
  replay: 1,
};

export const normalizeAttackType = (type) => {
  if (!type) return 'intercept_resend';
  if (type === 'bell_forgery') return 'forgery';
  if (type === 'depolarizing_noise') return 'depolarizing';
  if (type === 'intercept-resend') return 'intercept_resend';
  if (!['intercept_resend', 'depolarizing', 'forgery', 'impersonation', 'replay'].includes(type)) {
    return 'intercept_resend';
  }
  return type;
};
