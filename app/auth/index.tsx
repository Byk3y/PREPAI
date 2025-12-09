/**
 * Auth Landing Screen
 * Provides options for magic link and social logins
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const router = useRouter();

  const handleMagicLink = () => {
    router.push('/auth/magic-link');
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/callback`,
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // OAuth will redirect, handled by callback
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <View className="flex-1 items-center justify-center px-6">
        <Text
          style={{ fontFamily: 'Nunito-Bold' }}
          className="text-4xl text-neutral-900 dark:text-neutral-50 mb-2"
        >
          PrepAI
        </Text>
        <Text className="text-lg text-neutral-600 dark:text-neutral-400 mb-12 text-center">
          Sign in to continue your learning journey
        </Text>

        {/* Magic Link Button */}
        <TouchableOpacity
          onPress={handleMagicLink}
          className="w-full bg-primary-500 rounded-2xl py-4 mb-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold">
            Continue with Email
          </Text>
        </TouchableOpacity>

        {/* Social Login Buttons */}
        <TouchableOpacity
          onPress={() => handleSocialLogin('google')}
          className="w-full bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl py-4 mb-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-neutral-900 dark:text-neutral-50 text-lg font-semibold">
            Continue with Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSocialLogin('apple')}
          className="w-full bg-black dark:bg-white rounded-2xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white dark:text-black text-lg font-semibold">
            Continue with Apple
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

