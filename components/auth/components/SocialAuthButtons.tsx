/**
 * Social Auth Buttons Component
 * Apple and Google sign-in buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import type { SocialAuthButtonsProps } from '@/lib/auth/types';

export function SocialAuthButtons({ onSocialLogin, colors, disabled = false }: SocialAuthButtonsProps) {
  const handlePress = (provider: 'google' | 'apple') => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSocialLogin(provider);
    }
  };

  return (
    <>
      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Social Login Icons */}
      <View style={styles.socialIconsContainer}>
        <TouchableOpacity
          onPress={() => handlePress('apple')}
          style={[
            styles.socialIconButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Ionicons name="logo-apple" size={28} color="#000000" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handlePress('google')}
          style={[
            styles.socialIconButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <GoogleIcon />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    marginHorizontal: 16,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  socialIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
