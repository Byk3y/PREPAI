/**
 * QuizViewer - Interactive quiz interface with multiple choice questions
 * Features: question navigation, answer selection, scoring, results display
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Quiz, QuizQuestion } from '@/lib/store/types';

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

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

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

  // Navigate to next question
  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Show results
      calculateResults();
    }
  };

  // Calculate and show results
  const calculateResults = () => {
    let correctCount = 0;
    quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correct) {
        correctCount++;
      }
    });

    setShowResults(true);
    if (onComplete) {
      onComplete((correctCount / totalQuestions) * 100);
    }
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const selectedAnswer = answers[currentQuestion.id];
  const isSubmitted = submittedAnswers[currentQuestion.id];
  const isCorrect = selectedAnswer === currentQuestion.correct;

  // Results screen
  if (showResults) {
    const correctCount = quiz.questions.filter(
      (q) => answers[q.id] === q.correct
    ).length;
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);

    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-200">
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#171717" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-neutral-900">
            Quiz Complete
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView className="flex-1">
          <View className="items-center px-6 py-12">
            <View className="w-32 h-32 bg-green-50 rounded-full items-center justify-center mb-6">
              <Text className="text-5xl font-bold text-green-600">
                {scorePercent}%
              </Text>
            </View>

            <Text className="text-2xl font-bold text-neutral-900 mb-2">
              Great job!
            </Text>
            <Text className="text-base text-neutral-600 text-center mb-8">
              You got {correctCount} out of {totalQuestions} questions correct
            </Text>

            {/* Question Review */}
            <View className="w-full">
              <Text className="text-lg font-semibold text-neutral-900 mb-4">
                Review Answers
              </Text>

              {quiz.questions.map((question, index) => {
                const userAnswer = answers[question.id];
                const isCorrect = userAnswer === question.correct;

                return (
                  <View
                    key={question.id}
                    className="bg-neutral-50 rounded-xl p-4 mb-3"
                  >
                    <View className="flex-row items-start mb-3">
                      <View
                        className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isCorrect ? 'bg-green-100' : 'bg-red-100'
                          }`}
                      >
                        <Ionicons
                          name={isCorrect ? 'checkmark' : 'close'}
                          size={18}
                          color={isCorrect ? '#10b981' : '#ef4444'}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-neutral-900 mb-2">
                          Question {index + 1}
                        </Text>
                        <Text className="text-sm text-neutral-700 mb-2">
                          {question.question}
                        </Text>
                        <View className="flex-row gap-2">
                          <Text className="text-xs text-neutral-500">
                            Your answer: {userAnswer || 'Not answered'}
                          </Text>
                          {!isCorrect && (
                            <Text className="text-xs text-green-600">
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

            <TouchableOpacity
              onPress={onClose}
              className="w-full bg-neutral-900 rounded-full py-4 mt-6"
            >
              <Text className="text-white text-center font-semibold">
                Close Quiz
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Question screen
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="pb-6">
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#171717" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-neutral-900">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Custom Gauge Bar */}
        <View className="px-6 flex-row items-center gap-3">
          {/* Progress Bar */}
          <View className="flex-1 h-4 bg-neutral-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-[#4ade80] rounded-r-full"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
            {/* Glossy/Highlight effect (optional, simplified for now) */}
            <View className="absolute top-0 left-2 right-2 h-2 bg-white/20 rounded-full" />
          </View>

          {/* Icons */}
          <View className="flex-row items-center gap-2">
            <LinearGradient
              colors={['#38bdf8', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-8 h-8 rounded-lg items-center justify-center"
            >
              <Ionicons name="flash" size={18} color="white" />
            </LinearGradient>
            <Ionicons name="infinite" size={28} color="#3b82f6" />
          </View>
        </View>
      </View>

      {/* Question Content */}
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="text-2xl font-bold text-neutral-900 mb-6 leading-relaxed">
          {currentQuestion.question}
        </Text>

        {/* Options */}
        <View className="gap-3">
          {(Object.keys(currentQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
            const isSelected = selectedAnswer === key;
            const isCorrectAnswer = currentQuestion.correct === key;
            const showCorrect = isSubmitted && isCorrectAnswer;
            const showIncorrect = isSubmitted && isSelected && !isCorrectAnswer;

            return (
              <TouchableOpacity
                key={key}
                onPress={() => !isSubmitted && handleSelectAnswer(key)}
                disabled={isSubmitted}
                className={`rounded-xl p-4 border-2 ${showCorrect
                  ? 'border-green-500 bg-green-50'
                  : showIncorrect
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-neutral-200 bg-white'
                  }`}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${showCorrect
                      ? 'bg-green-500'
                      : showIncorrect
                        ? 'bg-red-500'
                        : isSelected
                          ? 'bg-blue-500'
                          : 'bg-neutral-100'
                      }`}
                  >
                    <Text
                      className={`font-semibold ${showCorrect || showIncorrect || isSelected
                        ? 'text-white'
                        : 'text-neutral-600'
                        }`}
                    >
                      {key}
                    </Text>
                  </View>
                  <Text
                    className={`flex-1 text-base ${showCorrect
                      ? 'text-green-900'
                      : showIncorrect
                        ? 'text-red-900'
                        : isSelected
                          ? 'text-blue-900 font-medium'
                          : 'text-neutral-900'
                      }`}
                  >
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

        {/* Explanation (shown after submit) */}
        {isSubmitted && (
          <View className="mt-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            <Text className="text-sm font-semibold text-neutral-900 mb-2">
              Explanation
            </Text>
            <Text className="text-sm text-neutral-700 leading-relaxed">
              {currentQuestion.explanation}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons - Only show navigation after answer is submitted */}
      {isSubmitted && (
        <View className="px-6 py-6 border-t border-neutral-200">
          <View className="flex-row gap-3">
            {currentQuestionIndex > 0 && (
              <TouchableOpacity
                onPress={handlePrevious}
                className="flex-1 border-2 border-neutral-200 rounded-full py-4"
              >
                <Text className="text-center font-semibold text-neutral-900">
                  Previous
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleNext}
              className="flex-1 bg-neutral-900 rounded-full py-4"
            >
              <Text className="text-center font-semibold text-white">
                {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
