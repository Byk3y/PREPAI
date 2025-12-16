/**
 * Auth Landing Screen
 * Clean, modern design with social login options
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

// Colorful Google G icon
const GoogleIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

// App icon at top
function AppIconHeader() {
  return (
    <View style={styles.iconContainer}>
      <Image
        source={require('@/assets/icon.png')}
        style={styles.appIcon}
        resizeMode="contain"
      />
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const { handleError } = useErrorHandler();

  const handleEmailAuth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/magic-link');
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/callback`,
        },
      });

      if (error) {
        await handleError(error, {
          operation: 'social_login',
          component: 'auth-index',
          metadata: { provider }
        });
        return;
      }

      // OAuth will redirect, handled by callback
    } catch (error: any) {
      await handleError(error, {
        operation: 'social_login',
        component: 'auth-index',
        metadata: { provider }
      });
    }
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/magic-link');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* App Icon */}
        <AppIconHeader />

        {/* Heading */}
        <Text style={[styles.heading, { color: colors.text }]}>
          Create an account
        </Text>

        {/* Main Content Container */}
        <View style={styles.mainContent}>
          {/* Auth Method Buttons */}
          <View style={styles.authMethodsContainer}>
            {/* Apple */}
            <TouchableOpacity
              onPress={() => handleSocialLogin('apple')}
              style={[
                styles.authMethodButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-apple" size={24} color={colors.text} />
              <Text style={[styles.authMethodText, { color: colors.text }]}>
                Continue with Apple
              </Text>
            </TouchableOpacity>

            {/* Google */}
            <TouchableOpacity
              onPress={() => handleSocialLogin('google')}
              style={[
                styles.authMethodButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
              activeOpacity={0.7}
            >
              <GoogleIcon />
              <Text style={[styles.authMethodText, { color: colors.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity
              onPress={handleEmailAuth}
              style={[
                styles.authMethodButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={24} color={colors.text} />
              <Text style={[styles.authMethodText, { color: colors.text }]}>
                Continue with Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text
                style={[styles.loginLink, { color: colors.primaryLight }]}
                onPress={handleLogin}
              >
                Log in
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  appIcon: {
    width: 120,
    height: 120,
    backgroundColor: 'transparent',
    // Ensure transparency is preserved
    tintColor: undefined,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  mainContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  authMethodsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  authMethodButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    // backgroundColor will be set inline based on theme
    gap: 8,
  },
  authMethodText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'left',
  },
  loginLinkContainer: {
    paddingTop: 8,
  },
  loginLinkText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
  },
  loginLink: {
    // color will be set inline based on theme
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
  },
});
