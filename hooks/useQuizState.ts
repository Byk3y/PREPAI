/**
 * Quiz State Hook
 * Manages all business logic for quiz interaction
 */

import { useState, useCallback, useRef } from 'react';
import type { Quiz, AnswerOption } from '@/lib/quiz/types';
import { useStore } from '@/lib/store';
import { completionService } from '@/lib/services/completionService';
import { calculateScore, calculateMetrics } from '@/lib/quiz/utils';
import type { UseQuizStateReturn } from '@/lib/quiz/types';

interface UseQuizStateProps {
  quiz: Quiz;
  onComplete?: (score: number) => void;
  onPlaySound: (sound: string) => void;
  onHaptic: (type: string) => void;
}

export function useQuizState({
  quiz,
  onComplete,
  onPlaySound,
  onHaptic,
}: UseQuizStateProps): UseQuizStateReturn {
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerOption>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [optionLayouts, setOptionLayouts] = useState<Record<string, Record<string, number>>>({});

  // Task completion tracking
  const completionRecordedRef = useRef(false);
  const { authUser, checkAndAwardTask, refreshTaskProgress, getUserTimezone } = useStore();

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Validate quiz has questions
  if (totalQuestions === 0) {
    console.error('[useQuizState] Quiz has no questions');
  }

  // Handle answer selection - auto-submit on selection
  const handleSelectAnswer = useCallback(
    (option: AnswerOption) => {
      if (isReviewMode || !currentQuestion) return;

      // Set the answer
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: option,
      }));

      // Auto-submit immediately
      setSubmittedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: true,
      }));
    },
    [currentQuestion, isReviewMode]
  );

  // Calculate and show results
  const calculateResults = useCallback(async () => {
    const scorePercent = calculateScore(answers, quiz.questions);

    setShowResults(true);
    if (onComplete) {
      onComplete(scorePercent);
    }

    // Record quiz completion for daily task (only once per quiz session)
    if (!completionRecordedRef.current && authUser) {
      completionRecordedRef.current = true;

      try {
        const metrics = calculateMetrics(answers, quiz.questions);

        // Record quiz completion via service
        await completionService.recordQuizCompletion(
          authUser.id,
          quiz.id,
          scorePercent,
          totalQuestions,
          metrics.correctCount
        );

        // Refresh progress and check for task completion
        await refreshTaskProgress('complete_quiz');

        // Check if threshold is met and award task
        const timezone = await getUserTimezone();
        await completionService.checkAndAwardTaskIfThresholdMet(
          authUser.id,
          'complete_quiz',
          timezone,
          1, // Threshold: 1 quiz
          () => checkAndAwardTask('complete_quiz')
        );
      } catch (err) {
        // Silent fail - don't block user experience for task tracking
        console.log('[useQuizState] Completion record failed:', err);
      }
    }
  }, [answers, quiz, totalQuestions, onComplete, authUser, refreshTaskProgress, getUserTimezone, checkAndAwardTask]);

  // Navigate to next question
  const handleNext = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      onPlaySound('tap');
      onHaptic('selection');
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onPlaySound('complete');
      onHaptic('success');
      // In review mode, just return to results without recalculating
      if (isReviewMode) {
        setShowResults(true);
        setIsReviewMode(false);
      } else {
        calculateResults();
      }
    }
  }, [currentQuestionIndex, totalQuestions, isReviewMode, onPlaySound, onHaptic, calculateResults]);

  // Navigate to previous question
  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  // Reveal hint
  const handleRevealHint = useCallback(() => {
    if (!currentQuestion) return;
    const hintAvailable = currentQuestion.hint && currentQuestion.hint.trim().length > 0;
    if (!hintAvailable || isReviewMode) return;

    onPlaySound('hint');
    onHaptic('light');
    setRevealedHints((prev) => ({ ...prev, [currentQuestion.id]: true }));
  }, [currentQuestion, isReviewMode, onPlaySound, onHaptic]);

  // Reset quiz for retake
  const resetQuiz = useCallback(() => {
    setShowResults(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSubmittedAnswers({});
    setRevealedHints({});
    setIsReviewMode(false);
    completionRecordedRef.current = false;
  }, []);

  // Enter review mode
  const enterReviewMode = useCallback(() => {
    setShowResults(false);
    setCurrentQuestionIndex(0);
    setIsReviewMode(true);
  }, []);

  // Handle option layout tracking
  const handleOptionLayout = useCallback((questionId: string, option: AnswerOption, y: number) => {
    setOptionLayouts((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [option]: y,
      },
    }));
  }, []);

  return {
    // State
    currentQuestionIndex,
    answers,
    submittedAnswers,
    revealedHints,
    isReviewMode,
    showResults,
    optionLayouts,
    // Setters
    setCurrentQuestionIndex,
    setAnswers,
    setSubmittedAnswers,
    setRevealedHints,
    setIsReviewMode,
    setShowResults,
    setOptionLayouts,
    // Actions
    handleSelectAnswer,
    handleNext,
    handlePrevious,
    handleRevealHint,
    calculateResults,
    resetQuiz,
    enterReviewMode,
    handleOptionLayout,
  };
}

