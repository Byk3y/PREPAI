/**
 * Quiz Utility Functions
 */

import type { QuizQuestion, AnswerOption, QuizMetrics } from './types';

/**
 * Calculate percentage score based on answers and questions
 */
export function calculateScore(
  answers: Record<string, AnswerOption>,
  questions: QuizQuestion[]
): number {
  if (questions.length === 0) return 0;
  
  let correctCount = 0;
  questions.forEach((q) => {
    if (answers[q.id] === q.correct) {
      correctCount++;
    }
  });
  return Math.round((correctCount / questions.length) * 100);
}

/**
 * Calculate detailed quiz metrics
 */
export function calculateMetrics(
  answers: Record<string, AnswerOption>,
  questions: QuizQuestion[]
): QuizMetrics {
  if (questions.length === 0) {
    return {
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      totalAnswered: 0,
      scorePercent: 0,
    };
  }

  const correctCount = questions.filter((q) => answers[q.id] === q.correct).length;
  const totalAnswered = Object.keys(answers).length;
  const wrongCount = Math.max(totalAnswered - correctCount, 0);
  const skippedCount = Math.max(questions.length - totalAnswered, 0);
  const scorePercent = Math.round((correctCount / questions.length) * 100);

  return {
    correctCount,
    wrongCount,
    skippedCount,
    totalAnswered,
    scorePercent,
  };
}


