/**
 * Screen 5: The Dream
 * Paints the picture of success
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiText } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';

interface Screen5Props {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen5({ colors }: Screen5Props) {
  return (
    <View style={styles.screenContainer}>
      <MotiText
        from={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500 }}
        style={styles.emoji}
      >
        🏆
      </MotiText>
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={200}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.headline, { color: colors.text }]}
      >
        Imagine This...
      </MotiText>
      <MotiText
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={400}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.body, { color: colors.textSecondary }]}
      >
        Walk into exams prepared, not panicked—because you've actually tested yourself.
      </MotiText>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 100, // Extra padding to account for footer button
    alignItems: 'center',
    justifyContent: 'flex-start',
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
