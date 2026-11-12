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
    // If it's an external browser extension / MetaMask error, don't show the error UI
    const errorMsg = error?.message || String(error);
    const errorStack = error?.stack || '';
    const isExtensionError =
      errorMsg.includes('MetaMask') ||
      errorMsg.includes('ethereum') ||
      errorMsg.includes('chrome-extension://') ||
      errorMsg.includes('inpage.js') ||
      errorStack.includes('chrome-extension://');

    if (isExtensionError) {
      return { hasError: false, error: null };
    }

    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMsg = error?.message || String(error);
    const errorStack = error?.stack || '';
    if (
      errorMsg.includes('MetaMask') ||
      errorMsg.includes('chrome-extension://') ||
      errorStack.includes('chrome-extension://')
    ) {
      // Ignored extension error
      return;
    }
    console.error('Unhandled application error in React component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-800/90 border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">アプリケーション表示エラー</h2>
                <p className="text-xs text-slate-400">予期しないエラーが発生しました</p>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-xs font-mono text-red-300 break-all mb-5 max-h-48 overflow-y-auto">
              {this.state.error.message || 'Unknown Error'}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                ページを再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
