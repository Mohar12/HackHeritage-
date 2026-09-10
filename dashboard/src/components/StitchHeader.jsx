/**
 * StitchHeader.jsx
 * ================
 * Canonical Stitch Navigation Header shared across all HyperQDS pages.
 * 
 * Features:
 * - Unified 74px height, 32px glassmorphism backdrop-filter blur.
 * - Epilogue brand typography + Plus Jakarta Sans navigation labels + JetBrains Mono status.
 * - Cohesive violet / lavender quantum palette matching the landing page.
 * - Cursor-following soft radial light effect on tabs and action buttons.
 * - Seamless page navigation: Overview -> Honest Protocol -> Attack Lab -> Scalable Engine -> Audit Ledger.
 */

import React from 'react';

export default function StitchHeader({ activeTab = 'landing', onNavigate }) {
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  const navItems = [
    { id: 'landing', label: 'Overview', tag: '00' },
    { id: 'honest', label: 'Honest Protocol', tag: '01' },
    { id: 'attack', label: 'Attack Lab', tag: '02' },
    { id: 'large_scale', label: 'Scalable Engine', tag: '03' },
    { id: 'audit', label: 'Audit Ledger', tag: '04' },
  ];

  return (
    <header className="hqds-header">
      <div className="hqds-header-inner">
        {/* Brand Identity */}
        <div 
          className="hqds-brand" 
          onClick={() => onNavigate && onNavigate('landing')}
          style={{ cursor: 'pointer' }}
        >
          <div className="hqds-logo-symbol" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="hqds-logo-svg">
              {/* Outer frame — Violet border matching landing */}
              <rect x="2" y="2" width="24" height="24" rx="6" stroke="#c084fc" strokeWidth="1.5" strokeOpacity="0.85" />
              {/* Inner nucleus — violet core */}
              <circle cx="14" cy="14" r="5" fill="#4a1272" fillOpacity="0.8" />
              <circle cx="14" cy="14" r="2.5" fill="#e9b3ff" />
              {/* Quantum arms — Violet */}
              <path d="M7 14H10M18 14H21M14 7V10M14 18V21" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
              {/* Corner accent dots */}
              <circle cx="3.5" cy="3.5" r="1" fill="#c084fc" fillOpacity="0.6" />
              <circle cx="24.5" cy="3.5" r="1" fill="#c084fc" fillOpacity="0.6" />
            </svg>
          </div>
          <div className="hqds-brand-text">
            <span className="hqds-brand-name">HyperQDS</span>
            <span className="hqds-brand-tag">QUANTUM CYBER DEFENSE</span>
          </div>
        </div>

        {/* Global Stitch Navigation Tabs */}
        <nav className="hqds-nav">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`hqds-nav-tab ${isActive ? 'active' : ''} hqds-cursor-light`}
                onMouseMove={handleMouseMove}
                onClick={() => onNavigate && onNavigate(item.id)}
              >
                <span className="hqds-nav-tab-tag">{item.tag}</span>
                <span className="hqds-nav-tab-label">{item.label}</span>
                {isActive && <span className="hqds-nav-tab-indicator" />}
              </button>
            );
          })}
        </nav>

        {/* Action Button & Live Link Pill */}
        <div className="hqds-header-action" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status Pill */}
          <div className="hqds-status-pill hidden-mobile">
            <span className="stitch-pulse-dot-green" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.05em' }}>LINK: ONLINE · 28-QPU</span>
          </div>

          {activeTab === 'landing' ? (
            <button
              className="hqds-btn-primary hqds-cursor-light"
              onMouseMove={handleMouseMove}
              onClick={() => onNavigate && onNavigate('honest')}
            >
              <span>HONEST PROTOCOL</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : activeTab === 'honest' ? (
            <button
              className="hqds-btn-primary hqds-cursor-light"
              onMouseMove={handleMouseMove}
              onClick={() => onNavigate && onNavigate('attack')}
            >
              <span>ATTACK LAB</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              className="hqds-btn-secondary hqds-cursor-light"
              onMouseMove={handleMouseMove}
              onClick={() => onNavigate && onNavigate('landing')}
            >
              <span>OVERVIEW</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
