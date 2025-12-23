/**
 * Error Notification Bridge
 * Allows ErrorBoundary (which is outside ErrorNotificationProvider) 
 * to communicate with ErrorNotificationContext
 */

import { AppError } from '@/lib/errors/AppError';

type ErrorCallback = (error: AppError) => void;

class ErrorNotificationBridge {
  private static showErrorCallback: ErrorCallback | null = null;

  /**
   * Register callback from ErrorNotificationProvider
   * This allows the provider to receive errors from ErrorBoundary
   */
  static register(callback: ErrorCallback) {
    this.showErrorCallback = callback;
  }

  /**
   * Unregister callback (cleanup)
   */
  static unregister() {
    this.showErrorCallback = null;
  }

  /**
   * Show error (called by ErrorBoundary)
   */
  static showError(error: AppError) {
    if (this.showErrorCallback) {
      this.showErrorCallback(error);
    } else {
      // Fallback: log if provider not ready
      console.error('[ErrorNotificationBridge] Error shown before provider ready:', error);
    }
  }
}

export { ErrorNotificationBridge };










