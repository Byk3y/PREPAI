/**
 * Mixpanel Analytics Service
 * 
 * Centralized analytics service for tracking user events and properties.
 * Similar pattern to Sentry integration - handles initialization, tracking, and user management.
 * 
 * Setup:
 * 1. Add EXPO_PUBLIC_MIXPANEL_TOKEN to .env file
 * 2. Get token from Mixpanel dashboard → Settings → Project Settings
 * 3. Restart Expo dev server after adding token
 */

import Constants from 'expo-constants';

// Safely import Mixpanel - it may not be available if native module isn't linked
let Mixpanel: any = null;
try {
  Mixpanel = require('mixpanel-react-native').default;
} catch (error) {
  if (__DEV__) {
    console.warn('[Mixpanel] Native module not available:', error);
  }
}

let mixpanelInstance: any = null;
let isInitialized = false;

/**
 * Initialize Mixpanel with project token
 * Should be called as early as possible, before React renders
 * Uses static init method which is the recommended approach for React Native/Expo
 */
export function initMixpanel() {
  // Check if Mixpanel module is available
  if (!Mixpanel || typeof Mixpanel.init !== 'function') {
    if (__DEV__) {
      console.warn('[Mixpanel] Native module not available. Skipping initialization.');
    }
    return;
  }

  const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

  // Only initialize if token is provided
  if (!token) {
    if (__DEV__) {
      console.log('[Mixpanel] Token not provided, skipping initialization');
    }
    return;
  }

  // Check if we're in Expo Go (which doesn't support native modules)
  // Mixpanel React Native requires a development build or production build
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  if (isExpoGo) {
    if (__DEV__) {
      console.warn('[Mixpanel] Mixpanel requires a development build. Skipping initialization in Expo Go.');
    }
    return;
  }

  // Use static init method for proper initialization
  // This is the recommended way for React Native/Expo
  // We don't await it since this is called at module load time
  try {
    Mixpanel.init(token, true) // true = trackAutomaticEvents
      .then((instance: any) => {
        mixpanelInstance = instance;
        isInitialized = true;

        if (__DEV__) {
          console.log('[Mixpanel] Initialized successfully');
        }
      })
      .catch((error: any) => {
        console.error('[Mixpanel] Initialization error:', error);
        // Don't crash the app if Mixpanel fails to initialize
        mixpanelInstance = null;
        isInitialized = false;
      });
  } catch (error) {
    console.error('[Mixpanel] Failed to call init:', error);
    // Don't crash the app if Mixpanel fails to initialize
    mixpanelInstance = null;
    isInitialized = false;
  }
}

/**
 * Track an event with optional properties
 */
export function track(event: string, properties?: Record<string, any>): void {
  if (!mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Track (instance not ready):', event, properties);
    }
    return;
  }

  try {
    mixpanelInstance.track(event, properties);

    if (__DEV__) {
      if (!isInitialized) {
        console.log('[Mixpanel] Track (queued, still initializing):', event, properties);
      } else {
        console.log('[Mixpanel] Track:', event, properties);
      }
    }
  } catch (error) {
    console.error('[Mixpanel] Track error:', error);
  }
}

/**
 * Identify a user (set user ID)
 * Call this when user logs in
 */
export function identify(userId: string): void {
  if (!mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Identify (instance not ready):', userId);
    }
    return;
  }

  try {
    mixpanelInstance.identify(userId).catch((error: any) => {
      console.error('[Mixpanel] Identify error:', error);
    });

    if (__DEV__) {
      if (!isInitialized) {
        console.log('[Mixpanel] Identify (queued, still initializing):', userId);
      } else {
        console.log('[Mixpanel] Identify:', userId);
      }
    }
  } catch (error) {
    console.error('[Mixpanel] Identify error:', error);
  }
}

/**
 * Set user properties (persistent properties associated with the user)
 * Call this when user properties change (tier, subscription status, etc.)
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (!mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Set user properties (instance not ready):', properties);
    }
    return;
  }

  try {
    mixpanelInstance.getPeople().set(properties);

    if (__DEV__) {
      if (!isInitialized) {
        console.log('[Mixpanel] Set user properties (queued, still initializing):', properties);
      } else {
        console.log('[Mixpanel] Set user properties:', properties);
      }
    }
  } catch (error) {
    console.error('[Mixpanel] Set user properties error:', error);
  }
}

/**
 * Set super properties (properties included in all events)
 * Useful for common data like tier, is_expired that should be on every event
 */
export function setSuperProperties(properties: Record<string, any>): void {
  if (!mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Set super properties (instance not ready):', properties);
    }
    return;
  }

  try {
    mixpanelInstance.registerSuperProperties(properties);

    if (__DEV__) {
      if (!isInitialized) {
        console.log('[Mixpanel] Set super properties (queued, still initializing):', properties);
      } else {
        console.log('[Mixpanel] Set super properties:', properties);
      }
    }
  } catch (error) {
    console.error('[Mixpanel] Set super properties error:', error);
  }
}

/**
 * Clear user data (call on logout)
 */
export function clearUser(): void {
  if (!mixpanelInstance) {
    return;
  }

  try {
    mixpanelInstance.reset();

    if (__DEV__) {
      console.log('[Mixpanel] User cleared');
    }
  } catch (error) {
    console.error('[Mixpanel] Clear user error:', error);
  }
}

/**
 * Check if Mixpanel is initialized
 */
export function isMixpanelInitialized(): boolean {
  return isInitialized && mixpanelInstance !== null;
}
