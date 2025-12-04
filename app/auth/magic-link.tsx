/**
 * OTP Email Authentication Screen
 * Simple OTP flow - no deep linking needed!
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function MagicLinkScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      );

      // Send OTP code (no redirect needed!)
      const otpPromise = supabase.auth.signInWithOtp({
        email: email.trim(),
      });

      const { error } = await Promise.race([otpPromise, timeoutPromise]) as any;

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setCodeSent(true);
      Alert.alert('Code sent!', 'Check your email for a verification code.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send code. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      Alert.alert('Error', 'Please enter the code from your email');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (data.session) {
        // Successfully authenticated - router will handle navigation
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-12">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-8"
          >
            <Text className="text-neutral-600 text-lg">← Back</Text>
          </TouchableOpacity>

          <Text
            style={{ fontFamily: 'SpaceGrotesk-Bold' }}
            className="text-3xl text-neutral-900 mb-4"
          >
            {codeSent ? 'Enter Code' : 'Sign in with Email'}
          </Text>
          <Text className="text-neutral-600 mb-8">
            {codeSent
              ? `Enter the code sent to ${email}`
              : "Enter your email address and we'll send you a code to sign in."}
          </Text>

          {!codeSent ? (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="bg-white border-2 border-neutral-200 rounded-2xl px-4 py-4 text-lg mb-6"
                editable={!loading}
              />

              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={loading}
                className="w-full bg-primary-500 rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white text-lg font-semibold">
                  {loading ? 'Sending...' : 'Send Code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                className="mt-4 items-center"
              >
                <Text className="text-neutral-600">Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="12345678"
                keyboardType="number-pad"
                maxLength={8}
                className="bg-white border-2 border-neutral-200 rounded-2xl px-4 py-4 text-lg mb-6 text-center text-2xl font-bold tracking-widest"
                editable={!loading}
                autoFocus
              />

              <TouchableOpacity
                onPress={handleVerifyOTP}
                disabled={loading || otpCode.length < 6}
                className="w-full bg-primary-500 rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white text-lg font-semibold">
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setCodeSent(false);
                  setOtpCode('');
                }}
                className="mt-4 items-center"
              >
                <Text className="text-neutral-600">Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

