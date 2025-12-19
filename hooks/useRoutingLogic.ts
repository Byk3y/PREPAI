/**
 * Hook for handling complex routing logic
 * Determines which screen to show based on auth state, onboarding status, and current route
 */

import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';

export function useRoutingLogic(fontsLoaded: boolean) {
  const router = useRouter();
  const segments = useSegments();
  const [isRoutingReady, setIsRoutingReady] = useState(false);
  const {
    hasCompletedOnboarding,
    currentOnboardingScreen,
    setHasCompletedOnboarding,
    _hasHydrated,
  } = useStore();

  useEffect(() => {
    // Wait for fonts, auth initialization, AND store hydration before routing
    // This prevents race conditions between persisted state loading and routing
    if (!fontsLoaded || !_hasHydrated) {
      if (__DEV__) {
        console.log('Waiting for hydration...', { fontsLoaded, _hasHydrated });
      }
      return;
    }

    // Define route variables before promise chain so they're in scope for catch block
    const currentRoute = segments[0];
    const inAuthGroup = currentRoute === 'auth';
    const inOnboardingGroup = currentRoute === 'onboarding';

    if (__DEV__) {
      console.log('Navigation check:', {
        currentRoute,
        hasCompletedOnboarding,
        currentOnboardingScreen,
        inOnboardingGroup,
        inAuthGroup,
      });
    }

    supabase.auth.getUser()
      .then(async ({ data: { user } }) => {
        // Mark routing as ready after first check completes
        setIsRoutingReady(true);
        // Route priority:
        // 1. No user + !hasCompletedOnboarding → /onboarding
        // 2. No user + hasCompletedOnboarding → /auth
        // 3. Has user + incomplete onboarding (currentOnboardingScreen 3-8) → /onboarding
        // 4. Has user + (in auth OR in onboarding) → / (home)
        // 5. Has user + other route → stay on route

        if (!user) {
          // Not logged in
          if (!hasCompletedOnboarding && !inOnboardingGroup && !inAuthGroup) {
            // First time - show onboarding (but not if they're actively trying to authenticate)
            if (__DEV__) {
              console.log('→ Routing to /onboarding (first time)');
            }
            router.replace('/onboarding');
          } else if (hasCompletedOnboarding && !inAuthGroup) {
            // Returning, no account - show auth
            if (__DEV__) {
              console.log('→ Routing to /auth (returning user)');
            }
            router.replace('/auth');
          } else if (inAuthGroup) {
            // User is on auth page trying to authenticate - let them stay there
            if (__DEV__) {
              console.log('→ Staying on /auth (user authenticating)');
            }
          }
        } else {
          // Logged in - CHECK DATABASE FIRST to avoid race condition with persisted store
          // This ensures we use the source of truth (database) not stale persisted state
          try {
            const { userService } = await import('@/lib/services/userService');
            const meta = await userService.getProfileMeta(user.id);

            if (meta !== null) {
              // Update store with database value to keep it in sync
              const dbHasCompletedOnboarding = meta.has_completed_onboarding === true;
              if (dbHasCompletedOnboarding !== hasCompletedOnboarding) {
                setHasCompletedOnboarding(dbHasCompletedOnboarding);
                if (__DEV__) {
                  console.log('Updated hasCompletedOnboarding from database:', dbHasCompletedOnboarding);
                }
              }

              // Use database value for routing decisions
              const shouldShowOnboarding = !dbHasCompletedOnboarding && 
                (currentOnboardingScreen >= 3 && currentOnboardingScreen < 9);

              if (shouldShowOnboarding) {
                // Mid-onboarding - send back to onboarding to complete screens 3-8 (after auth break)
                if (!inOnboardingGroup) {
                  if (__DEV__) {
                    console.log('→ Routing to /onboarding (resume at screen', currentOnboardingScreen, ')');
                  }
                  router.replace('/onboarding');
                  return;
                } else {
                  if (__DEV__) {
                    console.log('→ Staying on /onboarding (already there)');
                  }
                  return;
                }
              } else if (inAuthGroup || inOnboardingGroup) {
                // Onboarding complete (from database), redirect to home from auth/onboarding routes
                if (__DEV__) {
                  console.log('→ Routing to / (onboarding complete per database)');
                }
                router.replace('/');
                return;
              }
              // Otherwise stay on current route (for deep links, etc.)
              return;
            }
          } catch (error) {
            // Error already handled by centralized system
            // Fall through to use persisted store state
          }

          // Fallback: Use persisted store state if database check failed
          if (currentOnboardingScreen >= 3 && currentOnboardingScreen < 9) {
            // Mid-onboarding - send back to onboarding to complete screens 3-8 (after auth break)
            if (!inOnboardingGroup) {
              if (__DEV__) {
                console.log('→ Routing to /onboarding (resume at screen', currentOnboardingScreen, ') - using persisted state');
              }
              router.replace('/onboarding');
            } else {
              if (__DEV__) {
                console.log('→ Staying on /onboarding (already there)');
              }
            }
          } else if (inAuthGroup || inOnboardingGroup) {
            // Onboarding complete, redirect to home from auth/onboarding routes
            if (__DEV__) {
              console.log('→ Routing to / (onboarding complete per persisted state)');
            }
            router.replace('/');
          }
          // Otherwise stay on current route (for deep links, etc.)
        }
      })
      .catch((error) => {
        // Error already handled by centralized system
        // Mark routing as ready even on error
        setIsRoutingReady(true);
        // On error, safe fallback to onboarding (safest option)
        if (!inOnboardingGroup && !inAuthGroup) {
          router.replace('/onboarding');
        }
      });
  }, [segments, fontsLoaded, hasCompletedOnboarding, currentOnboardingScreen, _hasHydrated, router, setHasCompletedOnboarding]);

  return isRoutingReady;
}




