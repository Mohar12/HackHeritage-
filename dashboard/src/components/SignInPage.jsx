/**
 * SignInPage.jsx
 * ==============
 * Dedicated HyperQDS Secure Sign-In & Registration Experience.
 * Reuses the exact same 3D QuantumEntanglementCanvas as the landing page.
 * Single viewport (100vh, overflow: hidden).
 * Connects directly to PostgreSQL authentication endpoints.
 */

import React, { useState, useEffect } from 'react';
import QuantumEntanglementCanvas from './QuantumEntanglementCanvas.jsx';
import { loginUser, registerUser } from '../services/authApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.__VITE_API_URL__) {
    return window.__VITE_API_URL__;
  }
  const envUrl = import.meta.env.VITE_API_URL || '';
  if (envUrl && typeof window !== 'undefined') {
    try {
      const parsed = new URL(envUrl, window.location.href);
      if (window.location.hostname === '127.0.0.1' && parsed.hostname === 'localhost') {
        parsed.hostname = '127.0.0.1';
        return parsed.origin;
      }
      if (window.location.hostname === 'localhost' && parsed.hostname === '127.0.0.1') {
        parsed.hostname = 'localhost';
        return parsed.origin;
      }
      return parsed.origin;
    } catch {
      return envUrl;
    }
  }
  return envUrl;
};

const API_BASE = getApiBase();

export default function SignInPage({ onNavigate, onLoginSuccess }) {
  const auth = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [socialNotice, setSocialNotice] = useState('');

  // Handle URL errors passed from OAuth redirects and lock scrolling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err) {
        setErrorMessage(decodeURIComponent(err));
        const cleanUrl = window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (auth?.isAuthenticated && !auth?.isLoading) {
      if (onLoginSuccess) {
        onLoginSuccess(auth.user);
      } else if (onNavigate) {
        onNavigate('honest');
      }
    }
  }, [auth?.isAuthenticated, auth?.isLoading, auth?.user, onLoginSuccess, onNavigate]);


  const handleModeChange = (newMode) => {
    setMode(newMode);
    setErrorMessage('');
    setSocialNotice('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters in length.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        const user = auth?.register 
          ? await auth.register({ email, password, fullName })
          : (await registerUser({ email, password, fullName })).user;
        if (onLoginSuccess) {
          onLoginSuccess(user);
        } else if (onNavigate) {
          onNavigate('honest');
        }
      } else {
        const user = auth?.login 
          ? await auth.login({ email, password })
          : (await loginUser({ email, password })).user;
        if (onLoginSuccess) {
          onLoginSuccess(user);
        } else if (onNavigate) {
          onNavigate('honest');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to establish a secure connection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = handleSubmit;

  const handleSocialClick = async (providerKey) => {
    if (connectingProvider || isLoading) return;
    const providerName = providerKey.toLowerCase() === 'google' 
      ? 'Google' 
      : providerKey.toLowerCase() === 'github' 
        ? 'GitHub' 
        : 'Microsoft';
    setConnectingProvider(providerName);
    setSocialNotice(`Connecting to ${providerName}...`);
    setErrorMessage('');

    // Fetch OAuth initiation endpoint with format=json, setting the state cookie seamlessly
    try {
      const endpoint = `${API_BASE}/auth/${providerKey.toLowerCase()}/login?format=json`;
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          window.location.href = data.url;
          return;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.message || `${providerName} sign-in is not configured on the server.`);
        setConnectingProvider(null);
        setSocialNotice('');
        return;
      }
    } catch (err) {
      console.warn('OAuth pre-fetch notice:', err);
      // If pre-fetch had network issues, attempt direct browser navigation as fallback
      const targetUrl = `${API_BASE}/auth/${providerKey.toLowerCase()}/login`;
      window.location.href = targetUrl;
      return;
    }

    setConnectingProvider(null);
    setSocialNotice('');
  };


  return (
    <div className="hqds-auth-root">
      {/* Reused Quantum Entanglement 3D Background */}
      <div className="hqds-auth-canvas-mount" aria-hidden="true">
        <QuantumEntanglementCanvas activePillar="01" activeDimension={0} />
      </div>

      {/* Atmospheric Ambient Scrim */}
      <div className="hqds-ambient-scrim" aria-hidden="true" />

      {/* Simplified Auth Header */}
      <header className="hqds-auth-header">
        <div className="hqds-auth-header-inner">
          <div 
            className="hqds-auth-brand"
            onClick={() => onNavigate && onNavigate('landing')}
            role="button"
            tabIndex={0}
          >
            HYPERQDS
          </div>

          <button
            type="button"
            className="hqds-auth-back-btn"
            onClick={() => onNavigate && onNavigate('landing')}
          >
            <span>Back to Home →</span>
          </button>
        </div>
      </header>

      {/* Central Optical Translucent Glass Authentication Panel */}
      <main className="hqds-auth-main">
        <div className="hqds-auth-glass-panel">
          {/* Header Title & Subtitle */}
          <div className="hqds-auth-panel-header">
            <h1 className="hqds-auth-title">
              {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
            </h1>
            <p className="hqds-auth-subtitle">
              {mode === 'signin' 
                ? 'Continue to your quantum security console.' 
                : 'Join the future of quantum-secure infrastructure.'}
            </p>

            {/* Segmented Mode Toggle [Sign In | Create Account] */}
            <div className="hqds-auth-mode-toggle" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={`hqds-auth-toggle-pill ${mode === 'signin' ? 'is-active' : ''}`}
                onClick={() => handleModeChange('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={`hqds-auth-toggle-pill ${mode === 'register' ? 'is-active' : ''}`}
                onClick={() => handleModeChange('register')}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form className="hqds-auth-form" onSubmit={handleSubmit} noValidate>
            {/* Inline Error Message */}
            {errorMessage && (
              <div className="hqds-auth-error-alert" role="alert">
                <svg className="hqds-auth-error-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Full Name Field (Register Mode Only) */}
            {mode === 'register' && (
              <div className="hqds-auth-field-group">
                <label htmlFor="auth-fullname" className="hqds-auth-label">
                  Full name
                </label>
                <div className="hqds-auth-input-wrapper">
                  <span className="hqds-auth-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="auth-fullname"
                    type="text"
                    className="hqds-auth-input"
                    placeholder="Dr. Evelyn Thorne"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="hqds-auth-field-group">
              <label htmlFor="auth-email" className="hqds-auth-label">
                Email address
              </label>
              <div className="hqds-auth-input-wrapper">
                <span className="hqds-auth-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="auth-email"
                  type="email"
                  className="hqds-auth-input"
                  placeholder="operator@hyperqds.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="hqds-auth-field-group">
              <label htmlFor="auth-password" className="hqds-auth-label">
                Password
              </label>
              <div className="hqds-auth-input-wrapper">
                <span className="hqds-auth-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="hqds-auth-input"
                  placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="hqds-auth-eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Register Mode Only) */}
            {mode === 'register' && (
              <div className="hqds-auth-field-group">
                <label htmlFor="auth-confirm-password" className="hqds-auth-label">
                  Confirm password
                </label>
                <div className="hqds-auth-input-wrapper">
                  <span className="hqds-auth-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="hqds-auth-input"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="hqds-auth-eye-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me & Forgot Password (Sign In Mode) */}
            {mode === 'signin' && (
              <div className="hqds-auth-row-options">
                <label className="hqds-auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="hqds-auth-forgot-link"
                  onClick={() => {
                    setErrorMessage('Self-service password recovery is handled by your enterprise administrator.');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Primary Action Button (Sign In -> / Create Account ->) */}
            <button
              type="submit"
              className="hqds-auth-submit-btn"
              disabled={isLoading}
            >
              <span>
                {isLoading ? (
                  <>
                    <span className="hqds-auth-spin-ring" aria-hidden="true" />
                    <span>Authenticating ···</span>
                  </>
                ) : (
                  mode === 'signin' ? 'Sign In →' : 'Create Account →'
                )}
              </span>
            </button>
          </form>

          {/* Divider: or continue with */}
          <div className="hqds-auth-divider">
            <span>or continue with</span>
          </div>

          {/* Social Authentication Row */}
          <div className="hqds-auth-social-row">
            {/* Google */}
            <button
              type="button"
              className={`hqds-auth-social-btn ${connectingProvider === 'Google' ? 'is-connecting' : ''}`}
              onClick={() => handleSocialClick('google')}
              disabled={Boolean(connectingProvider || isLoading)}
              aria-label={connectingProvider === 'Google' ? 'Connecting to Google…' : 'Continue with Google'}
              title={connectingProvider === 'Google' ? 'Connecting to Google…' : 'Continue with Google'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.7 0 3 .6 4 1.5l3-3C17.2 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"/>
              </svg>
            </button>

            {/* GitHub */}
            <button
              type="button"
              className={`hqds-auth-social-btn ${connectingProvider === 'GitHub' ? 'is-connecting' : ''}`}
              onClick={() => handleSocialClick('github')}
              disabled={Boolean(connectingProvider || isLoading)}
              aria-label={connectingProvider === 'GitHub' ? 'Connecting to GitHub…' : 'Continue with GitHub'}
              title={connectingProvider === 'GitHub' ? 'Connecting to GitHub…' : 'Continue with GitHub'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </button>

            {/* Microsoft */}
            <button
              type="button"
              className={`hqds-auth-social-btn ${connectingProvider === 'Microsoft' ? 'is-connecting' : ''}`}
              onClick={() => handleSocialClick('microsoft')}
              disabled={Boolean(connectingProvider || isLoading)}
              aria-label={connectingProvider === 'Microsoft' ? 'Connecting to Microsoft…' : 'Continue with Microsoft'}
              title={connectingProvider === 'Microsoft' ? 'Connecting to Microsoft…' : 'Continue with Microsoft'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
            </button>
          </div>


          {/* Social placeholder feedback */}
          {socialNotice && (
            <div className="hqds-auth-social-notice">
              {socialNotice}
            </div>
          )}

          {/* Footer tagline */}
          <div className="hqds-auth-panel-footer">
            Secured by the laws of physics.
          </div>
        </div>
      </main>
    </div>
  );
}
