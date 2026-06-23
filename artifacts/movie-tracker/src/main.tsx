import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#0a0a0c', color: 'white', minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: 'system-ui', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: 32 }}>🎬</div>
          <h2 style={{ color: '#eab308', margin: 0, fontSize: 18 }}>Something went wrong</h2>
          <pre style={{
            color: '#888', fontSize: 13, whiteSpace: 'pre-wrap',
            maxWidth: 480, textAlign: 'center', margin: 0,
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '10px 24px', background: '#eab308',
              color: '#000', border: 'none', borderRadius: 12,
              fontWeight: 700, cursor: 'pointer', fontSize: 14,
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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}
