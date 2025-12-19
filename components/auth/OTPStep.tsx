/**
 * OTP Step Component
 * OTP code verification
 */

import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { AuthButton } from './components/AuthButton';
import type { OTPStepProps } from '@/lib/auth/types';
import { MIN_OTP_LENGTH } from '@/lib/auth/constants';

export function OTPStep({
  otpCode,
  email,
  onOTPCodeChange,
  onVerifyOTP,
  onBackToEmail,
  loading,
  colors,
}: OTPStepProps) {
  const isButtonDisabled = loading || otpCode.length < MIN_OTP_LENGTH;

  return (
    <>
      <TextInput
        value={otpCode}
        onChangeText={onOTPCodeChange}
        placeholder="Enter code"
        keyboardType="number-pad"
        maxLength={8}
        style={[
          styles.input,
          styles.otpInput,
          { color: colors.text, borderColor: colors.border },
        ]}
        placeholderTextColor={colors.textSecondary}
        editable={!loading}
        autoFocus
      />

      <AuthButton
        text="Verify Code"
        loadingText="Verifying..."
        onPress={onVerifyOTP}
        disabled={isButtonDisabled}
        loading={loading}
        variant="primary"
        colors={colors}
      />

      <AuthButton
        text="Use a different email"
        onPress={onBackToEmail}
        variant="secondary"
        colors={colors}
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
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 4,
  },
});
