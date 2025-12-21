/**
 * Hook for setting up Supabase auth state subscription
 * Handles user authentication state changes and loads user data
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { identify, clearUser } from '@/lib/services/analyticsService';

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

          // Hydrate from cache immediately for instant UI response
          hydratePetStateFromCache();
          hydrateUserProfileFromCache();

          // Mark initialization as complete as soon as we have local hydration ready
          if (mounted) {
            setIsInitialized(true);
          }

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
            if (meta?.has_created_notebook) {
              setHasCreatedNotebook(true);
            } else {
              setHasCreatedNotebook(false);
            }

            // Load onboarding completion flag
            const hasCompleted = meta?.has_completed_onboarding ?? false;
            setHasCompletedOnboarding(hasCompleted);
          }
        } catch (error) {
          // Error already handled by centralized system
          if (mounted) setIsInitialized(true); // Ensure initialization happens even on error
        }
      } else {
        // Logged out
        if (wasLoggedIn && !isNowLoggedIn) {
          const { resetPetState, resetUserProfile } = useStore.getState();
          resetPetState();
          resetUserProfile();
          clearUser();
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





