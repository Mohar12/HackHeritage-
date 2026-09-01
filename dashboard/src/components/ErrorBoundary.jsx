/**
 * ErrorBoundary.jsx
 * ==================
 * Production-quality React Error Boundary.
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="error-boundary-card">
          <div className="error-boundary-header">
            <span className="error-icon">⚠️</span>
            <h4>{this.props.title || 'Component Unavailable'}</h4>
          </div>
          <p className="error-boundary-msg">
            {this.state.error?.message || 'An unexpected rendering error occurred in this section.'}
          </p>
          <div className="error-boundary-actions">
            <button className="btn-retry" onClick={this.handleReset}>
              🔄 Retry Section
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
