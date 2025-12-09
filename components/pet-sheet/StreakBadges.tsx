/**
 * Streak Badges - Displays streak milestones (3d, 10d, 30d, 100d, 200d)
 * Replaces the old StatsCard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface StreakBadgesProps {
    streak: number;
}

const MILESTONES = [3, 10, 30, 100, 200];

export function StreakBadges({ streak }: StreakBadgesProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Streak badges</Text>

            <View style={styles.badgesContainer}>
                {MILESTONES.map((milestone, index) => {
                    const isUnlocked = streak >= milestone;
                    const isLast = index === MILESTONES.length - 1;

                    return (
                        <View key={milestone} style={styles.badgeWrapper}>
                            <View style={styles.badgeContent}>
                                {/* Icon */}
                                {isUnlocked ? (
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="flame" size={28} color="#EA580C" />
                                    </View>
                                ) : (
                                    <View style={[styles.iconContainer, styles.iconInactive]}>
                                        <Ionicons name="flame" size={28} color="#D4D4D4" />
                                    </View>
                                )}

                                {/* Label */}
                                <Text style={[
                                    styles.label,
                                    isUnlocked ? styles.labelActive : styles.labelInactive
                                ]}>
                                    {milestone}d
                                </Text>
                            </View>

                            {/* Connecting Line (except for last item) */}
                            {!isLast && (
                                <View style={styles.lineContainer}>
                                    <View style={[
                                        styles.line,
                                        streak >= MILESTONES[index + 1] ? styles.lineActive : styles.lineInactive
                                    ]} />
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 32, // Extra space at bottom of sheet
        padding: 24,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#171717',
        marginBottom: 20,
    },
    badgesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    badgeWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // Distribute space
    },
    badgeContent: {
        alignItems: 'center',
        zIndex: 2, // Ensure badge sits on top of line if overlapping (though flex layout separates them)
    },
    iconContainer: {
        width: 48, // Slightly larger touch target look
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    iconInactive: {
        opacity: 0.8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
    labelActive: {
        color: '#EA580C', // Deep Orange
    },
    labelInactive: {
        color: '#A3A3A3', // Neutral Gray
    },
    lineContainer: {
        flex: 1,
        height: 48, // Match icon container height to center line
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -26, // Pull up to align with icon center (48 height + 8 margin + text height roughly)
        // Actually simpler: just place it absolute or calculate offset.
        // Let's rely on flex centering. The wrapper is row.
        // badgeContent is one item, lineContainer is the other.
        // We want line to connect ICONS.
        // Let's adjust margin to visually align.
    },
    line: {
        height: 2,
        width: '100%',
        borderRadius: 1,
    },
    lineActive: {
        backgroundColor: '#FDBA74', // Orange-300
    },
    lineInactive: {
        backgroundColor: '#E5E5E5',
    },
});
