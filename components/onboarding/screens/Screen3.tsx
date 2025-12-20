/**
 * Screen 3: The Solution Part 1
 * Introduces Brigo's core value proposition
 * Includes policy checkbox and auth buttons
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { MotiText, MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { APP_URLS } from '@/lib/constants';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

interface Screen3Props {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen3({ colors }: Screen3Props) {
  const router = useRouter();
  const { handleError } = useErrorHandler();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleCreateAccount = () => {
    if (!termsAccepted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Required', 'Please accept the Terms & Conditions and Privacy Policy to continue');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/auth');
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/auth');
  };

  const handleTermsPress = () => {
    Linking.openURL(APP_URLS.TERMS).catch(async (err) => {
      await handleError(err, {
        operation: 'open_terms_link',
        component: 'onboarding-screen3',
        metadata: { url: APP_URLS.TERMS }
      });
    });
  };

  const handlePrivacyPress = () => {
    Linking.openURL(APP_URLS.PRIVACY).catch(async (err) => {
      await handleError(err, {
        operation: 'open_privacy_link',
        component: 'onboarding-screen3',
        metadata: { url: APP_URLS.PRIVACY }
      });
    });
  };

  return (
    <View style={styles.screenContainer}>
      {/* Top Content Section */}
      <View style={styles.contentSection}>
        <MotiText
          from={{ opacity: 0, rotate: '-45deg' }}
          animate={{ opacity: 1, rotate: '0deg' }}
          transition={{ type: 'timing', duration: 500 }}
          style={styles.emoji}
        >
          ✨
        </MotiText>
        <MotiText
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          delay={200}
          transition={{ type: 'timing', duration: 400 }}
          style={[styles.headline, { color: colors.text }]}
        >
          Turn Anything Into Study Tools
        </MotiText>
        <MotiText
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          delay={400}
          transition={{ type: 'timing', duration: 400 }}
          style={[styles.body, { color: colors.textSecondary }]}
        >
          Upload anything. Get AI-powered practice that makes you actually remember.
        </MotiText>

        {/* Terms & Conditions Checkbox */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          delay={600}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.termsContainer}
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTermsAccepted(!termsAccepted);
            }}
            style={styles.checkboxContainer}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: termsAccepted ? colors.primary : colors.neutral.light,
                },
                termsAccepted && {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={16} color={colors.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.termsText, { color: colors.text }]}>
            I agree to Brigo's{' '}
            <Text style={[styles.linkText, { color: colors.primary }]} onPress={handleTermsPress}>
              Terms & Conditions
            </Text>
            {' '}and acknowledge the{' '}
            <Text style={[styles.linkText, { color: colors.primary }]} onPress={handlePrivacyPress}>
              Privacy Policy
            </Text>
            .
          </Text>
        </MotiView>
      </View>

      {/* Bottom Buttons Section */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={800}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.buttonsContainer}
      >
        {/* Create Account Button */}
        <TouchableOpacity
          onPress={handleCreateAccount}
          disabled={!termsAccepted}
          style={[
            styles.primaryButton,
            {
              backgroundColor: termsAccepted ? colors.primary : colors.neutral.light,
              shadowColor: colors.shadowColor,
            },
            !termsAccepted && styles.buttonDisabled,
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: colors.white }]}>
            Create an account
          </Text>
        </TouchableOpacity>

        {/* Log In Button */}
        <TouchableOpacity
          onPress={handleLogin}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: colors.white,
              borderColor: colors.neutral.light,
              shadowColor: colors.shadowColor,
            },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.neutral.dark }]}>
            Log in
          </Text>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  contentSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
    textAlign: 'center',
  },
  headline: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
    paddingHorizontal: 8,
  },
  body: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    // borderColor will be set inline using colors.neutral.light for unchecked state
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    // Will be overridden by inline style with colors.primary
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    lineHeight: 20,
  },
  linkText: {
    // Color will be set inline using colors.primary
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  buttonsContainer: {
    width: '100%',
    paddingHorizontal: 0,
    gap: 16,
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 8,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    // shadowColor will be set inline using colors.shadowColor
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    // Color will be set inline using colors.white
    letterSpacing: 0.3,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    // Colors will be set inline
    borderWidth: 1.5,
    // shadowColor will be set inline using colors.shadowColor
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    // Color will be set inline using colors.neutral.dark
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
