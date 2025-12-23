import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { TypewriterText } from '../components/TypewriterText';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { TESTIMONIALS } from '@/lib/onboarding/data/testimonials';

const { width } = Dimensions.get('window');

interface Screen6Props {
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen6({ colors }: Screen6Props) {
  const [headlineComplete, setHeadlineComplete] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const handleHeadlineComplete = useCallback(() => {
    setHeadlineComplete(true);
  }, []);

  // Auto-rotate testimonials
  React.useEffect(() => {
    if (headlineComplete) {
      const timer = setInterval(() => {
        setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [headlineComplete]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false} // Disable scroll as requested
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
            animate={{ translateY: [-5, 5, -5] }}
            transition={{ loop: true, type: 'timing', duration: 2800 } as any}
          >
            <Image
              source={require('@/assets/pets/stage-1/bubble.png')}
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
            text="I'm backed by science and loved by students who finally enjoy studying."
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

      {/* Stats Section */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 20 }}
        transition={{ type: 'timing', duration: 600, delay: 200 } as any}
        style={styles.contentWrapper}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>THE SCIENCE</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#F9731608', borderColor: '#F9731620' }]}>
            <Ionicons name="rocket" size={24} color="#F97316" />
            <Text style={[styles.statValue, { color: colors.text }]}>3x</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>More effective than reading</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F608', borderColor: '#3B82F620' }]}>
            <Ionicons name={"brain" as any} size={24} color="#3B82F6" />
            <Text style={[styles.statValue, { color: colors.text }]}>200%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Better retention rates</Text>
          </View>
        </View>

        {/* Testimonials Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>STUDENT VOICES</Text>
        </View>

        <View style={styles.testimonialContainer}>
          {TESTIMONIALS.map((testimonial, index) => {
            const isActive = index === testimonialIndex;
            return (
              <MotiView
                key={index}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1 : 0.95,
                  translateX: isActive ? 0 : (index > testimonialIndex ? 20 : -20),
                  pointerEvents: isActive ? 'auto' : 'none'
                } as any}
                transition={{ type: 'spring', damping: 20, stiffness: 100 } as any}
                style={[
                  styles.testimonialCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    position: isActive ? 'relative' : 'absolute',
                    width: '100%'
                  }
                ]}
              >
                <View style={styles.starsRow}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color="#FBBF24" />
                  ))}
                </View>
                <Text style={[styles.testimonialText, { color: colors.text }]}>
                  "{testimonial.text}"
                </Text>
                <View style={styles.authorRow}>
                  <View style={[styles.authorAvatar, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.avatarText, { color: colors.textMuted }]}>
                      {testimonial.author.charAt(0)}
                    </Text>
                  </View>
                  <Text style={[styles.authorName, { color: colors.textMuted }]}>
                    {testimonial.author}
                  </Text>
                </View>
              </MotiView>
            );
          })}

          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {TESTIMONIALS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === testimonialIndex ? '#F97316' : colors.textMuted + '40' }
                ]}
              />
            ))}
          </View>
        </View>

        <View style={[styles.badgeContainer, { backgroundColor: '#10B98110' }]}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={[styles.badgeText, { color: '#059669' }]}>Verified Scientific Methods</Text>
        </View>
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
    marginBottom: 25,
  },
  petContainer: {
    width: width * 0.4,
    height: width * 0.4,
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
  sectionHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    lineHeight: 16,
  },
  testimonialContainer: {
    width: '100%',
    minHeight: 180,
    marginBottom: 32,
  },
  testimonialCard: {
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 10,
  },
  testimonialText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    lineHeight: 20,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  authorName: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-SemiBold',
    opacity: 0.8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
  },
});

