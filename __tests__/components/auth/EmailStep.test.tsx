/**
 * Tests for EmailStep component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmailStep } from '@/components/auth/EmailStep';

// Mocks are handled in jest.setup.js

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

jest.mock('@/lib/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false }),
  getThemeColors: () => ({
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6',
  }),
}));

describe('EmailStep', () => {
  const mockColors = {
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6',
  } as any; // Simplified mock for testing

  const defaultProps = {
    email: '',
    onEmailChange: jest.fn(),
    onSendOTP: jest.fn(),
    onSocialLogin: jest.fn(),
    loading: false,
    colors: mockColors,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render email input', () => {
    const { getByPlaceholderText } = render(<EmailStep {...defaultProps} />);
    expect(getByPlaceholderText('Email address')).toBeTruthy();
  });

  it('should render Continue button', () => {
    const { getByText } = render(<EmailStep {...defaultProps} />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('should call onEmailChange when typing', () => {
    const { getByPlaceholderText } = render(<EmailStep {...defaultProps} />);
    const input = getByPlaceholderText('Email address');

    fireEvent.changeText(input, 'test@example.com');

    expect(defaultProps.onEmailChange).toHaveBeenCalledWith('test@example.com');
  });

  it('should call onSendOTP when Continue button is pressed', () => {
    const { getByText } = render(<EmailStep {...defaultProps} />);
    const button = getByText('Continue');

    fireEvent.press(button);

    expect(defaultProps.onSendOTP).toHaveBeenCalled();
  });

  it('should call onSocialLogin with google when Google button is pressed', () => {
    const { getAllByRole } = render(<EmailStep {...defaultProps} />);
    const buttons = getAllByRole('button');

    // Find Google button (second social button)
    const googleButton = buttons[buttons.length - 1];
    fireEvent.press(googleButton);

    expect(defaultProps.onSocialLogin).toHaveBeenCalledWith('google');
  });

  it('should call onSocialLogin with apple when Apple button is pressed', () => {
    const { getAllByRole } = render(<EmailStep {...defaultProps} />);
    const buttons = getAllByRole('button');

    // Find Apple button (first social button)
    const appleButton = buttons[buttons.length - 2];
    fireEvent.press(appleButton);

    expect(defaultProps.onSocialLogin).toHaveBeenCalledWith('apple');
  });

  it('should show loading text when loading', () => {
    const { getByText } = render(<EmailStep {...defaultProps} loading={true} />);
    expect(getByText('Sending...')).toBeTruthy();
  });

  it('should disable input when loading', () => {
    const { getByPlaceholderText } = render(<EmailStep {...defaultProps} loading={true} />);
    const input = getByPlaceholderText('Email address');

    expect(input.props.editable).toBe(false);
  });

  it('should display email value', () => {
    const { getByDisplayValue } = render(
      <EmailStep {...defaultProps} email="test@example.com" />
    );
    expect(getByDisplayValue('test@example.com')).toBeTruthy();
  });
});
