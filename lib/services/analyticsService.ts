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

import Mixpanel from 'mixpanel-react-native';
import Constants from 'expo-constants';

let mixpanelInstance: Mixpanel | null = null;
let isInitialized = false;

/**
 * Initialize Mixpanel with project token
 * Should be called as early as possible, before React renders
 * Uses static init method which is the recommended approach for React Native/Expo
 */
export function initMixpanel() {
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
  Mixpanel.init(token, true) // true = trackAutomaticEvents
    .then((instance) => {
      mixpanelInstance = instance;
      isInitialized = true;
      
      if (__DEV__) {
        console.log('[Mixpanel] Initialized successfully');
      }
    })
    .catch((error) => {
      console.error('[Mixpanel] Initialization error:', error);
      // Don't crash the app if Mixpanel fails to initialize
      mixpanelInstance = null;
      isInitialized = false;
    });
}

/**
 * Track an event with optional properties
 */
export function track(event: string, properties?: Record<string, any>): void {
  if (!isInitialized || !mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Track (not initialized):', event, properties);
    }
    return;
  }

  try {
    // Don't track in development mode (or use Mixpanel's dev mode)
    // Uncomment the line below if you want to track in dev mode
    // if (__DEV__) return;

    mixpanelInstance.track(event, properties);
    
    if (__DEV__) {
      console.log('[Mixpanel] Track:', event, properties);
    }
  } catch (error) {
    console.error('[Mixpanel] Track error:', error);
    // Don't crash the app if tracking fails
  }
}

/**
 * Identify a user (set user ID)
 * Call this when user logs in
 */
export function identify(userId: string): void {
  if (!isInitialized || !mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Identify (not initialized):', userId);
    }
    return;
  }

  try {
    // identify() is async but we don't need to await it
    mixpanelInstance.identify(userId).catch((error) => {
      console.error('[Mixpanel] Identify error:', error);
    });
    
    if (__DEV__) {
      console.log('[Mixpanel] Identify:', userId);
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
  if (!isInitialized || !mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Set user properties (not initialized):', properties);
    }
    return;
  }

  try {
    mixpanelInstance.getPeople().set(properties);
    
    if (__DEV__) {
      console.log('[Mixpanel] Set user properties:', properties);
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
  if (!isInitialized || !mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Set super properties (not initialized):', properties);
    }
    return;
  }

  try {
    mixpanelInstance.registerSuperProperties(properties);
    
    if (__DEV__) {
      console.log('[Mixpanel] Set super properties:', properties);
    }
  } catch (error) {
    console.error('[Mixpanel] Set super properties error:', error);
  }
}

/**
 * Clear user data (call on logout)
 */
export function clearUser(): void {
  if (!isInitialized || !mixpanelInstance) {
    if (__DEV__) {
      console.log('[Mixpanel] Clear user (not initialized)');
    }
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

