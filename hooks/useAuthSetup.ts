/**
 * Hook for setting up Supabase auth state subscription
 * Handles user authentication state changes and loads user data
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { identify, clearUser, track, setUserProperties } from '@/lib/services/analyticsService';
import { identifyPurchaser, logoutPurchaser } from '@/lib/purchases';
import { isOnboardingComplete } from '@/lib/auth/onboardingStatus';

export function useAuthSetup() {
  const {
    setAuthUser,
    setHasCreatedNotebook,
    setIsInitialized,
    loadNotebooks,
    loadPetState,
    hydratePetStateFromCache,
    setHasCompletedOnboarding,
    loadUserProfile,
    loadSubscription,
  } = useStore();

  useEffect(() => {
    // Single source of truth for auth state and initialization
    // This prevents race conditions between getUser() and onAuthStateChange
    let mounted = true;

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Auth state changed - handled silently

      if (!mounted) return;

      const currentAuthUser = useStore.getState().authUser;
      const newUserId = session?.user?.id;
      const userIdChanged = currentAuthUser?.id !== newUserId;
      const wasLoggedIn = !!currentAuthUser;
      const isNowLoggedIn = !!session?.user;

      setAuthUser(session?.user ?? null);

      if (session?.user) {
        // Reset initialization flag when auth state changes
        // This prevents routing logic from running with stale user data
        // Will be set back to true after data fetch completes
        if (userIdChanged || event === 'SIGNED_IN') {
          if (__DEV__) console.log('[Auth] Resetting isInitialized to false, fetching user data...');
          setIsInitialized(false);
        }

        try {
          const {
            resetPetState,
            clearPetCache,
            hydratePetStateFromCache,
            resetUserProfile,
            hydrateUserProfileFromCache,
            cachedPetUserId,
            userProfileUserId
          } = useStore.getState();

          // Identify user in Mixpanel (only on new sign-in or user change)
          if (userIdChanged || event === 'SIGNED_IN') {
            identify(session.user.id);

            // Track sign in event
            track('user_signed_in', {
              auth_event: event,
            });

            // Run RevenueCat login in background - don't block auth flow
            // The subscription check will use database tier initially
            identifyPurchaser(session.user.id).catch((err) => {
              if (__DEV__) console.warn('[RevenueCat] Background login error:', err);
            });
          }

          // Logic for state clearing/preservation on login:
          // 1. If user ID actually changed (different person), clear EVERYTHING including cache
          if (userIdChanged && currentAuthUser) {
            clearPetCache();
            resetPetState();
            resetUserProfile();
          }
          // 2. If it's a new login (was null), just reset active UI but KEEP cache for hydration
          else if (userIdChanged || event === 'SIGNED_IN') {
            resetPetState();
            resetUserProfile();
          }

          // HYDRATION: Hydrate from cache immediately for instant UI response
          hydratePetStateFromCache();
          hydrateUserProfileFromCache();

          // Fetch all user data in parallel in the background
          const [profileResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, name, streak, avatar_url, meta')
              .eq('id', session.user.id)
              .single(),
            loadUserProfile(),
            loadSubscription(session.user.id),
            loadNotebooks(session.user.id),
            loadPetState(),
          ]);

          const profile = profileResult?.data;
          const meta = profile?.meta as any;

          if (mounted) {
            // CORRECT: Use centralized helper that handles legacy 'has_created_notebook' logic
            const hasCompleted = isOnboardingComplete(meta);
            setHasCompletedOnboarding(hasCompleted);

            // Sync rich user properties to Mixpanel for segmentation
            const storeState = useStore.getState() as any;
            const { notebooks, petState, user } = storeState;
            const subscriptionData = storeState.subscriptionData; // May not exist
            const createdAt = session.user.created_at;
            const daysSinceSignup = createdAt
              ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            setUserProperties({
              // Subscription & monetization
              subscription_tier: subscriptionData?.tier || 'free',
              is_trial: subscriptionData?.is_trial || false,
              // Engagement metrics
              streak: user?.streak || 0,
              total_notebooks: notebooks?.length || 0,
              pet_stage: petState?.stage || 1,
              pet_points: petState?.points || 0,
              // Lifecycle
              days_since_signup: daysSinceSignup,
              onboarding_completed: hasCompleted,
              // Profile
              education_level: meta?.education_level,
              learning_style: meta?.learning_style,
            });

            if (__DEV__) console.log('[Auth] User data fetched, setting isInitialized to true', { hasCompleted });

            // Mark initialization as complete ONLY after we have correct onboarding status
            setIsInitialized(true);
          }
        } catch (error) {
          // Error already handled by centralized system
          if (__DEV__) console.log('[Auth] Error fetching user data, setting isInitialized to true anyway', error);
          if (mounted) setIsInitialized(true); // Ensure initialization happens even on error
        }
      } else {
        // Logged out
        if (wasLoggedIn && !isNowLoggedIn) {
          // Track sign out
          track('user_signed_out', {});

          const { resetPetState, resetUserProfile } = useStore.getState();
          resetPetState();
          resetUserProfile();
          clearUser();
          logoutPurchaser();
        }

        // Mark initialization complete for non-auth state
        if (mounted) {
          setIsInitialized(true);
        }
      }
    });

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, [
    setAuthUser,
    setHasCreatedNotebook,
    setIsInitialized,
    loadNotebooks,
    loadPetState,
    hydratePetStateFromCache,
    setHasCompletedOnboarding,
    loadUserProfile,
    loadSubscription,
  ]);
}





