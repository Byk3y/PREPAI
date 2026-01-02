/**
 * OnboardingButton - Reusable button with commitment-oriented language
 * Supports primary and secondary variants
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getThemeColors } from '@/lib/ThemeContext';
import { useTheme } from '@/lib/ThemeContext';

interface OnboardingButtonProps {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'commitment';
  disabled?: boolean;
  loading?: boolean;
}

export function OnboardingButton({
  text,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
}: OnboardingButtonProps) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const isPrimary = variant === 'primary' || variant === 'commitment';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: isPrimary ? colors.primary : 'transparent',
          opacity: disabled || loading ? 0.5 : 1,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.primary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color: isPrimary ? colors.white : colors.primary,
            },
          ]}
        >
          {text}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    // shadowColor will be set inline
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
  },
});
