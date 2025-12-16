/**
 * Assessment Question Component
 * Reusable quiz-style question with icon-based options
 * Used for learning style assessment
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/lib/ThemeContext';

// Note: colors parameter should include primary, primaryLight, and white from getThemeColors

export interface AssessmentOption {
  value: string;
  label: string;
  icon: string;
  description?: string;
}

interface AssessmentQuestionProps {
  question: string;
  subtitle?: string;
  options: AssessmentOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  colors: ReturnType<typeof getThemeColors>;
}

export function AssessmentQuestion({
  question,
  subtitle,
  options,
  selectedValue,
  onSelect,
  colors,
}: AssessmentQuestionProps) {
  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(value);
  };

  return (
    <View style={styles.container}>
      {/* Question text */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.questionContainer}
      >
        <Text style={[styles.question, { color: colors.text }]}>{question}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </MotiView>

      {/* Options grid */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={200}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.optionsWrapper}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {options.map((option, index) => {
            const isSelected = selectedValue === option.value;

            return (
              <MotiView
                key={option.value}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                delay={300 + index * 100}
                transition={{ type: 'spring', damping: 15, stiffness: 150 }}
              >
                <TouchableOpacity
                  onPress={() => handleSelect(option.value)}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: isSelected ? colors.white : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text
                      style={[
                        styles.optionDescription,
                        { color: isSelected ? colors.primaryLight : colors.textSecondary },
                      ]}
                    >
                      {option.description}
                    </Text>
                  )}
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </ScrollView>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  questionContainer: {
    marginBottom: 24,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  optionsContainer: {
    gap: 12,
    paddingBottom: 16,
  },
  optionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    minHeight: 100,
  },
  optionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk-SemiBold',
    textAlign: 'center',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
