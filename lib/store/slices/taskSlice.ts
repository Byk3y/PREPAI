/**
 * Task slice - Task management and tracking
 * 
 * Enhanced to support:
 * - Foundational tasks (one-time onboarding tasks)
 * - Timezone from profiles table with device fallback
 * - Server-side validated task completion
 */

import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
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
            const { data, error } = await supabase
                .from('profiles')
                .select('timezone')
                .eq('id', authUser.id)
                .single();

            if (!error && data?.timezone) {
                set({ userTimezone: data.timezone });
                return data.timezone;
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
        const { authUser, getUserTimezone } = get();
        if (!authUser) return;

        set({ isLoadingTasks: true });
        try {
            // Get timezone (from profile or device fallback)
            const timezone = await getUserTimezone();

            const { data, error } = await supabase.rpc('get_daily_tasks', {
                p_user_id: authUser.id,
                p_timezone: timezone
            });

            if (error) {
                console.error('Error loading daily tasks:', error);
                return;
            }

            set({ dailyTasks: data || [] });

            // After loading tasks, fetch progress for any incomplete progressive tasks
            const tasks = data || [];
            const progressiveTasks = tasks.filter(
                (t: DailyTask) =>
                    !t.completed &&
                    (t.task_key === 'study_flashcards' || t.task_key === 'complete_quiz')
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
            const { data, error } = await supabase.rpc('get_foundational_tasks', {
                p_user_id: authUser.id
            });

            if (error) {
                console.error('Error loading foundational tasks:', error);
                return;
            }

            const tasks = data || [];
            set({ foundationalTasks: tasks });

            // Recovery: if add_material remains incomplete but user already has material,
            // attempt awarding once. Idempotent and quick no-op if criteria not met.
            const addMaterialTask = tasks.find((t: any) => t.task_key === 'add_material');
            if (addMaterialTask && !addMaterialTask.completed) {
                get().checkAndAwardTask('add_material');
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

            const { data, error } = await supabase.rpc('get_task_progress', {
                p_user_id: authUser.id,
                p_task_key: taskKey,
                p_timezone: timezone
            });

            if (error) {
                console.error(`Error fetching progress for ${taskKey}:`, error);
                return;
            }

            set((state) => ({
                taskProgress: {
                    ...state.taskProgress,
                    [taskKey]: data
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

            // Call award_task_points with timezone for server-side validation
            const { data, error } = await supabase.rpc('award_task_points', {
                p_user_id: authUser.id,
                p_task_key: taskKey,
                p_completion_date: completionDate,
                p_timezone: timezone
            });

            if (error) {
                console.error(`Error awarding points for ${taskKey}:`, error);
                return { success: false, error: error.message };
            }

            // P3 Fix: Validate response shape before accessing properties
            if (!isValidAwardResponse(data)) {
                console.error(`Invalid RPC response shape for ${taskKey}:`, data);
                return { success: false, error: 'Invalid server response' };
            }

            // Handle response from server-side validated RPC
            if (data.success) {
                // Update local points/stage immediately if points were awarded > 0
                if (data.points_awarded && data.points_awarded > 0) {
                    addPetPoints(data.points_awarded);
                }

                // Refresh both task lists
                await Promise.all([
                    loadDailyTasks(),
                    loadFoundationalTasks()
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
