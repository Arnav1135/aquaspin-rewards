// src/components/ui/ErrorBoundary.tsx
// React Error Boundary for catching and handling component errors

import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppError, logError, ErrorSeverity, ErrorCategory } from '@/lib/errors';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React Error Boundary component
 * Catches errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = {
      ...error,
      category: ErrorCategory.RENDERING,
      severity: ErrorSeverity.ERROR,
      context: { componentStack: errorInfo.componentStack },
      timestamp: Date.now(),
      name: error.name,
      message: error.message,
      stack: error.stack,
    } as unknown as AppError;

    logError(appError, { boundaryName: this.props.name });
    this.props.onError?.(error, errorInfo);

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default error UI
      const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

      return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-navy-950 to-navy-900">
          <div className="max-w-md w-full">
            <div className="bg-navy-900 border border-red-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {this.props.name ? `${this.props.name} Error` : 'Something went wrong'}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    The component encountered an unexpected error.
                  </p>
                </div>
              </div>

              {/* Error details in development */}
              {isDev && (
                <div className="bg-navy-950/80 rounded-lg p-3 space-y-2 text-xs font-mono border border-navy-700/50">
                  <div>
                    <p className="text-text-secondary">Message:</p>
                    <p className="text-red-400 break-all">{this.state.error.message}</p>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <p className="text-text-secondary">Component Stack:</p>
                      <p className="text-cyan-400 text-2xs overflow-auto max-h-20">
                        {this.state.errorInfo.componentStack}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="neon"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={this.handleReset}
                >
                  <RefreshCw size={14} />
                  Try Again
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.location.href = '/'}
                >
                  Home
                </Button>
              </div>

              <p className="text-2xs text-text-secondary text-center">
                If the problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: (error: Error, reset: () => void) => ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    name?: string;
  }
) {
  const displayName = options?.name || Component.displayName || Component.name || 'Component';

  function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary
        fallback={options?.fallback}
        onError={options?.onError}
        name={displayName}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${displayName})`;

  return WithErrorBoundaryComponent;
}

/**
 * Async Error Boundary wrapper for error handling in async operations
 */
export function createAsyncErrorHandler(
  onError?: (error: AppError) => void,
  options?: {
    showToast?: boolean;
    recoveryAction?: () => void | Promise<void>;
  }
) {
  return (error: unknown) => {
    const appError = error instanceof Error
      ? ({
        ...error,
        category: ErrorCategory.GAME_LOGIC,
        severity: ErrorSeverity.ERROR,
        timestamp: Date.now(),
      } as unknown as AppError)
      : (new Error(String(error)) as unknown as AppError);

    logError(appError);
    onError?.(appError);

    if (options?.recoveryAction) {
      try {
        const result = options.recoveryAction();
        if (result instanceof Promise) {
          result.catch(e => logError(e, { context: 'recoveryAction' }));
        }
      } catch (e) {
        logError(e, { context: 'recoveryAction' });
      }
    }
  };
}
