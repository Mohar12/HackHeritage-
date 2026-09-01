/**
 * client.js
 * =========
 * API client for the QDS Threat Detection backend (FastAPI on port 8000).
 *
 * Each function wraps a single backend endpoint and handles JSON
 * serialisation / deserialisation. Throws on non-2xx HTTP responses.
 *
 * TODO: Add request cancellation via AbortController for long-running simulations.
 * TODO: Add retry logic with exponential back-off for transient failures.
 * TODO: Move BASE_URL to an environment variable (import.meta.env.VITE_API_URL).
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

// ---------------------------------------------------------------------------
// /generate-keys
// ---------------------------------------------------------------------------
/** @param {{ n_qubits: number }} params */
export async function generateKeys(params) {
  // TODO: return apiFetch('/generate-keys/', { method: 'POST', body: JSON.stringify(params) });
  throw new Error('generateKeys: not yet implemented');
}

// ---------------------------------------------------------------------------
// /signatures
// ---------------------------------------------------------------------------
/** @param {{ message: string, private_key: object }} params */
export async function signMessage(params) {
  // TODO: return apiFetch('/signatures/sign', { method: 'POST', body: JSON.stringify(params) });
  throw new Error('signMessage: not yet implemented');
}

/** @param {{ signature: object, public_key: object }} params */
export async function verifySignature(params) {
  // TODO: return apiFetch('/signatures/verify', { method: 'POST', body: JSON.stringify(params) });
  throw new Error('verifySignature: not yet implemented');
}

// ---------------------------------------------------------------------------
// /simulate-attack
// ---------------------------------------------------------------------------
/** @param {{ attack_type: string, params: object }} params */
export async function simulateAttack(params) {
  // TODO: return apiFetch('/simulate-attack/', { method: 'POST', body: JSON.stringify(params) });
  throw new Error('simulateAttack: not yet implemented');
}

// ---------------------------------------------------------------------------
// /detect
// ---------------------------------------------------------------------------
/** @param {{ measurement_data: object }} params */
export async function detectThreat(params) {
  // TODO: return apiFetch('/detect/', { method: 'POST', body: JSON.stringify(params) });
  throw new Error('detectThreat: not yet implemented');
}
