/**
 * Auth Callback Handler
 * Handles OAuth and magic link callbacks
 */

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle deep link URL if app was opened via magic link
        const url = await Linking.getInitialURL();
        if (url) {
          const parsed = Linking.parse(url);
          console.log('Deep link URL:', url);
          console.log('Parsed URL:', parsed);
          
          // Extract tokens from query params or hash
          const queryParams = parsed.queryParams || {};
          const accessToken = (queryParams.access_token || params.access_token) as string | undefined;
          const refreshToken = (queryParams.refresh_token || params.refresh_token) as string | undefined;

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Auth callback error:', error);
              router.replace('/auth');
              return;
            }
          }
        } else {
          // Handle OAuth and magic link callbacks from params
          const accessToken = params.access_token as string | undefined;
          const refreshToken = params.refresh_token as string | undefined;

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Auth callback error:', error);
              router.replace('/auth');
              return;
            }
          }
        }

        // Check if user is authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Redirect to home
          router.replace('/');
        } else {
          router.replace('/auth');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth');
      }
    };

    handleAuthCallback();
  }, [params]);

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50">
      <ActivityIndicator size="large" color="#FFCB3C" />
      <Text className="mt-4 text-neutral-600">Completing sign in...</Text>
    </View>
  );
}

