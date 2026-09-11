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
      <div className="hqds-header-inner" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 24px',
        height: '74px',
        minHeight: '74px',
        gap: '24px',
        boxSizing: 'border-box',
      }}>
        {/* Brand Identity — Official HYPER.QDS Transparent SVG Lockup */}
        <div 
          className="hqds-brand" 
          onClick={() => onNavigate && onNavigate('landing')}
          style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          title="HyperQDS Overview"
          aria-label="HyperQDS Overview"
        >
          <img 
            src="/HYPER_QDS_transparent.svg" 
            alt="HYPER.QDS"
            className="hqds-header-logo-img"
            style={{
              height: '64px',
              width: 'auto',
              maxHeight: '68px',
              display: 'block',
              objectFit: 'contain',
              background: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(34, 211, 238, 0.28))',
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease',
            }}
          />
        </div>

        {/* Global Stitch Navigation Tabs */}
        <nav className="hqds-nav" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

        {/* Action / Status Section — DISPLAY ONCE: SYSTEM: ONLINE */}
        <div className="hqds-header-action" style={{ display: 'flex', alignItems: 'center' }}>
          {/* Status Pill */}
          <div className="hqds-status-pill hidden-mobile" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(57, 255, 20, 0.08)',
            border: '1px solid rgba(57, 255, 20, 0.3)',
          }}>
            <span className="stitch-pulse-dot-green" />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#39FF14',
              letterSpacing: '0.06em',
            }}>
              SYSTEM: ONLINE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
