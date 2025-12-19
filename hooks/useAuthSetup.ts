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

      setAuthUser(session?.user ?? null);

      if (session?.user) {
        try {
          // Identify user in Mixpanel (only on new sign-in or user change)
          if (userIdChanged || event === 'SIGNED_IN') {
            identify(session.user.id);
          }
          
          // Only reset pet state if user actually changed or it's a new sign-in
          // This prevents:
          // 1. Flash of default name on token refresh (TOKEN_REFRESHED event with same user)
          // 2. Cross-user contamination when switching accounts
          // 3. Ensures fresh data on new sign-in
          const { resetPetState, loadPetState } = useStore.getState();
          if (userIdChanged || event === 'SIGNED_IN') {
            resetPetState();
          }
          // Hydrate pet state from per-user cache immediately (instant display)
          hydratePetStateFromCache();

          // 1. Load full profile data (including streak, name, avatar)
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, streak, avatar_url, meta')
            .eq('id', session.user.id)
            .single();

          if (mounted && profile?.meta?.has_created_notebook) {
            setHasCreatedNotebook(true);
          } else if (mounted) {
            setHasCreatedNotebook(false);
          }

          // Load onboarding completion flag
          const hasCompleted = profile?.meta?.has_completed_onboarding ?? false;
          if (mounted) {
            setHasCompletedOnboarding(hasCompleted);
          }

          // 2. Load user profile (streak, name, avatar) into store
          await loadUserProfile();

          // 3. Load subscription/trial data
          await loadSubscription(session.user.id);

          // 4. Load notebooks
          // Pass userId directly to avoid race condition with store state propagation
          await loadNotebooks(session.user.id);

          // 5. Load pet state from database (will overwrite defaults)
          // Use await to ensure it completes before continuing
          await loadPetState();
        } catch (error) {
          // Error already handled by centralized system
        }
      } else {
        // Clear sensitive state on sign out
        // Reset pet state to defaults
        const { resetPetState } = useStore.getState();
        resetPetState();
        
        // Clear Mixpanel user data on logout
        clearUser();
        
        // Note: The store might need a clear() method, but for now specific slices handle their own cleanup
        // or we rely on them replacing data when new user logs in. 
        // Ideally we should clear notebooks here but loadNotebooks() handles "no user" check.
      }

      // Mark initialization as complete after processing the auth state
      if (mounted) {
        setIsInitialized(true);
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





