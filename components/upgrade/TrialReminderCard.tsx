/**
 * Trial Reminder Card
 * Banner shown on home screen when trial is ending soon (3 days or less remaining)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors } from '@/lib/ThemeContext';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUBSCRIPTION_CONSTANTS } from '@/lib/constants';
import { useUpgrade } from '@/lib/hooks/useUpgrade';

interface TrialReminderCardProps {
  daysRemaining: number;
  notebooksCount?: number;
  streakDays?: number;
  onDismiss: () => void;
}

export function TrialReminderCard({
  daysRemaining,
  notebooksCount = 0,
  streakDays = 0,
  onDismiss,
}: TrialReminderCardProps) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const router = useRouter();
  const { trackUpgradeButtonClicked, trackReminderDismissed } = useUpgrade();

  const handleDismiss = async () => {
    await AsyncStorage.setItem(SUBSCRIPTION_CONSTANTS.TRIAL_REMINDER_DISMISSED_KEY, 'true');
    trackReminderDismissed(daysRemaining);
    onDismiss();
  };

  const handleViewPlans = () => {
    trackUpgradeButtonClicked('trial_reminder');
    router.push('/upgrade');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.primary + '33', // 20% opacity
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={[styles.title, { color: colors.text }]}>Amazing progress!</Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Trial ends in{' '}
          <Text style={[styles.daysText, { color: colors.primary }]}>
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
          </Text>
        </Text>

        {(notebooksCount > 0 || streakDays > 0) && (
          <View style={styles.stats}>
            {notebooksCount > 0 && (
              <Text style={[styles.stat, { color: colors.textSecondary }]}>
                📚 {notebooksCount} {notebooksCount === 1 ? 'notebook' : 'notebooks'}
              </Text>
            )}
            {streakDays > 0 && (
              <Text style={[styles.stat, { color: colors.textSecondary }]}>
                🔥 {streakDays}-day streak
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleViewPlans}
        >
          <Text style={styles.primaryButtonText}>View Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'Nunito-Regular',
  },
  daysText: {
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: '#FFFFFF',
  },
  dismissButton: {
    padding: 8,
  },
});
