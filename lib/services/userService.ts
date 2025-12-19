/**
 * User Service
 * Handles user profile operations
 */

import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errors';
import type { User } from '@/lib/store/types';

export const userService = {
  /**
   * Load user profile from database
   * @param userId - The user's ID
   * @returns User profile or null if not found
   */
  loadUserProfile: async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, first_name, last_name, streak, avatar_url')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        await handleError(error, {
          operation: 'load_user_profile',
          component: 'user-service',
          metadata: { userId },
        });
        return null;
      }

      if (data) {
        return {
          id: data.id,
          name: data.name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          streak: data.streak || 0,
          coins: 0, // Not used in current system
          avatar: data.avatar_url || undefined,
        };
      }

      return null;
    } catch (error) {
      await handleError(error, {
        operation: 'load_user_profile',
        component: 'user-service',
        metadata: { userId },
      });
      return null;
    }
  },

  /**
   * Get user timezone from profiles table
   * @param userId - The user's ID
   * @returns Timezone string or null if not found
   */
  getUserTimezone: async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        await handleError(error, {
          operation: 'get_user_timezone',
          component: 'user-service',
          metadata: { userId },
        });
        return null;
      }

      return data?.timezone || null;
    } catch (error) {
      await handleError(error, {
        operation: 'get_user_timezone',
        component: 'user-service',
        metadata: { userId },
      });
      return null;
    }
  },

  /**
   * Get profile meta field
   * @param userId - The user's ID
   * @returns Meta object or null
   */
  getProfileMeta: async (userId: string): Promise<Record<string, any> | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('meta')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        await handleError(error, {
          operation: 'get_profile_meta',
          component: 'user-service',
          metadata: { userId },
        });
        return null;
      }

      return data?.meta || null;
    } catch (error) {
      await handleError(error, {
        operation: 'get_profile_meta',
        component: 'user-service',
        metadata: { userId },
      });
      return null;
    }
  },

  /**
   * Get total flashcard completions count for a user
   * @param userId - The user's ID
   * @returns Total number of flashcards studied
   */
  getFlashcardsStudiedCount: async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('flashcard_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        await handleError(error, {
          operation: 'get_flashcards_studied_count',
          component: 'user-service',
          metadata: { userId },
        });
        return 0;
      }

      return count || 0;
    } catch (error) {
      await handleError(error, {
        operation: 'get_flashcards_studied_count',
        component: 'user-service',
        metadata: { userId },
      });
      return 0;
    }
  },
};





