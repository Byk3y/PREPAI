import { useCallback, useContext } from 'react';
import { errorHandler } from '@/lib/errors';
import { ErrorContext } from '@/lib/errors/types';
import { ErrorNotificationContext } from '@/lib/contexts/ErrorNotificationContext';

/**
 * Hook for consistent error handling in React components
 * Now includes automatic UI display via ErrorNotificationContext
 * 
 * Note: This hook requires ErrorNotificationProvider to be in the component tree.
 * It's provided at the root level in app/_layout.tsx
 */
export function useErrorHandler() {
  // Use useContext directly with safety check
  const context = useContext(ErrorNotificationContext);
  
  // If context is not available, we'll still handle errors but won't show UI
  // This prevents crashes during initial render or if provider isn't set up yet
  const showErrorUI = context?.showError || (() => {
    // Fallback: just log if context isn't available
    if (__DEV__) {
      console.warn('[useErrorHandler] ErrorNotificationContext not available, error logged but not displayed in UI');
    }
  });

  /**
   * Handle an error with proper context and display in UI
   */
  const handleError = useCallback(async (
    error: unknown,
    context: Omit<ErrorContext, 'timestamp' | 'userAgent'>
  ) => {
    const appError = await errorHandler.handle(error, context);
    
    // Automatically show error in UI based on severity
    showErrorUI(appError);
    
    return appError;
  }, [showErrorUI]);

  /**
   * Wrap an async function with error handling
   * Returns null on error, or the function result on success
   */
  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: Omit<ErrorContext, 'timestamp' | 'userAgent'>
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        await handleError(error, context);
        return null;
      }
    };
  }, [handleError]);

  /**
   * Wrap an async function that should throw on error (preserves error throwing)
   */
  const withErrorContext = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: Omit<ErrorContext, 'timestamp' | 'userAgent'>
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        // Re-throw the classified error so calling code can handle it
        throw await handleError(error, context);
      }
    };
  }, [handleError]);

  return {
    handleError,
    withErrorHandling,
    withErrorContext
  };
}









