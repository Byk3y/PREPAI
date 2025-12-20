/**
 * Centralized Error Handling System
 *
 * Exports all error-related functionality for easy importing
 */

export { AppError } from './AppError';
export { ErrorClassifier } from './ErrorClassifier';
export { errorHandler, ErrorHandler } from './ErrorHandler';
export * from './types';

// Import after exports to avoid circular dependency
import { errorHandler } from './ErrorHandler';
import { ErrorClassifier } from './ErrorClassifier';

// Convenience function for handling errors
export async function handleError(
  error: unknown,
  context: {
    operation: string;
    component?: string;
    userId?: string;
    metadata?: Record<string, any>;
    sessionId?: string;
  }
) {
  return errorHandler.handle(error, context);
}

// Utility function for classifying errors
export function classifyError(
  error: unknown,
  context: Omit<import('./types').ErrorContext, 'timestamp'>
) {
  return ErrorClassifier.classifyError(error, context);
}






