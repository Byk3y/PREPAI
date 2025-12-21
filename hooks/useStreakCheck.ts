import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export function useStreakCheck() {
    const authUser = useStore((state) => state.authUser);
    const checkAndAwardTask = useStore((state) => state.checkAndAwardTask);
    const loadUserProfile = useStore((state) => state.loadUserProfile);
    const getUserTimezone = useStore((state) => state.getUserTimezone);
    const hasCheckedRef = useRef(false);

    useEffect(() => {
        if (!authUser || hasCheckedRef.current) return;

        const checkStreak = async () => {
            hasCheckedRef.current = true;

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
                    // Reload user profile to update streak in store
                    await loadUserProfile();

                    // Award the maintain_streak task always if streak logic succeeded
                    // The server-side RPC (award_task_points) handles idempotent daily rewards
                    await checkAndAwardTask('maintain_streak');
                }
            } catch (error) {
                console.error('[StreakCheck] Failed to check streak:', error);
            }
        };

        // Small delay to ensure store is fully hydrated after auth
        const timer = setTimeout(checkStreak, 500);

        return () => clearTimeout(timer);
    }, [authUser?.id, checkAndAwardTask, loadUserProfile, getUserTimezone]);
}

