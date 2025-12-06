/**
 * Stats Card - Display user statistics (coins, level, streak)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatItemProps {
    value: number;
    label: string;
}

function StatItem({ value, label }: StatItemProps) {
    return (
        <View style={styles.statItem}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

interface StatsCardProps {
    coins: number;
    level: number;
    streak: number;
}

export function StatsCard({ coins, level, streak }: StatsCardProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Stats</Text>
            <View style={styles.statsRow}>
                <StatItem value={coins} label="Coins" />
                <StatItem value={level} label="Level" />
                <StatItem value={streak} label="Streak" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white', marginHorizontal: 16,
        marginBottom: 0,
        marginTop: 0,
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
        fontSize: 16,
        fontWeight: '600',
        color: '#262626',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#262626',
    },
    statLabel: {
        fontSize: 12,
        color: '#737373',
        marginTop: 4,
    },
});
