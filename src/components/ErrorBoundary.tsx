import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

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
    // Error caught gracefully without unhandled crashes
    if (process.env.NODE_ENV !== 'production') {
      console.error('Domino Sky caught error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-[#080e1d] text-[#dde2f8] flex items-center justify-center p-6 font-mono"
        >
          <div className="max-w-md w-full bg-[#151b2b] p-6 rounded-lg border border-[#ef4444] shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#93000a]/20 border border-[#ef4444] flex items-center justify-center text-[#ff817a] mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#dde2f8] uppercase tracking-wider">
                DOMINO SKY OCC RECOVERY HALTED
              </h2>
              <p className="text-xs text-[#869397] mt-1">
                An unexpected operational render exception was caught by the safety boundary.
              </p>
            </div>

            {this.state.error && (
              <div className="p-2.5 rounded bg-[#0d1322] border border-[#242a3a] text-left text-[11px] text-[#ff817a] overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded bg-[#06b6d4] text-[#003640] font-bold text-xs uppercase hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-[#4cd7f6]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTART OCC CONTROLLER</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
