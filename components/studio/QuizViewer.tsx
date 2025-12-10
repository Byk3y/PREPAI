/**
 * QuizViewer - Interactive quiz interface with multiple choice questions
 * Features: question navigation, answer selection, scoring, results display
 * Updated: Dark mode support, quiz completion tracking for daily task
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Quiz, QuizQuestion } from '@/lib/store/types';
import { useStore } from '@/lib/store';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useFeedback } from '@/lib/feedback';

interface QuizViewerProps {
  quiz: Quiz;
  onClose: () => void;
  onComplete?: (score: number) => void;
}

export const QuizViewer: React.FC<QuizViewerProps> = ({ quiz, onClose, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [showResults, setShowResults] = useState(false);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({});
  const [showReviewAnswers, setShowReviewAnswers] = useState(false);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  
  // Task completion tracking
  const completionRecordedRef = useRef(false);
  const { petState, authUser, checkAndAwardTask, refreshTaskProgress, getUserTimezone } = useStore();
  const petName = petState?.name || 'Maria';
  
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const { play, haptic, preload } = useFeedback();

  // Preload key sounds used in quiz so they are ready on first play
  useEffect(() => {
    preload(['correct', 'incorrect', 'complete', 'hint']);
  }, [preload]);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Derived state - must be defined before useEffect that depends on them
  const selectedAnswer = answers[currentQuestion.id];
  const isSubmitted = submittedAnswers[currentQuestion.id];
  const isCorrect = selectedAnswer === currentQuestion.correct;
  const hintAvailable = currentQuestion.hint && currentQuestion.hint.trim().length > 0;
  const hintRevealed = revealedHints[currentQuestion.id];

  // Handle answer selection - auto-submit on selection
  const handleSelectAnswer = (option: 'A' | 'B' | 'C' | 'D') => {
    // Set the answer
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: option,
    };
    setAnswers(newAnswers);

    // Auto-submit immediately
    setSubmittedAnswers({
      ...submittedAnswers,
      [currentQuestion.id]: true,
    });
  };

  // Feedback when an answer state changes to submitted
  useEffect(() => {
    if (!isSubmitted || !selectedAnswer) return;

    if (isCorrect) {
      play('correct');
      haptic('success');
    } else {
      play('incorrect');
      haptic('error');
    }
  }, [isSubmitted, selectedAnswer, isCorrect, currentQuestion.correct, play, haptic]);

  // Navigate to next question
  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      play('tap');
      haptic('selection');
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      play('complete');
      haptic('success');
      // Show results
      calculateResults();
    }
  };

  // Calculate and show results
  const calculateResults = async () => {
    let correctCount = 0;
    quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correct) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / totalQuestions) * 100);

    setShowResults(true);
    if (onComplete) {
      onComplete(scorePercent);
    }

    // Record quiz completion for daily task (only once per quiz session)
    if (!completionRecordedRef.current && authUser) {
      completionRecordedRef.current = true;
      
      try {
        // Insert quiz completion record
        const { error } = await supabase.from('quiz_completions').insert({
          user_id: authUser.id,
          quiz_id: quiz.id,
          score: correctCount,
          total_questions: totalQuestions,
          score_percentage: scorePercent
        });

        if (error) {
          console.error('[QuizViewer] Error recording completion:', error.message);
          return;
        }

        // Refresh progress and check for task completion
        await refreshTaskProgress('complete_quiz');
        
        const timezone = await getUserTimezone();
        const { data: progress } = await supabase.rpc('get_task_progress', {
          p_user_id: authUser.id,
          p_task_key: 'complete_quiz',
          p_timezone: timezone
        });

        // If user has completed at least 1 quiz today, award the task
        if (progress && progress.current >= 1) {
          await checkAndAwardTask('complete_quiz');
        }
      } catch (err) {
        // Silent fail - don't block user experience for task tracking
      }
    }
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Result metrics (computed every render)
  const correctCount = quiz.questions.filter((q) => answers[q.id] === q.correct).length;
  const totalAnswered = Object.keys(answers).length;
  const wrongCount = Math.max(totalAnswered - correctCount, 0);
  const skippedCount = Math.max(totalQuestions - totalAnswered, 0);
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);

  const handleRevealHint = () => {
    if (!hintAvailable) return;
    play('hint');
    haptic('light');
    setRevealedHints((prev) => ({ ...prev, [currentQuestion.id]: true }));
  };

  // Results screen
  if (showResults) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingHorizontal: 24, 
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border
        }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.icon} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontFamily: 'Nunito-SemiBold', color: colors.text }}>
            Quiz Complete
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={{ flex: 1 }}>
          <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
            <View style={{ 
              width: 128, 
              height: 128, 
              backgroundColor: isDarkMode ? '#064e3b' : '#dcfce7', 
              borderRadius: 64, 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: 24 
            }}>
              <Text style={{ fontSize: 48, fontFamily: 'Nunito-Bold', color: isDarkMode ? '#34d399' : '#16a34a' }}>
                {scorePercent}%
              </Text>
            </View>

            <Text style={{ fontSize: 24, fontFamily: 'Nunito-Bold', color: colors.text, marginBottom: 8 }}>
              Great job!
            </Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, fontFamily: 'Nunito-Regular' }}>
              You got {correctCount} out of {totalQuestions} questions correct
            </Text>

            {/* Summary cards */}
            <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4, fontFamily: 'Nunito-Regular' }}>Score</Text>
                <Text style={{ fontSize: 24, fontFamily: 'Nunito-SemiBold', color: colors.text }}>
                  {correctCount} / {totalQuestions}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4, fontFamily: 'Nunito-Regular' }}>Accuracy</Text>
                <Text style={{ fontSize: 24, fontFamily: 'Nunito-SemiBold', color: colors.text }}>
                  {scorePercent}%
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4, fontFamily: 'Nunito-Regular' }}>Right</Text>
                <Text style={{ fontSize: 24, fontFamily: 'Nunito-SemiBold', color: '#16a34a' }}>
                  {correctCount}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4, fontFamily: 'Nunito-Regular' }}>Wrong</Text>
                <Text style={{ fontSize: 24, fontFamily: 'Nunito-SemiBold', color: '#dc2626' }}>
                  {wrongCount}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4, fontFamily: 'Nunito-Regular' }}>Skipped</Text>
                <Text style={{ fontSize: 24, fontFamily: 'Nunito-SemiBold', color: colors.text }}>
                  {skippedCount}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  play('start');
                  haptic('selection');
                  // Reset all quiz state to retake
                  setCurrentQuestionIndex(0);
                  setAnswers({});
                  setSubmittedAnswers({});
                  setRevealedHints({});
                  setShowReviewAnswers(false);
                }}
                style={{ width: 140, borderWidth: 2, borderColor: colors.border, borderRadius: 999, paddingVertical: 10 }}
              >
                <Text style={{ textAlign: 'center', fontFamily: 'Nunito-SemiBold', color: colors.text, fontSize: 14 }}>
                  Retake Quiz
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  play('tap');
                  haptic('selection');
                  setShowReviewAnswers(true);
                }}
                style={{ width: 140, backgroundColor: '#3f5efb', borderRadius: 999, paddingVertical: 10 }}
              >
                <Text style={{ textAlign: 'center', fontFamily: 'Nunito-SemiBold', color: '#FFFFFF', fontSize: 14 }}>
                  Review Answers
                </Text>
              </TouchableOpacity>
            </View>

            {/* Question Review (on demand) */}
            {showReviewAnswers && (
              <View style={{ width: '100%', marginTop: 40 }}>
                <Text style={{ fontSize: 18, fontFamily: 'Nunito-SemiBold', color: colors.text, marginBottom: 16 }}>
                  Review Answers
                </Text>

                {quiz.questions.map((question, index) => {
                  const userAnswer = answers[question.id];
                  const isCorrect = userAnswer === question.correct;

                  return (
                    <View
                      key={question.id}
                      style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                            backgroundColor: isCorrect ? (isDarkMode ? '#064e3b' : '#dcfce7') : (isDarkMode ? '#7f1d1d' : '#fee2e2')
                          }}
                        >
                          <Ionicons
                            name={isCorrect ? 'checkmark' : 'close'}
                            size={18}
                            color={isCorrect ? '#10b981' : '#ef4444'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontFamily: 'Nunito-Medium', color: colors.text, marginBottom: 8 }}>
                            Question {index + 1}
                          </Text>
                          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontFamily: 'Nunito-Regular' }}>
                            {question.question}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>
                              Your answer: {userAnswer || 'Not answered'}
                            </Text>
                            {!isCorrect && (
                              <Text style={{ fontSize: 12, color: '#16a34a' }}>
                                Correct: {question.correct}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Question screen
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.icon} />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 16, fontFamily: 'Nunito-SemiBold', color: colors.text, textAlign: 'center', paddingHorizontal: 12 }}
          >
            {quiz.title}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Custom Gauge Bar with question count */}
        <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Nunito-Medium', color: colors.textSecondary }}>
            {currentQuestionIndex + 1} / {totalQuestions}
          </Text>
          {/* Progress Bar */}
          <View style={{ flex: 1, height: 16, backgroundColor: isDarkMode ? colors.surfaceAlt : '#e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
            <View
              style={{ height: '100%', backgroundColor: '#4ade80', borderTopRightRadius: 8, borderBottomRightRadius: 8, width: `${Math.max(progress, 5)}%` }}
            />
          </View>

          {/* Icons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LinearGradient
              colors={['#38bdf8', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="flash" size={18} color="white" />
            </LinearGradient>
            <Ionicons name="infinite" size={28} color="#3b82f6" />
          </View>
        </View>
      </View>

      {/* Question Content */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 24 }}>
        <Text style={{ fontSize: 24, fontFamily: 'Nunito-Bold', color: colors.text, marginBottom: 24, lineHeight: 34 }}>
          {currentQuestion.question}
        </Text>

        {/* Options */}
        <View style={{ gap: 12 }}>
          {(Object.keys(currentQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
            const isSelected = selectedAnswer === key;
            const isCorrectAnswer = currentQuestion.correct === key;
            const showCorrect = isSubmitted && isCorrectAnswer;
            const showIncorrect = isSubmitted && isSelected && !isCorrectAnswer;

            let bgColor = colors.surface;
            let borderColor = colors.border;
            let badgeBg = isDarkMode ? colors.surfaceAlt : '#f5f5f5';
            let badgeText = colors.textSecondary;
            let optionText = colors.text;

            if (showCorrect) {
              bgColor = isDarkMode ? '#064e3b' : '#dcfce7';
              borderColor = '#22c55e';
              badgeBg = '#22c55e';
              badgeText = '#FFFFFF';
              optionText = isDarkMode ? '#86efac' : '#14532d';
            } else if (showIncorrect) {
              bgColor = isDarkMode ? '#7f1d1d' : '#fee2e2';
              borderColor = '#ef4444';
              badgeBg = '#ef4444';
              badgeText = '#FFFFFF';
              optionText = isDarkMode ? '#fca5a5' : '#7f1d1d';
            } else if (isSelected) {
              bgColor = isDarkMode ? '#1e3a5f' : '#dbeafe';
              borderColor = '#3b82f6';
              badgeBg = '#3b82f6';
              badgeText = '#FFFFFF';
              optionText = isDarkMode ? '#93c5fd' : '#1e3a8a';
            }

            return (
              <TouchableOpacity
                key={key}
                onPress={() => !isSubmitted && handleSelectAnswer(key)}
                disabled={isSubmitted}
                style={{
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 2,
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      backgroundColor: badgeBg,
                    }}
                  >
                    <Text style={{ fontFamily: 'Nunito-SemiBold', color: badgeText }}>
                      {key}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 16, color: optionText, fontFamily: 'Nunito-Regular' }}>
                    {currentQuestion.options[key]}
                  </Text>
                  {showCorrect && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  )}
                  {showIncorrect && (
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hint CTA and content */}
        <View style={{ marginTop: 24 }}>
          <TouchableOpacity
            onPress={handleRevealHint}
            disabled={!hintAvailable || hintRevealed}
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: hintRevealed ? colors.border : '#3b82f6',
              backgroundColor: hintRevealed ? colors.surface : 'transparent',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name="bulb-outline"
                size={18}
                color={hintRevealed ? colors.textMuted : '#3b82f6'}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Nunito-SemiBold',
                  color: hintRevealed ? colors.textMuted : '#3b82f6',
                }}
              >
                {hintAvailable
                  ? `Ask ${petName} for a hint`
                  : 'No hint available'}
              </Text>
            </View>
          </TouchableOpacity>

          {hintRevealed && hintAvailable && (
            <View style={{ 
              marginTop: 12, 
              padding: 16, 
              backgroundColor: isDarkMode ? '#1e3a5f' : '#dbeafe', 
              borderRadius: 12, 
              borderWidth: 1, 
              borderColor: isDarkMode ? '#3b82f6' : '#bfdbfe' 
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="sparkles-outline" size={18} color="#2563eb" />
                <Text style={{ fontSize: 14, fontFamily: 'Nunito-SemiBold', color: isDarkMode ? '#93c5fd' : '#1e40af' }}>
                  Hint
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: isDarkMode ? '#bfdbfe' : '#1e3a8a', lineHeight: 20, fontFamily: 'Nunito-Regular' }}>
                {currentQuestion.hint}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons - Always available for navigation */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, marginBottom: 8 }}>
        {currentQuestionIndex > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
            <TouchableOpacity
              onPress={handlePrevious}
              style={{ width: 140, borderWidth: 2, borderColor: colors.border, borderRadius: 999, paddingVertical: 10 }}
            >
              <Text style={{ textAlign: 'center', fontFamily: 'Nunito-SemiBold', color: colors.text, fontSize: 14 }}>
                Previous
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              style={{ width: 140, backgroundColor: '#3f5efb', borderRadius: 999, paddingVertical: 10 }}
            >
              <Text style={{ textAlign: 'center', fontFamily: 'Nunito-SemiBold', color: '#FFFFFF', fontSize: 14 }}>
                {currentQuestionIndex < totalQuestions - 1 ? 'Next' : 'Finish'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              onPress={handleNext}
              style={{ width: 140, backgroundColor: '#3f5efb', borderRadius: 999, paddingVertical: 10 }}
            >
              <Text style={{ textAlign: 'center', fontFamily: 'Nunito-SemiBold', color: '#FFFFFF', fontSize: 14 }}>
                {currentQuestionIndex < totalQuestions - 1 ? 'Next' : 'Finish'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};
