/**
 * Pet Display - Streak counter and animated pet emoji
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';

interface PetDisplayProps {
    streak: number;

}

export function PetDisplay({ streak }: PetDisplayProps) {
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
                    <Image
                        source={require('@/assets/pets/stage-1/full-view.png')}
                        style={styles.petImage}
                        resizeMode="contain"
                        fadeDuration={0}
                    />
                </MotiView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
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
        width: 250,
        height: 250,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    petImage: {
        width: '100%',
        height: '100%',
    },
});
