/**
 * ResultsCharts.jsx
 * =================
 * Dashboard panel that visualises QDS protocol and threat detection results.
 *
 * Displays:
 *  - QBER bar/gauge chart
 *  - Chi-squared p-value chart
 *  - Measurement outcome distribution (bit-frequency histogram)
 *  - Confidence score gauge
 *  - Threat classification badge (SECURE / WARNING / COMPROMISED)
 *
 * Props
 * -----
 * protocolResult  : object | null — result from ProtocolRunPanel
 * attackResult    : object | null — result from AttackSelectionPanel
 * detectionResult : object | null — threat assessment from /detect
 *
 * TODO: Integrate a lightweight charting library (e.g. Recharts or Chart.js)
 *       for the histogram and gauge components — no ML libs.
 * TODO: Render a data table of raw measurement counts alongside the charts.
 * TODO: Add colour-coded threat badge: green=SECURE, yellow=WARNING, red=COMPROMISED.
 */

import React from 'react';

export default function ResultsCharts({ protocolResult, attackResult, detectionResult }) {
  const hasData = protocolResult || attackResult || detectionResult;

  if (!hasData) {
    return (
      <section className="panel results-panel">
        <h2>Results &amp; Charts</h2>
        <p className="placeholder-text">
          Run a protocol or attack simulation to see results here.
        </p>
      </section>
    );
  }

  return (
    <section className="panel results-panel">
      <h2>Results &amp; Charts</h2>
      {/* TODO: render QBER chart */}
      {/* TODO: render chi-squared chart */}
      {/* TODO: render measurement histogram */}
      {/* TODO: render confidence score gauge */}
      {/* TODO: render threat classification badge */}
      <pre>{JSON.stringify({ protocolResult, attackResult, detectionResult }, null, 2)}</pre>
    </section>
  );
}
