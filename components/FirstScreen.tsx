/**
 * FirstScreen - Duolingo-style splash/loading screen
 * Displays while the app initializes with an orange background and centered mascot/logo
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrigoLogo } from './BrigoLogo';

interface FirstScreenProps {
  /** Optional image source - defaults to the splash mascot */
  imageSrc?: any;
  /** Background color - defaults to theme background */
  backgroundColor?: string;
  /** Text color for app name - defaults to white */
  textColor?: string;
  /** Show app name at bottom - defaults to true */
  showAppName?: boolean;
}

export function FirstScreen({
  imageSrc = require('@/assets/onboarding/splash.png'),
  backgroundColor = '#faf9f6',
  textColor = '#ffffff',
  showAppName = true,
}: FirstScreenProps) {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={['top', 'bottom']}
    >
      {/* Centered Image/Mascot */}
      {imageSrc && (
        <View style={styles.imageContainer}>
          <Image
            source={imageSrc}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      )}

      {/* App Logo at Bottom (optional) */}
      {showAppName && (
        <View style={styles.appNameContainer}>
          <BrigoLogo size={32} textColor={textColor} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  appNameContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
});
