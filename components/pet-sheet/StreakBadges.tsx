/**
 * Streak Badges - Displays streak milestones (3d, 10d, 30d, 100d, 200d)
 * Replaces the old StatsCard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';

interface StreakBadgesProps {
    streak: number;
}

const MILESTONES = [3, 10, 30, 100, 200];

export function StreakBadges({ streak }: StreakBadgesProps) {
    const { isDarkMode } = useTheme();

    // Semi-transparent white card for glass effect on golden gradient
    const cardBg = isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'white';
    const cardTextColor = isDarkMode ? '#FFFFFF' : '#171717';

    // Theme-aware colors
    const inactiveIconColor = isDarkMode ? 'rgba(255,255,255,0.3)' : '#D4D4D4';
    const inactiveLabelColor = isDarkMode ? 'rgba(255,255,255,0.5)' : '#A3A3A3';
    const inactiveLineColor = isDarkMode ? 'rgba(255,255,255,0.2)' : '#E5E5E5';
    const activeLineColor = isDarkMode ? '#FDBA74' : '#FDBA74';

    return (
        <View style={[
            styles.container, 
            { 
                backgroundColor: cardBg,
                borderWidth: 0,
                shadowOpacity: isDarkMode ? 0 : 0.05,
            }
        ]}>
            <Text style={[styles.title, { color: cardTextColor }]}>Your Streak badges</Text>

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
                                        <Ionicons name="flame" size={28} color={inactiveIconColor} />
                                    </View>
                                )}

                                {/* Label */}
                                <Text style={[
                                    styles.label,
                                    isUnlocked ? styles.labelActive : { color: inactiveLabelColor }
                                ]}>
                                    {milestone}d
                                </Text>
                            </View>

                            {/* Connecting Line (except for last item) */}
                            {!isLast && (
                                <View style={styles.lineContainer}>
                                    <View style={[
                                        styles.line,
                                        { backgroundColor: streak >= MILESTONES[index + 1] ? activeLineColor : inactiveLineColor }
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
        marginHorizontal: 16,
        marginBottom: 32, // Extra space at bottom of sheet
        padding: 24,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
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
    lineContainer: {
        flex: 1,
        height: 48, // Match icon container height to center line
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -26, // Pull up to align with icon center (48 height + 8 margin + text height roughly)
    },
    line: {
        height: 2,
        width: '100%',
        borderRadius: 1,
    },
});
