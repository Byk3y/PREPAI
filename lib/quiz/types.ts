/**
 * Quiz Component Type Definitions
 */

import type { getThemeColors } from '@/lib/ThemeContext';
import type { Quiz, QuizQuestion } from '@/lib/store/types';

export type AnswerOption = 'A' | 'B' | 'C' | 'D';

// Re-export types from store
export type { Quiz, QuizQuestion };

// Quiz state
export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<string, AnswerOption>;
  submittedAnswers: Record<string, boolean>;
  revealedHints: Record<string, boolean>;
  isReviewMode: boolean;
  showResults: boolean;
  optionLayouts: Record<string, Record<string, number>>;
}

// Quiz actions
export interface QuizActions {
  setCurrentQuestionIndex: (index: number) => void;
  setAnswers: (answers: Record<string, AnswerOption>) => void;
  setSubmittedAnswers: (submitted: Record<string, boolean>) => void;
  setRevealedHints: (hints: Record<string, boolean>) => void;
  setIsReviewMode: (isReview: boolean) => void;
  setShowResults: (show: boolean) => void;
  setOptionLayouts: (layouts: Record<string, Record<string, number>>) => void;
  handleSelectAnswer: (option: AnswerOption) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleRevealHint: () => void;
  calculateResults: () => Promise<void>;
  resetQuiz: () => void;
  enterReviewMode: () => void;
  handleOptionLayout: (questionId: string, option: AnswerOption, y: number) => void;
}

// Combined hook return type
export type UseQuizStateReturn = QuizState & QuizActions;

// Quiz metrics
export interface QuizMetrics {
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalAnswered: number;
  scorePercent: number;
}

// Component props
export interface QuizViewerProps {
  quiz: Quiz;
  onClose: () => void;
  onComplete?: (score: number) => void;
}

export interface QuizHeaderProps {
  title: string;
  currentIndex: number;
  totalQuestions: number;
  isReviewMode: boolean;
  onClose: () => void;
  colors: ReturnType<typeof getThemeColors>;
  isDarkMode: boolean;
}

export interface QuestionCardProps {
  question: string;
  wasSkipped: boolean;
  colors: ReturnType<typeof getThemeColors>;
}

export interface AnswerOptionProps {
  optionKey: AnswerOption;
  optionText: string;
  isSelected: boolean;
  isCorrect: boolean;
  showCorrect: boolean;
  showIncorrect: boolean;
  explanation?: string;
  isSubmitted: boolean;
  isReviewMode: boolean;
  onSelect: (option: AnswerOption) => void;
  onLayout: (option: AnswerOption, y: number) => void;
  colors: ReturnType<typeof getThemeColors>;
  isDarkMode: boolean;
}

export interface AnswerOptionsProps {
  question: QuizQuestion;
  selectedAnswer?: AnswerOption;
  isSubmitted: boolean;
  isReviewMode: boolean;
  answers: Record<string, AnswerOption>;
  onSelectAnswer: (option: AnswerOption) => void;
  onOptionLayout: (questionId: string, option: AnswerOption, y: number) => void;
  colors: ReturnType<typeof getThemeColors>;
  isDarkMode: boolean;
}

export interface HintSectionProps {
  hint?: string | null;
  hintAvailable: boolean;
  hintRevealed: boolean;
  petName: string;
  onRevealHint: () => void;
  isReviewMode: boolean;
  colors: ReturnType<typeof getThemeColors>;
  isDarkMode: boolean;
}

export interface QuizNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  colors: ReturnType<typeof getThemeColors>;
}

export interface QuizResultsProps {
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  wrongCount: number;
  skippedCount: number;
  onClose: () => void;
  onRetake: () => void;
  onReview: () => void;
  colors: ReturnType<typeof getThemeColors>;
  isDarkMode: boolean;
  onPlaySound: (sound: string) => void;
  onHaptic: (type: string) => void;
}

