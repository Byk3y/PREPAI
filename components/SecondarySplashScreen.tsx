import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { BrigoLogo } from './BrigoLogo';
import { getThemeColors } from '@/lib/ThemeContext';

const { width, height } = Dimensions.get('window');

/**
 * SecondarySplashScreen - A React Native component that mimics the splash screen
 * but allows for precise layout (like Logo at bottom) and smooth transitions.
 */
export const SecondarySplashScreen: React.FC = () => {
    const colors = getThemeColors(false); // Splash is usually light mode by default

    return (
        <View style={[styles.container, { backgroundColor: '#faf9f6' }]}>
            {/* Centered App Icon */}
            <View style={styles.iconContainer}>
                <Image
                    source={require('@/assets/icon.png')}
                    style={[styles.icon, { borderRadius: 16 }]}
                    resizeMode="contain"
                />
            </View>

            {/* Bottom Logo */}
            <View style={styles.bottomContainer}>
                <BrigoLogo size={32} textColor="#1a1a1a" />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: width * 0.22, // 22% of screen width (slightly smaller as requested)
        aspectRatio: 1,
        overflow: 'hidden',
    },
    icon: {
        width: '100%',
        height: '100%',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 60, // Positioned at the bottom
        alignItems: 'center',
    },
});
