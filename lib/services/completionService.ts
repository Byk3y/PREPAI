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
   * @param totalQuestions - Total number of questions
   * @param correctCount - Number of correct answers
   */
  recordQuizCompletion: async (
    userId: string,
    quizId: string,
    scorePercentage: number,
    totalQuestions: number,
    correctCount: number
  ): Promise<void> => {
    try {
      // Use any to bypass draft schema type errors
      const { error } = await (supabase as any)
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
   * Record a single quiz question answer
   */
  recordQuizQuestionAnswer: async (userId: string, questionId: string): Promise<void> => {
    try {
      const { error } = await (supabase as any)
        .from('quiz_question_answers')
        .insert({
          user_id: userId,
          question_id: questionId,
        });

      if (error) {
        if (error.code === '23505') return;
        throw error;
      }
    } catch (error) {
      console.error('Failed to record quiz question answer:', error);
    }
  },

  /**
   * Check if task progress threshold is met and award task if needed
   */
  checkAndAwardTaskIfThresholdMet: async (
    userId: string,
    taskKey: string,
    timezone: string,
    threshold: number,
    onThresholdMet?: () => Promise<any>
  ): Promise<void> => {
    try {
      const progress = await taskService.getTaskProgress(userId, taskKey, timezone);

      if (progress.current >= threshold && onThresholdMet) {
        await onThresholdMet();
      }
    } catch (error) {
      console.error('Check task threshold failed:', error);
    }
  },
};
