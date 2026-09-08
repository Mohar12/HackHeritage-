/**
 * client.js
 * =========
 * API client for the QDS Threat Detection backend.
 */

/**
 * Resolve the API base URL based on execution environment.
 * - If VITE_API_URL is provided, use it (trimming any trailing slash).
 * - In production mode (PROD=true), defaults to '' (same-origin relative URL)
 *   so production builds never accidentally call localhost:8000.
 * - In development mode, defaults to 'http://localhost:8000'.
 */
export function resolveBaseUrl(env = (typeof import.meta !== 'undefined' ? import.meta.env : {})) {
  if (env?.VITE_API_URL) {
    return env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (env?.PROD) {
    return '';
  }
  return 'http://localhost:8000';
}

export const BASE_URL = resolveBaseUrl();

/** Generic fetch helper — throws on non-2xx status. */
export async function apiFetch(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}${normalizedPath}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const apiKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY;
  if (apiKey) {
    defaultHeaders['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
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

/** Simulate an attack (forgery, impersonation, replay, intercept_resend, depolarizing) */
export async function simulateAttack(attackType, params = {}) {
  return apiFetch(`/simulate-attack/${attackType}`, {
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

/** Fetch immutable audit ledger entries */
export async function getAuditLedger(limit = 20) {
  return apiFetch(`/api/v1/audit-ledger?limit=${limit}`);
}

/** Unified single-call simulation endpoint */
export async function runUnifiedSimulation(params) {
  const cleanParams = { ...params };
  if (cleanParams.attack_type !== 'depolarizing') {
    delete cleanParams.noise_rate;
  }
  return apiFetch('/api/v1/simulate', {
    method: 'POST',
    body: JSON.stringify(cleanParams),
  });
}
