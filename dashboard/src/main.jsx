/**
 * main.jsx
 * ========
 * React application entry point.
 * Mounts the root <App /> component into the #root DOM node.
 *
 * TODO: Add React StrictMode wrapper after initial development.
 * TODO: Configure global error boundaries once component tree grows.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // TODO: create index.css with global styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
