import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('SpotifyMine Error Boundary caught an exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-zinc-950 text-white p-6 text-center select-none">
          <div className="w-16 h-16 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-black text-2xl mb-4 shadow-xl">
            S
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">SpotifyMine UI Reload</h1>
          <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
            An unexpected render error occurred. Click below to reload SpotifyMine cleanly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            Reload SpotifyMine
          </button>
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
