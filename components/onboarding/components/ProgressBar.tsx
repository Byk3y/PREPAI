/**
 * ProgressBar - Enhanced progress indicator with milestones
 * Shows current step out of total with milestone celebrations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ProgressBarProps {
  current: number;
  total: number;
  onBack?: () => void;
  barColor?: string;
}

export function ProgressBar({ current, total, onBack, barColor }: ProgressBarProps) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Use barColor or default orange
  const fillColor = barColor || '#F97316';

  const textColor = colors.text;
  const mutedTextColor = colors.textMuted;

  // Calculate milestones
  const isMidpoint = current === Math.ceil(total / 2);
  const isNearEnd = current === total - 1;
  const canGoBack = current > 1 && onBack;

  const handleBack = () => {
    if (canGoBack) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onBack();
    }
  };

  return (
    <View style={styles.progressContainer}>
      {/* Progress bar with back button */}
      <View style={styles.progressBarRow}>
        {canGoBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={textColor} />
          </TouchableOpacity>
        )}
        <View style={[styles.progressBarTrack, { backgroundColor: colors.borderLight, flex: 1 }]}>
          <MotiView
            animate={{ width: `${(current / total) * 100}%` }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 100,
            } as any}
            style={[styles.progressBarFill, { backgroundColor: fillColor }]}
          />
        </View>
      </View>

      {/* Progress text with step counter */}
      <View style={styles.progressTextContainer}>
        <Text style={[styles.progressText, { color: mutedTextColor }]}>
          Step {current} of {total}
        </Text>
      </View>

      {/* Milestone celebrations */}
      {isMidpoint && (
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 } as any}
          style={styles.milestoneContainer}
        >
          <MotiText style={[styles.milestoneText, { color: colors.text }]}>
            You're halfway there! 🎉
          </MotiText>
        </MotiView>
      )}

      {isNearEnd && (
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 } as any}
          style={styles.milestoneContainer}
        >
          <MotiText style={[styles.milestoneText, { color: colors.text }]}>
            Almost there! 🚀
          </MotiText>
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressTextContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  milestoneContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  milestoneText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
    textAlign: 'center',
  },
});
