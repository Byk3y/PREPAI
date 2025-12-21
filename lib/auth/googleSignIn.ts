/**
 * Google Sign-In Service
 * Uses OAuth flow with expo-web-browser (works in Expo Go)
 * For native sign-in (development builds), use @react-native-google-signin/google-signin
 */

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { validateTokens } from '@/lib/auth/tokenValidator';
import { OAuthConfig } from '@/lib/auth/config';

// Complete auth session when browser redirects back to app
WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with Google using OAuth flow
 * Works in Expo Go and development builds
 * Returns the Supabase session on success
 */
export async function signInWithGoogle(): Promise<{ session: any; user: any }> {
  try {
    // Use centralized OAuth config for consistent redirect URI across all auth flows
    const redirectTo = OAuthConfig.redirectUri;

    if (__DEV__) {
      console.log('[Google Sign-In] Using redirect URI:', redirectTo);
    }

    // Start OAuth flow with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true, // We'll handle the browser ourselves
      },
    });

    if (error) {
      throw error;
    }

    if (!data.url) {
      throw new Error('No OAuth URL received from Supabase');
    }

    // Open browser for OAuth flow
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo,
      {
        showInRecents: true,
      }
    );

    if (result.type === 'success') {
      // Parse the callback URL
      const url = result.url;

      if (__DEV__) {
        // Log only metadata, never token values (security)
        const urlObj = new URL(url);
        console.log('[Google Sign-In] Callback received:', {
          scheme: urlObj.protocol,
          host: urlObj.host,
          path: urlObj.pathname,
          hasFragment: urlObj.hash.length > 0,
          hasQueryParams: urlObj.search.length > 0,
        });
      }

      // Extract the URL fragment (contains tokens)
      // OAuth callbacks typically use hash fragments: #access_token=...&refresh_token=...
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      
      try {
        const urlObj = new URL(url);
        const fragment = urlObj.hash.substring(1); // Remove the '#'
        if (fragment) {
          const params = new URLSearchParams(fragment);
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
        }
        
        // Fallback: also check query params (some OAuth flows use these)
        if (!accessToken || !refreshToken) {
          const queryParams = urlObj.searchParams;
          accessToken = accessToken || queryParams.get('access_token');
          refreshToken = refreshToken || queryParams.get('refresh_token');
        }
      } catch (urlError) {
        // URL parsing failed - try regex fallback
        if (__DEV__) {
          console.warn('[Google Sign-In] URL parsing failed, trying regex fallback:', urlError);
        }
        const hashMatch = url.match(/#access_token=([^&]+).*refresh_token=([^&]+)/);
        if (hashMatch) {
          accessToken = decodeURIComponent(hashMatch[1]);
          refreshToken = decodeURIComponent(hashMatch[2]);
        }
      }

      if (accessToken && refreshToken) {
        // Validate tokens before using them (security - prevents injection attacks)
        const validation = validateTokens(accessToken, refreshToken);
        if (!validation.isValid) {
          if (__DEV__) {
            console.error('[Google Sign-In] Token validation failed:', validation.error);
          }
          throw new Error(`Invalid tokens received: ${validation.error}`);
        }

        if (__DEV__) {
          console.log('[Google Sign-In] Tokens validated, setting session...');
        }

        // Set the session with the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          if (__DEV__) {
            console.error('[Google Sign-In] Session error:', sessionError);
          }
          throw sessionError;
        }

        if (!sessionData.session || !sessionData.user) {
          if (__DEV__) {
            console.error('[Google Sign-In] No session or user in response:', sessionData);
          }
          throw new Error('Failed to create Supabase session');
        }

        if (__DEV__) {
          console.log('[Google Sign-In] Session created successfully for user:', sessionData.user.email);
        }

        return {
          session: sessionData.session,
          user: sessionData.user,
        };
      } else {
        if (__DEV__) {
          // Log only metadata, never the URL itself (security)
          const urlObj = new URL(url);
          console.error('[Google Sign-In] No tokens found in callback. URL info:', {
            scheme: urlObj.protocol,
            host: urlObj.host,
            path: urlObj.pathname,
            hasFragment: urlObj.hash.length > 0,
            fragmentLength: urlObj.hash.length,
            hasQueryParams: urlObj.search.length > 0,
            queryParamCount: urlObj.searchParams.toString().split('&').length,
          });
        }
        throw new Error('No tokens found in OAuth callback');
      }
    } else if (result.type === 'cancel') {
      throw new Error('Sign in was cancelled');
    } else {
      throw new Error('OAuth flow failed');
    }
  } catch (error: any) {
    // Handle cancellation gracefully
    if (error.message?.includes('cancelled') || error.message?.includes('Sign in was cancelled')) {
      throw new Error('Sign in was cancelled');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Configure Google Sign-In (no-op for OAuth flow, kept for compatibility)
 */
export function configureGoogleSignIn() {
  // No configuration needed for OAuth flow
  // This function is kept for compatibility with native sign-in code
}

