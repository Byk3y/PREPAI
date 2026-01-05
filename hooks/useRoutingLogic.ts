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
      return;
    }

    // Define route variables
    const currentRoute = segments[0];
    const inAuthGroup = currentRoute === 'auth';
    const inOnboardingGroup = currentRoute === 'onboarding';
    const user = authUser;

    // 1. Determine redirection path
    let redirectPath: string | null = null;

    if (!user) {
      if (!hasCompletedOnboarding && !inOnboardingGroup && !inAuthGroup) {
        redirectPath = '/onboarding';
      } else if (hasCompletedOnboarding && !inAuthGroup && !inOnboardingGroup) {
        redirectPath = '/auth';
      }
    } else {
      if (!hasCompletedOnboarding) {
        if (!inOnboardingGroup) {
          redirectPath = '/onboarding';
        }
      } else if (inAuthGroup || (inOnboardingGroup && !segments.includes('debug'))) {
        // In 2026, we allow the redirect home even in DEV if they are 100% finished,
        // unless they explicitly added a 'debug' segment to stay there.
        redirectPath = '/';
      }
    }

    // 2. Execute Redirection if needed
    // Skip if we are already on the target path group to avoid flicker and loops
    const isOnTargetPath =
      (redirectPath === '/onboarding' && inOnboardingGroup) ||
      (redirectPath === '/auth' && inAuthGroup) ||
      (redirectPath === '/' && (!inOnboardingGroup && !inAuthGroup));

    if (redirectPath && !isOnTargetPath) {
      if (__DEV__) console.log(`→ Routing Sync: [${currentRoute || 'root'}] to ${redirectPath}`);
      router.replace(redirectPath as any);
      return;
    }

    // 3. Mark Routing Ready
    setIsRoutingReady(true);

    // 4. Background Verification Check (Logged-in only)
    if (user) {
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





