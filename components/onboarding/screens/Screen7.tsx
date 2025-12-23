import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { formatMinutes } from '@/lib/utils/time';
import { TypewriterText } from '../components/TypewriterText';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface Screen7Props {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen7({ colors }: Screen7Props) {
  const { dailyCommitmentMinutes, learningStyle } = useStore();
  const [headlineComplete, setHeadlineComplete] = useState(false);

  // Get personalized commitment time (default to 15 if not set)
  const commitmentTime = dailyCommitmentMinutes || 15;
  const timeDisplay = formatMinutes(commitmentTime);

  const handleHeadlineComplete = useCallback(() => {
    setHeadlineComplete(true);
  }, []);

  // Personalized subtitle based on learning style
  const getPersonalizedSubtitle = () => {
    if (learningStyle === 'practice') {
      return `Just ${timeDisplay} of practice daily—built for how you learn best.`;
    } else if (learningStyle === 'visual') {
      return `Just ${timeDisplay} daily with visual learning—made for you.`;
    } else if (learningStyle === 'reading') {
      return `Just ${timeDisplay} of smart reading daily—your way.`;
    } else if (learningStyle === 'auditory') {
      return `Just ${timeDisplay} of audio learning daily—tailored for you.`;
    }
    return `Study just ${timeDisplay} per day—small steps, big results.`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Section: Mentor + Speech Bubble */}
      <View style={styles.topSection}>
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 300 } as any}
          style={styles.petContainer}
        >
          <MotiView
            animate={{ translateY: [-8, 8, -8], scale: [1, 1.05, 1] }}
            transition={{ loop: true, type: 'timing', duration: 3000 } as any}
          >
            <Image
              source={require('@/assets/pets/stage-1/full-view.png')}
              style={styles.petImage}
              resizeMode="contain"
            />
          </MotiView>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.8, translateY: 10 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 600 } as any}
          style={[styles.bubbleContainer, { backgroundColor: colors.surfaceElevated }]}
        >
          <TypewriterText
            text="You're all set! Ready to transform your learning journey?"
            style={[styles.headline, { color: colors.text }]}
            speed={35}
            delay={1000}
            onComplete={handleHeadlineComplete}
          />
          <View style={styles.bubbleTail}>
            <Svg width="24" height="16" viewBox="0 0 24 16">
              <Path d="M12 16L0 0H24L12 16Z" fill={colors.surfaceElevated} />
            </Svg>
          </View>
        </MotiView>
      </View>

      {/* Offer Section */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 20 }}
        transition={{ type: 'timing', duration: 600, delay: 200 } as any}
        style={styles.contentWrapper}
      >
        <View style={[styles.offerCard, { backgroundColor: colors.surfaceElevated }]}>
          <View style={[styles.trialBadge, { backgroundColor: '#F97316' }]}>
            <Text style={styles.trialBadgeText}>7-DAY FREE TRIAL</Text>
          </View>

          <Text style={[styles.offerTitle, { color: colors.text }]}>
            Unlock Full Potential
          </Text>

          <Text style={[styles.offerSubtitle, { color: colors.textSecondary }]}>
            {getPersonalizedSubtitle()}
          </Text>

          <View style={styles.benefitList}>
            <View style={styles.benefitItem}>
              <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text style={[styles.benefitText, { color: colors.text }]}>AI-powered practice sessions</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text style={[styles.benefitText, { color: colors.text }]}>Unlimited study materials</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text style={[styles.benefitText, { color: colors.text }]}>Personal AI Mentor evolution</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.noCommitment}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.noCommitmentText, { color: colors.textMuted }]}>
              No credit card required • Cancel anytime
            </Text>
          </View>
        </View>

        <Text style={[styles.motivation, { color: colors.textMuted }]}>
          Join students who actually remember what they study
        </Text>
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 25,
  },
  petContainer: {
    width: width * 0.45,
    height: width * 0.45,
    zIndex: 1,
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  bubbleContainer: {
    marginTop: -5,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 24,
    width: '100%',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -15,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headline: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 24,
    textAlign: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  offerCard: {
    padding: 24,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 24,
    alignItems: 'center',
  },
  trialBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  trialBadgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 1,
  },
  offerTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  offerSubtitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  benefitList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20,
  },
  noCommitment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noCommitmentText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  motivation: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

