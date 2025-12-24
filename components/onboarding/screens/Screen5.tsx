import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { TypewriterText } from '../components/TypewriterText';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface Screen5Props {
  colors: ReturnType<typeof getThemeColors>;
}

import NovaBubble from '../../../assets/pets/stage-1/bubble.png';

export function Screen5({ colors }: Screen5Props) {
  const [headlineComplete, setHeadlineComplete] = useState(false);

  const handleHeadlineComplete = useCallback(() => {
    setHeadlineComplete(true);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Section: Evolved Mentor + Speech Bubble */}
      <View style={styles.topSection}>
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 300 } as any}
          style={styles.petContainer}
        >
          <MotiView
            animate={{ translateY: [-6, 6, -6] }}
            transition={{ loop: true, type: 'timing', duration: 3200 } as any}
          >
            <Image
              source={NovaBubble}
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
            text="Imagine this... you're walking into your big session feeling focused and prepared."
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

      {/* Dream Content */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 20 }}
        transition={{ type: 'timing', duration: 600, delay: 200 } as any}
        style={styles.resultsWrapper}
      >
        {/* Success Transformation Card */}
        <View style={[styles.successCard, { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="sparkles" size={20} color="white" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>THE DREAM RESULT</Text>
          </View>

          <View style={styles.comparisonRow}>
            <View style={styles.outcomeHalf}>
              <View style={[styles.statusIndicator, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="close-circle" size={14} color="#EF4444" />
                <Text style={[styles.statusText, { color: '#EF4444' }]}>BEFORE</Text>
              </View>
              <Text style={[styles.outcomeDesc, { color: colors.textSecondary }]}>
                Last-minute cramming, anxiety, and fast forgetting.
              </Text>
            </View>

            <View style={styles.outcomeHalf}>
              <View style={[styles.statusIndicator, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={[styles.statusText, { color: '#10B981' }]}>WITH ME</Text>
              </View>
              <Text style={[styles.outcomeDesc, { color: colors.textSecondary }]}>
                Deep retention, calm focus, and total exam mastery.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.benefitList}>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark" size={18} color="#F97316" />
              <Text style={[styles.benefitText, { color: colors.text }]}>Retain 90% of what you learn</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="time" size={18} color="#F97316" />
              <Text style={[styles.benefitText, { color: colors.text }]}>Cut study time in half</Text>
            </View>
          </View>
        </View>

        {/* Motivational Footer Note */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 800 } as any}
          style={[styles.motivationBox, { backgroundColor: '#F9731610', borderColor: '#F9731630' }]}
        >
          <Text style={[styles.motivationText, { color: colors.text }]}>
            “Small daily steps create massive transformations.”
          </Text>
        </MotiView>
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
    paddingBottom: 140,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
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
    marginTop: -10,
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
  resultsWrapper: {
    flex: 1,
  },
  successCard: {
    padding: 24,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 1,
    opacity: 0.6,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 24,
  },
  outcomeHalf: {
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 0.5,
  },
  outcomeDesc: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 24,
  },
  benefitList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  motivationBox: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  motivationText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

