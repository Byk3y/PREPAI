/**
 * Hook for handling deep links (magic link callbacks)
 * Processes authentication callbacks from email links
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { validateTokens } from '@/lib/auth/tokenValidator';

export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      const parsed = Linking.parse(url);

      // 1. Handle Activity Deep Links from Widget
      if (parsed.path === 'activity' || parsed.path === '/activity') {
        const queryParams = parsed.queryParams || {};
        const type = queryParams.type as string; // 'podcast' | 'quiz' | 'notebook'
        const id = queryParams.id as string;
        const notebookId = queryParams.notebookId as string;

        console.log(`[Deep Links] Activity route: ${type}, ID: ${id}, Notebook: ${notebookId}`);

        if (type === 'podcast' && id) {
          router.push(`/audio-player/${id}`);
        } else if (type === 'quiz' && id) {
          router.push(`/quiz/${id}`);
        } else if (type === 'notebook' && id) {
          router.push(`/notebook/${id}`);
        }
        return;
      }

      // 2. Handle Home/Fallback
      if (parsed.path === 'home' || parsed.path === '/home') {
        router.replace('/');
        return;
      }

      // 3. Handle Auth Callbacks
      if (parsed.path === 'auth/callback' || parsed.path === '/auth/callback') {
        // OAuth callbacks can have tokens in either:
        // 1. Query params: ?access_token=...&refresh_token=...
        // 2. Hash fragment: #access_token=...&refresh_token=...
        // Check both locations

        const queryParams = parsed.queryParams || {};
        let accessToken = queryParams.access_token as string | undefined;
        let refreshToken = queryParams.refresh_token as string | undefined;

        // If not in query params, check hash fragment
        if (!accessToken || !refreshToken) {
          try {
            const urlObj = new URL(url);
            const fragment = urlObj.hash.substring(1); // Remove the '#'
            if (fragment) {
              const hashParams = new URLSearchParams(fragment);
              accessToken = accessToken || (hashParams.get('access_token') as string | undefined);
              refreshToken = refreshToken || (hashParams.get('refresh_token') as string | undefined);
            }
          } catch (e) {
            // URL parsing failed, try alternative method
            const hashMatch = url.match(/#access_token=([^&]+).*refresh_token=([^&]+)/);
            if (hashMatch) {
              accessToken = accessToken || decodeURIComponent(hashMatch[1]);
              refreshToken = refreshToken || decodeURIComponent(hashMatch[2]);
            }
          }
        }

        if (accessToken && refreshToken) {
          // Validate tokens before using them (security - prevents injection attacks)
          const validation = validateTokens(accessToken, refreshToken);
          if (!validation.isValid) {
            console.error('[Deep Links] Token validation failed:', validation.error);
            router.replace('/auth');
            return;
          }

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            // Error already handled by centralized system
            router.replace('/auth');
          }
        } else {
          // No tokens found - let the callback screen handle it
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
  }, [router]); // router dependency ensures handleDeepLink closure always has current router
}











