/**
 * Task slice - Task management and tracking
 * 
 * Enhanced to support:
 * - Foundational tasks (one-time onboarding tasks)
 * - Timezone from profiles table with device fallback
 * - Server-side validated task completion
 */

import type { StateCreator } from 'zustand';
import { taskService } from '@/lib/services/taskService';
import { userService } from '@/lib/services/userService';
import type { SupabaseUser, DailyTask, TaskProgress } from '../types';

// Type definition for award_task_points RPC response
interface AwardTaskPointsResponse {
    success: boolean;
    already_completed?: boolean;
    points_awarded?: number;
    new_total_points?: number;
    new_stage?: number;
    error?: string;
    error_code?: string;
    task_key?: string;
}

// Type guard for validating RPC response shape
function isValidAwardResponse(data: unknown): data is AwardTaskPointsResponse {
    return (
        typeof data === 'object' &&
        data !== null &&
        'success' in data &&
        typeof (data as AwardTaskPointsResponse).success === 'boolean'
    );
}

export interface TaskSlice {
    dailyTasks: DailyTask[];
    foundationalTasks: DailyTask[];
    taskProgress: Record<string, TaskProgress>;
    isLoadingTasks: boolean;
    userTimezone: string;

    // Actions
    loadDailyTasks: () => Promise<void>;
    loadFoundationalTasks: () => Promise<void>;
    refreshTaskProgress: (taskKey: string) => Promise<void>;
    checkAndAwardTask: (taskKey: string) => Promise<{ success: boolean; newPoints?: number; error?: string }>;
    getUserTimezone: () => Promise<string>;
}

export const createTaskSlice: StateCreator<
    TaskSlice & { authUser: SupabaseUser | null; addPetPoints: (amount: number) => void },
    [],
    [],
    TaskSlice
> = (set, get) => ({
    dailyTasks: [],
    foundationalTasks: [],
    taskProgress: {},
    isLoadingTasks: false,
    userTimezone: 'UTC',

    /**
     * Get user's timezone from profiles table, with device fallback
     * Per spec: Use profiles.timezone (IANA string), fallback to device timezone
     */
    getUserTimezone: async () => {
        const { authUser } = get();
        if (!authUser) {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        }

        try {
            // Try to get timezone from profiles table
            const timezone = await userService.getUserTimezone(authUser.id);

            if (timezone) {
                set({ userTimezone: timezone });
                return timezone;
            }
        } catch (e) {
            console.log('[TaskSlice] Could not fetch profile timezone, using device timezone');
        }

        // Fallback to device timezone
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        set({ userTimezone: deviceTimezone });
        return deviceTimezone;
    },

    loadDailyTasks: async () => {
        const { authUser, getUserTimezone, isLoadingTasks } = get();
        if (!authUser || isLoadingTasks) return;

        set({ isLoadingTasks: true });
        try {
            // Get timezone (from profile or device fallback)
            const timezone = await getUserTimezone();

            const tasks = await taskService.getDailyTasks(authUser.id, timezone);

            set({ dailyTasks: tasks });

            // After loading tasks, fetch progress for any incomplete progressive tasks
            const progressiveTasks = tasks.filter(
                (t: DailyTask) =>
                    !t.completed &&
                    [
                        'study_flashcards',
                        'quiz_5_questions',
                        'podcast_3_min',
                        'quiz_perfect_score',
                        'add_material_daily',
                        'audio_feedback_given',
                        'study_early_bird'
                    ].includes(t.task_key)
            );

            // Load progress in parallel
            await Promise.all(progressiveTasks.map((t: DailyTask) => get().refreshTaskProgress(t.task_key)));

        } catch (error) {
            console.error('Failed to load daily tasks:', error);
        } finally {
            set({ isLoadingTasks: false });
        }
    },

    /**
     * Load all foundational tasks (completed and incomplete)
     * These are one-time onboarding tasks that remain visible when completed (with checkmark)
     * This provides user validation and shows progress
     */
    loadFoundationalTasks: async () => {
        const { authUser } = get();
        if (!authUser) return;

        try {
            const tasks = await taskService.getFoundationalTasks(authUser.id);
            set({ foundationalTasks: tasks });

            // Recovery: if add_material remains incomplete but user already has material,
            // attempt awarding once. Idempotent and quick no-op if criteria not met.
            const addMaterialTask = tasks.find((t: any) => t.task_key === 'add_material');
            if (addMaterialTask && !addMaterialTask.completed) {
                get().checkAndAwardTask('add_material');
            }

            // Recovery: if generate_audio_overview remains incomplete but user already has completed audio,
            // attempt awarding once. Idempotent and quick no-op if criteria not met.
            // This handles cases where the app was backgrounded or component unmounted
            // before the polling detected completion.
            const generateAudioTask = tasks.find((t: any) => t.task_key === 'generate_audio_overview');
            if (generateAudioTask && !generateAudioTask.completed) {
                get().checkAndAwardTask('generate_audio_overview');
            }
        } catch (error) {
            console.error('Failed to load foundational tasks:', error);
        }
    },

    refreshTaskProgress: async (taskKey: string) => {
        const { authUser, getUserTimezone } = get();
        if (!authUser) return;

        try {
            const timezone = await getUserTimezone();
            const progress = await taskService.getTaskProgress(authUser.id, taskKey, timezone);

            set((state) => ({
                taskProgress: {
                    ...state.taskProgress,
                    [taskKey]: progress
                }
            }));
        } catch (error) {
            console.error(`Failed to refresh progress for ${taskKey}:`, error);
        }
    },

    checkAndAwardTask: async (taskKey: string) => {
        const { authUser, addPetPoints, loadDailyTasks, loadFoundationalTasks, getUserTimezone } = get();
        if (!authUser) return { success: false, error: 'Not authenticated' };

        try {
            // Get timezone for the RPC call
            const timezone = await getUserTimezone();

            // Get local completion date (YYYY-MM-DD)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const completionDate = `${year}-${month}-${day}`;

            // Call award_task_points via service
            const data = await taskService.awardTaskPoints(
                authUser.id,
                taskKey,
                completionDate,
                timezone
            );

            // Handle response from server-side validated RPC
            if (data.success) {
                // Update local points/stage immediately if points were awarded > 0
                if (data.points_awarded && data.points_awarded > 0) {
                    addPetPoints(data.points_awarded);
                }

                // Refresh both task lists and the user profile (to update streak and last_streak_date)
                await Promise.all([
                    loadDailyTasks(),
                    loadFoundationalTasks(),
                    (get() as any).loadUserProfile?.()
                ]);

                return {
                    success: true,
                    newPoints: data.points_awarded ?? 0
                };
            }

            // Handle server-side validation failure
            if (data.error_code === 'CRITERIA_NOT_MET') {
                console.log(`[TaskSlice] Task ${taskKey} criteria not met (server validation)`);
                return { success: false, error: 'Criteria not met' };
            }

            // Handle already completed (idempotent success)
            if (data.already_completed) {
                return { success: true, newPoints: 0 };
            }

            return { success: false, error: data.error || 'Unknown error' };
        } catch (error) {
            console.error(`Failed to award task ${taskKey}:`, error);
            return { success: false, error: 'Failed to award task' };
        }
    }
});
