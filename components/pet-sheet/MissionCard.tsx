import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';

export interface Mission {
    id: string;
    title: string;
    progress: number;
    total: number;
    reward: number;
    completed: boolean;
}

interface MissionCardProps {
    mission: Mission;
    activeColor?: string;
}

export function MissionCard({ mission, activeColor = '#FBBF24' }: MissionCardProps) {
    const { isDarkMode } = useTheme();

    // Inactive badge color - semi-transparent for glass effect
    const inactiveBadgeColor = isDarkMode ? 'rgba(255,255,255,0.2)' : '#F3F4F6';
    const inactiveCheckColor = isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF';
    const textColor = isDarkMode ? '#FFFFFF' : '#171717';

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                {/* Background Seal */}
                <MaterialCommunityIcons
                    name="decagram"
                    size={32}
                    color={mission.completed ? activeColor : inactiveBadgeColor}
                />

                {/* Checkmark Overlay */}
                <View style={styles.checkmarkOverlay}>
                    <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={mission.completed ? 'white' : inactiveCheckColor}
                    />
                </View>
            </View>

            <View style={styles.info}>
                <Text style={[styles.title, { color: textColor }]}>{mission.title}</Text>
                <Text style={[styles.reward, { color: activeColor }]}>
                    +{mission.reward} growth points
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        marginRight: 16,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        marginBottom: 4,
        fontWeight: '500',
    },
    reward: {
        fontSize: 14,
        fontWeight: '600',
    },
});
