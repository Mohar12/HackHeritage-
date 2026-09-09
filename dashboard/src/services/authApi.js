/**
 * authApi.js
 * ==========
 * Client-side authentication service for HyperQDS.
 * Communicates with FastAPI PostgreSQL endpoints (/auth/login, /auth/register, /auth/me, /auth/logout).
 * Includes credentials for HTTP-only session cookie management.
 */

const API_BASE = (typeof window !== 'undefined' && window.__VITE_API_URL__) 
  || import.meta.env.VITE_API_URL 
  || '';

export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Invalid email or password.');
  }
  return data;
}

export async function registerUser({ email, password, fullName }) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      email,
      password,
      full_name: fullName || null,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to create account.');
  }
  return data;
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }
  return await response.json();
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    console.warn('Logout warning:', err);
  }
}
