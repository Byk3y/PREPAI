/**
 * Email Step Component
 * Email input and social authentication
 */

import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { AuthButton } from './components/AuthButton';
import { SocialAuthButtons } from './components/SocialAuthButtons';
import type { EmailStepProps } from '@/lib/auth/types';

export function EmailStep({
  email,
  onEmailChange,
  onSendOTP,
  onSocialLogin,
  loading,
  colors,
}: EmailStepProps) {
  return (
    <>
      <TextInput
        value={email}
        onChangeText={onEmailChange}
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        placeholderTextColor={colors.textSecondary}
        editable={!loading}
        autoFocus
      />

      <AuthButton
        text="Continue"
        loadingText="Sending..."
        onPress={onSendOTP}
        disabled={loading}
        loading={loading}
        variant="primary"
        colors={colors}
      />

      <SocialAuthButtons
        onSocialLogin={onSocialLogin}
        colors={colors}
        disabled={loading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    marginBottom: 16,
  },
});
