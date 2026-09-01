/**
 * App.jsx
 * =======
 * Root application component for the QDS Threat Detection Dashboard.
 */

import React, { useState } from 'react';
import ProtocolRunPanel from './components/ProtocolRunPanel.jsx';
import AttackSelectionPanel from './components/AttackSelectionPanel.jsx';
import ResultsCharts from './components/ResultsCharts.jsx';
import './index.css';

export default function App() {
  const [activeData, setActiveData] = useState(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-badge">PHYSICS-BASED QUANTUM SIMULATION</div>
        <h1>Quantum-Inspired Cyber Threat Detection</h1>
        <p className="app-subtitle">
          Teleportation-Based Quantum Digital Signatures (QDS) · Bell-State Measurement &amp; Statistical Anomaly Engine
        </p>
      </header>

      <main className="app-main">
        <div className="controls-column">
          <ProtocolRunPanel onResult={setActiveData} />
          <AttackSelectionPanel onResult={setActiveData} />
        </div>
        <div className="telemetry-column">
          <ResultsCharts data={activeData} />
        </div>
      </main>
    </div>
  );
}
