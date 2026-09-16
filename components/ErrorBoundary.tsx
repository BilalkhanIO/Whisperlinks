import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-mono select-none">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wider">NEURAL UPLINK ERROR</h2>
                <p className="text-xs text-zinc-400">Application encountered an unhandled exception</p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-black/60 border border-white/5 text-[11px] text-zinc-400 font-mono break-words max-h-36 overflow-y-auto">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 rounded-xl bg-neon-green/20 hover:bg-neon-green/30 border border-neon-green/40 text-neon-green text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Reload App</span>
              </button>
              <button
                onClick={this.handleReset}
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
