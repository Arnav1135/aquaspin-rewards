// src/lib/errors.ts
// Centralized error handling, logging, and recovery system

import toast from 'react-hot-toast';

/** Error severity levels */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/** Error categories for better handling */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  DATABASE = 'database',
  GAME_LOGIC = 'game_logic',
  PAYMENT = 'payment',
  RENDERING = 'rendering',
  UNKNOWN = 'unknown',
}

/** Structured error object */
export interface AppError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  context?: Record<string, any>;
  userMessage?: string;
  shouldNotify?: boolean;
  recoveryAction?: () => void | Promise<void>;
  timestamp: number;
}

/** Create a structured AppError */
export function createAppError(
  message: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  options?: {
    code?: string;
    context?: Record<string, any>;
    userMessage?: string;
    shouldNotify?: boolean;
    recoveryAction?: () => void | Promise<void>;
  }
): AppError {
  const error = new Error(message) as AppError;
  error.name = 'AppError';
  error.category = category;
  error.severity = severity;
  error.code = options?.code;
  error.context = options?.context;
  error.userMessage = options?.userMessage;
  error.shouldNotify = options?.shouldNotify ?? true;
  error.recoveryAction = options?.recoveryAction;
  error.timestamp = Date.now();

  // Log immediately
  logError(error);

  return error;
}

/** Error logger with different levels */
export function logError(error: unknown, context?: Record<string, any>): void {
  const appError = isAppError(error) ? error : normalizeError(error);

  const logData = {
    timestamp: new Date(appError.timestamp).toISOString(),
    name: appError.name,
    message: appError.message,
    category: (appError as AppError).category || ErrorCategory.UNKNOWN,
    severity: (appError as AppError).severity || ErrorSeverity.ERROR,
    code: (appError as AppError).code,
    context: { ...((appError as AppError).context || {}), ...context },
    stack: appError.stack,
  };

  // Console logging based on severity
  const severity = (appError as AppError).severity || ErrorSeverity.ERROR;
  if (severity === ErrorSeverity.CRITICAL) {
    console.error('🚨 CRITICAL ERROR:', logData);
  } else if (severity === ErrorSeverity.ERROR) {
    console.error('❌ ERROR:', logData);
  } else if (severity === ErrorSeverity.WARNING) {
    console.warn('⚠️ WARNING:', logData);
  } else {
    console.info('ℹ️ INFO:', logData);
  }

  // Send to analytics/monitoring service (if configured)
  if (typeof window !== 'undefined' && window.__ERROR_ANALYTICS__) {
    try {
      window.__ERROR_ANALYTICS__.track(logData);
    } catch (e) {
      console.error('Failed to log error to analytics:', e);
    }
  }
}

/** Check if an error is an AppError */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'category' in error && 'severity' in error;
}

/** Normalize any error to AppError format */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof Error) {
    const appError = error as AppError;
    appError.category = ErrorCategory.UNKNOWN;
    appError.severity = ErrorSeverity.ERROR;
    appError.timestamp = Date.now();
    return appError;
  }

  const appError = new Error(String(error)) as AppError;
  appError.category = ErrorCategory.UNKNOWN;
  appError.severity = ErrorSeverity.ERROR;
  appError.timestamp = Date.now();
  return appError;
}

/** Handle and notify user about an error */
export function handleError(
  error: unknown,
  options?: {
    showToast?: boolean;
    toastDuration?: number;
    fallbackMessage?: string;
    onRetry?: () => void | Promise<void>;
  }
): AppError {
  const appError = isAppError(error) ? error : normalizeError(error);

  // Notify user if configured
  if (options?.showToast !== false && appError.shouldNotify !== false) {
    const message = appError.userMessage || options?.fallbackMessage || appError.message;
    const toastDuration = options?.toastDuration ?? 3000;

    if ((appError as AppError).severity === ErrorSeverity.CRITICAL) {
      toast.error(message, { duration: toastDuration });
    } else if ((appError as AppError).severity === ErrorSeverity.ERROR) {
      toast.error(message, { duration: toastDuration });
    } else if ((appError as AppError).severity === ErrorSeverity.WARNING) {
      toast(() => (
        <div>
          <p className="font-semibold">⚠️ Warning</p>
          <p className="text-sm">{message}</p>
        </div>
      ), { duration: toastDuration });
    } else {
      toast.success(message, { duration: toastDuration });
    }
  }

  return appError;
}

/** Wrap async function with error handling */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    fallbackReturn?: any;
    onError?: (error: AppError) => void;
  }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = isAppError(error) ? error : createAppError(
        error instanceof Error ? error.message : String(error),
        options?.category,
        options?.severity
      );

      options?.onError?.(appError);
      logError(appError);

      if (options?.fallbackReturn !== undefined) {
        return options.fallbackReturn;
      }

      throw appError;
    }
  }) as T;
}

/** Retry logic for failed operations */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delayMs = options?.delayMs ?? 1000;
  const backoffMultiplier = options?.backoffMultiplier ?? 1.5;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      options?.onRetry?.(attempt, lastError);

      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw createAppError(
    `Operation failed after ${maxAttempts} attempts: ${lastError?.message}`,
    ErrorCategory.UNKNOWN,
    ErrorSeverity.ERROR,
    {
      context: { attempts: maxAttempts, lastError: lastError?.message },
    }
  );
}

/** Safe JSON parse with error handling */
export function safeJsonParse<T = any>(
  json: string,
  fallback?: T
): T | null {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logError(error, { context: 'safeJsonParse' });
    return fallback ?? null;
  }
}

/** Safe local storage operations */
export const safeStorage = {
  getItem(key: string, fallback?: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      logError(error, { context: `localStorage.getItem(${key})` });
      return fallback ?? null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      logError(error, { context: `localStorage.setItem(${key})` });
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logError(error, { context: `localStorage.removeItem(${key})` });
      return false;
    }
  },
};

/** Categorize network errors */
export function categorizeNetworkError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes('network') || message.includes('fetch')) return ErrorCategory.NETWORK;
  if (message.includes('auth') || message.includes('401') || message.includes('403')) return ErrorCategory.AUTH;
  if (message.includes('valid')) return ErrorCategory.VALIDATION;
  if (message.includes('database') || message.includes('db')) return ErrorCategory.DATABASE;
  if (message.includes('payment')) return ErrorCategory.PAYMENT;

  return ErrorCategory.UNKNOWN;
}

/** Global error handler for unhandled rejections */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    logError(event.error, { context: 'uncaughtError' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { context: 'unhandledRejection' });
  });
}

// Extend Window to support error analytics
declare global {
  interface Window {
    __ERROR_ANALYTICS__?: {
      track: (data: any) => void;
    };
  }
}
