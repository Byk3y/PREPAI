/**
 * Notebook list component for home screen
 * Renders ScrollView with notebooks, banners, and refresh control
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { NotebookCard } from '@/components/NotebookCard';
import { TrialReminderCard } from '@/components/upgrade/TrialReminderCard';
import { LimitedAccessBanner } from '@/components/upgrade/LimitedAccessBanner';
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
        paddingBottom: 120,
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

      {/* Trial Reminder (3 days or less remaining) */}
      {showTrialReminder && (
        <TrialReminderCard
          daysRemaining={daysRemaining}
          notebooksCount={notebooksCount}
          streakDays={streakDays}
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

      {/* Add New Button (List Item) */}
      <TouchableOpacity
        onPress={onCreateNotebook}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        <Text
          style={{
            fontSize: 16,
            fontFamily: 'Nunito-SemiBold',
            color: colors.textSecondary,
          }}
        >
          + Add New Notebook
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

