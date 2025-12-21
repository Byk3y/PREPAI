/**
 * Centralized Authentication Configuration
 * Single source of truth for OAuth redirect URIs and auth-related constants
 */

import Constants from 'expo-constants';

/**
 * Gets the OAuth redirect URI for the current environment
 * Uses the app's deep link scheme configured in app.json
 *
 * @returns The redirect URI for OAuth callbacks (e.g., "brigo://auth/callback")
 */
export function getOAuthRedirectUri(): string {
  // Get scheme from app.json config (defaults to 'brigo' if not set)
  const scheme = Constants.expoConfig?.scheme || 'brigo';
  return `${scheme}://auth/callback`;
}

/**
 * OAuth Provider Configuration
 * Defines settings for each OAuth provider (Google, Apple, etc.)
 */
export const OAuthConfig = {
  /** Common redirect URI used by all OAuth providers */
  redirectUri: getOAuthRedirectUri(),

  /** Provider-specific settings */
  providers: {
    google: {
      // Google-specific OAuth settings can be added here
      scopes: ['openid', 'email', 'profile'],
    },
    apple: {
      // Apple-specific OAuth settings can be added here
      scopes: ['email', 'name'],
    },
  },
} as const;

/**
 * Authentication Constants
 * Shared constants for auth-related operations
 */
export const AuthConstants = {
  /** Maximum retry attempts for auth operations */
  maxRetries: 3,

  /** Delay between retries (milliseconds) */
  retryDelayMs: 1000,

  /** Minimum valid token length (characters) */
  minTokenLength: 50,

  /** Maximum valid token length (characters) */
  maxTokenLength: 4000,

  /** Session refresh interval (milliseconds) - 55 minutes */
  sessionRefreshInterval: 55 * 60 * 1000,

  /** Token expiry buffer (milliseconds) - refresh 5 minutes before expiry */
  tokenExpiryBuffer: 5 * 60 * 1000,
} as const;

/**
 * OAuth Error Messages
 * User-friendly error messages for common OAuth errors
 */
export const OAuthErrorMessages = {
  cancelled: 'Sign in was cancelled',
  noTokens: 'No authentication tokens received',
  invalidTokens: 'Invalid authentication tokens received',
  networkError: 'Network error during sign in. Please check your connection.',
  unknownError: 'An unexpected error occurred during sign in',
  sessionError: 'Failed to create authentication session',
} as const;
