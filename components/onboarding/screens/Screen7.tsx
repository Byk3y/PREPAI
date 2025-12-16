/**
 * Screen 7: Trial Offer
 * Final screen with personalized trial offer and commitment language
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiText, MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { formatMinutes } from '@/lib/utils/time';

interface Screen7Props {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen7({ colors }: Screen7Props) {
  const { dailyCommitmentMinutes, learningStyle } = useStore();

  // Get personalized commitment time (default to 15 if not set)
  const commitmentTime = dailyCommitmentMinutes || 15;
  const timeDisplay = formatMinutes(commitmentTime);

  // Personalized subtitle based on learning style
  const getPersonalizedSubtitle = () => {
    if (learningStyle === 'practice') {
      return `Just ${timeDisplay} of practice daily—built for how you learn best`;
    } else if (learningStyle === 'visual') {
      return `Just ${timeDisplay} daily with visual learning—made for you`;
    } else if (learningStyle === 'reading') {
      return `Just ${timeDisplay} of smart reading daily—your way`;
    } else if (learningStyle === 'auditory') {
      return `Just ${timeDisplay} of audio learning daily—tailored for you`;
    }
    return `Study just ${timeDisplay} per day—small steps, big results`;
  };

  return (
    <View style={styles.screenContainer}>
      <MotiText
        from={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
        style={styles.emoji}
      >
        🎓
      </MotiText>
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={200}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.headline, { color: colors.text }]}
      >
        Start Your 7-Day Free Trial
      </MotiText>

      {/* Personalized commitment message */}
      <MotiText
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={300}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.subtitle, { color: colors.textSecondary }]}
      >
        {getPersonalizedSubtitle()}
      </MotiText>

      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={400}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.featureList}
      >
        <View style={styles.featureItem}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
            AI-powered practice that makes learning stick
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
            Unlimited notebooks and study materials
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
            Your personal AI study companion
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
            No credit card • Cancel anytime
          </Text>
        </View>
      </MotiView>
      <MotiText
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={600}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.encouragement, { color: colors.textMuted }]}
      >
        Join students who actually remember what they study
      </MotiText>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
    textAlign: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  featureList: {
    marginTop: 20,
    gap: 14,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkmark: {
    fontSize: 18,
    // Color will be set inline using colors.success
    fontWeight: '700',
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    flex: 1,
    lineHeight: 21,
  },
  encouragement: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
