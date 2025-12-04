/**
 * Error Classifier
 * Classifies errors to determine retry vs fallback strategy
 */

import { ErrorType } from './types.ts';

export function classifyError(error: Error, statusCode?: number): ErrorType {
  // Rate limit errors → immediate fallback
  if (statusCode === 429) {
    return ErrorType.RATE_LIMIT;
  }

  // Permanent errors (auth, bad request, forbidden) → skip to fallback
  if (statusCode === 401 || statusCode === 400 || statusCode === 403) {
    return ErrorType.PERMANENT;
  }

  // Check error message for permanent indicators
  const errorMsg = error.message.toLowerCase();

  if (
    errorMsg.includes('invalid pdf') ||
    errorMsg.includes('corrupted') ||
    errorMsg.includes('encrypted') ||
    errorMsg.includes('password protected') ||
    errorMsg.includes('not a valid pdf') ||
    errorMsg.includes('api key') ||
    errorMsg.includes('unauthorized')
  ) {
    return ErrorType.PERMANENT;
  }

  // Transient errors (service unavailable, timeouts) → retry once
  if (statusCode === 503 || statusCode === 502 || statusCode === 504) {
    return ErrorType.TRANSIENT;
  }

  if (
    errorMsg.includes('timeout') ||
    errorMsg.includes('econnreset') ||
    errorMsg.includes('network') ||
    errorMsg.includes('unavailable') ||
    errorMsg.includes('try again')
  ) {
    return ErrorType.TRANSIENT;
  }

  // Default: treat as transient (retry once, then fallback)
  return ErrorType.TRANSIENT;
}

export function shouldRetry(errorType: ErrorType): boolean {
  return errorType === ErrorType.TRANSIENT;
}

export function shouldFallback(errorType: ErrorType): boolean {
  return errorType === ErrorType.PERMANENT || errorType === ErrorType.RATE_LIMIT;
}
