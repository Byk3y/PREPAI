/**
 * Tests for NamesStep component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NamesStep } from '@/components/auth/NamesStep';

// Mocks are handled in jest.setup.js

// Mock dependencies
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

describe('NamesStep', () => {
  const mockColors = {
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6',
  } as any; // Simplified mock for testing

  const defaultProps = {
    firstName: '',
    lastName: '',
    onFirstNameChange: jest.fn(),
    onLastNameChange: jest.fn(),
    onSaveNames: jest.fn(),
    loading: false,
    colors: mockColors,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render first name input', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} />);
    expect(getByPlaceholderText('First name')).toBeTruthy();
  });

  it('should render last name input', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} />);
    expect(getByPlaceholderText('Last name')).toBeTruthy();
  });

  it('should render Continue button', () => {
    const { getByText } = render(<NamesStep {...defaultProps} />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('should call onFirstNameChange when typing in first name', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} />);
    const input = getByPlaceholderText('First name');

    fireEvent.changeText(input, 'John');

    expect(defaultProps.onFirstNameChange).toHaveBeenCalledWith('John');
  });

  it('should call onLastNameChange when typing in last name', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} />);
    const input = getByPlaceholderText('Last name');

    fireEvent.changeText(input, 'Doe');

    expect(defaultProps.onLastNameChange).toHaveBeenCalledWith('Doe');
  });

  it('should call onSaveNames when Continue button is pressed', () => {
    const { getByText } = render(<NamesStep {...defaultProps} />);
    const button = getByText('Continue');

    fireEvent.press(button);

    expect(defaultProps.onSaveNames).toHaveBeenCalled();
  });

  it('should show loading text when loading', () => {
    const { getByText } = render(<NamesStep {...defaultProps} loading={true} />);
    expect(getByText('Saving...')).toBeTruthy();
  });

  it('should disable inputs when loading', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} loading={true} />);
    const firstNameInput = getByPlaceholderText('First name');
    const lastNameInput = getByPlaceholderText('Last name');

    expect(firstNameInput.props.editable).toBe(false);
    expect(lastNameInput.props.editable).toBe(false);
  });

  it('should display first name value', () => {
    const { getByDisplayValue } = render(<NamesStep {...defaultProps} firstName="John" />);
    expect(getByDisplayValue('John')).toBeTruthy();
  });

  it('should display last name value', () => {
    const { getByDisplayValue } = render(<NamesStep {...defaultProps} lastName="Doe" />);
    expect(getByDisplayValue('Doe')).toBeTruthy();
  });

  it('should use words autoCapitalize for first name', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} />);
    const input = getByPlaceholderText('First name');

    expect(input.props.autoCapitalize).toBe('words');
  });

  it('should use words autoCapitalize for last name', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} />);
    const input = getByPlaceholderText('Last name');

    expect(input.props.autoCapitalize).toBe('words');
  });

  it('should have name-given autoComplete for first name', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} />);
    const input = getByPlaceholderText('First name');

    expect(input.props.autoComplete).toBe('name-given');
  });

  it('should have name-family autoComplete for last name', () => {
    const { getByPlaceholderText } = render(<NamesStep {...defaultProps} />);
    const input = getByPlaceholderText('Last name');

    expect(input.props.autoComplete).toBe('name-family');
  });
});
