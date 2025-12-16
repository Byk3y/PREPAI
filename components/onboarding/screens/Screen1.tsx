/**
 * Screen 1: The Problem
 * Highlights the ineffectiveness of traditional study methods
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiText } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';

interface Screen1Props {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen1({ colors }: Screen1Props) {
  return (
    <View style={styles.screenContainer}>
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        style={styles.emoji}
      >
        📚
      </MotiText>
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={200}
        style={[styles.headline, { color: colors.text }]}
      >
        Does Studying Feel Like a Chore?
      </MotiText>
      <MotiText
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={400}
        style={[styles.body, { color: colors.textSecondary }]}
      >
        Research shows re-reading is one of the least effective study methods.
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
    fontSize: 80,
    marginBottom: 24,
    textAlign: 'center',
  },
  headline: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
    paddingHorizontal: 8,
  },
  body: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
});
