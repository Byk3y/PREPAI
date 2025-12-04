/**
 * Missions List - List of pet growth missions
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MissionCard, type Mission } from './MissionCard';

interface MissionsListProps {
    missions: Mission[];
}

export function MissionsList({ missions }: MissionsListProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Grow your Pet</Text>
            {missions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
            ))}
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
});
