/**
 * Hook for analytics tracking on home screen
 * Handles debounced user properties updates
 */

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { setUserProperties } from '@/lib/services/analyticsService';

/**
 * Hook to track user properties updates (debounced)
 * Updates notebooks count and streak days when they change
 */
export function useHomeAnalytics() {
  const { authUser, isInitialized, notebooks, user } = useStore();

  useEffect(() => {
    if (!authUser || !isInitialized) return;

    // Debounce updates to reduce API calls
    const timer = setTimeout(() => {
      setUserProperties({
        notebooks_count: notebooks.length,
        streak_days: user.streak || 0,
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [authUser, isInitialized, notebooks.length, user.streak]);
}







