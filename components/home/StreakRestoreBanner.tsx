/**
 * Streak Restore Banner
 * Vibrant inline card shown when a user has lost their streak but has restores available.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors } from '@/lib/ThemeContext';
import { useTheme } from '@/lib/ThemeContext';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import { LinearGradient } from 'expo-linear-gradient';

interface StreakRestoreBannerProps {
    previousStreak: number;
    restoresLeft: number;
    onRestore: () => Promise<void>;
    onDismiss: () => void;
}

export function StreakRestoreBanner({
    previousStreak,
    restoresLeft,
    onRestore,
    onDismiss,
}: StreakRestoreBannerProps) {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleRestore = async () => {
        setIsRestoring(true);
        try {
            await onRestore();
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <MotiView
            from={{ opacity: 0, translateY: -20, scale: 0.95 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={[
                styles.container,
                {
                    backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.1)' : '#FFFBEB',
                    borderColor: isDarkMode ? 'rgba(251, 191, 36, 0.2)' : '#FEF3C7',
                },
            ]}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={['#FBBF24', '#F59E0B']}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="flash" size={24} color="white" />
                    </LinearGradient>
                    <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.badgeText}>{previousStreak}</Text>
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Streak at risk!</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Use a restore to get your {previousStreak}-day streak back.
                    </Text>

                    <View style={styles.restoresLeftContainer}>
                        <Ionicons name="heart" size={14} color="#EF4444" />
                        <Text style={[styles.restoresLeftText, { color: colors.textSecondary }]}>
                            {restoresLeft} saves left
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={handleRestore}
                    disabled={isRestoring}
                    style={styles.restoreButton}
                >
                    <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.restoreGradient}
                    >
                        {isRestoring ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.restoreText}>Restore Now</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onDismiss}
                    style={styles.dismissButton}
                    disabled={isRestoring}
                >
                    <Text style={[styles.dismissText, { color: colors.textMuted }]}>No thanks</Text>
                </TouchableOpacity>
            </View>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        position: 'relative',
        marginRight: 16,
    },
    iconGradient: {
        width: 60,
        height: 60,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFFBEB',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Nunito-Bold',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Regular',
        lineHeight: 20,
    },
    restoresLeftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    restoresLeftText: {
        fontSize: 12,
        fontFamily: 'Nunito-SemiBold',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    restoreButton: {
        flex: 2,
    },
    restoreGradient: {
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    restoreText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
    },
    dismissButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    dismissText: {
        fontSize: 14,
        fontFamily: 'Nunito-SemiBold',
    },
});
