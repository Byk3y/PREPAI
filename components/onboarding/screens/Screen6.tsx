/**
 * Screen 6: Social Proof
 * Shows science-backed statistics and testimonials
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiText, MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { StatisticsCard } from '@/components/onboarding/components/StatisticsCard';
import { TESTIMONIALS } from '@/lib/onboarding/data/testimonials';

interface Screen6Props {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen6({ colors }: Screen6Props) {
  return (
    <View style={styles.screenContainer}>
      <MotiText
        from={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
        style={styles.emoji}
      >
        🧠
      </MotiText>
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={200}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.headline, { color: colors.text }]}
      >
        Backed by Science, Loved by Students
      </MotiText>

      {/* Science-backed statistics */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={400}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.statsContainer}
      >
        <View style={styles.statsRow}>
          <StatisticsCard
            icon="🚀"
            stat="3x"
            description="More effective than re-reading"
            colors={colors}
            delay={500}
          />
          <StatisticsCard
            icon="🧠"
            stat="200%"
            description="Better long-term retention"
            colors={colors}
            delay={600}
          />
        </View>
        <View style={styles.statsRow}>
          <StatisticsCard
            icon="⏱️"
            stat="15 min"
            description="Daily is all you need"
            colors={colors}
            delay={700}
          />
        </View>
      </MotiView>

      {/* Testimonials */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={900}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.testimonialContainer}
      >
        {TESTIMONIALS.map((testimonial, index) => (
          <View
            key={index}
            style={[styles.testimonial, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.testimonialStars, { color: colors.accent }]}>
              {testimonial.stars}
            </Text>
            <Text style={[styles.testimonialText, { color: colors.textSecondary }]}>
              "{testimonial.text}"
            </Text>
            <Text style={[styles.testimonialAuthor, { color: colors.textMuted }]}>
              - {testimonial.author}
            </Text>
          </View>
        ))}
      </MotiView>
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
    marginBottom: 20,
    lineHeight: 34,
    paddingHorizontal: 8,
  },
  statsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  testimonialContainer: {
    gap: 12,
    width: '100%',
  },
  testimonial: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  testimonialStars: {
    fontSize: 14,
    marginBottom: 6,
  },
  testimonialText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Regular',
    lineHeight: 18,
    marginBottom: 6,
  },
  testimonialAuthor: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Regular',
    fontStyle: 'italic',
  },
});
