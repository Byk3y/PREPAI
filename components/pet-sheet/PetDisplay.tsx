/**
 * Pet Display - Streak counter and animated pet emoji
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import { Ionicons } from '@expo/vector-icons';

interface PetDisplayProps {
    streak: number;
    stage: 1 | 2;  // Required, derived from petState.stage (clamped to 1-2 for now)
    onNextStage?: () => void;  // Optional: for previewing next stage
    onPrevStage?: () => void;  // Optional: for previewing previous stage
}

export function PetDisplay({ streak, stage, onNextStage, onPrevStage }: PetDisplayProps) {
    return (
        <View style={styles.container}>
            {/* Streak Days */}
            <View style={styles.streakContainer}>
                <Text style={styles.streakLabel}>Streak days</Text>
                <Text style={styles.streakValue}>{streak}</Text>
            </View>

            <View style={styles.petCharacterContainer}>
                <MotiView
                    from={{ scale: 1 }}
                    animate={{ scale: stage === 1 ? [1, 1.05, 1] : 1 }}
                    transition={{
                        type: 'timing',
                        duration: 2000,
                        loop: true,
                        repeatReverse: true,
                        delay: 0,
                    }}
                    style={styles.petEmojiContainer}
                >
                    {/* Stage 1 Pet */}
                    <Image
                        source={require('@/assets/pets/stage-1/full-view.png')}
                        style={[
                            styles.petImage,
                            { opacity: stage === 1 ? 1 : 0 },
                            { position: 'absolute' } // Ensure exact overlay
                        ]}
                        resizeMode="contain"
                        fadeDuration={0}
                    />

                    {/* Stage 2 Silhouette (Always rendered, just hidden) */}
                    <Image
                        source={require('@/assets/pets/stage-2/silhouette.png')}
                        style={[
                            styles.petImage,
                            { opacity: stage === 2 ? 1 : 0 },
                            { position: 'absolute' }, // Ensure exact overlay
                            { transform: [{ scale: 1.2 }] } // Scale visually
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
                    <Ionicons name="chevron-forward" size={32} color="#000000" />
                </TouchableOpacity>
            )}

            {/* Back to Stage 1 Arrow - Show if on Stage 2 and prev stage handler provided */}
            {stage === 2 && onPrevStage && (
                <TouchableOpacity
                    style={[styles.navigationArrow, { right: undefined, left: 0 }]}
                    onPress={onPrevStage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={32} color="#000000" />
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
        color: '#000000',
        marginBottom: 4,
        fontWeight: '500',
    },
    streakValue: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#000000',
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
