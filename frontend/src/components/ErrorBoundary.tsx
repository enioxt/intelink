'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to console
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Send telemetry (non-blocking)
    this.sendTelemetry(error, errorInfo).catch(() => {
      // Silently fail if telemetry endpoint is down
    });
  }

  async sendTelemetry(error: Error, errorInfo: any) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://127.0.0.1:8042/api/v1/intelink';
      
      await fetch(`${API_URL}/telemetry/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          component_stack: errorInfo?.componentStack,
          url: typeof window !== 'undefined' ? window.location.href : '',
          timestamp: new Date().toISOString(),
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        }),
      });
    } catch {
      // Ignore telemetry errors
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 border-2 border-red-500 rounded-xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Erro Inesperado
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Algo deu errado no sistema Intelink
                </p>
              </div>
            </div>
            
            {this.state.error && (
              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 mb-6">
                <p className="text-sm font-mono text-slate-900 dark:text-white break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                      Ver stack trace
                    </summary>
                    <pre className="text-xs text-slate-700 dark:text-slate-300 mt-2 overflow-x-auto">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Recarregar Página
              </button>
              <button
                onClick={() => window.location.href = '/intelink'}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Ir para Dashboard
              </button>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-600 mt-6 text-center">
              ⚠️ Erro reportado automaticamente para telemetria
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
