/**
 * Pending Sync Indicator
 * Shows when there are offline operations waiting to be synced
 * Best Practice 2025: Keep users informed about pending sync status
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '@/lib/contexts/NetworkContext';
import { getPendingCount } from '@/lib/services/offlineSyncService';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

interface PendingSyncIndicatorProps {
    /** Position style override */
    style?: object;
}

export function PendingSyncIndicator({ style }: PendingSyncIndicatorProps) {
    const { isOffline, lastOnlineAt } = useNetwork();
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const spinAnim = React.useRef(new Animated.Value(0)).current;

    // Poll for pending count
    useEffect(() => {
        const checkPending = async () => {
            const count = await getPendingCount();
            setPendingCount(count);
        };

        checkPending();
        const interval = setInterval(checkPending, 5000);

        return () => clearInterval(interval);
    }, []);

    // Show syncing animation when coming back online with pending items
    useEffect(() => {
        if (!isOffline && pendingCount > 0) {
            setIsSyncing(true);

            // Spin animation
            Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ).start();

            // Stop after a delay (sync complete)
            const timeout = setTimeout(() => {
                setIsSyncing(false);
                spinAnim.setValue(0);
            }, 3000);

            return () => {
                clearTimeout(timeout);
                spinAnim.stopAnimation();
            };
        }
    }, [isOffline, pendingCount, lastOnlineAt, spinAnim]);

    // Don't render if nothing pending
    if (pendingCount === 0 && !isSyncing) {
        return null;
    }

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.badge, { backgroundColor: isSyncing ? colors.primary : '#F59E0B' }]}>
                <Animated.View style={isSyncing ? { transform: [{ rotate: spin }] } : undefined}>
                    <Ionicons
                        name={isSyncing ? 'sync' : 'cloud-upload-outline'}
                        size={12}
                        color="#FFFFFF"
                    />
                </Animated.View>
                <Text style={styles.text}>
                    {isSyncing ? 'Syncing...' : `${pendingCount} pending`}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 16,
        zIndex: 1000,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
        fontFamily: 'Nunito-SemiBold',
    },
});
