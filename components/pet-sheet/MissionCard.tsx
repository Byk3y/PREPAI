/**
 * Mission Card - Individual mission item with progress
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
}

export function MissionCard({ mission }: MissionCardProps) {
    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.checkbox,
                    mission.completed ? styles.checkboxCompleted : styles.checkboxIncomplete,
                ]}
            >
                {mission.completed && (
                    <Text style={styles.checkmark}>✓</Text>
                )}
            </View>

            <View style={styles.info}>
                <Text style={styles.title}>{mission.title}</Text>
                <Text style={styles.reward}>
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
        marginBottom: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxCompleted: {
        backgroundColor: '#F97316',
    },
    checkboxIncomplete: {
        backgroundColor: '#FFEDD5',
    },
    checkmark: {
        color: 'white',
        fontSize: 12,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        color: '#171717',
        marginBottom: 4,
    },
    reward: {
        fontSize: 14,
        color: '#EA580C',
        fontWeight: '600',
    },
});
