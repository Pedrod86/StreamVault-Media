import React from 'react';

/**
 * Catches render-time crashes anywhere in the tree and shows the actual error
 * on screen instead of a silent freeze. Critical for debugging Android TV / APK
 * WebViews where there's no dev console to read.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.error) {
      const { error, info } = this.state;
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            overflowY: 'auto',
            background: '#0d1117',
            color: '#f0f0f0',
            padding: 24,
            fontFamily: 'monospace',
            zIndex: 99999,
          }}
        >
          <h1 style={{ color: '#ff5577', fontSize: 22, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, marginBottom: 16, color: '#ffaa66' }}>
            {String(error?.message || error)}
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 11,
              lineHeight: 1.5,
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: 12,
              maxHeight: '50vh',
              overflowY: 'auto',
            }}
          >
            {String(error?.stack || '')}
            {info?.componentStack || ''}
          </pre>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: 16,
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}