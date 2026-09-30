import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast'; // Notifications ke liye[cite: 1]
import './index.css';
import App from './App.jsx';
import { UserProvider } from './context/UserContext.jsx';

// 🐞 ErrorBoundary: keeps a crash from showing a blank white screen.
// If any React component throws, the user gets a readable message here and the
// full stack is logged to the console. Keep this permanently — without it any
// crash takes down the entire app with no explanation.
class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { error: null }; }
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error, info) { console.error('REACT CRASH:', error, info); }
    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: '30px', fontFamily: 'monospace', color: '#b91c1c', background: '#fef2f2', minHeight: '100vh' }}>
                    <h2 style={{ marginTop: 0 }}>❌ Page Crash Ho Gaya</h2>
                    <p style={{ color: '#7f1d1d' }}>Something went wrong. Details are shown below, and the full stack is logged in the browser console.</p>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>{String(this.state.error?.stack || this.state.error)}</pre>
                    <button
                        onClick={() => this.setState({ error: null })}
                        style={{ marginTop: '15px', padding: '10px 18px', fontSize: '0.95rem', cursor: 'pointer', backgroundColor: '#b91c1c', color: '#fff', border: 'none', borderRadius: '6px' }}
                    >
                        🔄 Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <UserProvider>
        <App />
        <Toaster position="top-right" />
      </UserProvider>
    </ErrorBoundary>
  </StrictMode>,
);