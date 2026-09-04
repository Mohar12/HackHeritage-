/**
 * LandingHero.jsx
 * ===============
 * HyperQDS Landing Page entry point wrapping the canonical StitchLandingPage.
 */

import React from 'react';
import StitchLandingPage from './StitchLandingPage.jsx';

export default function LandingHero({ onEnterSOC }) {
  return <StitchLandingPage onEnterSOC={onEnterSOC} />;
}
