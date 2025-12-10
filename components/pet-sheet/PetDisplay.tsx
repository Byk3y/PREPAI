/**
 * Pet Display - Streak counter and animated pet emoji
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

// Pet full-view images by stage - require() needs static strings
const PET_FULL_VIEW_IMAGES: Record<number, ImageSourcePropType> = {
    1: require('@/assets/pets/stage-1/full-view.png'),
    2: require('@/assets/pets/stage-2/full-view.png'),
};

interface PetDisplayProps {
    streak: number;
    stage: 1 | 2;  // Required, derived from petState.stage (clamped to 1-2 for now)
    onNextStage?: () => void;  // Optional: for previewing next stage
    onPrevStage?: () => void;  // Optional: for previewing previous stage
}

export function PetDisplay({ streak, stage, onNextStage, onPrevStage }: PetDisplayProps) {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    // On golden gradient - dark text in light mode, white in dark mode
    const textOnGradient = isDarkMode ? '#FFFFFF' : '#000000';
    const textSecondaryOnGradient = isDarkMode ? '#FFFFFF' : '#333333';

    return (
        <View style={styles.container}>
            {/* Streak Days */}
            <View style={styles.streakContainer}>
                <Text style={[styles.streakLabel, { color: textSecondaryOnGradient }]}>
                    Streak days
                </Text>
                <Text style={[styles.streakValue, { color: textOnGradient }]}>
                    {streak}
                </Text>
            </View>

            <View style={styles.petCharacterContainer}>
                <MotiView
                    from={{ scale: 1 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{
                        type: 'timing',
                        duration: 2000,
                        loop: true,
                        repeatReverse: true,
                        delay: 0,
                    }}
                    style={styles.petEmojiContainer}
                >
                    {/* Pet full view - dynamically changes based on stage */}
                    <Image
                        source={PET_FULL_VIEW_IMAGES[stage]}
                        style={[
                            styles.petImage,
                            stage === 2 && { transform: [{ scale: 1.2 }] } // Stage 2 is slightly larger
                        ]}
                        resizeMode="contain"
                        fadeDuration={0}
                    />
                </MotiView>
            </View>

            {/* Stage 2 Preview Arrow - Show if on Stage 1 and next stage handler provided */}
            {stage === 1 && onNextStage && (
                <TouchableOpacity
                    style={styles.navigationArrow}
                    onPress={onNextStage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-forward" size={32} color={textSecondaryOnGradient} />
                </TouchableOpacity>
            )}

            {/* Back to Stage 1 Arrow - Show if on Stage 2 and prev stage handler provided */}
            {stage === 2 && onPrevStage && (
                <TouchableOpacity
                    style={[styles.navigationArrow, { right: undefined, left: 0 }]}
                    onPress={onPrevStage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={32} color={textSecondaryOnGradient} />
                </TouchableOpacity>
            )}
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        marginBottom: 6,
        position: 'relative',
    },
    streakContainer: {
        marginBottom: 12,
    },
    streakLabel: {
        fontSize: 15,
        marginBottom: 4,
        fontWeight: '500',
    },
    streakValue: {
        fontSize: 56,
        fontWeight: 'bold',
        letterSpacing: -2,
    },
    petCharacterContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        position: 'relative', // For absolute positioning of arrow
    },
    navigationArrow: {
        position: 'absolute',
        right: 0,
        top: '50%',
        marginTop: 20, // Push it down a bit
        zIndex: 10,
        padding: 8,
    },
    petEmojiContainer: {
        width: 250,
        height: 250,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    petImage: {
        width: '100%',
        height: '100%',
    },
});
