/**
 * StatisticsCard - Displays science-backed statistics
 * Used in social proof section
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';

interface StatisticsCardProps {
  icon: string;
  stat: string;
  description: string;
  colors: ReturnType<typeof getThemeColors>;
  delay?: number;
}

export function StatisticsCard({
  icon,
  stat,
  description,
  colors,
  delay = 0,
}: StatisticsCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      delay={delay}
      transition={{ type: 'spring', damping: 15, stiffness: 100 }}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.stat, { color: colors.text }]}>{stat}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  stat: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 16,
  },
});
