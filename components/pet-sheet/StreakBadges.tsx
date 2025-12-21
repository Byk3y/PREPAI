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
    const activeLineColor = '#EA580C'; // Consistent orange for progress

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: cardBg,
                borderWidth: 0,
            }
        ]}>
            <Text style={[styles.title, { color: cardTextColor }]}>Your Streak badges</Text>

            <View style={styles.badgesContainer}>
                {MILESTONES.map((milestone, index) => {
                    const isUnlocked = streak >= milestone;
                    const isLast = index === MILESTONES.length - 1;

                    // Calculate progress to next milestone for the connecting line
                    let progress = 0;
                    if (!isLast) {
                        const nextMilestone = MILESTONES[index + 1];
                        if (streak >= nextMilestone) {
                            progress = 1;
                        } else if (streak >= milestone) {
                            progress = (streak - milestone) / (nextMilestone - milestone);
                        }
                    }

                    return (
                        <View key={milestone} style={[styles.badgeWrapper, isLast && { flex: 0 }]}>
                            <View style={styles.badgeContent}>
                                {/* Icon */}
                                <View style={[
                                    styles.iconContainer,
                                    !isUnlocked && styles.iconInactive,
                                    isUnlocked && styles.iconActive
                                ]}>
                                    <Ionicons
                                        name="flame"
                                        size={28}
                                        color={isUnlocked ? "#EA580C" : inactiveIconColor}
                                    />
                                </View>

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
                                    {/* Background Line */}
                                    <View style={[
                                        styles.line,
                                        { backgroundColor: inactiveLineColor }
                                    ]} />
                                    {/* Progress Overlay */}
                                    {progress > 0 && (
                                        <View style={[
                                            styles.line,
                                            {
                                                backgroundColor: activeLineColor,
                                                width: `${progress * 100}%`,
                                                zIndex: 1
                                            }
                                        ]} />
                                    )}
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
        marginBottom: 32,
        padding: 20,
        borderRadius: 24,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 20,
    },
    badgesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    badgeWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    badgeContent: {
        alignItems: 'center',
        zIndex: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    iconActive: {
        backgroundColor: 'rgba(234, 88, 12, 0.1)',
    },
    iconInactive: {
        opacity: 0.6,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
    },
    labelActive: {
        color: '#EA580C',
    },
    lineContainer: {
        flex: 1,
        height: 6, // Thickness
        marginHorizontal: -10, // Overlap with icons for seamless look
        marginTop: -24, // Lift up to align with icon center (48/2 + small label/margin offset)
    },
    line: {
        height: 6, // Thickness
        borderRadius: 3,
        position: 'absolute',
        width: '100%',
    },
});
