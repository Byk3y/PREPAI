/**
 * Completion Service
 * Handles flashcard and quiz completion tracking
 */

import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errors';
import { taskService } from './taskService';

export const completionService = {
  /**
   * Record a flashcard completion
   * @param userId - The user's ID
   * @param flashcardId - The flashcard's ID
   */
  recordFlashcardCompletion: async (userId: string, flashcardId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('flashcard_completions')
        .insert({
          user_id: userId,
          flashcard_id: flashcardId,
        });

      if (error) {
        // Check if it's a duplicate constraint error (acceptable)
        if (error.code === '23505') {
          // Duplicate entry - already recorded, this is fine
          return;
        }

        await handleError(error, {
          operation: 'record_flashcard_completion',
          component: 'completion-service',
          metadata: { userId, flashcardId },
        });
        throw error;
      }
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'record_flashcard_completion',
        component: 'completion-service',
        metadata: { userId, flashcardId },
      });
      throw appError;
    }
  },

  /**
   * Record a quiz completion
   * @param userId - The user's ID
   * @param quizId - The quiz's ID
   * @param scorePercentage - The score percentage achieved (0-100)
   * @param totalQuestions - Total number of questions (required)
   * @param correctCount - Number of correct answers (required, stored as score)
   */
  recordQuizCompletion: async (
    userId: string,
    quizId: string,
    scorePercentage: number,
    totalQuestions: number,
    correctCount: number
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('quiz_completions')
        .insert({
          user_id: userId,
          quiz_id: quizId,
          score: correctCount,
          score_percentage: scorePercentage,
          total_questions: totalQuestions,
        });

      if (error) {
        await handleError(error, {
          operation: 'record_quiz_completion',
          component: 'completion-service',
          metadata: { userId, quizId, scorePercentage, totalQuestions, correctCount },
        });
        throw error;
      }
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'record_quiz_completion',
        component: 'completion-service',
        metadata: { userId, quizId, scorePercentage, totalQuestions, correctCount },
      });
      throw appError;
    }
  },

  /**
   * Check if task progress threshold is met and award task if needed
   * @param userId - The user's ID
   * @param taskKey - The task key ('study_flashcards' or 'complete_quiz')
   * @param timezone - The user's timezone
   * @param threshold - The threshold to check (default: 5 for flashcards)
   * @param onThresholdMet - Callback when threshold is met (for awarding task)
   */
  checkAndAwardTaskIfThresholdMet: async (
    userId: string,
    taskKey: 'study_flashcards' | 'complete_quiz',
    timezone: string,
    threshold: number = 5,
    onThresholdMet?: () => Promise<void>
  ): Promise<void> => {
    try {
      // Get current progress using taskService
      const progress = await taskService.getTaskProgress(userId, taskKey, timezone);

      if (progress >= threshold && onThresholdMet) {
        await onThresholdMet();
      }
    } catch (error) {
      // Non-critical error - log but don't throw
      await handleError(error, {
        operation: 'check_task_threshold',
        component: 'completion-service',
        metadata: { userId, taskKey, timezone, threshold },
      });
    }
  },
};






