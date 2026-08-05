import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './firebase.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SignalLab App Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#C0C0C0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#000080',
            color: '#FFFFFF',
            padding: '4px 8px',
            width: '100%',
            maxWidth: '600px',
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '10px'
          }}>
            ⚠️ REI SignalLab System Recovery - [Stale Browser Cache Detected]
          </div>
          <div style={{
            border: '2px solid #808080',
            backgroundColor: '#FFFFFF',
            padding: '20px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '4px 4px 0px #000000'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#FF0000' }}>Cache Synchronization Notice</h3>
            <p style={{ fontSize: '12px', lineHeight: '1.5' }}>
              The live Firebase deployment was updated with new DSP components. Your browser loaded a cached bundle version that is no longer active.
            </p>
            <div style={{
              backgroundColor: '#000000',
              color: '#00FF00',
              padding: '10px',
              fontSize: '11px',
              marginBottom: '15px',
              overflowX: 'auto'
            }}>
              {String(this.state.error?.message || this.state.error)}
            </div>
            <button
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(r => r.unregister());
                  });
                }
                window.location.reload(true);
              }}
              style={{
                backgroundColor: '#00AA00',
                color: '#FFFFFF',
                border: '2px outset #FFFFFF',
                padding: '8px 16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔄 FORCE HARD RELOAD APPLICATION (CLEAR CACHE)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
