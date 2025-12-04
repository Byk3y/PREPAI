/**
 * useAppState Hook
 * Monitors React Native app lifecycle (foreground/background/inactive)
 * Provides callbacks for state transitions
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface AppStateCallbacks {
  onForeground?: () => void;
  onBackground?: () => void;
  onInactive?: () => void;
}

/**
 * Hook to monitor app state and trigger callbacks on transitions
 *
 * @param callbacks - Optional callbacks for state transitions
 * @returns Current app state information
 *
 * @example
 * ```typescript
 * const { isActive } = useAppState({
 *   onForeground: () => console.log('App came to foreground'),
 *   onBackground: () => console.log('App went to background'),
 * });
 * ```
 */
export const useAppState = (callbacks?: AppStateCallbacks) => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextAppState;
      setAppState(nextAppState);

      // Detect transition to foreground (active)
      if (previous.match(/inactive|background/) && nextAppState === 'active') {
        callbacks?.onForeground?.();
      }
      // Detect transition to background
      else if (previous === 'active' && nextAppState.match(/inactive|background/)) {
        callbacks?.onBackground?.();
      }
      // Detect inactive state
      else if (nextAppState === 'inactive') {
        callbacks?.onInactive?.();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [callbacks]);

  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background',
    isInactive: appState === 'inactive',
  };
};
