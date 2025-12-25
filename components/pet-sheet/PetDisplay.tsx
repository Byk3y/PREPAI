/**
 * Pet Display - Streak counter and animated pet emoji
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Easing } from 'react-native-reanimated';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

// Pet full-view images by stage - require() needs static strings
const STAGE_1_FULL = require('@/assets/pets/stage-1/full-view.png');
const STAGE_2_FULL = require('@/assets/pets/stage-2/full-view.png');
const STAGE_2_SILHOUETTE = require('@/assets/pets/stage-2/silhouette.png');

interface PetDisplayProps {
    streak: number;
    restores?: number;
    stage: 1 | 2;
    currentStage: 1 | 2;
    onNextStage?: () => void;
    onPrevStage?: () => void;
    canRestore?: boolean;
    onRestore?: () => void;
    showBalance?: boolean;
}

/**
 * FieryStreakNumber - Memoized sub-component to handle heavy fire animations
 * isolated from the pet's mounting logic.
 */
const FieryStreakNumber = memo(({ streak }: { streak: number }) => {
    return (
        <View style={styles.fieryTextContainer}>
            {/* Layer 1: Outer Ember/Deep Heat (Bottom) */}
            <MotiView
                animate={{
                    opacity: [0.6, 1, 0.7],
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    type: 'timing',
                    duration: 2000,
                    loop: true,
                    easing: Easing.bezier(0.4, 0, 0.6, 1),
                }}
                style={StyleSheet.absoluteFill}
            >
                <Text
                    style={[styles.streakValue, styles.emberLayer]}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    {streak}
                </Text>
            </MotiView>

            {/* Layer 2: Main Flame Body (Middle) */}
            <MotiView
                animate={{
                    opacity: [0.8, 1, 0.9],
                    scale: [1, 1.02, 1],
                }}
                transition={{
                    type: 'timing',
                    duration: 1200,
                    loop: true,
                    delay: 200,
                }}
                style={StyleSheet.absoluteFill}
            >
                <Text
                    style={[styles.streakValue, styles.flameLayer]}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    {streak}
                </Text>
            </MotiView>

            {/* Layer 3: Hot Core (Top) */}
            <MotiView
                animate={{
                    opacity: [1, 0.9, 1],
                }}
                transition={{
                    type: 'timing',
                    duration: 800,
                    loop: true,
                }}
            >
                <Text
                    style={[styles.streakValue, styles.coreLayer]}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    {streak}
                </Text>
            </MotiView>
        </View>
    );
});

export const PetDisplay = memo(({
    streak,
    restores = 0,
    stage,
    currentStage,
    onNextStage,
    onPrevStage,
    canRestore,
    onRestore,
    showBalance = false
}: PetDisplayProps) => {
    const { isDarkMode } = useTheme();

    const textSecondaryOnGradient = useMemo(() =>
        isDarkMode ? '#FFFFFF' : '#333333'
        , [isDarkMode]);

    const isUnlocked = stage <= currentStage;

    // Fixed source to prevent re-mounting during Prop passes
    const stage2Source = useMemo(() => {
        if (stage !== 2) return STAGE_2_SILHOUETTE;
        return isUnlocked ? STAGE_2_FULL : STAGE_2_SILHOUETTE;
    }, [stage, isUnlocked]);

    return (
        <View style={styles.container}>
            <View
                style={styles.streakContainer}
                accessibilityLabel={`Your current streak is ${streak} days`}
                accessibilityRole="text"
            >
                <View style={styles.labelRow}>
                    <Text style={[styles.streakLabel, { color: textSecondaryOnGradient }]}>
                        {streak === 0 && (canRestore || restores === 0) ? 'Streak lost' : 'Streak days'}
                    </Text>

                    {/* Restore Action or Balance Badge */}
                    {canRestore ? (
                        <TouchableOpacity
                            onPress={onRestore}
                            activeOpacity={0.7}
                            style={styles.restoreButton}
                        >
                            <LinearGradient
                                colors={['#38BDF8', '#0284C7']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.restoreButtonGradient}
                            >
                                <Ionicons name="flash" size={14} color="white" />
                                <Text style={styles.restoreButtonText}>Restore</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        showBalance && restores > 0 ? (
                            <MotiView
                                from={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={styles.restoreBadge}
                            >
                                <View style={styles.shieldBackground}>
                                    <Ionicons name="shield-checkmark" size={14} color="#38BDF8" />
                                    <Text style={styles.restoreCountText}>{restores} saves</Text>
                                </View>
                            </MotiView>
                        ) : streak === 0 && restores === 0 && (
                            <View style={styles.noRestoresBadge}>
                                <Text style={styles.noRestoresText}>0 restores left</Text>
                            </View>
                        )
                    )}
                </View>

                <FieryStreakNumber streak={streak} />
            </View>

            <View style={styles.petCharacterContainer}>
                <MotiView
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{
                        type: 'timing',
                        duration: 2000,
                        loop: true,
                        repeatReverse: true,
                    }}
                    style={styles.petEmojiContainer}
                >
                    {/* Stage 1 Render - Always mounted, toggle opacity */}
                    <View style={[styles.imageWrapper, { opacity: stage === 1 ? 1 : 0 }]}>
                        <Image
                            source={STAGE_1_FULL}
                            style={styles.petImage}
                            resizeMode="contain"
                            fadeDuration={0}
                        />
                    </View>

                    {/* Stage 2 Render - Always mounted, toggle opacity */}
                    <View
                        style={[
                            styles.imageWrapper,
                            styles.absoluteWrapper,
                            { opacity: stage === 2 ? 1 : 0 }
                        ]}
                    >
                        <Image
                            source={stage2Source}
                            style={[
                                styles.petImage,
                                { transform: [{ scale: 1.2 }] }
                            ]}
                            resizeMode="contain"
                            fadeDuration={0}
                        />
                    </View>
                </MotiView>
            </View>

            {stage === 1 && onNextStage && (
                <TouchableOpacity
                    style={styles.navigationArrow}
                    onPress={onNextStage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-forward" size={32} color={textSecondaryOnGradient} />
                </TouchableOpacity>
            )}

            {stage === 2 && onPrevStage && (
                <TouchableOpacity
                    style={[styles.navigationArrow, { right: undefined, left: 0 }]}
                    onPress={onPrevStage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={32} color={textSecondaryOnGradient} />
                </TouchableOpacity>
            )}
        </View >
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        marginBottom: 6,
        position: 'relative',
    },
    streakContainer: {
        marginBottom: 12,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    streakLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    restoreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shieldBackground: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)',
        gap: 4,
    },
    restoreCountText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#38BDF8',
    },
    restoreButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    restoreButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
    },
    restoreButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    noRestoresBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    noRestoresText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(0, 0, 0, 0.4)',
    },
    streakValue: {
        fontSize: 72,
        fontWeight: '900',
        letterSpacing: -3,
    },
    fieryTextContainer: {
        height: 80,
        justifyContent: 'center',
        position: 'relative',
    },
    emberLayer: {
        color: '#FF4500',
        textShadowColor: '#EA580C',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15, // Reduced slightly for perf
    },
    flameLayer: {
        color: '#FFCC00',
        textShadowColor: '#FFD700',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8, // Reduced slightly for perf
    },
    coreLayer: {
        color: '#FFF9E5',
    },
    petCharacterContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        position: 'relative',
    },
    navigationArrow: {
        position: 'absolute',
        right: 0,
        top: '50%',
        marginTop: 20,
        zIndex: 10,
        padding: 8,
    },
    petEmojiContainer: {
        width: 250,
        height: 250,
        alignItems: 'center',
        justifyContent: 'center',
    },
    petImage: {
        width: '100%',
        height: '100%',
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    absoluteWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});
