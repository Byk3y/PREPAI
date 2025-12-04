/**
 * Pet Display - Streak counter and animated pet emoji
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';

interface PetDisplayProps {
    streak: number;
    petEmoji?: string;
}

export function PetDisplay({ streak, petEmoji = '🐾' }: PetDisplayProps) {
    return (
        <View style={styles.container}>
            {/* Streak Days */}
            <View style={styles.streakContainer}>
                <Text style={styles.streakLabel}>Streak days</Text>
                <Text style={styles.streakValue}>{streak}</Text>
            </View>

            {/* Pet Character */}
            <View style={styles.petCharacterContainer}>
                <MotiView
                    from={{ scale: 1 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{
                        type: 'timing',
                        duration: 2000,
                        loop: true,
                        repeatReverse: true,
                    }}
                    style={styles.petEmojiContainer}
                >
                    <Text style={styles.petEmoji}>{petEmoji}</Text>
                </MotiView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E5E1F5',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        marginBottom: 12,
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
    },
    petEmojiContainer: {
        width: 192,
        height: 192,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    petEmoji: {
        fontSize: 144,
    },
});
