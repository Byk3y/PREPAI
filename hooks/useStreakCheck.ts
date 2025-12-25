import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export function useStreakCheck() {
    const authUser = useStore((state) => state.authUser);
    const checkAndAwardTask = useStore((state) => state.checkAndAwardTask);
    const loadUserProfile = useStore((state) => state.loadUserProfile);
    const getUserTimezone = useStore((state) => state.getUserTimezone);
    const setShowStreakRestoreModal = useStore((state) => state.setShowStreakRestoreModal);
    const setPreviousStreakForRestore = useStore((state) => state.setPreviousStreakForRestore);
    const hasCheckedTodayRef = useRef<string | null>(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        if (!authUser) return;

        const checkStreak = async () => {
            const today = new Date().toISOString().split('T')[0];

            // Only skip if we already successfully checked TODAY in this session
            if (hasCheckedTodayRef.current === today) return;

            try {
                // Get user's timezone (from profile or device fallback)
                const timezone = await getUserTimezone();

                // Step 1: Increment streak in database (handles day logic with timezone)
                const { data: incrementResult, error: incrementError } = await supabase.rpc('increment_streak', {
                    p_user_id: authUser.id,
                    p_timezone: timezone
                });

                if (incrementError) {
                    console.error('[StreakCheck] Failed to increment streak:', incrementError);
                    return;
                }

                const result = incrementResult as any;
                if (result?.success) {
                    // Mark as checked for today after success
                    hasCheckedTodayRef.current = today;

                    // Reload user profile to update streak and restores in store
                    await loadUserProfile();

                    // If streak was reset, show the Savior Modal
                    if (result.was_reset && (result.streak_restores > 0) && (result.previous_streak > 1)) {
                        setPreviousStreakForRestore(result.previous_streak);
                        setShowStreakRestoreModal(true);
                    }

                    // Only award points if it was actually incremented (not just a reset or same-day call)
                    if (result.was_incremented) {
                        await checkAndAwardTask('maintain_streak');
                    }

                    // Check for "Early Bird" daily task (5 AM - 9 AM)
                    const now = new Date();
                    const hour = now.getHours();
                    if (hour >= 5 && hour < 9) {
                        await checkAndAwardTask('study_early_bird');
                    }
                }
            } catch (error) {
                console.error('[StreakCheck] Failed to check streak:', error);
            }
        };

        // 1. Check on mount (initial load)
        const timer = setTimeout(checkStreak, 1000);

        // 2. Check on AppState change (returns from background)
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // Return to foreground - trigger check
                checkStreak();
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            clearTimeout(timer);
            subscription.remove();
        };
    }, [authUser?.id, checkAndAwardTask, loadUserProfile, getUserTimezone]);
}

