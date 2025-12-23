import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { TypewriterText } from '../components/TypewriterText';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

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

  const [headlineComplete, setHeadlineComplete] = useState(false);

  const handleHeadlineComplete = useCallback(() => {
    setHeadlineComplete(true);
  }, []);

  // Generate recommendations when component mounts
  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  return (
    <ScrollView
      style={styles.screenContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Top Section: Character + Speech Bubble */}
      <View style={styles.topSection}>
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 300 } as any}
          style={styles.characterContainer}
        >
          <MotiView
            animate={{ translateY: [-8, 8, -8] }}
            transition={{ loop: true, type: 'timing', duration: 3000 } as any}
          >
            <Image
              source={require('@/assets/first-screen/success_brain.png')}
              style={styles.characterImage}
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
            text="I've got it! I've built your custom learning strategy."
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

      {/* Results Content */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 20 }}
        transition={{ type: 'timing', duration: 600, delay: 200 } as any}
        style={styles.resultsWrapper}
      >
        {/* Strategy Summary Card */}
        <View style={[styles.strategyCard, { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#F97316' }]}>
              <Ionicons name="sparkles" size={20} color="white" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>YOUR STRATEGY</Text>
          </View>

          <Text style={[styles.messageText, { color: colors.textSecondary }]}>
            {personalizedMessage}
          </Text>

          <View style={styles.divider} />

          <View style={styles.methodsGrid}>
            {recommendedMethods.map((method, index) => (
              <View key={method} style={styles.methodTag}>
                <Ionicons name="checkmark-circle" size={16} color="#F97316" />
                <Text style={[styles.methodText, { color: colors.text }]}>{method}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pet Companion Note */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 800 } as any}
          style={[styles.petNote, { backgroundColor: '#F9731610', borderColor: '#F9731630' }]}
        >
          <Text style={[styles.petNoteText, { color: colors.text }]}>
            <Text style={{ fontWeight: '700', color: '#F97316' }}>Pro Tip: </Text>
            {petMessage}
          </Text>
        </MotiView>
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140, // Space for the bottom button
  },
  topSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  characterContainer: {
    width: width * 0.4,
    height: width * 0.4,
    zIndex: 1,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  bubbleContainer: {
    marginTop: -10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
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
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 24,
    textAlign: 'center',
  },
  resultsWrapper: {
  },
  strategyCard: {
    padding: 24,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  messageText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Medium',
    lineHeight: 22,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  methodText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  petNote: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  petNoteText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    lineHeight: 18,
    textAlign: 'center',
  },
});

