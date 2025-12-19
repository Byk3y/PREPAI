/**
 * OTP Email Authentication Screen
 * Unified email-first flow: Email → OTP → Names (if needed)
 * Refactored with component-based architecture
 */

import React from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { EmailStep } from '@/components/auth/EmailStep';
import { OTPStep } from '@/components/auth/OTPStep';
import { NamesStep } from '@/components/auth/NamesStep';

export default function MagicLinkScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  const {
    flowStep,
    email,
    otpCode,
    firstName,
    lastName,
    loading,
    setEmail,
    setOtpCode,
    setFirstName,
    setLastName,
    handleSendOTP,
    handleVerifyOTP,
    handleSaveNames,
    handleSocialLogin,
    resetToEmail,
  } = useAuthFlow();

  // Heading text based on current step
  const getHeading = () => {
    switch (flowStep) {
      case 'email':
        return 'Welcome to PrepAI';
      case 'otp':
        return 'Enter verification code';
      case 'names':
        return 'Almost there!';
    }
  };

  // Description text based on current step
  const getDescription = () => {
    switch (flowStep) {
      case 'email':
        return 'Create an account to start your learning journey and unlock your potential.';
      case 'otp':
        return `We sent a code to ${email}. Enter it below to continue.`;
      case 'names':
        return 'Just need your name to get started.';
    }
  };

  // Render the current step component
  const renderStep = () => {
    switch (flowStep) {
      case 'email':
        return (
          <EmailStep
            email={email}
            onEmailChange={setEmail}
            onSendOTP={handleSendOTP}
            onSocialLogin={handleSocialLogin}
            loading={loading}
            colors={colors}
          />
        );
      case 'otp':
        return (
          <OTPStep
            otpCode={otpCode}
            email={email}
            onOTPCodeChange={setOtpCode}
            onVerifyOTP={handleVerifyOTP}
            onBackToEmail={resetToEmail}
            loading={loading}
            colors={colors}
          />
        );
      case 'names':
        return (
          <NamesStep
            firstName={firstName}
            lastName={lastName}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onSaveNames={handleSaveNames}
            loading={loading}
            colors={colors}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.backButton, { color: colors.text }]}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (flowStep === 'otp' || flowStep === 'names') {
                  resetToEmail();
                } else {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.back();
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.loginLink}>
                {flowStep === 'email' ? 'Log in' : 'Start over'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <Text style={[styles.heading, { color: colors.text }]}>{getHeading()}</Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>{getDescription()}</Text>

          {/* Render current step */}
          {renderStep()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: '#3B82F6',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    marginBottom: 32,
    lineHeight: 24,
  },
});

