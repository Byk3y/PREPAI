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

// Pet silhouette images for locked stages
const PET_SILHOUETTE_IMAGES: Record<number, ImageSourcePropType> = {
    2: require('@/assets/pets/stage-2/silhouette.png'),
};

interface PetDisplayProps {
    streak: number;
    stage: 1 | 2;  // Required, the stage being displayed (may be preview)
    currentStage: 1 | 2;  // Required, the actual unlocked stage
    onNextStage?: () => void;  // Optional: for previewing next stage
    onPrevStage?: () => void;  // Optional: for previewing previous stage
}

export function PetDisplay({ streak, stage, currentStage, onNextStage, onPrevStage }: PetDisplayProps) {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    // On golden gradient - dark text in light mode, white in dark mode
    const textOnGradient = isDarkMode ? '#FFFFFF' : '#000000';
    const textSecondaryOnGradient = isDarkMode ? '#FFFFFF' : '#333333';

    // Determine if this stage is unlocked
    const isUnlocked = stage <= currentStage;

    // Get the appropriate image - silhouette for locked stages, full-view for unlocked
    const petImage = isUnlocked ? PET_FULL_VIEW_IMAGES[stage] : PET_SILHOUETTE_IMAGES[stage];

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
                    {/* 
                        DUAL RENDER STRATEGY: 
                        We keep both stages mounted to prevent "flashing" or re-decoding.
                        This ensures Stage 1 never accidentally takes the Stage 2 scale during transition.
                    */}

                    {/* Stage 1 Render */}
                    <View style={[styles.imageWrapper, { opacity: stage === 1 ? 1 : 0 }]}>
                        <Image
                            source={PET_FULL_VIEW_IMAGES[1]}
                            style={styles.petImage}
                            resizeMode="contain"
                            fadeDuration={0}
                        />
                    </View>

                    {/* Stage 2 Render (Silhouette or Full) */}
                    <View
                        style={[
                            styles.imageWrapper,
                            styles.absoluteWrapper,
                            { opacity: stage === 2 ? 1 : 0 }
                        ]}
                    >
                        <Image
                            source={stage === 2 ? petImage : PET_SILHOUETTE_IMAGES[2]}
                            style={[
                                styles.petImage,
                                { transform: [{ scale: 1.2 }] }
                            ]}
                            resizeMode="contain"
                            fadeDuration={0}
                        />
                    </View>
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
    imageWrapper: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    absoluteWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});
