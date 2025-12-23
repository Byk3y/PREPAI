import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { AssessmentQuestion, type AssessmentOption } from '@/components/onboarding/components/AssessmentQuestion';
import { TypewriterText } from '../components/TypewriterText';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface Screen4AssessmentProps {
  colors: ReturnType<typeof getThemeColors>;
  onComplete: () => void;
}

export function Screen4_Assessment({ colors, onComplete }: Screen4AssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [headlineComplete, setHeadlineComplete] = useState(false);

  const {
    studyGoal,
    learningStyle,
    dailyCommitmentMinutes,
    setStudyGoal,
    setLearningStyle,
    setDailyCommitment,
  } = useStore();

  const handleHeadlineComplete = useCallback(() => {
    setHeadlineComplete(true);
  }, []);

  // Reset headline status when question changes
  useEffect(() => {
    setHeadlineComplete(false);
  }, [currentQuestion]);

  // Question 1: Study Goal
  const studyGoalOptions: AssessmentOption[] = [
    {
      value: 'exam_prep',
      label: 'Ace My Exams',
      icon: 'trophy-outline',
      description: 'Focused preparation for upcoming tests',
    },
    {
      value: 'retention',
      label: 'Long-term Learning',
      icon: 'library-outline',
      description: 'Remember for years, not just weeks',
    },
    {
      value: 'quick_review',
      label: 'Quick Reviews',
      icon: 'flash-outline',
      description: 'Fast refreshers for busy schedules',
    },
    {
      value: 'all',
      label: 'All of the Above',
      icon: 'star-outline',
      description: 'Flexible approach for all needs',
    },
  ];

  // Question 2: Learning Style
  const learningStyleOptions: AssessmentOption[] = [
    {
      value: 'visual',
      label: 'Visual',
      icon: 'images-outline',
      description: 'Charts, diagrams, and images',
    },
    {
      value: 'auditory',
      label: 'Listening',
      icon: 'headset-outline',
      description: 'Podcasts and audio summaries',
    },
    {
      value: 'reading',
      label: 'Reading',
      icon: 'reader-outline',
      description: 'Notes and written content',
    },
    {
      value: 'practice',
      label: 'Hands-On',
      icon: 'construct-outline',
      description: 'Quizzes and active practice',
    },
  ];

  // Question 3: Daily Commitment
  const commitmentOptions: AssessmentOption[] = [
    {
      value: '10',
      label: '5-15 minutes',
      icon: 'cafe-outline',
      description: 'Quick daily sessions',
    },
    {
      value: '25',
      label: '15-30 minutes',
      icon: 'timer-outline',
      description: 'Balanced study time',
    },
    {
      value: '45',
      label: '30-60 minutes',
      icon: 'flame-outline',
      description: 'Deep focus sessions',
    },
    {
      value: '75',
      label: '60+ minutes',
      icon: 'rocket-outline',
      description: 'Intensive learning',
    },
  ];

  const questions = [
    {
      question: "So, what's your main study goal today?",
      subtitle: 'I will tailor your practice for this.',
      options: studyGoalOptions,
      selectedValue: studyGoal || null,
      onSelect: (value: string) => {
        setStudyGoal(value as 'exam_prep' | 'retention' | 'quick_review' | 'all');
        handleNext(true); // Auto-advance for better flow
      },
    },
    {
      question: 'How do you usually learn best?',
      subtitle: "I'll use this to create your materials.",
      options: learningStyleOptions,
      selectedValue: learningStyle || null,
      onSelect: (value: string) => {
        setLearningStyle(value as 'visual' | 'auditory' | 'reading' | 'practice');
        handleNext(true);
      },
    },
    {
      question: 'How much time can we study daily?',
      subtitle: 'Consistency is our best friend.',
      options: commitmentOptions,
      selectedValue: dailyCommitmentMinutes?.toString() || null,
      onSelect: (value: string) => {
        setDailyCommitment(parseInt(value, 10));
        // Don't auto-advance on last question to let user see selection
      },
    },
  ];

  const currentQ = questions[currentQuestion];
  const canAdvance = currentQ.selectedValue !== null;
  const isLastQuestion = currentQuestion === questions.length - 1;

  const handleNext = (isAuto = false) => {
    // If it's an auto-advance from selection, wait a moment for the user to see the state change
    const delay = isAuto ? 400 : 0;

    setTimeout(() => {
      if (isLastQuestion) {
        onComplete();
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCurrentQuestion((prev) => prev + 1);
      }
    }, delay);
  };


  return (
    <View style={styles.container}>
      {/* Character Section */}
      <View style={styles.characterSection}>
        {/* Character - Thinking Brain */}
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateX: -20 }}
          animate={{ opacity: 1, scale: 1, translateX: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 200 } as any}
          style={styles.characterContainer}
        >
          <MotiView
            animate={{ translateY: [-4, 4, -4] }}
            transition={{ loop: true, type: 'timing', duration: 3500 } as any}
          >
            <Image
              source={require('@/assets/first-screen/thinking_brain.png')}
              style={styles.characterImage}
              resizeMode="contain"
            />
          </MotiView>
        </MotiView>

        {/* Speech Bubble */}
        <MotiView
          from={{ opacity: 0, scale: 0, translateX: 20, translateY: 10 }}
          animate={{ opacity: 1, scale: 1, translateX: 0, translateY: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 500 } as any}
          style={[styles.bubbleContainer, { backgroundColor: colors.surfaceElevated }]}
        >
          <TypewriterText
            key={currentQuestion}
            text={currentQ.question}
            style={[styles.questionText, { color: colors.text }]}
            speed={40}
            delay={800}
            onComplete={handleHeadlineComplete}
          />
          <View style={styles.bubbleTail}>
            <Svg width="20" height="14" viewBox="0 0 20 14">
              <Path d="M10 14L0 0H20L10 14Z" fill={colors.surfaceElevated} />
            </Svg>
          </View>
        </MotiView>
      </View>

      {/* Local Progress Indicator - Segmented Design */}
      <View style={styles.progressWrapper}>
        <View style={styles.segmentedContainer}>
          {questions.map((_, index) => {
            const isActive = index === currentQuestion;
            const isCompleted = index < currentQuestion;

            return (
              <View key={index} style={styles.segmentWrapper}>
                <MotiView
                  animate={{
                    backgroundColor: isCompleted || isActive ? '#3B82F6' : colors.borderLight,
                    scaleY: isActive ? 1.2 : 1,
                    opacity: isActive ? 1 : (isCompleted ? 0.8 : 0.4)
                  }}
                  transition={{ type: 'spring', damping: 20 } as any}
                  style={styles.segmentPill}
                />
              </View>
            );
          })}
        </View>
        <MotiView
          key={currentQuestion}
          from={{ opacity: 0, translateY: 5 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.progressTextWrapper}
        >
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Step {currentQuestion + 1} of {questions.length}
          </Text>
        </MotiView>
      </View>

      {/* Options Section - 2x2 Grid */}
      <MotiView
        key={currentQuestion}
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: headlineComplete ? 1 : 0, scale: headlineComplete ? 1 : 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 } as any}
        style={styles.optionsGridWrapper}
      >
        <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
          {currentQ.subtitle}
        </Text>

        <View style={styles.gridContainer}>
          {currentQ.options.map((option, index) => {
            const isSelected = currentQ.selectedValue === option.value;
            return (
              <MotiView
                key={option.value}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 15, delay: index * 100 } as any}
                style={[styles.gridItemWrapper, { width: '48%' }]}
              >
                <TouchableOpacity
                  onPress={() => currentQ.onSelect(option.value)}
                  activeOpacity={0.8}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? '#F9731608' : colors.surfaceElevated,
                      borderColor: isSelected ? '#F97316' : 'transparent',
                      borderWidth: 2.5,
                    }
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={32}
                    color="#F97316"
                    style={{ marginBottom: 8, opacity: isSelected ? 1 : 0.7 }}
                  />
                  <Text style={[
                    styles.optionLabel,
                    { color: colors.text }
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.optionDesc,
                    { color: colors.textSecondary }
                  ]}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </View>
      </MotiView>

      {/* Footer / Results Button */}
      <View style={styles.footerSpace}>
        {isLastQuestion && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: canAdvance ? 1 : 0, translateY: canAdvance ? 0 : 20 }}
            style={styles.footer}
          >
            <TouchableOpacity
              onPress={() => handleNext()}
              activeOpacity={0.8}
              style={[styles.nextButton, { backgroundColor: '#F97316' }]}
            >
              <Text style={styles.nextText}>See My Results</Text>
              <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </MotiView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  characterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 120,
    marginBottom: 5,
  },
  characterContainer: {
    width: 90,
    height: 90,
    marginRight: 10,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  bubbleContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  bubbleTail: {
    position: 'absolute',
    left: -10,
    bottom: 20,
    transform: [{ rotate: '90deg' }],
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 22,
  },
  progressWrapper: {
    paddingHorizontal: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  segmentedContainer: {
    flexDirection: 'row',
    height: 6,
    width: '100%',
    gap: 8,
    marginBottom: 10,
  },
  segmentWrapper: {
    flex: 1,
    height: '100%',
  },
  segmentPill: {
    height: '100%',
    borderRadius: 3,
    width: '100%',
  },
  progressTextWrapper: {
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    opacity: 0.8,
  },
  optionsGridWrapper: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitleText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItemWrapper: {
    marginBottom: 12,
  },
  optionCard: {
    padding: 16,
    borderRadius: 24,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 14,
  },
  footerSpace: {
    height: 100,
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  nextButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
  },
});

