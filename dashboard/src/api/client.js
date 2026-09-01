/**
 * client.js
 * =========
 * API client for the QDS Threat Detection backend (FastAPI on port 8000).
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/** Generic fetch helper — throws on non-2xx status. */
async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status} for ${url}: ${errorBody}`);
  }
  return response.json();
}

/** Check backend health */
export async function getHealth() {
  return apiFetch('/health');
}

/** Generate public keys and distribute EPR pairs */
export async function generateKeys(params = { n_qubits: 8 }) {
  return apiFetch('/generate-keys/', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** Sign a classical message using teleportation QDS */
export async function signMessage(params) {
  return apiFetch('/signatures/sign', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** Verify a QDS signature with Pauli corrections */
export async function verifySignature(params) {
  return apiFetch('/signatures/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** Simulate an attack (forgery, impersonation, replay, channel_manipulation) */
export async function simulateAttack(params) {
  return apiFetch('/simulate-attack/', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** Run threat detection over measurement statistics */
export async function detectThreat(params) {
  return apiFetch('/detect/', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** Unified single-call simulation endpoint */
export async function runUnifiedSimulation(params) {
  return apiFetch('/api/v1/simulate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
