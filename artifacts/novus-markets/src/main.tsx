import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';
import App from './App';
import './index.css';

setBaseUrl(import.meta.env.VITE_API_URL || '');

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; info: React.ErrorInfo | null }
> {
  state = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'white', background: '#0a0a0a', minHeight: '100vh' }}>
          <h2>Something went wrong</h2>
          <pre style={{ color: '#f87171', fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {(this.state.error as Error)?.message}
          </pre>
          <pre style={{ color: '#9ca3af', fontSize: 11, whiteSpace: 'pre-wrap', marginTop: 16 }}>
            {(this.state.info as React.ErrorInfo | null)?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);