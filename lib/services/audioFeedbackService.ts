/**
 * Audio Feedback Service
 * Handles like/dislike operations for audio overviews
 */

import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errors';

export type AudioFeedback = {
  id: string;
  user_id: string;
  audio_overview_id: string;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
};

export const audioFeedbackService = {
  /**
   * Get user's feedback for a specific audio overview
   * @param userId - The user's ID
   * @param audioOverviewId - The audio overview's ID
   * @returns The feedback record or null if none exists
   */
  getFeedback: async (
    userId: string,
    audioOverviewId: string
  ): Promise<AudioFeedback | null> => {
    try {
      const { data, error } = await supabase
        .from('audio_feedback')
        .select('*')
        .eq('user_id', userId)
        .eq('audio_overview_id', audioOverviewId)
        .single();

      if (error) {
        // 406 = no rows returned (PGRST error code for .single() when no rows)
        if (error.code === 'PGRST116' || error.code === '406') {
          return null; // No feedback exists yet
        }

        await handleError(error, {
          operation: 'get_audio_feedback',
          component: 'audio-feedback-service',
          userId,
          metadata: { audioOverviewId },
        });
        throw error;
      }

      return data;
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'get_audio_feedback',
        component: 'audio-feedback-service',
        userId,
        metadata: { audioOverviewId },
      });
      throw appError;
    }
  },

  /**
   * Save or update user's feedback for an audio overview
   * Uses upsert pattern: inserts if new, updates if exists
   * @param userId - The user's ID
   * @param audioOverviewId - The audio overview's ID
   * @param isLiked - true for like, false for dislike
   */
  saveFeedback: async (
    userId: string,
    audioOverviewId: string,
    isLiked: boolean
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('audio_feedback')
        .upsert(
          {
            user_id: userId,
            audio_overview_id: audioOverviewId,
            is_liked: isLiked,
          },
          {
            onConflict: 'user_id,audio_overview_id',
          }
        );

      if (error) {
        await handleError(error, {
          operation: 'save_audio_feedback',
          component: 'audio-feedback-service',
          userId,
          metadata: { audioOverviewId, isLiked },
        });
        throw error;
      }
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'save_audio_feedback',
        component: 'audio-feedback-service',
        userId,
        metadata: { audioOverviewId, isLiked },
      });
      throw appError;
    }
  },

  /**
   * Remove user's feedback for an audio overview
   * @param userId - The user's ID
   * @param audioOverviewId - The audio overview's ID
   */
  removeFeedback: async (
    userId: string,
    audioOverviewId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('audio_feedback')
        .delete()
        .eq('user_id', userId)
        .eq('audio_overview_id', audioOverviewId);

      if (error) {
        await handleError(error, {
          operation: 'remove_audio_feedback',
          component: 'audio-feedback-service',
          userId,
          metadata: { audioOverviewId },
        });
        throw error;
      }
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'remove_audio_feedback',
        component: 'audio-feedback-service',
        userId,
        metadata: { audioOverviewId },
      });
      throw appError;
    }
  },
};

