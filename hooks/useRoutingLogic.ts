/**
 * Hook for handling complex routing logic
 * Determines which screen to show based on auth state, onboarding status, and current route
 */

import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { isOnboardingComplete } from '@/lib/auth/onboardingStatus';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

export function useRoutingLogic(fontsLoaded: boolean) {
  const router = useRouter();
  const segments = useSegments();
  const [isRoutingReady, setIsRoutingReady] = useState(false);
  const { handleError } = useErrorHandler();
  const {
    authUser, // Use store's authUser as source of truth (updated by onAuthStateChange)
    hasCompletedOnboarding,
    currentOnboardingScreen,
    setHasCompletedOnboarding,
    _hasHydrated,
    isInitialized, // Wait for auth initialization
  } = useStore();

  useEffect(() => {
    // Wait for fonts, auth initialization, AND store hydration before routing
    if (!fontsLoaded || !_hasHydrated || !isInitialized) {
      if (__DEV__) {
        console.log('Waiting for hydration...', { fontsLoaded, _hasHydrated, isInitialized });
      }
      return;
    }

    // Marking routing ready allows RootLayout to render Stack
    setIsRoutingReady(true);

    // Define route variables for immediate use
    const currentRoute = segments[0];
    const inAuthGroup = currentRoute === 'auth';
    const inOnboardingGroup = currentRoute === 'onboarding';

    // Source of truth for routing branch
    const user = authUser;

    if (!user) {
      // NOT LOGGED IN - Use persisted state for immediate routing
      if (!hasCompletedOnboarding && !inOnboardingGroup && !inAuthGroup) {
        if (__DEV__) console.log('→ Routing to /onboarding (first time)');
        router.replace('/onboarding');
      } else if (hasCompletedOnboarding && !inAuthGroup) {
        if (__DEV__) console.log('→ Routing to /auth (returning user)');
        router.replace('/auth');
      }
    } else {
      // LOGGED IN - Use persisted state for IMMEDIATE render
      if (!hasCompletedOnboarding) {
        if (currentOnboardingScreen >= 3 && currentOnboardingScreen < 9) {
          if (!inOnboardingGroup) {
            if (__DEV__) console.log('→ Routing to /onboarding (persisted resume)');
            router.replace('/onboarding');
          }
        } else if (currentOnboardingScreen === 0 && (inAuthGroup || inOnboardingGroup)) {
          if (__DEV__) console.log('→ Routing to /onboarding (persisted new user)');
          router.replace('/onboarding');
        }
      } else if (inAuthGroup || inOnboardingGroup) {
        // User logged in and onboarding complete - go home
        if (__DEV__) console.log('→ Routing to / (persisted complete)');
        router.replace('/');
      }

      // BACKGROUND VERIFICATION - Check database to ensure persisted state isn't stale
      let cancelled = false;

      const verifyRoutingWithDatabase = async () => {
        try {
          const { userService } = await import('@/lib/services/userService');
          if (cancelled) return;

          const meta = await userService.getProfileMeta(user.id);
          if (cancelled || !meta) return;

          const dbHasCompletedOnboarding = isOnboardingComplete(meta);

          if (dbHasCompletedOnboarding !== hasCompletedOnboarding) {
            if (__DEV__) console.log('→ DB Sync: hasCompletedOnboarding changed to', dbHasCompletedOnboarding);
            setHasCompletedOnboarding(dbHasCompletedOnboarding);
          }
        } catch (error) {
          if (__DEV__) console.warn('Failed to verify routing with database:', error);
        }
      };

      verifyRoutingWithDatabase();

      return () => {
        cancelled = true;
      };
    }
  }, [segments, fontsLoaded, hasCompletedOnboarding, currentOnboardingScreen, _hasHydrated, isInitialized, authUser, router, setHasCompletedOnboarding]);

  return isRoutingReady;
}





