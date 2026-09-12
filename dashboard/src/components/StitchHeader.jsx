/**
 * StitchHeader.jsx
 * ================
 * Canonical Stitch Navigation Header shared across all HyperQDS pages.
 * Exact design language from the Landing Page:
 * - Liquid Brokers reference architecture (.hqds-top-nav + .hqds-nav-ambient-light)
 * - Typography wordmark brand (HYPERQDS with Epilogue font & hqdsLogoLuminance)
 * - Unified center navigation links (.hqds-nav-link with cyan active/hover indicators)
 * - Optical fluid caustics button pair (.hqds-nav-ghost-btn & .hqds-nav-pill-btn)
 * - Excludes SYSTEM: ONLINE and Test User
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function StitchHeader({ activeTab = 'landing', onNavigate }) {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const [optimisticTab, setOptimisticTab] = useState(activeTab);

  useEffect(() => {
    setOptimisticTab(activeTab);
  }, [activeTab]);

  const navItems = [
    { id: 'landing', label: 'Overview', colorKey: 'overview' },
    { id: 'honest', label: 'Honest Protocol', colorKey: 'honest' },
    { id: 'attack', label: 'Attack Lab', colorKey: 'attack' },
    { id: 'large_scale', label: 'Scalable Engine', colorKey: 'scalable' },
    { id: 'audit', label: 'Audit Ledger', colorKey: 'audit' },
  ];

  const themeClassMap = {
    landing: 'theme-overview',
    honest: 'theme-honest',
    attack: 'theme-attack',
    large_scale: 'theme-scalable',
    scalable: 'theme-scalable',
    audit: 'theme-audit',
  };
  const currentActive = optimisticTab || activeTab;
  const currentTheme = themeClassMap[currentActive] || 'theme-overview';

  return (
    <nav className={`hqds-top-nav ${currentTheme}`} aria-label="Main Navigation">
      <div className="hqds-nav-ambient-light" aria-hidden="true" />
      <div className="hqds-nav-inner">
        {/* Brand Lockup — Exact Landing Page Typography Wordmark */}
        <div 
          className="hqds-brand-wrap" 
          onClick={() => {
            setOptimisticTab('landing');
            if (onNavigate) onNavigate('landing');
          }}
          title="HyperQDS Overview"
          role="button"
          tabIndex={0}
        >
          <span className="hqds-brand-title">HYPERQDS</span>
        </div>

        {/* Global Navigation Links with distinct signature colors */}
        <div className="hqds-nav-center">
          {navItems.map((item) => {
            const isActive = currentActive === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`hqds-nav-link hqds-nav-link-${item.colorKey} ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  if (item.id !== currentActive) {
                    setOptimisticTab(item.id);
                    if (onNavigate) onNavigate(item.id);
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Action Pair — Exact Landing Page Liquid-Fill Buttons */}
        <div className="hqds-nav-right">
          {isAuthLoading ? (
            <button
              type="button"
              className="hqds-nav-pill-btn"
              disabled
              aria-label="Checking session"
              style={{ opacity: 0.6, pointerEvents: 'none' }}
            >
              <span>···</span>
            </button>
          ) : isAuthenticated ? (
            <>
              <button
                type="button"
                className="hqds-nav-ghost-btn"
                onClick={() => onNavigate && onNavigate('honest')}
                title="Open Honest Protocol Console"
              >
                <span>Console</span>
              </button>
              <button
                type="button"
                className="hqds-nav-pill-btn"
                onClick={async () => {
                  try {
                    await logout();
                  } catch (err) {
                    console.error('Logout error:', err);
                  }
                }}
                title="Sign out of session"
              >
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="hqds-nav-ghost-btn"
                onClick={() => onNavigate && onNavigate('landing')}
                title="Explore platform overview"
              >
                <span>Get Started</span>
              </button>
              <button
                type="button"
                className="hqds-nav-pill-btn"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('sign-in');
                  }
                }}
                title="Sign in to HyperQDS"
              >
                <span>Sign In</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
