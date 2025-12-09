/**
 * Missions List - List of pet growth missions
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MissionCard } from './MissionCard';
import { DailyTask, TaskProgress } from '@/lib/store/types';

interface MissionsListProps {
    missions: DailyTask[];
    taskProgress: Record<string, TaskProgress>;
    activeColor?: string;
}

export function MissionsList({ missions, taskProgress, activeColor }: MissionsListProps) {
    if (!missions || missions.length === 0) return null;

    // Show all tasks (foundational and daily) - completed foundational tasks remain visible
    // with checkmarks to provide user validation and show progress
    // Daily tasks: "Permanently visible for that day" (with checkmark if complete)
    // Foundational tasks: Remain visible when completed (with checkmark) for validation

    // Filter to only show tasks that have content (safety check)
    const visibleMissions = missions.filter(m => m != null);

    if (visibleMissions.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>All tasks complete!</Text>
                <Text style={styles.subtitle}>Great job for today. Come back tomorrow for more.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Grow your Pet</Text>
            {visibleMissions.map((task) => {
                const progress = taskProgress[task.task_key];

                // Map DailyTask to Mission format for MissionCard
                const missionProps = {
                    id: task.id,
                    title: task.title,
                    // If task is completed, progress is fully done. 
                    // If not, use tracked progress or 0.
                    progress: task.completed ? 1 : (progress?.current || 0),
                    // Goal: if completed, goal matches progress. 
                    // If not, use tracked goal or default to 1 for binary tasks.
                    total: task.completed ? 1 : (progress?.goal || 1),
                    reward: task.points,
                    completed: task.completed
                };

                return (
                    <MissionCard
                        key={task.id}
                        mission={missionProps}
                        activeColor={activeColor}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#171717',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: -10,
        marginBottom: 10,
    }
});
