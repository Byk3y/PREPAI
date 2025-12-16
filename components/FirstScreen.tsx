/**
 * FirstScreen - Duolingo-style splash/loading screen
 * Displays while the app initializes with an orange background and centered mascot/logo
 */

import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FirstScreenProps {
  /** Optional image source - defaults to the splash mascot */
  imageSrc?: any;
  /** Background color - defaults to theme background */
  backgroundColor?: string;
  /** Text color for app name - defaults to white */
  textColor?: string;
  /** Show app name at bottom - defaults to true */
  showAppName?: boolean;
  /** App name to display - defaults to PrepAI */
  appName?: string;
}

export function FirstScreen({
  imageSrc = require('@/assets/first-screen/splash.png'),
  backgroundColor = '#faf9f6',
  textColor = '#1a1a1a',
  showAppName = true,
  appName = 'PrepAI'
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

      {/* App Name at Bottom (optional) */}
      {showAppName && (
        <View style={styles.appNameContainer}>
          <Text style={[styles.appName, { color: textColor }]}>{appName}</Text>
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
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  appNameContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
});
