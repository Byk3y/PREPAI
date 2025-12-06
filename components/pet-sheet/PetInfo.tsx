/**
 * Pet Info - Pet name and XP progress bar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PetNameEditor } from './PetNameEditor';

interface PetInfoProps {
    name: string;
    xp: number;
    xpToNext: number;
    onNameChange: (newName: string) => void;
}

export function PetInfo({ name, xp, xpToNext, onNameChange }: PetInfoProps) {
    const xpPercentage = (xp / xpToNext) * 100;

    return (
        <View style={styles.container}>
            <View style={styles.characterContainer}>
                {/* Pet Name with Edit Icon */}
                <PetNameEditor name={name} onNameChange={onNameChange} />

                {/* XP Progress Bar */}
                <View style={styles.xpContainer}>
                    <View style={styles.xpBarBackground}>
                        <View
                            style={[styles.xpBarFill, { width: `${xpPercentage}%` }]}
                        />
                    </View>
                    <Text style={styles.xpText}>
                        {xpToNext - xp} points to unlock the next look
                    </Text>
                </View>
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
    characterContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    xpContainer: {
        width: 256,
    },
    xpBarBackground: {
        height: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 7,
        overflow: 'hidden',
        marginBottom: 8,
    },
    xpBarFill: {
        height: '100%',
        backgroundColor: '#FFB300',
        borderRadius: 7,
    },
    xpText: {
        fontSize: 13,
        color: '#666666',
        textAlign: 'center',
    },
});
