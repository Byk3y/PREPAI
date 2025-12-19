/**
 * ProgressSummary - Displays user's progress stats for upgrade screens
 * Shows notebooks, flashcards studied, streak, and pet level
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

interface ProgressSummaryProps {
  notebooksCount: number;
  flashcardsStudied: number;
  streakDays: number;
  petName: string;
  petLevel: number;
  compact?: boolean;
}

export function ProgressSummary({
  notebooksCount,
  flashcardsStudied,
  streakDays,
  petName,
  petLevel,
  compact = false,
}: ProgressSummaryProps) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <View style={styles.contentWrapper}>
        <View style={styles.content}>
          <View style={styles.row}>
        <Text style={styles.emoji}>📚</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          <Text style={styles.number}>{notebooksCount}</Text>
          <Text style={styles.label}> {notebooksCount === 1 ? 'notebook' : 'notebooks'}</Text>
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.emoji}>🎴</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          <Text style={styles.number}>{flashcardsStudied}</Text>
          <Text style={styles.label}> flashcards studied</Text>
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          <Text style={styles.number}>{streakDays}</Text>
          <Text style={styles.label}>-day streak</Text>
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.emoji}>🐾</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          <Text style={styles.label}>{petName} - </Text>
          <Text style={styles.number}>Level {petLevel}</Text>
        </Text>
      </View>
        </View>
        <Text style={styles.confettiEmoji}>🎉</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  emoji: {
    fontSize: 20,
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
  },
  number: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
  },
  label: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
  },
  confettiEmoji: {
    fontSize: 40,
    marginLeft: 12,
  },
});
