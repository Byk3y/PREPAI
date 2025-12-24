import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Image, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { APP_URLS } from '@/lib/constants';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { useStore } from '@/lib/store';
import { TypewriterText } from '../components/TypewriterText';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const FeatureItem = ({ icon, title, color, delay, isVisible, colors }: { icon: any, title: string, color: string, delay: number, isVisible: boolean, colors: any }) => (
  <MotiView
    from={{ opacity: 0, scale: 0.9, translateY: 10 }}
    animate={{
      opacity: isVisible ? 1 : 0,
      scale: isVisible ? 1 : 0.9,
      translateY: isVisible ? 0 : 10
    }}
    transition={{ type: 'spring', damping: 20, stiffness: 100, delay } as any}
    style={[styles.featureItem, { backgroundColor: color + '12', borderColor: color + '25' }]}
  >
    <Ionicons name={icon} size={18} color={color} />
    <Text style={[styles.featureText, { color: colors.text }]}>{title}</Text>
  </MotiView>
);

interface Screen3Props {
  colors: ReturnType<typeof getThemeColors>;
  onContinue: () => void;
}

import BuddyBrain from '../../../assets/onboarding-ui/buddy_brain.png';

export function Screen3({ colors, onContinue }: Screen3Props) {
  const router = useRouter();
  const { authUser } = useStore();
  const { handleError } = useErrorHandler();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [headlineComplete, setHeadlineComplete] = useState(false);

  const handleCreateAccount = () => {
    if (!termsAccepted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Required', 'Please accept the Terms & Conditions and Privacy Policy to continue');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (authUser) {
      onContinue();
    } else {
      router.replace('/auth');
    }
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (authUser) {
      onContinue();
    } else {
      router.replace('/auth');
    }
  };

  const handleTermsPress = () => {
    Linking.openURL(APP_URLS.TERMS).catch(async (err) => {
      await handleError(err, {
        operation: 'open_terms_link',
        component: 'onboarding-screen3',
        metadata: { url: APP_URLS.TERMS }
      });
    });
  };

  const handlePrivacyPress = () => {
    Linking.openURL(APP_URLS.PRIVACY).catch(async (err) => {
      await handleError(err, {
        operation: 'open_privacy_link',
        component: 'onboarding-screen3',
        metadata: { url: APP_URLS.PRIVACY }
      });
    });
  };

  const handleHeadlineComplete = React.useCallback(() => {
    setHeadlineComplete(true);
  }, []);

  return (
    <View style={styles.screenContainer}>
      {/* Top Section: Character + Speech Bubble */}
      <View style={styles.topSection}>
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 300 } as any}
          style={styles.characterContainer}
        >
          <MotiView
            animate={{ translateY: [-6, 6, -6] }}
            transition={{ loop: true, type: 'timing', duration: 4000 } as any}
          >
            <Image
              source={BuddyBrain}
              style={styles.characterImage}
              resizeMode="contain"
            />
          </MotiView>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 600 } as any}
          style={[styles.bubbleContainer, { backgroundColor: colors.surfaceElevated }]}
        >
          <TypewriterText
            text="I'll turn your messy notes into study tools!"
            style={[styles.headline, { color: colors.text }]}
            speed={40}
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

      {/* Feature Grid */}
      <View style={styles.featureGrid}>
        <FeatureItem
          icon="copy-outline"
          title="Flashcards"
          color="#F97316"
          delay={200}
          isVisible={headlineComplete}
          colors={colors}
        />
        <FeatureItem
          icon="list-outline"
          title="Quizzes"
          color="#3B82F6"
          delay={400}
          isVisible={headlineComplete}
          colors={colors}
        />
        <FeatureItem
          icon="headset-outline"
          title="Podcasts"
          color="#8B5CF6"
          delay={600}
          isVisible={headlineComplete}
          colors={colors}
        />
      </View>

      {/* Auth Section */}
      <View style={styles.authSection}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 20 }}
          transition={{ type: 'timing', duration: 600, delay: 800 } as any}
        >
          {/* Terms Checkbox */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTermsAccepted(!termsAccepted);
            }}
            style={styles.termsContainer}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              { borderColor: termsAccepted ? '#F97316' : colors.border },
              termsAccepted && { backgroundColor: '#F97316' }
            ]}>
              {termsAccepted && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I agree to the{' '}
              <Text style={styles.linkText} onPress={handleTermsPress}>Terms</Text>
              {' & '}
              <Text style={styles.linkText} onPress={handlePrivacyPress}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              onPress={handleCreateAccount}
              style={[
                styles.primaryButton,
                { backgroundColor: termsAccepted ? '#F97316' : colors.border }
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              style={styles.secondaryButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                Already have an account? <Text style={{ color: '#F97316' }}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    paddingBottom: 20,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterContainer: {
    width: width * 0.5,
    height: width * 0.5,
    zIndex: 1,
    marginTop: 20,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  bubbleContainer: {
    position: 'absolute',
    top: '5%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    width: width * 0.75,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 24,
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  authSection: {
    marginTop: 'auto',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  termsText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    lineHeight: 18,
    flex: 1,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
  },
});

