/**
 * Hook for setting up global error handler
 * Captures unhandled exceptions and sends them to Sentry
 */

import { useEffect } from 'react';
import { ErrorUtils } from 'react-native';
import { captureError } from '@/lib/sentry';

export function useGlobalErrorHandler() {
  useEffect(() => {
    if (ErrorUtils && ErrorUtils.getGlobalHandler) {
      const defaultErrorHandler = ErrorUtils.getGlobalHandler();

      const customErrorHandler = (error: Error, isFatal?: boolean) => {
        // Send to Sentry
        captureError(error, isFatal ?? false);
        
        // Call the default error handler
        defaultErrorHandler(error, isFatal);
      };

      ErrorUtils.setGlobalHandler(customErrorHandler);
    }
  }, []);
}




