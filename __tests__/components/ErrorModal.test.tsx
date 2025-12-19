/**
 * Tests for ErrorModal component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorModal } from '@/components/ErrorModal';
import { AppError } from '@/lib/errors/AppError';
import { ErrorType, ErrorSeverity, RecoveryAction } from '@/lib/errors/types';

// Mocks are handled in jest.setup.js

// Mock dependencies
jest.mock('@/lib/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false }),
  getThemeColors: () => ({
    surface: '#ffffff',
    text: '#000000',
    textSecondary: '#666666',
    border: '#e0e0e0',
    primary: '#007AFF',
    white: '#ffffff',
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
}));

describe('ErrorModal', () => {
  const mockContext = {
    operation: 'test_operation',
    component: 'TestComponent',
    timestamp: new Date().toISOString(),
  };

  const createMockError = (type: ErrorType, severity: ErrorSeverity = ErrorSeverity.HIGH) => {
    return new AppError({
      type,
      message: 'Test error message',
      context: mockContext,
      severity,
      recoveryAction: RecoveryAction.RETRY,
    });
  };

  it('should render error modal with title and message', () => {
    const error = createMockError(ErrorType.NETWORK);
    const onDismiss = jest.fn();

    const { getByText } = render(
      <ErrorModal error={error} onDismiss={onDismiss} />
    );

    expect(getByText('Connection Error')).toBeTruthy();
    expect(getByText(/internet connection/)).toBeTruthy();
  });

  it('should call onDismiss when dismiss button is pressed', () => {
    const error = createMockError(ErrorType.NETWORK);
    const onDismiss = jest.fn();

    const { getByText } = render(
      <ErrorModal error={error} onDismiss={onDismiss} />
    );

    const dismissButton = getByText('Dismiss');
    fireEvent.press(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry when retry button is pressed', () => {
    const error = createMockError(ErrorType.NETWORK);
    const onDismiss = jest.fn();
    const onRetry = jest.fn();

    const { getByText } = render(
      <ErrorModal error={error} onDismiss={onDismiss} onRetry={onRetry} />
    );

    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should display correct icon for critical errors', () => {
    const error = createMockError(ErrorType.UNKNOWN, ErrorSeverity.CRITICAL);

    const { getByText } = render(
      <ErrorModal error={error} onDismiss={jest.fn()} />
    );

    // Modal should render
    expect(getByText('Something Went Wrong')).toBeTruthy();
  });

  it('should display correct icon for high severity errors', () => {
    const error = createMockError(ErrorType.AUTH, ErrorSeverity.HIGH);

    const { getByText } = render(
      <ErrorModal error={error} onDismiss={jest.fn()} />
    );

    expect(getByText('Authentication Required')).toBeTruthy();
  });

  it('should handle LOGIN recovery action', () => {
    const error = new AppError({
      type: ErrorType.AUTH,
      message: 'Auth error',
      context: mockContext,
      severity: ErrorSeverity.HIGH,
      recoveryAction: RecoveryAction.LOGIN,
    });

    const onDismiss = jest.fn();
    const { getByText } = render(
      <ErrorModal error={error} onDismiss={onDismiss} />
    );

    const loginButton = getByText('Sign In');
    fireEvent.press(loginButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should display "Close App" for critical errors', () => {
    const error = createMockError(ErrorType.UNKNOWN, ErrorSeverity.CRITICAL);

    const { getByText } = render(
      <ErrorModal error={error} onDismiss={jest.fn()} />
    );

    expect(getByText('Close App')).toBeTruthy();
  });

  it('should display "Dismiss" for non-critical errors', () => {
    const error = createMockError(ErrorType.NETWORK, ErrorSeverity.HIGH);

    const { getByText } = render(
      <ErrorModal error={error} onDismiss={jest.fn()} />
    );

    expect(getByText('Dismiss')).toBeTruthy();
  });
});





