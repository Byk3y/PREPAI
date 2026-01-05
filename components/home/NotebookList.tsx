/**
 * Notebook list component for home screen
 * Renders ScrollView with notebooks, banners, and refresh control
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { NotebookCard } from '@/components/NotebookCard';
import { TrialReminderCard } from '@/components/upgrade/TrialReminderCard';
import { LimitedAccessBanner } from '@/components/upgrade/LimitedAccessBanner';
import { StreakRestoreBanner } from '@/components/home/StreakRestoreBanner';
import { TikTokLoader } from '@/components/TikTokLoader';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import type { Notebook } from '@/lib/store';

interface NotebookListProps {
  notebooks: Notebook[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onNotebookPress: (id: string) => void;
  onCreateNotebook: () => void;
  showTrialReminder: boolean;
  daysRemaining: number;
  notebooksCount: number;
  streakDays: number;
  showLimitedAccess: boolean;
  accessibleCount: number;
  totalCount: number;
  onUpgrade: () => void;
  onDismissTrialReminder: () => void;
  showStreakRestore?: boolean;
  previousStreak?: number;
  restoresLeft?: number;
  onRestoreStreak?: () => Promise<void>;
  onDismissStreakRestore?: () => void;
}

export function NotebookList({
  notebooks,
  isRefreshing,
  onRefresh,
  onNotebookPress,
  onCreateNotebook,
  showTrialReminder,
  daysRemaining,
  notebooksCount,
  streakDays,
  showLimitedAccess,
  accessibleCount,
  totalCount,
  onUpgrade,
  onDismissTrialReminder,
  showStreakRestore,
  previousStreak = 0,
  restoresLeft = 0,
  onRestoreStreak,
  onDismissStreakRestore,
}: NotebookListProps) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 160,
        flexGrow: 1, // allow pull-to-refresh from anywhere
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="transparent"
          colors={['transparent']}
          style={{ backgroundColor: 'transparent' }}
        />
      }
    >
      {isRefreshing && (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <TikTokLoader size={10} color="#6366f1" containerWidth={60} />
        </View>
      )}

      {/* Streak Restore Banner */}
      {showStreakRestore && onRestoreStreak && onDismissStreakRestore && (
        <StreakRestoreBanner
          previousStreak={previousStreak}
          restoresLeft={restoresLeft}
          onRestore={onRestoreStreak}
          onDismiss={onDismissStreakRestore}
        />
      )}

      {/* Trial Reminder (3 days or less remaining) */}
      {showTrialReminder && (
        <TrialReminderCard
          daysRemaining={daysRemaining}
          onDismiss={onDismissTrialReminder}
        />
      )}

      {/* Limited Access Banner (trial expired) */}
      {showLimitedAccess && (
        <LimitedAccessBanner
          accessibleCount={accessibleCount}
          totalCount={totalCount}
          onUpgrade={onUpgrade}
        />
      )}

      {/* Notebook Cards */}
      {notebooks.map((notebook) => (
        <NotebookCard
          key={notebook.id}
          notebook={notebook}
          onPress={() => onNotebookPress(notebook.id)}
        />
      ))}

    </ScrollView>
  );
}







