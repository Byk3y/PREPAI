/**
 * Sentry Error Tracking Configuration
 * 
 * Integrates Sentry with the centralized error handling system.
 * Only sends errors in production (not in development mode).
 */

import * as Sentry from '@sentry/react-native';
import { ErrorSeverity } from './errors/types';
import type { AppError } from './errors/AppError';

/**
 * Initialize Sentry with configuration
 * Should be called as early as possible, before React renders
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  // Only initialize if DSN is provided
  if (!dsn) {
    if (__DEV__) {
      console.log('[Sentry] DSN not provided, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    // Don't send errors in development mode
    enableInExpoDevelopment: false,
    // Sample rate for performance monitoring (0.0 to 1.0)
    tracesSampleRate: __DEV__ ? 0.0 : 0.1,
    // Enable native crash reporting
    enableNative: true,
    // Enable native nagger (shows native crash dialog)
    enableNativeNagger: false,
    // Automatically attach breadcrumbs
    attachStacktrace: true,
    // Filter out non-critical errors if needed
    beforeSend(event, hint) {
      // In development, don't send any events
      if (__DEV__) {
        return null;
      }

      // You can add custom filtering logic here
      // For example, filter out certain error types
      return event;
    },
    // Note: Performance monitoring integrations removed for now
    // ReactNativeTracing requires additional setup for Expo Router
    // Can be added later if needed
  });

  if (__DEV__) {
    console.log('[Sentry] Initialized successfully');
  }
}

/**
 * Map AppError severity to Sentry severity level
 */
function mapSeverityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 'fatal';
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Capture an AppError to Sentry with full context
 */
export function captureAppError(appError: AppError): void {
  // Don't send in development
  if (__DEV__) {
    return;
  }

  const logData = appError.toLogData();

  Sentry.withScope((scope) => {
    // Set severity level
    scope.setLevel(mapSeverityToSentryLevel(appError.severity));

    // Set user context if available
    if (appError.context.userId) {
      scope.setUser({
        id: appError.context.userId,
      });
    }

    // Add tags for filtering
    scope.setTag('error_type', appError.type);
    scope.setTag('error_severity', appError.severity);
    scope.setTag('operation', appError.context.operation);
    if (appError.context.component) {
      scope.setTag('component', appError.context.component);
    }
    if (appError.retryable) {
      scope.setTag('retryable', 'true');
    }
    if (appError.context.retryCount) {
      scope.setTag('retry_count', appError.context.retryCount.toString());
    }

    // Add context data
    scope.setContext('error_details', {
      type: appError.type,
      severity: appError.severity,
      operation: appError.context.operation,
      component: appError.context.component,
      retryable: appError.retryable,
      retryCount: appError.context.retryCount,
      userMessage: appError.userMessage,
      recoveryAction: appError.recoveryAction,
    });

    // Add metadata as additional context
    if (appError.context.metadata) {
      scope.setContext('metadata', appError.context.metadata);
    }

    // Add breadcrumb for the error
    scope.addBreadcrumb({
      category: 'error',
      message: appError.technicalMessage,
      level: mapSeverityToSentryLevel(appError.severity),
      data: {
        operation: appError.context.operation,
        component: appError.context.component,
      },
    });

    // Capture the exception
    // Use the original error if available, otherwise use the AppError
    const errorToCapture = appError.originalError instanceof Error
      ? appError.originalError
      : new Error(appError.technicalMessage);

    // Enhance error message with context
    errorToCapture.message = `${appError.type}: ${appError.technicalMessage}`;
    errorToCapture.name = `AppError[${appError.type}]`;

    Sentry.captureException(errorToCapture);
  });
}

/**
 * Capture a raw error (for use in global error handler)
 */
export function captureError(error: Error, isFatal: boolean = false): void {
  if (__DEV__) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(isFatal ? 'fatal' : 'error');
    scope.setTag('fatal', isFatal.toString());
    Sentry.captureException(error);
  });
}

/**
 * Set user context in Sentry
 */
export function setUser(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for user actions
 */
export function addBreadcrumb(message: string, category: string = 'user', data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}






