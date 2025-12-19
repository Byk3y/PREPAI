/**
 * Quiz Results Component
 * Displays quiz completion results with metrics and actions
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { QuizResultsProps } from '@/lib/quiz/types';
import { RESULTS_COLORS, BUTTON_COLORS } from '@/lib/quiz/constants';

export function QuizResults({
  scorePercent,
  correctCount,
  totalQuestions,
  wrongCount,
  skippedCount,
  onClose,
  onRetake,
  onReview,
  colors,
  isDarkMode,
  onPlaySound,
  onHaptic,
}: QuizResultsProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quiz Complete</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Score Circle */}
          <View
            style={[
              styles.scoreCircle,
              {
                backgroundColor: isDarkMode ? RESULTS_COLORS.scoreBgDark : RESULTS_COLORS.scoreBgLight,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreText,
                { color: isDarkMode ? RESULTS_COLORS.scoreTextDark : RESULTS_COLORS.scoreTextLight },
              ]}
            >
              {scorePercent}%
            </Text>
          </View>

          {/* Title and Description */}
          <Text style={[styles.title, { color: colors.text }]}>Great job!</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            You got {correctCount} out of {totalQuestions} questions correct
          </Text>

          {/* Summary Cards */}
          <View style={styles.cardsContainer}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Score</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>
                {correctCount} / {totalQuestions}
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Accuracy</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>{scorePercent}%</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Right</Text>
              <Text style={[styles.cardValue, { color: RESULTS_COLORS.correctCount }]}>{correctCount}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Wrong</Text>
              <Text style={[styles.cardValue, { color: RESULTS_COLORS.wrongCount }]}>{wrongCount}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Skipped</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>{skippedCount}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={() => {
                onPlaySound('start');
                onHaptic('selection');
                onRetake();
              }}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Retake Quiz</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onPlaySound('tap');
                onHaptic('selection');
                onReview();
              }}
              style={[styles.primaryButton, { backgroundColor: BUTTON_COLORS.primary }]}
            >
              <Text style={[styles.primaryButtonText, { color: BUTTON_COLORS.primaryText }]}>
                Review Answers
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
  },
  headerSpacer: {
    width: 28,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  scoreCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 48,
    fontFamily: 'Nunito-Bold',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Nunito-Regular',
  },
  cardsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 40,
  },
  card: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'Nunito-Regular',
  },
  cardValue: {
    fontSize: 24,
    fontFamily: 'Nunito-SemiBold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 20,
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

