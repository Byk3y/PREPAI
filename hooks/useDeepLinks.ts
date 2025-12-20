/**
 * Hook for handling deep links (magic link callbacks)
 * Processes authentication callbacks from email links
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      const parsed = Linking.parse(url);

      if (parsed.path === 'auth/callback' || parsed.path === '/auth/callback') {
        const queryParams = parsed.queryParams || {};
        const accessToken = queryParams.access_token as string | undefined;
        const refreshToken = queryParams.refresh_token as string | undefined;

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            // Error already handled by centralized system
            router.replace('/auth');
          }
        } else {
          router.push('/auth/callback');
        }
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      linkingSubscription.remove();
    };
  }, [router]);
}






