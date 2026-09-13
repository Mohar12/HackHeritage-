/**
 * StitchHeader.jsx
 * ================
 * Canonical Stitch Navigation Header shared across all HyperQDS pages.
 * - In Landing Page: Exactly 3 section navigation buttons (Physical Layer, Pillars, Dimensions)
 * - In Inner SOC Pages: 5 platform navigation tabs (Overview, Honest Protocol, Attack Lab, Scalable Engine, Audit Ledger)
 * - Action Pair: Clean borderless buttons (Console/Logout or Get Started/Sign In)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function StitchHeader({ 
  activeTab = 'landing', 
  onNavigate,
  activeSection,
  onScrollToSection,
}) {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const [optimisticTab, setOptimisticTab] = useState(activeTab);

  useEffect(() => {
    setOptimisticTab(activeTab);
  }, [activeTab]);

  const isLanding = (optimisticTab || activeTab) === 'landing';

  // Landing Page: exactly 3 section navigation buttons
  const landingNavItems = [
    { id: 'problem', label: 'Physical Layer', target: 'problem' },
    { id: 'pillars', label: 'Pillars', target: 'pillars' },
    { id: 'dimensions', label: 'Dimensions', target: 'comparison' },
  ];

  // Inner SOC Pages: 5 platform navigation tabs
  const dashboardNavItems = [
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

  const handleLandingScroll = (targetId) => {
    if (onScrollToSection) {
      onScrollToSection(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const isLandingItemActive = (item) => {
    if (!activeSection) return item.id === 'problem';
    if (item.id === 'problem') return activeSection === 'problem' || activeSection === 'hero';
    if (item.id === 'pillars') return activeSection === 'pillars';
    if (item.id === 'dimensions') return activeSection === 'comparison' || activeSection === 'conduit';
    return false;
  };

  return (
    <nav className={`hqds-top-nav ${currentTheme}`} aria-label="Main Navigation">
      <div className="hqds-nav-ambient-light" aria-hidden="true" />
      <div className="hqds-nav-inner">
        {/* Brand Lockup */}
        <div 
          className="hqds-brand-wrap" 
          onClick={() => {
            if (isLanding) {
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            } else {
              setOptimisticTab('landing');
              if (onNavigate) onNavigate('landing');
            }
          }}
          title="HyperQDS Overview"
          role="button"
          tabIndex={0}
        >
          <span className="hqds-brand-title">HYPERQDS</span>
        </div>

        {/* Global Navigation Links */}
        <div className="hqds-nav-center">
          {isLanding ? (
            landingNavItems.map((item) => {
              const active = isLandingItemActive(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`hqds-nav-link ${active ? 'is-active' : ''}`}
                  onClick={() => handleLandingScroll(item.target)}
                >
                  {item.label}
                </button>
              );
            })
          ) : (
            dashboardNavItems.map((item) => {
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
            })
          )}
        </div>

        {/* Action Pair — Borderless Liquid-Fill Buttons */}
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
                onClick={() => {
                  if (isLanding) {
                    handleLandingScroll('problem');
                  } else if (onNavigate) {
                    onNavigate('landing');
                  }
                }}
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
