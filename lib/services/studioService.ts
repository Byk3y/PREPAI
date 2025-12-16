/**
 * Studio Service
 * Handles studio content (flashcards, quizzes) database operations
 */

import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errors';
import type { StudioFlashcard, Quiz } from '@/lib/store/types';

export const studioService = {
  /**
   * Fetch all flashcards for a notebook
   */
  fetchFlashcards: async (notebookId: string): Promise<StudioFlashcard[]> => {
    try {
      const { data, error } = await supabase
        .from('studio_flashcards')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('created_at', { ascending: false });

      if (error) {
        await handleError(error, {
          operation: 'fetch_flashcards',
          component: 'studio-service',
          metadata: { notebookId },
        });
        return [];
      }

      return data || [];
    } catch (error) {
      await handleError(error, {
        operation: 'fetch_flashcards',
        component: 'studio-service',
        metadata: { notebookId },
      });
      return [];
    }
  },

  /**
   * Fetch all quizzes for a notebook
   */
  fetchQuizzes: async (notebookId: string): Promise<Quiz[]> => {
    try {
      const { data, error } = await supabase
        .from('studio_quizzes')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('created_at', { ascending: false });

      if (error) {
        await handleError(error, {
          operation: 'fetch_quizzes',
          component: 'studio-service',
          metadata: { notebookId },
        });
        return [];
      }

      return data || [];
    } catch (error) {
      await handleError(error, {
        operation: 'fetch_quizzes',
        component: 'studio-service',
        metadata: { notebookId },
      });
      return [];
    }
  },

  /**
   * Fetch flashcards and quizzes in parallel
   */
  fetchAll: async (notebookId: string): Promise<{
    flashcards: StudioFlashcard[];
    quizzes: Quiz[];
  }> => {
    try {
      const [flashcards, quizzes] = await Promise.all([
        studioService.fetchFlashcards(notebookId),
        studioService.fetchQuizzes(notebookId),
      ]);

      return { flashcards, quizzes };
    } catch (error) {
      await handleError(error, {
        operation: 'fetch_studio_content',
        component: 'studio-service',
        metadata: { notebookId },
      });
      return { flashcards: [], quizzes: [] };
    }
  },

  /**
   * Fetch flashcard progress for a notebook
   */
  fetchFlashcardProgress: async (notebookId: string, userId: string): Promise<{
    last_flashcard_id: string | null;
    last_index: number;
  } | null> => {
    try {
      const { data, error } = await supabase
        .from('user_flashcard_progress')
        .select('last_flashcard_id, last_index')
        .eq('notebook_id', notebookId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        await handleError(error, {
          operation: 'fetch_flashcard_progress',
          component: 'studio-service',
          metadata: { notebookId, userId },
        });
        return null;
      }

      return data || null;
    } catch (error) {
      await handleError(error, {
        operation: 'fetch_flashcard_progress',
        component: 'studio-service',
        metadata: { notebookId, userId },
      });
      return null;
    }
  },

  /**
   * Upsert flashcard progress for a notebook
   */
  upsertFlashcardProgress: async (
    notebookId: string,
    userId: string,
    lastFlashcardId: string | null,
    lastIndex: number
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('user_flashcard_progress')
        .upsert(
          {
            user_id: userId,
            notebook_id: notebookId,
            last_flashcard_id: lastFlashcardId,
            last_index: lastIndex,
          },
          {
            onConflict: 'user_id,notebook_id',
          }
        );

      if (error) {
        await handleError(error, {
          operation: 'upsert_flashcard_progress',
          component: 'studio-service',
          metadata: { notebookId, userId, lastFlashcardId, lastIndex },
        });
        throw error;
      }
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'upsert_flashcard_progress',
        component: 'studio-service',
        metadata: { notebookId, userId, lastFlashcardId, lastIndex },
      });
      throw appError;
    }
  },
};


