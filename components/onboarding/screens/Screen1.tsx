import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions, Text } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { TypewriterText } from '../components/TypewriterText';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface Screen1Props {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen1({ colors }: Screen1Props) {
  const [headlineComplete, setHeadlineComplete] = useState(false);

  return (
    <View style={styles.screenContainer}>
      {/* Top Section: Character + Speech Bubble */}
      <View style={styles.topSection}>
        {/* Character - Offset slightly to the left */}
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateX: -20 }}
          animate={{ opacity: 1, scale: 1, translateX: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 300 } as any}
          style={styles.characterContainer}
        >
          <MotiView
            animate={{ translateY: [-8, 8, -8] }}
            transition={{ loop: true, type: 'timing', duration: 3000 } as any}
          >
            <Image
              source={require('@/assets/first-screen/overwhelmed_brain.png')}
              style={styles.characterImage}
              resizeMode="contain"
            />
          </MotiView>
        </MotiView>

        {/* Speech Bubble - Pops in above/right of character */}
        <MotiView
          from={{ opacity: 0, scale: 0, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 800 } as any}
          style={[styles.bubbleContainer, { backgroundColor: colors.surfaceElevated }]}
        >
          <TypewriterText
            text="Does Studying Feel Like a Chore?"
            style={[styles.headline, { color: colors.text }]}
            speed={40}
            delay={1200}
            onComplete={() => setHeadlineComplete(true)}
          />
          {/* Bubble Tail */}
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

      {/* Bottom Section: Science Insight Card */}
      <MotiView
        from={{ opacity: 0, translateY: 40 }}
        animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 40 }}
        transition={{ type: 'timing', duration: 600 } as any}
        style={[
          styles.insightCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#F9731620' }]}>
          <Ionicons name="flask" size={18} color="#F97316" />
        </View>
        <View style={styles.insightContent}>
          <Text style={[styles.insightLabel, { color: '#F97316' }]}>SCIENCE INSIGHT</Text>
          <TypewriterText
            text="Research shows re-reading is one of the least effective study methods."
            style={[styles.body, { color: colors.textSecondary }]}
            speed={25}
            startTrigger={headlineComplete}
            delay={300}
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
    flex: 1,
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
    top: '15%',
    right: 10,
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
    left: 40,
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 26,
    textAlign: 'center',
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
