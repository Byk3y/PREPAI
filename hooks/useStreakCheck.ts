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

                if (incrementResult?.success) {
                    console.log('[StreakCheck] Streak updated:', {
                        previous: incrementResult.previous_streak,
                        new: incrementResult.new_streak,
                        was_incremented: incrementResult.was_incremented
                    });

                    // Reload user profile to update streak in store
                    await loadUserProfile();

                    // Step 2: Award the maintain_streak task if streak was incremented
                    // Only award if streak actually increased (not reset, not already updated today)
                    if (incrementResult.was_incremented) {
                        const result = await checkAndAwardTask('maintain_streak');

                        if (result.success) {
                            console.log('[StreakCheck] Daily streak task completed');
                        } else {
                            console.log('[StreakCheck] Streak task not awarded:', result.error);
                        }
                    } else {
                        console.log('[StreakCheck] Streak not incremented (already updated today or reset)');
                    }
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

