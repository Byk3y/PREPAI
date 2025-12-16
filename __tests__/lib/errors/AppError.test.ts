/**
 * Tests for AppError class
 */

import { AppError } from '@/lib/errors/AppError';
import { ErrorType, ErrorSeverity, RecoveryAction } from '@/lib/errors/types';

describe('AppError', () => {
  const mockContext = {
    operation: 'test_operation',
    component: 'TestComponent',
    userId: 'user-123',
    timestamp: new Date().toISOString(),
  };

  describe('constructor', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network request failed',
        context: mockContext,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        recoveryAction: RecoveryAction.RETRY,
      });

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.message).toBe('Network request failed');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
      expect(error.recoveryAction).toBe(RecoveryAction.RETRY);
      expect(error.context).toEqual(mockContext);
      expect(error.name).toBe('AppError');
    });

    it('should use default severity if not provided', () => {
      const error = new AppError({
        type: ErrorType.UNKNOWN,
        message: 'Unknown error',
        context: mockContext,
      });

      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should use default retryable value if not provided', () => {
      const error = new AppError({
        type: ErrorType.UNKNOWN,
        message: 'Unknown error',
        context: mockContext,
      });

      expect(error.retryable).toBe(false);
    });

    it('should generate default user message based on error type', () => {
      const networkError = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network error',
        context: mockContext,
      });

      expect(networkError.userMessage.title).toBe('Connection Error');
      expect(networkError.userMessage.message).toContain('internet connection');
      expect(networkError.userMessage.actionLabel).toBe('Retry');
    });
  });

  describe('withRetry', () => {
    it('should create a new AppError with incremented retry count', () => {
      const error = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network error',
        context: { ...mockContext, retryCount: 0 },
        retryable: true,
      });

      const retryError = error.withRetry();

      expect(retryError.context.retryCount).toBe(1);
      expect(retryError.context.retryCount).not.toBe(error.context.retryCount);
      expect(retryError.type).toBe(error.type);
      expect(retryError.message).toBe(error.message);
    });

    it('should handle undefined retry count', () => {
      const error = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network error',
        context: mockContext,
        retryable: true,
      });

      const retryError = error.withRetry();

      expect(retryError.context.retryCount).toBe(1);
    });
  });

  describe('shouldAutoRetry', () => {
    it('should return true for retryable, non-critical errors under retry limit', () => {
      const error = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network error',
        context: { ...mockContext, retryCount: 0 },
        severity: ErrorSeverity.LOW,
        retryable: true,
      });

      expect(error.shouldAutoRetry()).toBe(true);
    });

    it('should return false for critical errors', () => {
      const error = new AppError({
        type: ErrorType.UNKNOWN,
        message: 'Critical error',
        context: { ...mockContext, retryCount: 0 },
        severity: ErrorSeverity.CRITICAL,
        retryable: true,
      });

      expect(error.shouldAutoRetry()).toBe(false);
    });

    it('should return false when retry count exceeds limit', () => {
      const error = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network error',
        context: { ...mockContext, retryCount: 3 },
        severity: ErrorSeverity.LOW,
        retryable: true,
      });

      expect(error.shouldAutoRetry()).toBe(false);
    });

    it('should return false for non-retryable errors', () => {
      const error = new AppError({
        type: ErrorType.AUTH,
        message: 'Auth error',
        context: { ...mockContext, retryCount: 0 },
        severity: ErrorSeverity.HIGH,
        retryable: false,
      });

      expect(error.shouldAutoRetry()).toBe(false);
    });
  });

  describe('toLogData', () => {
    it('should return structured log data', () => {
      const error = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network request failed',
        context: {
          ...mockContext,
          retryCount: 2,
          metadata: { url: 'https://api.example.com' },
        },
        severity: ErrorSeverity.HIGH,
      });

      const logData = error.toLogData();

      expect(logData).toEqual({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        operation: 'test_operation',
        component: 'TestComponent',
        userId: 'user-123',
        retryCount: 2,
        message: 'Network request failed',
        timestamp: mockContext.timestamp,
        metadata: { url: 'https://api.example.com' },
      });
    });
  });

  describe('toUserDisplay', () => {
    it('should return user-friendly display data', () => {
      const error = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network request failed',
        context: mockContext,
        severity: ErrorSeverity.HIGH,
        recoveryAction: RecoveryAction.RETRY,
      });

      const displayData = error.toUserDisplay();

      expect(displayData).toHaveProperty('title');
      expect(displayData).toHaveProperty('message');
      expect(displayData).toHaveProperty('actionLabel');
      expect(displayData).toHaveProperty('actionType');
      expect(displayData).toHaveProperty('severity');
      expect(displayData.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('default user messages', () => {
    it('should provide correct user message for NETWORK errors', () => {
      const error = new AppError({
        type: ErrorType.NETWORK,
        message: 'Network error',
        context: mockContext,
      });

      expect(error.userMessage.title).toBe('Connection Error');
      expect(error.userMessage.actionType).toBe(RecoveryAction.RETRY);
    });

    it('should provide correct user message for AUTH errors', () => {
      const error = new AppError({
        type: ErrorType.AUTH,
        message: 'Auth error',
        context: mockContext,
      });

      expect(error.userMessage.title).toBe('Authentication Required');
      expect(error.userMessage.actionType).toBe(RecoveryAction.LOGIN);
    });

    it('should provide correct user message for QUOTA errors', () => {
      const error = new AppError({
        type: ErrorType.QUOTA,
        message: 'Quota exceeded',
        context: mockContext,
      });

      expect(error.userMessage.title).toBe('Limit Reached');
      expect(error.userMessage.actionType).toBe(RecoveryAction.UPGRADE);
    });

    it('should provide correct user message for VALIDATION errors', () => {
      const error = new AppError({
        type: ErrorType.VALIDATION,
        message: 'Validation error',
        context: mockContext,
      });

      expect(error.userMessage.title).toBe('Invalid Input');
      expect(error.userMessage.actionLabel).toBeUndefined();
    });

    it('should provide correct user message for UNKNOWN errors', () => {
      const error = new AppError({
        type: ErrorType.UNKNOWN,
        message: 'Unknown error',
        context: mockContext,
      });

      expect(error.userMessage.title).toBe('Something Went Wrong');
      expect(error.userMessage.actionType).toBe(RecoveryAction.RETRY);
    });
  });
});


