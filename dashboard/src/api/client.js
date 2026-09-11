/**
 * client.js
 * =========
 * API client for the QDS Threat Detection backend.
 */

/**
 * Custom error class for QDS API interactions providing structured HTTP status,
 * response payloads, and clean human-readable error descriptions.
 */
export class ApiError extends Error {
  constructor(message, { status, statusText, url, data, isNetworkError = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Resolve the API base URL based on execution environment.
 * - Prioritizes VITE_API_BASE_URL, then VITE_API_URL (trimming trailing slashes).
 * - In production mode (PROD=true), defaults to '' (same-origin relative URL)
 *   so production builds never accidentally call localhost:8000.
 * - In development mode, aligns with current browser host (127.0.0.1 vs localhost)
 *   and defaults to 'http://localhost:8000' for Node.js / test environments.
 */
export function resolveBaseUrl(env = (typeof import.meta !== 'undefined' ? import.meta.env : {})) {
  const customUrl = env?.VITE_API_BASE_URL || env?.VITE_API_URL;
  if (customUrl) {
    return customUrl.replace(/\/+$/, '');
  }
  if (env?.PROD) {
    return '';
  }
  if (typeof window !== 'undefined' && window.location?.hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8000';
  }
  return 'http://localhost:8000';
}

export const BASE_URL = resolveBaseUrl();

/** Generic fetch helper — throws structured ApiError on non-2xx status or network failures. */
export async function apiFetch(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}${normalizedPath}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const apiKey =
    typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_API_KEY || import.meta.env?.QDS_API_KEY);
  if (apiKey) {
    defaultHeaders['Authorization'] = `Bearer ${apiKey}`;
    defaultHeaders['X-API-Key'] = apiKey;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
  } catch (networkErr) {
    const origin = typeof window !== 'undefined' ? window.location?.origin : '';
    throw new ApiError(
      `Backend unreachable. Could not connect to ${url}. Ensure the FastAPI backend is running (python -m uvicorn backend.main:app --reload)${origin ? ` and CORS allows origin ${origin}` : ''}.`,
      { url, isNetworkError: true }
    );
  }

  if (!response.ok) {
    let errorData = null;
    let detailMsg = '';
    try {
      errorData = await response.json();
      if (typeof errorData?.detail === 'string') {
        detailMsg = errorData.detail;
      } else if (Array.isArray(errorData?.detail)) {
        detailMsg = errorData.detail
          .map((d) => `${d.loc ? d.loc.slice(1).join('.') : 'parameter'}: ${d.msg}`)
          .join('; ');
      } else if (errorData?.message) {
        detailMsg = errorData.message;
      } else if (errorData?.error) {
        detailMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
      }
    } catch {
      try {
        detailMsg = await response.text();
      } catch {
        detailMsg = response.statusText;
      }
    }

    let userFriendlyMsg = '';
    if (response.status === 401) {
      userFriendlyMsg = `Authentication failure (HTTP 401): ${detailMsg || 'Valid API key or Bearer token required.'}`;
    } else if (response.status === 403) {
      userFriendlyMsg = `Access forbidden (HTTP 403): ${detailMsg || 'Request not authorized.'}`;
    } else if (response.status === 404) {
      userFriendlyMsg = `Endpoint not found (HTTP 404): ${url}`;
    } else if (response.status === 422) {
      userFriendlyMsg = `Validation failure (HTTP 422): ${detailMsg || 'Simulation parameters rejected by backend schema.'}`;
    } else if (response.status >= 500) {
      userFriendlyMsg = `Backend error (HTTP ${response.status}): ${detailMsg || 'An error occurred during quantum simulation.'}`;
    } else {
      userFriendlyMsg = `API request failed (HTTP ${response.status}): ${detailMsg || response.statusText}`;
    }

    throw new ApiError(userFriendlyMsg, {
      status: response.status,
      statusText: response.statusText,
      url,
      data: errorData,
    });
  }

  try {
    return await response.json();
  } catch (jsonErr) {
    throw new ApiError(
      `Malformed response from backend (HTTP ${response.status}): Received invalid JSON.`,
      { status: response.status, statusText: response.statusText, url }
    );
  }
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
