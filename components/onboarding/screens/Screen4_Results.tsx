/**
 * Screen 4: Assessment Results (Part 2)
 * Shows personalized insights based on assessment answers
 * Displays recommended methods and pet companion message
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';

interface Screen4ResultsProps {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen4_Results({ colors }: Screen4ResultsProps) {
  const {
    generateRecommendations,
    recommendedMethods,
    personalizedMessage,
    petMessage,
  } = useStore();

  // Generate recommendations when component mounts
  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  return (
    <View style={styles.screenContainer}>
      {/* Success icon */}
      <MotiText
        from={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
        style={styles.successIcon}
      >
        ✨
      </MotiText>

      {/* Headline */}
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={200}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.headline, { color: colors.text }]}
      >
        Your Learning Profile
      </MotiText>

      {/* Personalized message */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={400}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.messageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>
          {personalizedMessage}
        </Text>
      </MotiView>

      {/* Recommended methods */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={600}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.methodsContainer}
      >
        <Text style={[styles.methodsHeading, { color: colors.text }]}>
          Your Personalized Tools
        </Text>
        <View style={styles.methodsList}>
          {recommendedMethods.map((method, index) => (
            <MotiView
              key={method}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              delay={700 + index * 100}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              style={[styles.methodItem, { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.methodIcon, { color: colors.success }]}>✓</Text>
              <Text style={[styles.methodText, { color: colors.text }]}>{method}</Text>
            </MotiView>
          ))}
        </View>
      </MotiView>

      {/* Pet companion message */}
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        delay={1000}
        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
        style={[
          styles.petMessageCard,
          { backgroundColor: `${colors.primary}10`, borderColor: colors.primary },
        ]}
      >
        <Text style={styles.petMessageIcon}>🐾</Text>
        <Text style={[styles.petMessageHeading, { color: colors.primary }]}>
          Your Study Companion Says:
        </Text>
        <Text style={[styles.petMessageText, { color: colors.text }]}>
          {petMessage}
        </Text>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
    textAlign: 'center',
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  messageCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    lineHeight: 22,
    textAlign: 'center',
  },
  methodsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  methodsHeading: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk-SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  methodsList: {
    gap: 8,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 10,
  },
  methodIcon: {
    fontSize: 16,
    // Color will be set inline using colors.success
    fontWeight: '700',
  },
  methodText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Medium',
    flex: 1,
  },
  petMessageCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
  },
  petMessageIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  petMessageHeading: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  petMessageText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
});
