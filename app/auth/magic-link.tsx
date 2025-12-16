/**
 * OTP Email Authentication Screen
 * Unified email-first flow: Email → OTP → Names (if needed)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

// Colorful Google G icon
const GoogleIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24">
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

type FlowStep = 'email' | 'otp' | 'names';

interface ProfileMeta {
  has_completed_onboarding?: boolean;
  [key: string]: any;
}

export default function MagicLinkScreen() {
  const router = useRouter();
  const { handleError } = useErrorHandler();
  const [flowStep, setFlowStep] = useState<FlowStep>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  // Cleanup old AsyncStorage entries on mount
  React.useEffect(() => {
    const cleanupOldStorage = async () => {
      try {
        await AsyncStorage.removeItem('pending_first_name');
        await AsyncStorage.removeItem('pending_last_name');
      } catch (error) {
        // Ignore cleanup errors
      }
    };
    cleanupOldStorage();
  }, []);

  const handleSendOTP = async () => {
    // Validate email only
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Required', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      );

      // Send OTP code - Supabase handles both signup and signin automatically
      const otpPromise = supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true, // Allow automatic signup
        },
      });

      const { error } = await Promise.race([otpPromise, timeoutPromise]) as any;

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', error.message);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFlowStep('otp');
      Alert.alert('Code sent!', 'Check your email for a verification code.');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await handleError(error, {
        operation: 'send_otp',
        component: 'magic-link-auth',
        metadata: { email: email.trim() }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        // Validation error - keep Alert for immediate feedback
        Alert.alert('Error', 'Please enter the code from your email');
        return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await handleError(error, {
          operation: 'verify_otp',
          component: 'magic-link-auth',
          metadata: { email: email.trim() }
        });
        return;
      }

      if (data.session && data.user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Check if profile has names
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, meta')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error checking profile:', profileError);
          
          // PGRST116 = no rows returned (profile doesn't exist yet - new user)
          if (profileError.code === 'PGRST116') {
            // New user - show name collection screen
            setLoading(false);
            setFlowStep('names');
            return;
          }
          
          // Other errors - assume names are missing (safer fallback)
          setLoading(false);
          setFlowStep('names');
          return;
        }

        // Check if names exist and are valid
        const hasValidFirstName = profile?.first_name && 
          profile.first_name.trim() !== '' && 
          !profile.first_name.includes('@');
        const hasValidLastName = profile?.last_name && 
          profile.last_name.trim() !== '';

        if (hasValidFirstName && hasValidLastName) {
          // Names exist - route to appropriate screen
          await routeAfterAuth(profile.meta);
        } else {
          // Names missing - show name collection screen
          setFlowStep('names');
        }
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await handleError(error, {
        operation: 'verify_otp',
        component: 'magic-link-auth',
        metadata: { email: email.trim() }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNames = async () => {
    // Validate names
    if (!firstName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Required', 'Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Required', 'Please enter your last name');
      return;
    }

    // Additional validation: ensure names don't look like emails
    if (firstName.trim().includes('@')) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid Name', 'Please enter a valid first name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Validation error - keep Alert for immediate feedback
        Alert.alert('Error', 'Please verify your email first');
        setFlowStep('otp');
        return;
      }

      // Save names directly to database
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        .eq('id', user.id);

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await handleError(error, {
          operation: 'save_names',
          component: 'magic-link-auth',
          metadata: { userId: user.id }
        });
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Get profile with meta to check onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('meta')
        .eq('id', user.id)
        .single();

      await routeAfterAuth(profile?.meta);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await handleError(error, {
        operation: 'save_names',
        component: 'magic-link-auth',
        metadata: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const routeAfterAuth = async (meta?: ProfileMeta) => {
    // Check onboarding completion status
    const hasCompletedOnboarding = meta?.has_completed_onboarding ?? false;
    
    if (hasCompletedOnboarding) {
      router.replace('/');
    } else {
      router.replace('/onboarding');
    }
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await handleError(error, {
          operation: 'social_login',
          component: 'magic-link-auth',
          metadata: { provider }
        });
        return;
      }

      // OAuth will redirect, handled by callback
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await handleError(error, {
        operation: 'social_login',
        component: 'magic-link-auth',
        metadata: { provider }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Top Bar with Login Link */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (flowStep === 'otp' || flowStep === 'names') {
                  // Reset to email step
                  setFlowStep('email');
                  setOtpCode('');
                  setFirstName('');
                  setLastName('');
                } else {
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
          <Text style={styles.heading}>
            {flowStep === 'email' && 'Welcome to PrepAI'}
            {flowStep === 'otp' && 'Enter verification code'}
            {flowStep === 'names' && 'Almost there!'}
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            {flowStep === 'email' && 'Create an account to start your learning journey and unlock your potential.'}
            {flowStep === 'otp' && `We sent a code to ${email}. Enter it below to continue.`}
            {flowStep === 'names' && 'Just need your name to get started.'}
          </Text>

          {/* Form Fields */}
          {flowStep === 'email' && (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                editable={!loading}
                autoFocus
              />

              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={loading}
                style={[
                  styles.continueButton,
                  loading && styles.continueButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? 'Sending...' : 'Continue'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Icons */}
              <View style={styles.socialIconsContainer}>
                <TouchableOpacity
                  onPress={() => handleSocialLogin('apple')}
                  style={styles.socialIconButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-apple" size={28} color="#000000" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSocialLogin('google')}
                  style={styles.socialIconButton}
                  activeOpacity={0.7}
                >
                  <GoogleIcon />
                </TouchableOpacity>
              </View>
            </>
          )}

          {flowStep === 'otp' && (
            <>
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="Enter code"
                keyboardType="number-pad"
                maxLength={8}
                style={[styles.input, styles.otpInput]}
                placeholderTextColor="#9CA3AF"
                editable={!loading}
                autoFocus
              />

              <TouchableOpacity
                onPress={handleVerifyOTP}
                disabled={loading || otpCode.length < 6}
                style={[
                  styles.continueButton,
                  (loading || otpCode.length < 6) && styles.continueButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFlowStep('email');
                  setOtpCode('');
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}

          {flowStep === 'names' && (
            <>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                autoCapitalize="words"
                autoComplete="name-given"
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                editable={!loading}
                autoFocus
              />

              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                autoCapitalize="words"
                autoComplete="name-family"
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                editable={!loading}
              />

              <TouchableOpacity
                onPress={handleSaveNames}
                disabled={loading}
                style={[
                  styles.continueButton,
                  loading && styles.continueButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? 'Saving...' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
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
    color: '#1F2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#1F2937',
    marginBottom: 16,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 4,
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#6B7280',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#9CA3AF',
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
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

