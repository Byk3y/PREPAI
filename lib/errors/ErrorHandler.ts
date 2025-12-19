import { AppError } from './AppError';
import { ErrorClassifier } from './ErrorClassifier';
import { ErrorSeverity, RecoveryAction } from './types';
import { captureAppError } from '@/lib/sentry';

/**
 * Centralized Error Handler - Processes, logs, and handles AppError instances
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Main entry point for handling errors
   * Classifies raw errors and handles them appropriately
   */
  async handle(
    error: unknown,
    context: {
      operation: string;
      component?: string;
      userId?: string;
      metadata?: Record<string, any>;
      sessionId?: string;
    }
  ): Promise<AppError> {
    const appError = ErrorClassifier.classifyError(error, context);

    // Log the error
    await this.logError(appError);

    // Handle based on severity and type
    await this.handleError(appError);

    return appError;
  }

  /**
   * Handle an already classified AppError
   */
  async handleError(appError: AppError): Promise<void> {
    // Attempt automatic recovery for retryable errors
    if (appError.shouldAutoRetry()) {
      await this.attemptRecovery(appError);
      return;
    }

    // Handle based on severity
    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
        await this.handleCriticalError(appError);
        break;
      case ErrorSeverity.HIGH:
        await this.handleHighSeverityError(appError);
        break;
      case ErrorSeverity.MEDIUM:
        await this.handleMediumSeverityError(appError);
        break;
      case ErrorSeverity.LOW:
        // Low severity errors are often just logged
        break;
    }
  }

  /**
   * Log error to appropriate destinations
   */
  private async logError(appError: AppError): Promise<void> {
    const logData = appError.toLogData();

    // Console logging (development)
    if (__DEV__) {
      console.error('[AppError]', logData);
    }

    // Send to Sentry (only in production)
    captureAppError(appError);

    // TODO: Add database logging for critical errors
    // if (appError.severity === ErrorSeverity.CRITICAL) {
    //   await this.logToDatabase(logData);
    // }
  }

  /**
   * Attempt automatic recovery for retryable errors
   */
  private async attemptRecovery(appError: AppError): Promise<void> {
    const retryKey = `${appError.context.operation}-${appError.context.userId || 'anonymous'}`;

    // Clear existing retry timer
    if (this.retryQueue.has(retryKey)) {
      clearTimeout(this.retryQueue.get(retryKey)!);
    }

    // Schedule retry with exponential backoff
    const retryDelay = Math.min(1000 * Math.pow(2, appError.context.retryCount || 0), 30000);
    const timeoutId = setTimeout(async () => {
      this.retryQueue.delete(retryKey);

      // Create retry error and attempt recovery
      const retryError = appError.withRetry();

      // TODO: Implement actual retry logic based on error type
      // This would involve calling the original operation again
      console.log(`[ErrorHandler] Retrying operation: ${retryError.context.operation} (attempt ${retryError.context.retryCount})`);

      // For now, just log that we would retry
      await this.logError(retryError);

    }, retryDelay);

    this.retryQueue.set(retryKey, timeoutId);
  }

  /**
   * Handle critical errors (app-breaking)
   */
  private async handleCriticalError(appError: AppError): Promise<void> {
    // Show full-screen error modal via event system
    // ErrorNotificationProvider will listen and display
    this.notifyError(appError);
    
    // TODO: Report to monitoring service
    // TODO: Potentially restart app or clear cache

    console.error('[CRITICAL ERROR]', appError.toLogData());
  }

  /**
   * Handle high severity errors (block user action)
   */
  private async handleHighSeverityError(appError: AppError): Promise<void> {
    // Show blocking modal via event system
    this.notifyError(appError);

    console.warn('[HIGH SEVERITY ERROR]', appError.toLogData());
  }

  /**
   * Handle medium severity errors (user notification)
   */
  private async handleMediumSeverityError(appError: AppError): Promise<void> {
    // Show toast notification via event system
    this.notifyError(appError);

    console.info('[MEDIUM SEVERITY ERROR]', appError.toLogData());
  }

  /**
   * Notify UI layer about error
   * In React Native, we'll use a global reference that components can access
   * This is a bridge between service layer and React context
   */
  private notifyError(appError: AppError): void {
    // Store error for UI layer to pick up
    // Components using useErrorNotification will call showError directly
    // This method is called by ErrorHandler, but UI integration happens
    // when components catch errors and call the context's showError method
    // For now, we just log - actual UI display happens via useErrorHandler hook
  }

  /**
   * Create error boundary for React components
   */
  createErrorBoundary(context: { component: string; userId?: string }) {
    return (error: Error, errorInfo: any) => {
      const appError = ErrorClassifier.classifyError(error, {
        operation: 'component_render',
        component: context.component,
        userId: context.userId,
        metadata: { errorInfo }
      });

      this.handleError(appError);
    };
  }

  /**
   * Clean up retry timers on app close
   */
  cleanup(): void {
    for (const timeoutId of this.retryQueue.values()) {
      clearTimeout(timeoutId);
    }
    this.retryQueue.clear();
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();




