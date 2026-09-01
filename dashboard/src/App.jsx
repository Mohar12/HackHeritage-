/**
 * App.jsx
 * =======
 * Root application component for the QDS Threat Detection Dashboard.
 *
 * Renders the three main panels:
 *  - ProtocolRunPanel   : trigger key generation, sign, verify flows
 *  - AttackSelectionPanel : choose and launch attack simulations
 *  - ResultsCharts       : visualise measurement statistics and threat scores
 *
 * TODO: Add React Router for multi-page navigation if the app grows.
 * TODO: Implement global state (Context or Zustand) to share API results
 *       between panels without prop-drilling.
 */

import React, { useState } from 'react';
import ProtocolRunPanel from './components/ProtocolRunPanel.jsx';
import AttackSelectionPanel from './components/AttackSelectionPanel.jsx';
import ResultsCharts from './components/ResultsCharts.jsx';

export default function App() {
  // TODO: Replace with proper state management
  const [protocolResult, setProtocolResult] = useState(null);
  const [attackResult, setAttackResult] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>QDS Threat Detection Framework</h1>
        <p className="app-subtitle">
          Quantum-Inspired Cyber Threat Detection · Teleportation-Based QDS
        </p>
      </header>

      <main className="app-main">
        {/* TODO: style panels with CSS grid layout */}
        <ProtocolRunPanel onResult={setProtocolResult} />
        <AttackSelectionPanel onResult={setAttackResult} />
        <ResultsCharts
          protocolResult={protocolResult}
          attackResult={attackResult}
          detectionResult={detectionResult}
        />
      </main>
    </div>
  );
}
