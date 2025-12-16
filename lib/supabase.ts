/**
 * Supabase client configuration
 * 
 * Setup instructions:
 * 1. Create a .env file in the root directory
 * 2. Add your Supabase URL and anon key:
 *    EXPO_PUBLIC_SUPABASE_URL=your-project-url
 *    EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * 3. Get these values from: https://app.supabase.com/project/_/settings/api
 * 4. Restart your Expo dev server after creating/updating .env
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

/**
 * Hybrid storage adapter to handle SecureStore's 2048 byte limit
 * 
 * Strategy:
 * - Full session stored in AsyncStorage (can handle large values)
 * - Refresh token stored in SecureStore as backup (small, critical)
 * 
 * This prevents the "Value being stored in SecureStore is larger than 2048 bytes" warning
 * while maintaining security for the critical refresh token.
 */
const HybridStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Try AsyncStorage first (primary storage for full session)
      const value = await AsyncStorage.getItem(key);
      if (value) {
        return value;
      }
      
      // Migration: Check if old session exists in SecureStore (from before hybrid adapter)
      // This handles the transition from old SecureStore-only storage
      try {
        const oldSession = await SecureStore.getItemAsync(key);
        if (oldSession) {
          // Migrate old session to AsyncStorage for future use
          await AsyncStorage.setItem(key, oldSession);
          
          // Extract and store refresh_token separately
          try {
            const session = JSON.parse(oldSession);
            if (session?.refresh_token) {
              const refreshTokenKey = `${key}_refresh_token`;
              await SecureStore.setItemAsync(refreshTokenKey, session.refresh_token);
            }
          } catch (parseError) {
            // If parsing fails, still return the old session
            console.warn(`Could not parse old session for migration:`, parseError);
          }
          
          return oldSession;
        }
      } catch (secureStoreError) {
        // SecureStore might fail if key doesn't exist, that's okay
        // Continue to check refresh token fallback
      }
      
      // Fallback: If AsyncStorage is empty, try to reconstruct from SecureStore refresh token
      // This handles edge cases where only refresh_token was stored
      const refreshTokenKey = `${key}_refresh_token`;
      const refreshToken = await SecureStore.getItemAsync(refreshTokenKey);
      
      if (refreshToken) {
        // If we only have refresh token, return null to let Supabase handle re-authentication
        // The refresh token alone isn't enough to reconstruct a full session
        console.warn(`Found refresh token in SecureStore but no session in AsyncStorage for key: ${key}`);
        return null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting item from storage (key: ${key}):`, error);
      return null;
    }
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      // Store full session in AsyncStorage (can handle large values)
      await AsyncStorage.setItem(key, value);
      
      // Extract and store refresh_token in SecureStore as backup (small, critical)
      try {
        const session = JSON.parse(value);
        if (session?.refresh_token) {
          const refreshTokenKey = `${key}_refresh_token`;
          // Refresh token is typically < 200 bytes, well under 2048 limit
          await SecureStore.setItemAsync(refreshTokenKey, session.refresh_token);
        }
      } catch (parseError) {
        // If value isn't valid JSON, skip refresh token extraction
        // This shouldn't happen with Supabase sessions, but handle gracefully
        console.warn(`Could not parse session JSON for refresh token extraction:`, parseError);
      }
    } catch (error) {
      console.error(`Error setting item in storage (key: ${key}):`, error);
      throw error;
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    try {
      // Remove from both storage locations
      await AsyncStorage.removeItem(key);
      const refreshTokenKey = `${key}_refresh_token`;
      await SecureStore.deleteItemAsync(refreshTokenKey).catch(() => {
        // Ignore errors if refresh token key doesn't exist
      });
    } catch (error) {
      console.error(`Error removing item from storage (key: ${key}):`, error);
      throw error;
    }
  },
};

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file. See lib/supabase.ts for setup instructions.'
  );
}

// Create Supabase client with hybrid storage for auth tokens
// Uses AsyncStorage for full session (handles large values) + SecureStore for refresh token backup
// Typed with generated Database types for full type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: HybridStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
  },
});

// Re-export Database type for convenience
export type { Database };



