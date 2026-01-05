/**
 * Trial Reminder Card
 * Compact banner shown on home screen when trial is ending soon (3 days or less remaining)
 * Matches the width and style of notebook cards
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

  // Get urgency color based on days remaining
  const getUrgencyColors = (): [string, string] => {
    if (daysRemaining <= 1) {
      // Urgent - warm orange/red gradient
      return isDarkMode
        ? ['#7c2d12', '#4a1e0a']
        : ['#fed7aa', '#fecaca'];
    }
    // Normal - subtle blue gradient
    return isDarkMode
      ? ['#1e3a5f', '#1e293b']
      : ['#dbeafe', '#e0e7ff'];
  };

  const gradientColors = getUrgencyColors();

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Left side - Emoji and trial info */}
        <View style={styles.leftSection}>
          <Text style={styles.emoji}>⏳</Text>
          <View style={styles.textContent}>
            <Text style={[styles.title, { color: colors.text }]}>
              Trial ends in{' '}
              <Text style={[styles.daysText, { color: daysRemaining <= 1 ? (isDarkMode ? '#f97316' : '#ea580c') : colors.primary }]}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
              </Text>
            </Text>
          </View>
        </View>

        {/* Right side - Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.upgradeButton,
              {
                backgroundColor: daysRemaining <= 1
                  ? (isDarkMode ? '#f97316' : '#ea580c')
                  : colors.primary
              }
            ]}
            onPress={handleViewPlans}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up-circle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 22,
    marginRight: 10,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
  },
  daysText: {
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: '#FFFFFF',
  },
  dismissButton: {
    padding: 4,
  },
});
