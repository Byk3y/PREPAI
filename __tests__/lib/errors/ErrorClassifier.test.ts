/**
 * Tests for ErrorClassifier
 */

import { ErrorClassifier } from '@/lib/errors/ErrorClassifier';
import { ErrorType, ErrorSeverity, RecoveryAction } from '@/lib/errors/types';

describe('ErrorClassifier', () => {
  const mockContext = {
    operation: 'test_operation',
    component: 'TestComponent',
    userId: 'user-123',
  };

  describe('classifyError', () => {
    describe('null/undefined errors', () => {
      it('should classify null errors as UNKNOWN', () => {
        const appError = ErrorClassifier.classifyError(null, mockContext);

        expect(appError.type).toBe(ErrorType.UNKNOWN);
        expect(appError.severity).toBe(ErrorSeverity.LOW);
        expect(appError.message).toBe('Unknown error occurred');
      });

      it('should classify undefined errors as UNKNOWN', () => {
        const appError = ErrorClassifier.classifyError(undefined, mockContext);

        expect(appError.type).toBe(ErrorType.UNKNOWN);
        expect(appError.severity).toBe(ErrorSeverity.LOW);
      });
    });

    describe('Error instances', () => {
      it('should classify network errors correctly', () => {
        const networkError = new Error('Network request failed');
        networkError.name = 'TypeError';

        const appError = ErrorClassifier.classifyError(networkError, mockContext);

        expect(appError.type).toBe(ErrorType.NETWORK);
        expect(appError.severity).toBe(ErrorSeverity.LOW);
        expect(appError.retryable).toBe(true);
        expect(appError.recoveryAction).toBe(RecoveryAction.RETRY);
      });

      it('should classify authentication errors correctly', () => {
        const authError = new Error('Unauthorized: Invalid token');

        const appError = ErrorClassifier.classifyError(authError, mockContext);

        expect(appError.type).toBe(ErrorType.AUTH);
        expect(appError.severity).toBe(ErrorSeverity.HIGH);
        expect(appError.retryable).toBe(false);
        expect(appError.recoveryAction).toBe(RecoveryAction.LOGIN);
      });

      it('should classify quota errors correctly', () => {
        const quotaError = new Error('Quota limit exceeded');

        const appError = ErrorClassifier.classifyError(quotaError, mockContext);

        expect(appError.type).toBe(ErrorType.QUOTA);
        expect(appError.severity).toBe(ErrorSeverity.HIGH);
        expect(appError.retryable).toBe(false);
        expect(appError.recoveryAction).toBe(RecoveryAction.UPGRADE);
      });

      it('should classify permission errors correctly', () => {
        const permissionError = new Error('Permission denied');

        const appError = ErrorClassifier.classifyError(permissionError, mockContext);

        expect(appError.type).toBe(ErrorType.PERMISSION);
        expect(appError.severity).toBe(ErrorSeverity.HIGH);
        expect(appError.retryable).toBe(false);
      });

      it('should classify validation errors correctly', () => {
        const validationError = new Error('Invalid input format');

        const appError = ErrorClassifier.classifyError(validationError, mockContext);

        expect(appError.type).toBe(ErrorType.VALIDATION);
        expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
        expect(appError.retryable).toBe(false);
      });

      it('should classify storage errors correctly', () => {
        const storageError = new Error('Storage upload failed');

        const appError = ErrorClassifier.classifyError(storageError, mockContext);

        expect(appError.type).toBe(ErrorType.STORAGE);
        expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
        expect(appError.retryable).toBe(true);
        expect(appError.recoveryAction).toBe(RecoveryAction.RETRY);
      });

      it('should classify processing errors correctly', () => {
        const processingError = new Error('Processing extract failed');

        const appError = ErrorClassifier.classifyError(processingError, mockContext);

        expect(appError.type).toBe(ErrorType.PROCESSING);
        expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
        expect(appError.retryable).toBe(true);
        expect(appError.recoveryAction).toBe(RecoveryAction.RETRY);
      });

      it('should classify unknown errors as UNKNOWN', () => {
        const unknownError = new Error('Some random error');

        const appError = ErrorClassifier.classifyError(unknownError, mockContext);

        expect(appError.type).toBe(ErrorType.UNKNOWN);
        expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
        expect(appError.retryable).toBe(false);
      });
    });

    describe('string errors', () => {
      it('should classify network string errors', () => {
        const appError = ErrorClassifier.classifyError('Network connection timeout', mockContext);

        expect(appError.type).toBe(ErrorType.NETWORK);
        expect(appError.retryable).toBe(true);
      });

      it('should classify auth string errors', () => {
        const appError = ErrorClassifier.classifyError('Session expired', mockContext);

        expect(appError.type).toBe(ErrorType.AUTH);
        expect(appError.recoveryAction).toBe(RecoveryAction.LOGIN);
      });

      it('should classify quota string errors', () => {
        const appError = ErrorClassifier.classifyError('Trial expired', mockContext);

        expect(appError.type).toBe(ErrorType.QUOTA);
        expect(appError.recoveryAction).toBe(RecoveryAction.UPGRADE);
      });
    });

    describe('object errors', () => {
      it('should classify Supabase auth errors', () => {
        const supabaseError = {
          code: 'PGRST301',
          message: 'JWT expired',
        };

        const appError = ErrorClassifier.classifyError(supabaseError, mockContext);

        expect(appError.type).toBe(ErrorType.AUTH);
        expect(appError.severity).toBe(ErrorSeverity.HIGH);
        expect(appError.recoveryAction).toBe(RecoveryAction.LOGIN);
        expect(appError.originalError).toBe(supabaseError);
      });

      it('should classify Supabase permission errors', () => {
        const supabaseError = {
          code: 'PGRST116',
          message: 'Permission denied',
        };

        const appError = ErrorClassifier.classifyError(supabaseError, mockContext);

        expect(appError.type).toBe(ErrorType.PERMISSION);
        expect(appError.severity).toBe(ErrorSeverity.HIGH);
        expect(appError.originalError).toBe(supabaseError);
      });

      it('should classify Supabase validation errors', () => {
        const supabaseError = {
          code: '23505',
          message: 'Violates unique constraint',
        };

        const appError = ErrorClassifier.classifyError(supabaseError, mockContext);

        expect(appError.type).toBe(ErrorType.VALIDATION);
        expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
        expect(appError.originalError).toBe(supabaseError);
      });

      it('should handle generic object errors', () => {
        const objectError = {
          error: 'Something went wrong',
        };

        const appError = ErrorClassifier.classifyError(objectError, mockContext);

        expect(appError.type).toBe(ErrorType.UNKNOWN);
        expect(appError.originalError).toBe(objectError);
      });
    });

    describe('context handling', () => {
      it('should add timestamp to context', () => {
        const error = new Error('Test error');
        const appError = ErrorClassifier.classifyError(error, mockContext);

        expect(appError.context.timestamp).toBeDefined();
        expect(typeof appError.context.timestamp).toBe('string');
        expect(new Date(appError.context.timestamp).getTime()).not.toBeNaN();
      });

      it('should preserve all context fields', () => {
        const fullContext = {
          ...mockContext,
          metadata: { key: 'value' },
          sessionId: 'session-123',
        };

        const error = new Error('Test error');
        const appError = ErrorClassifier.classifyError(error, fullContext);

        expect(appError.context.operation).toBe('test_operation');
        expect(appError.context.component).toBe('TestComponent');
        expect(appError.context.userId).toBe('user-123');
        expect(appError.context.metadata).toEqual({ key: 'value' });
        expect(appError.context.sessionId).toBe('session-123');
        expect(appError.context.timestamp).toBeDefined();
      });
    });
  });
});


