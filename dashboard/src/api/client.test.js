import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBaseUrl } from './client.js';

describe('API Client Configuration & URL Resolution', () => {
  it('defaults to http://localhost:8000 in development when VITE_API_URL is unset', () => {
    const devEnv = { DEV: true, PROD: false };
    const url = resolveBaseUrl(devEnv);
    assert.equal(url, 'http://localhost:8000');
  });

  it('uses VITE_API_URL when provided and trims trailing slashes', () => {
    const customEnv = { VITE_API_URL: 'https://api.hyperqds.io/' };
    const url = resolveBaseUrl(customEnv);
    assert.equal(url, 'https://api.hyperqds.io');
  });

  it('defaults to empty string (same-origin relative) in production when VITE_API_URL is unset', () => {
    const prodEnv = { DEV: false, PROD: true };
    const url = resolveBaseUrl(prodEnv);
    assert.equal(url, '');
    assert.notEqual(url, 'http://localhost:8000', 'Production build must never default to localhost');
  });

  it('honors explicit VITE_API_URL in production', () => {
    const prodEnv = {
      DEV: false,
      PROD: true,
      VITE_API_URL: 'https://backend.hyperqds.io',
    };
    const url = resolveBaseUrl(prodEnv);
    assert.equal(url, 'https://backend.hyperqds.io');
  });

  it('uses VITE_API_BASE_URL when provided and trims trailing slashes', () => {
    const customEnv = { VITE_API_BASE_URL: 'http://127.0.0.1:8000/' };
    const url = resolveBaseUrl(customEnv);
    assert.equal(url, 'http://127.0.0.1:8000');
  });

  it('prefers VITE_API_BASE_URL over VITE_API_URL when both are present', () => {
    const env = {
      VITE_API_BASE_URL: 'http://127.0.0.1:8000',
      VITE_API_URL: 'http://localhost:8000',
    };
    const url = resolveBaseUrl(env);
    assert.equal(url, 'http://127.0.0.1:8000');
  });
});

