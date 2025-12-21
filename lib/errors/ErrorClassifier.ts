import { ErrorType, ErrorSeverity, ErrorContext, RecoveryAction } from './types';
import { AppError } from './AppError';

/**
 * Error Classifier - Converts raw errors into structured AppError instances
 */
export class ErrorClassifier {
  /**
   * Classify a raw error into an AppError with appropriate type, severity, and recovery
   */
  static classifyError(
    error: unknown,
    context: Omit<ErrorContext, 'timestamp'>
  ): AppError {
    const fullContext: ErrorContext = {
      ...context,
      timestamp: new Date().toISOString()
    };

    // Handle null/undefined errors
    if (!error) {
      return new AppError({
        type: ErrorType.UNKNOWN,
        message: 'Unknown error occurred',
        context: fullContext,
        severity: ErrorSeverity.LOW
      });
    }

    // Handle Error instances
    if (error instanceof Error) {
      return this.classifyErrorInstance(error, fullContext);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.classifyStringError(error, fullContext);
    }

    // Handle object errors (API responses, etc.)
    if (typeof error === 'object') {
      return this.classifyObjectError(error, fullContext);
    }

    // Fallback for unknown error types
    return new AppError({
      type: ErrorType.UNKNOWN,
      message: String(error),
      context: fullContext,
      severity: ErrorSeverity.MEDIUM
    });
  }

  private static classifyErrorInstance(error: Error, context: ErrorContext): AppError {
    const message = error.message.toLowerCase();

    // Network errors
    if (this.isNetworkError(error, message)) {
      return new AppError({
        type: ErrorType.NETWORK,
        message: error.message,
        context,
        severity: ErrorSeverity.LOW,
        retryable: true,
        recoveryAction: RecoveryAction.RETRY
      });
    }

    // Authentication errors
    if (this.isAuthError(message)) {
      return new AppError({
        type: ErrorType.AUTH,
        message: error.message,
        context,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        recoveryAction: RecoveryAction.LOGIN
      });
    }

    // Quota/limit errors (including rate limits)
    if (this.isQuotaError(message)) {
      const isRateLimit = message.includes('rate limit') || message.includes('rate_limit');
      return new AppError({
        type: ErrorType.QUOTA,
        message: error.message,
        context,
        severity: isRateLimit ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH,
        retryable: isRateLimit, // Rate limits are retryable after a delay
        recoveryAction: isRateLimit ? RecoveryAction.RETRY : RecoveryAction.UPGRADE
      });
    }

    // Permission errors
    if (this.isPermissionError(message)) {
      return new AppError({
        type: ErrorType.PERMISSION,
        message: error.message,
        context,
        severity: ErrorSeverity.HIGH,
        retryable: false
      });
    }

    // Validation errors
    if (this.isValidationError(message)) {
      return new AppError({
        type: ErrorType.VALIDATION,
        message: error.message,
        context,
        severity: ErrorSeverity.MEDIUM,
        retryable: false
      });
    }

    // Storage errors
    if (this.isStorageError(message)) {
      return new AppError({
        type: ErrorType.STORAGE,
        message: error.message,
        context,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        recoveryAction: RecoveryAction.RETRY
      });
    }

    // Processing errors (PDF, audio, etc.)
    if (this.isProcessingError(message)) {
      return new AppError({
        type: ErrorType.PROCESSING,
        message: error.message,
        context,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        recoveryAction: RecoveryAction.RETRY
      });
    }

    // Default to unknown error
    return new AppError({
      type: ErrorType.UNKNOWN,
      message: error.message,
      context,
      severity: ErrorSeverity.MEDIUM,
      retryable: false
    });
  }

  private static classifyStringError(error: string, context: ErrorContext): AppError {
    const message = error.toLowerCase();

    // Network-related strings
    if (message.includes('network') || message.includes('fetch') ||
        message.includes('connection') || message.includes('timeout')) {
      return new AppError({
        type: ErrorType.NETWORK,
        message: error,
        context,
        severity: ErrorSeverity.LOW,
        retryable: true,
        recoveryAction: RecoveryAction.RETRY
      });
    }

    // Auth-related strings
    if (message.includes('unauthorized') || message.includes('not authenticated') ||
        message.includes('invalid token') || message.includes('session expired')) {
      return new AppError({
        type: ErrorType.AUTH,
        message: error,
        context,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        recoveryAction: RecoveryAction.LOGIN
      });
    }

    // Quota-related strings
    if (message.includes('limit') || message.includes('quota') ||
        message.includes('trial expired') || message.includes('upgrade')) {
      return new AppError({
        type: ErrorType.QUOTA,
        message: error,
        context,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        recoveryAction: RecoveryAction.UPGRADE
      });
    }

    // Default string error
    return new AppError({
      type: ErrorType.UNKNOWN,
      message: error,
      context,
      severity: ErrorSeverity.MEDIUM
    });
  }

  private static classifyObjectError(error: object, context: ErrorContext): AppError {
    // Handle Supabase errors
    if (this.isSupabaseError(error)) {
      return this.classifySupabaseError(error, context);
    }

    // Handle API response errors
    if ('error' in error && typeof error.error === 'string') {
      const appError = this.classifyStringError(error.error, context);
      // Preserve original error object
      return new AppError({
        type: appError.type,
        message: appError.technicalMessage,
        context: appError.context,
        severity: appError.severity,
        retryable: appError.retryable,
        recoveryAction: appError.recoveryAction,
        originalError: error,
      });
    }

    // Handle generic object errors
    const message = error.toString() || 'Object error occurred';
    return new AppError({
      type: ErrorType.UNKNOWN,
      message,
      context,
      severity: ErrorSeverity.MEDIUM,
      originalError: error
    });
  }

  private static isNetworkError(error: Error, message: string): boolean {
    return (
      error.name === 'TypeError' ||
      error.name === 'NetworkError' ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('abort') ||
      message.includes('econnreset')
    );
  }

  private static isAuthError(message: string): boolean {
    return (
      message.includes('unauthorized') ||
      message.includes('not authenticated') ||
      message.includes('invalid token') ||
      message.includes('session expired') ||
      message.includes('jwt') ||
      message.includes('authentication')
    );
  }

  private static isQuotaError(message: string): boolean {
    return (
      message.includes('limit') ||
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('rate_limit') ||
      message.includes('trial expired') ||
      message.includes('trial has expired') ||
      message.includes('exceeded') ||
      message.includes('upgrade required') ||
      message.includes('upgrade to continue')
    );
  }

  private static isPermissionError(message: string): boolean {
    return (
      message.includes('permission') ||
      message.includes('forbidden') ||
      message.includes('not allowed') ||
      message.includes('access denied')
    );
  }

  private static isValidationError(message: string): boolean {
    return (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('missing') ||
      message.includes('format')
    );
  }

  private static isStorageError(message: string): boolean {
    return (
      message.includes('storage') ||
      message.includes('upload') ||
      message.includes('file') ||
      message.includes('save')
    );
  }

  private static isProcessingError(message: string): boolean {
    return (
      message.includes('processing') ||
      message.includes('extract') ||
      message.includes('generate') ||
      message.includes('convert')
    );
  }

  private static isSupabaseError(error: object): boolean {
    return (
      'code' in error ||
      'message' in error ||
      'hint' in error ||
      'details' in error
    );
  }

  private static classifySupabaseError(error: any, context: ErrorContext): AppError {
    const message = error.message || error.error || 'Supabase error';

    // Suppress expected auth errors when logged out (invalid refresh token, etc.)
    // These are normal when there's no active session
    if (
      message.includes('Invalid Refresh Token') ||
      message.includes('Refresh Token Not Found') ||
      message.includes('refresh_token_not_found') ||
      (message.includes('JWT') && message.includes('expired'))
    ) {
      // These are expected when logged out - suppress them
      return new AppError({
        type: ErrorType.AUTH,
        message,
        context,
        severity: ErrorSeverity.LOW, // Low severity - don't show to user
        retryable: false,
        // LOW severity - won't show in UI
        originalError: error
      });
    }

    // Rate limit errors (check after auth errors, as they're common)
    if (message.includes('rate limit') || message.includes('rate_limit') || message.includes('Request rate limit reached')) {
      // Suppress rate limit errors during token refresh (expected when logged out)
      if (context.operation?.includes('refresh') || context.operation?.includes('token')) {
        return new AppError({
          type: ErrorType.QUOTA,
          message,
          context,
          severity: ErrorSeverity.LOW,
          retryable: false,
          // LOW severity - won't show in UI
          originalError: error
        });
      }
      
      return new AppError({
        type: ErrorType.QUOTA,
        message,
        context,
        severity: ErrorSeverity.MEDIUM,
        retryable: true, // Rate limits are retryable after a delay
        recoveryAction: RecoveryAction.RETRY,
        originalError: error
      });
    }

    // Authentication errors
    if (error.code === 'PGRST301' || message.includes('JWT')) {
      return new AppError({
        type: ErrorType.AUTH,
        message,
        context,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        recoveryAction: RecoveryAction.LOGIN,
        originalError: error
      });
    }

    // Permission errors
    if (error.code === 'PGRST116' || message.includes('permission')) {
      return new AppError({
        type: ErrorType.PERMISSION,
        message,
        context,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        originalError: error
      });
    }

    // Validation errors
    if (error.code?.startsWith('23') || message.includes('violates')) {
      return new AppError({
        type: ErrorType.VALIDATION,
        message,
        context,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        originalError: error
      });
    }

    // Default Supabase error
    return new AppError({
      type: ErrorType.UNKNOWN,
      message,
      context,
      severity: ErrorSeverity.MEDIUM,
      originalError: error
    });
  }
}







