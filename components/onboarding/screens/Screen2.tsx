import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions, Text } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { TypewriterText } from '../components/TypewriterText';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface Screen2Props {
  colors: ReturnType<typeof getThemeColors>;
}

import SmartBrain from '../../../assets/onboarding-ui/smart_brain.png';

export function Screen2({ colors }: Screen2Props) {
  const [headlineComplete, setHeadlineComplete] = useState(false);

  return (
    <View style={styles.screenContainer}>
      {/* Top Section: Character + Speech Bubble */}
      <View style={styles.topSection}>
        {/* Character - Moving to the Right this time for variety */}
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateX: 20 }}
          animate={{ opacity: 1, scale: 1, translateX: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 300 } as any}
          style={styles.characterContainer}
        >
          <MotiView
            animate={{ translateY: [-8, 8, -8] }}
            transition={{ loop: true, type: 'timing', duration: 3000 } as any}
          >
            <Image
              source={SmartBrain}
              style={styles.characterImage}
              resizeMode="contain"
            />
          </MotiView>
        </MotiView>

        {/* Speech Bubble - Above/Left of character */}
        <MotiView
          from={{ opacity: 0, scale: 0, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 800 } as any}
          style={[styles.bubbleContainer, { backgroundColor: colors.surfaceElevated }]}
        >
          <TypewriterText
            text="Your Brain Learns by Doing, Not Reading"
            style={[styles.headline, { color: colors.text }]}
            speed={40}
            delay={1200}
            onComplete={() => setHeadlineComplete(true)}
          />
          {/* Bubble Tail - Flipped for left side */}
          <View style={styles.bubbleTail}>
            <Svg width="24" height="16" viewBox="0 0 24 16">
              <Path
                d="M12 16L0 0H24L12 16Z"
                fill={colors.surfaceElevated}
              />
            </Svg>
          </View>
        </MotiView>
      </View>

      {/* Center Section: Retention Comparison */}
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: headlineComplete ? 1 : 0, scale: headlineComplete ? 1 : 0.9 }}
        transition={{ type: 'spring', damping: 15, delay: 200 } as any}
        style={styles.comparisonContainer}
      >
        <View style={styles.comparisonRow}>
          <View style={styles.barLabelContainer}>
            <Text style={[styles.barLabel, { color: colors.textSecondary }]}>Passive Reading</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
              <MotiView
                from={{ width: '0%' }}
                animate={{ width: headlineComplete ? '40%' : '0%' }}
                transition={{ type: 'timing', duration: 1000, delay: 500 } as any}
                style={[styles.barFill, { backgroundColor: colors.textMuted }]}
              />
            </View>
          </View>
          <Text style={[styles.percentageText, { color: colors.textMuted }]}>30%</Text>
        </View>

        <View style={styles.comparisonRow}>
          <View style={styles.barLabelContainer}>
            <Text style={[styles.barLabel, { color: '#F97316', fontWeight: '800' }]}>Active Recall (Brigo)</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
              <MotiView
                from={{ width: '0%' }}
                animate={{ width: headlineComplete ? '90%' : '0%' }}
                transition={{ type: 'spring', damping: 12, delay: 700 } as any}
                style={[styles.barFill, { backgroundColor: '#F97316' }]}
              />
            </View>
          </View>
          <Text style={[styles.percentageText, { color: '#F97316', fontWeight: '800' }]}>90%</Text>
        </View>
      </MotiView>

      {/* Bottom Section: Science Insight Card */}
      <MotiView
        from={{ opacity: 0, translateY: 40 }}
        animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 40 }}
        transition={{ type: 'timing', duration: 600, delay: 1500 } as any}
        style={[
          styles.insightCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#F9731620' }]}>
          <Ionicons name="flash" size={18} color="#F97316" />
        </View>
        <View style={styles.insightContent}>
          <Text style={[styles.insightLabel, { color: '#F97316' }]}>WHY IT WORKS</Text>
          <TypewriterText
            text="Retrieving information strengthens neural pathways, making memories permanent."
            style={[styles.body, { color: colors.textSecondary }]}
            speed={25}
            startTrigger={headlineComplete}
            delay={1600}
          />
        </View>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 20,
  },
  topSection: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterContainer: {
    width: width * 0.6,
    height: width * 0.6,
    zIndex: 1,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  bubbleContainer: {
    position: 'absolute',
    top: '10%',
    left: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    width: width * 0.6,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -14,
    right: 40,
    transform: [{ scaleX: -1 }],
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 24,
    textAlign: 'center',
  },
  comparisonContainer: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.5)',
    gap: 16,
    marginBottom: 20,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  barLabelContainer: {
    flex: 1,
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 0.5,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  percentageText: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    width: 40,
    textAlign: 'right',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  body: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Medium',
    lineHeight: 22,
  },
});

