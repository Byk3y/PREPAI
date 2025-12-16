/**
 * Screen 4: Learning Assessment (Part 1)
 * 3-question quiz to understand user's learning preferences
 * Questions presented one at a time with smooth transitions
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { AssessmentQuestion, type AssessmentOption } from '@/components/onboarding/components/AssessmentQuestion';

interface Screen4AssessmentProps {
  colors: ReturnType<typeof getThemeColors>;
  onComplete: () => void;
}

export function Screen4_Assessment({ colors, onComplete }: Screen4AssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const {
    studyGoal,
    learningStyle,
    dailyCommitmentMinutes,
    setStudyGoal,
    setLearningStyle,
    setDailyCommitment,
  } = useStore();

  // Question 1: Study Goal
  const studyGoalOptions: AssessmentOption[] = [
    {
      value: 'exam_prep',
      label: 'Ace My Exams',
      icon: '🎯',
      description: 'Focused preparation for upcoming tests',
    },
    {
      value: 'retention',
      label: 'Long-term Learning',
      icon: '🧠',
      description: 'Remember for years, not just weeks',
    },
    {
      value: 'quick_review',
      label: 'Quick Reviews',
      icon: '⚡',
      description: 'Fast refreshers for busy schedules',
    },
    {
      value: 'all',
      label: 'All of the Above',
      icon: '✨',
      description: 'Flexible approach for all needs',
    },
  ];

  // Question 2: Learning Style
  const learningStyleOptions: AssessmentOption[] = [
    {
      value: 'visual',
      label: 'Visual',
      icon: '👁️',
      description: 'Charts, diagrams, and images',
    },
    {
      value: 'auditory',
      label: 'Listening',
      icon: '🎧',
      description: 'Podcasts and audio summaries',
    },
    {
      value: 'reading',
      label: 'Reading',
      icon: '📖',
      description: 'Notes and written content',
    },
    {
      value: 'practice',
      label: 'Hands-On',
      icon: '🎮',
      description: 'Quizzes and active practice',
    },
  ];

  // Question 3: Daily Commitment
  const commitmentOptions: AssessmentOption[] = [
    {
      value: '10',
      label: '5-15 minutes',
      icon: '☕',
      description: 'Quick daily sessions',
    },
    {
      value: '25',
      label: '15-30 minutes',
      icon: '🌱',
      description: 'Balanced study time',
    },
    {
      value: '45',
      label: '30-60 minutes',
      icon: '🔥',
      description: 'Deep focus sessions',
    },
    {
      value: '75',
      label: '60+ minutes',
      icon: '🚀',
      description: 'Intensive learning',
    },
  ];

  const questions = [
    {
      question: "What's your main study goal?",
      subtitle: 'Help us personalize your experience',
      options: studyGoalOptions,
      selectedValue: studyGoal || null,
      onSelect: (value: string) => setStudyGoal(value as 'exam_prep' | 'retention' | 'quick_review' | 'all'),
    },
    {
      question: 'How do you learn best?',
      subtitle: "We'll tailor content to your style",
      options: learningStyleOptions,
      selectedValue: learningStyle || null,
      onSelect: (value: string) => setLearningStyle(value as 'visual' | 'auditory' | 'reading' | 'practice'),
    },
    {
      question: 'How much time can you commit daily?',
      subtitle: 'Be realistic - consistency beats intensity',
      options: commitmentOptions,
      selectedValue: dailyCommitmentMinutes?.toString() || null,
      onSelect: (value: string) => setDailyCommitment(parseInt(value, 10)),
    },
  ];

  const currentQ = questions[currentQuestion];
  const canAdvance = currentQ.selectedValue !== null;
  const isLastQuestion = currentQuestion === questions.length - 1;

  const handleNext = () => {
    if (!canAdvance) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isLastQuestion) {
      // Generate recommendations and move to results
      onComplete();
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };


  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {questions.map((_, index) => (
          <View
            key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    index <= currentQuestion ? colors.primary : colors.borderLight,
                },
              ]}
          />
        ))}
      </View>

      {/* Current question with animation */}
      <MotiView
        key={currentQuestion}
        from={{ opacity: 0, translateX: 50 }}
        animate={{ opacity: 1, translateX: 0 }}
        exit={{ opacity: 0, translateX: -50 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        style={styles.questionWrapper}
      >
        <AssessmentQuestion
          question={currentQ.question}
          subtitle={currentQ.subtitle}
          options={currentQ.options}
          selectedValue={currentQ.selectedValue}
          onSelect={currentQ.onSelect}
          colors={colors}
        />
      </MotiView>

      {/* Navigation */}
      <View style={styles.footer}>
        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={handleNext}
          disabled={!canAdvance}
          activeOpacity={0.8}
          style={[
            styles.nextButton,
            {
              backgroundColor: canAdvance ? colors.primaryLight : colors.surfaceAlt,
              opacity: canAdvance ? 1 : 0.5,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <Text style={[styles.nextText, { color: canAdvance ? colors.white : colors.textMuted }]}>
            {isLastQuestion ? 'See My Results →' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  questionWrapper: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  nextButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    // shadowColor will be set inline
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  nextText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
  },
});
