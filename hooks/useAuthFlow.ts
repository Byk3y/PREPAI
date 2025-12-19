/**
 * Auth Flow Hook
 * Manages all business logic for the email/OTP/names authentication flow
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { validateEmail, validateOTP, validateName } from '@/lib/auth/validation';
import {
  OTP_TIMEOUT_MS,
  SUCCESS_MESSAGES,
  ERROR_OPERATIONS,
  ERROR_COMPONENT,
} from '@/lib/auth/constants';
import type { FlowStep, ProfileMeta, UseAuthFlowReturn } from '@/lib/auth/types';

export function useAuthFlow(): UseAuthFlowReturn {
  const router = useRouter();
  const { handleError } = useErrorHandler();

  // State
  const [flowStep, setFlowStep] = useState<FlowStep>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  // Cleanup old AsyncStorage entries on mount
  const cleanupStorage = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('pending_first_name');
      await AsyncStorage.removeItem('pending_last_name');
    } catch (error) {
      // Ignore cleanup errors
    }
  }, []);

  useEffect(() => {
    cleanupStorage();
  }, [cleanupStorage]);

  // Route user after successful authentication
  const routeAfterAuth = useCallback(
    async (meta?: ProfileMeta) => {
      const hasCompletedOnboarding = meta?.has_completed_onboarding ?? false;

      if (hasCompletedOnboarding) {
        router.replace('/');
      } else {
        router.replace('/onboarding');
      }
    },
    [router]
  );

  // Send OTP to email
  const handleSendOTP = useCallback(async () => {
    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid Email', validation.error!);
      return;
    }

    // Show suggestion if common typo detected
    if (validation.suggestion) {
      Alert.alert('Check your email', validation.suggestion);
      // Continue anyway, just warn the user
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), OTP_TIMEOUT_MS)
      );

      // Send OTP code - Supabase handles both signup and signin automatically
      const otpPromise = supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true, // Allow automatic signup
        },
      });

      const { error } = (await Promise.race([otpPromise, timeoutPromise])) as any;

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', error.message);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFlowStep('otp');
      Alert.alert('Code sent!', SUCCESS_MESSAGES.OTP_SENT);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await handleError(error, {
        operation: ERROR_OPERATIONS.SEND_OTP,
        component: ERROR_COMPONENT,
        metadata: { email: email.trim() },
      });
    } finally {
      setLoading(false);
    }
  }, [email, handleError]);

  // Verify OTP code
  const handleVerifyOTP = useCallback(async () => {
    // Validate OTP
    const validation = validateOTP(otpCode);
    if (!validation.valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Error', validation.error!);
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
          operation: ERROR_OPERATIONS.VERIFY_OTP,
          component: ERROR_COMPONENT,
          metadata: { email: email.trim() },
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
        const hasValidFirstName =
          profile?.first_name &&
          profile.first_name.trim() !== '' &&
          !profile.first_name.includes('@');
        const hasValidLastName = profile?.last_name && profile.last_name.trim() !== '';

        if (hasValidFirstName && hasValidLastName) {
          // Names exist - route to appropriate screen
          await routeAfterAuth(profile.meta as ProfileMeta);
        } else {
          // Names missing - show name collection screen
          setFlowStep('names');
        }
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await handleError(error, {
        operation: ERROR_OPERATIONS.VERIFY_OTP,
        component: ERROR_COMPONENT,
        metadata: { email: email.trim() },
      });
    } finally {
      setLoading(false);
    }
  }, [email, otpCode, handleError, routeAfterAuth]);

  // Save user names
  const handleSaveNames = useCallback(async () => {
    // Validate first name
    const firstNameValidation = validateName(firstName, 'first');
    if (!firstNameValidation.valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid Name', firstNameValidation.error!);
      return;
    }

    // Validate last name
    const lastNameValidation = validateName(lastName, 'last');
    if (!lastNameValidation.valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid Name', lastNameValidation.error!);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
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
          operation: ERROR_OPERATIONS.SAVE_NAMES,
          component: ERROR_COMPONENT,
          metadata: { userId: user.id },
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

      await routeAfterAuth(profile?.meta as ProfileMeta);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await handleError(error, {
        operation: ERROR_OPERATIONS.SAVE_NAMES,
        component: ERROR_COMPONENT,
        metadata: {},
      });
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, handleError, routeAfterAuth]);

  // Handle social login (Google/Apple)
  const handleSocialLogin = useCallback(
    async (provider: 'google' | 'apple') => {
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
            operation: ERROR_OPERATIONS.SOCIAL_LOGIN,
            component: ERROR_COMPONENT,
            metadata: { provider },
          });
          return;
        }

        // OAuth will redirect, handled by callback
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await handleError(error, {
          operation: ERROR_OPERATIONS.SOCIAL_LOGIN,
          component: ERROR_COMPONENT,
          metadata: { provider },
        });
      }
    },
    [handleError]
  );

  // Reset flow to email step
  const resetToEmail = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlowStep('email');
    setOtpCode('');
    setFirstName('');
    setLastName('');
  }, []);

  return {
    // State
    flowStep,
    email,
    otpCode,
    firstName,
    lastName,
    loading,
    // Setters
    setEmail,
    setOtpCode,
    setFirstName,
    setLastName,
    // Actions
    handleSendOTP,
    handleVerifyOTP,
    handleSaveNames,
    handleSocialLogin,
    resetToEmail,
    cleanupStorage,
  };
}
