/**
 * Quiz Navigation Component
 * Previous/Next/Finish buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { QuizNavigationProps } from '@/lib/quiz/types';
import { BUTTON_COLORS } from '@/lib/quiz/constants';

export function QuizNavigation({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  colors,
}: QuizNavigationProps) {
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <View style={styles.container}>
      {isFirstQuestion ? (
        <View style={styles.singleButtonContainer}>
          <TouchableOpacity
            onPress={onNext}
            style={[styles.primaryButton, { backgroundColor: BUTTON_COLORS.primary }]}
          >
            <Text style={[styles.primaryButtonText, { color: BUTTON_COLORS.primaryText }]}>
              {isLastQuestion ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={onPrevious}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNext}
            style={[styles.primaryButton, { backgroundColor: BUTTON_COLORS.primary }]}
          >
            <Text style={[styles.primaryButtonText, { color: BUTTON_COLORS.primaryText }]}>
              {isLastQuestion ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    marginBottom: 8,
  },
  singleButtonContainer: {
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  primaryButton: {
    width: 140,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    textAlign: 'center',
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
  },
  secondaryButton: {
    width: 140,
    borderWidth: 2,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    textAlign: 'center',
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
  },
});



