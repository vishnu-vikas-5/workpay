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
    console.error('WorkPay Uncaught React Error:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch (e) {
      window.location.href = '/';
    }
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#EBE2CC] text-[#302C25] flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-[#DED6C1] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#CFC6B1] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-200 border border-amber-300 text-amber-900 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-7 h-7 text-amber-800" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-[#302C25]">Something Went Wrong</h2>
              <p className="text-xs text-[#635B4E] leading-relaxed">
                WorkPay encountered an unexpected display error. Your payroll and worker records are safely preserved in offline storage and cloud.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-[#EBE2CC] rounded-xl border border-[#CFC6B1] text-[11px] font-mono text-[#302C25] text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-[#302C25] hover:bg-[#1B1915] text-[#FAF6EE] rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 border border-[#1B1915]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full py-2.5 px-4 bg-[#EBE2CC] hover:bg-[#CFC6B1] text-[#302C25] rounded-xl text-xs font-bold transition-all border border-[#CFC6B1]"
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

