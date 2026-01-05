import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { BrigoLogo } from './BrigoLogo';

const { width } = Dimensions.get('window');

/**
 * SecondarySplashScreen - A React Native component that mimics the splash screen
 * but allows for precise layout (like Logo at bottom) and smooth transitions.
 */
export const SecondarySplashScreen: React.FC = () => {
    return (
        <View style={[styles.container, { backgroundColor: '#FF9500' }]}>
            {/* Centered App Icon with white circular background for contrast */}
            <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                    <Image
                        source={require('@/assets/icon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Bottom Logo - white text on orange background */}
            <View style={styles.bottomContainer}>
                <BrigoLogo size={36} textColor="#FFFFFF" />
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
        width: width * 0.18, // 18% of screen width - more reasonable size
        aspectRatio: 1,
    },
    iconBackground: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 999, // Fully circular
        padding: 16, // Space between white circle and icon
        justifyContent: 'center',
        alignItems: 'center',
        // Subtle shadow for depth (Duolingo-style)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    icon: {
        width: '100%',
        height: '100%',
        borderRadius: 20, // Rounded corners for the icon
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 60, // Positioned at the bottom
        alignItems: 'center',
    },
});
