import { ErrorType, ErrorSeverity, ErrorContext, RecoveryAction, UserFriendlyMessage } from './types';

/**
 * Enhanced Error class with classification, severity, and recovery actions
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly retryable: boolean;
  public readonly userMessage: UserFriendlyMessage;
  public readonly technicalMessage: string;
  public readonly recoveryAction?: RecoveryAction;
  public readonly originalError?: unknown;

  constructor(params: {
    type: ErrorType;
    message: string;
    context: ErrorContext;
    severity?: ErrorSeverity;
    retryable?: boolean;
    userMessage?: UserFriendlyMessage;
    recoveryAction?: RecoveryAction;
    originalError?: unknown;
  }) {
    super(params.message);

    this.name = 'AppError';
    this.type = params.type;
    this.severity = params.severity || ErrorSeverity.MEDIUM;
    this.context = params.context;
    this.retryable = params.retryable ?? false;
    this.technicalMessage = params.message;
    this.recoveryAction = params.recoveryAction;
    this.originalError = params.originalError;

    // Default user message based on error type if not provided
    this.userMessage = params.userMessage || this.getDefaultUserMessage();

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  private getDefaultUserMessage(): UserFriendlyMessage {
    switch (this.type) {
      case ErrorType.NETWORK:
        return {
          title: 'Connection Error',
          message: 'Please check your internet connection and try again.',
          actionLabel: 'Retry',
          actionType: RecoveryAction.RETRY
        };

      case ErrorType.AUTH:
        return {
          title: 'Authentication Required',
          message: 'Please sign in to continue.',
          actionLabel: 'Sign In',
          actionType: RecoveryAction.LOGIN
        };

      case ErrorType.QUOTA:
        return {
          title: 'Limit Reached',
          message: 'You\'ve reached your usage limit. Upgrade to continue.',
          actionLabel: 'Upgrade',
          actionType: RecoveryAction.UPGRADE
        };

      case ErrorType.VALIDATION:
        return {
          title: 'Invalid Input',
          message: 'Please check your input and try again.',
        };

      case ErrorType.PROCESSING:
        return {
          title: 'Processing Error',
          message: 'Something went wrong while processing your request.',
          actionLabel: 'Retry',
          actionType: RecoveryAction.RETRY
        };

      case ErrorType.PERMISSION:
        return {
          title: 'Permission Denied',
          message: 'You don\'t have permission to perform this action.',
        };

      case ErrorType.STORAGE:
        return {
          title: 'Storage Error',
          message: 'Failed to save your data. Please try again.',
          actionLabel: 'Retry',
          actionType: RecoveryAction.RETRY
        };

      default:
        return {
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred. Please try again.',
          actionLabel: 'Retry',
          actionType: RecoveryAction.RETRY
        };
    }
  }

  /**
   * Create a new AppError with incremented retry count
   */
  withRetry(): AppError {
    return new AppError({
      type: this.type,
      message: this.technicalMessage,
      context: {
        ...this.context,
        retryCount: (this.context.retryCount || 0) + 1
      },
      severity: this.severity,
      retryable: this.retryable,
      userMessage: this.userMessage,
      recoveryAction: this.recoveryAction,
      originalError: this.originalError,
    });
  }

  /**
   * Check if error should trigger automatic retry
   */
  shouldAutoRetry(): boolean {
    return this.retryable &&
           this.severity !== ErrorSeverity.CRITICAL &&
           (this.context.retryCount || 0) < 3;
  }

  /**
   * Get error data for logging
   */
  toLogData() {
    return {
      type: this.type,
      severity: this.severity,
      operation: this.context.operation,
      component: this.context.component,
      userId: this.context.userId,
      retryCount: this.context.retryCount,
      message: this.technicalMessage,
      timestamp: this.context.timestamp,
      metadata: this.context.metadata
    };
  }

  /**
   * Get error data for user display
   */
  toUserDisplay() {
    return {
      title: this.userMessage.title,
      message: this.userMessage.message,
      actionLabel: this.userMessage.actionLabel,
      actionType: this.userMessage.actionType,
      severity: this.severity
    };
  }
}




