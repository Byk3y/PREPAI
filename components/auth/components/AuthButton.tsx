/**
 * Auth Button Component
 * Reusable button for auth screens
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { AuthButtonProps } from '@/lib/auth/types';

export function AuthButton({
  text,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingText,
  colors,
}: AuthButtonProps) {
  const isPrimary = variant === 'primary';
  const displayText = loading && loadingText ? loadingText : text;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        (disabled || loading) && styles.disabledButton,
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.buttonText,
          isPrimary ? styles.primaryButtonText : styles.secondaryButtonText,
        ]}
      >
        {displayText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontFamily: 'SpaceGrotesk-Regular',
  },
});
