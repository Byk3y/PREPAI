import * as AppleAuthentication from 'expo-apple-authentication'
import { supabase } from '@/lib/supabase'

/**
 * Native Apple Sign-In implementation
 * Handles authentication flow and exchanges Apple identity token with Supabase
 *
 * IMPORTANT: Apple only provides user's name on the FIRST sign-in.
 * Subsequent sign-ins will not include name information.
 */

export interface AppleSignInResult {
  data: any | null
  userInfo: {
    email: string | null
    fullName: string | null
  } | null
  canceled?: boolean
}

/**
 * Sign in with Apple using native authentication
 * Returns user data and profile information
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    // 1. Request Apple credentials with native sign-in sheet
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    // 2. Exchange Apple identity token with Supabase
    // This creates or signs in the user on your Supabase backend
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
      nonce: credential.nonce, // Important for security (prevents replay attacks)
    })

    if (error) throw error

    // 3. Extract user info from Apple credential
    // CRITICAL: Apple only provides fullName on FIRST sign-in
    // Store it immediately or it will be lost!
    const userInfo = {
      email: credential.email,
      fullName: credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : null,
    }

    return { data, userInfo }
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return { data: null, userInfo: null, canceled: true }
    }
    throw error
  }
}

/**
 * Check if Apple Authentication is available on this device
 * Returns true for iOS 13+ devices signed into iCloud
 */
export async function isAppleAuthAvailable(): Promise<boolean> {
  return await AppleAuthentication.isAvailableAsync()
}
