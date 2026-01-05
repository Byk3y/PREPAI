/**
 * SubtitleDisplay - Chat bubble style subtitle component for podcasts
 * Shows current speaker with their dialogue in a conversational format
 * Speaker images: Brigo icon for host, pet bubble for user's pet
 * 
 * Uses a crossfade pattern with two stacked layers to prevent flash during speaker transitions
 */

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, TouchableOpacity, ScrollView, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarkdownText } from '@/components/MarkdownText';
import {
    parseScript,
    getCurrentSegment,
    getSpeakerColor,
    type ScriptSegment,
} from '@/lib/utils/scriptParser';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';

// Speaker images
const BRIGO_ICON = require('@/assets/icon-rounded.png');
const PET_BUBBLES: Record<number, ImageSourcePropType> = {
    1: require('@/assets/pets/stage-1/bubble.png'),
    2: require('@/assets/pets/stage-2/bubble.png'),
    3: require('@/assets/pets/stage-3/bubble.png'),
};

// Animation duration constants
const CROSSFADE_DURATION = 200;

interface SubtitleDisplayProps {
    script: string;
    currentTime: number;
    duration: number;
    isVisible: boolean;
    onToggleVisibility?: () => void;
}

// Helper to get speaker image
const getSpeakerImage = (speaker: string | undefined, petStage: 1 | 2 | 3): ImageSourcePropType => {
    const isBrigo = speaker?.toLowerCase() === 'brigo';
    return isBrigo ? BRIGO_ICON : PET_BUBBLES[petStage];
};

// Helper to get image size based on speaker
const getSpeakerImageSize = (speaker: string | undefined, petStage: 1 | 2 | 3): number => {
    const isBrigo = speaker?.toLowerCase() === 'brigo';
    if (isBrigo) return 40;

    switch (petStage) {
        case 1: return 74; // Increased from 68
        case 2: return 86;
        case 3: return 64; // Increased from 52
        default: return 60;
    }
};

// Helper to get positioning offsets
const getSpeakerOffsets = (speaker: string | undefined, petStage: 1 | 2 | 3): { bottom: number; left: number } => {
    const isBrigo = speaker?.toLowerCase() === 'brigo';
    if (isBrigo) return { bottom: -12, left: 8 };

    switch (petStage) {
        case 1: return { bottom: -20, left: -2 }; // Adjusted for better card integration
        case 2: return { bottom: -28, left: -6 };
        case 3: return { bottom: -16, left: 2 }; // Adjusted for better card integration (was -10, 6)
        default: return { bottom: -12, left: 4 };
    }
};

// Speaker bubble component for reuse in crossfade layers
interface SpeakerBubbleProps {
    segment: ScriptSegment;
    petStage: 1 | 2 | 3;
    colors: ReturnType<typeof getThemeColors>;
    isDarkMode: boolean;
}

const SpeakerBubble = React.memo(({ segment, petStage, colors, isDarkMode }: SpeakerBubbleProps) => {
    const isBrigo = segment.speaker?.toLowerCase() === 'brigo';
    const speakerImage = getSpeakerImage(segment.speaker, petStage);
    const imageSize = getSpeakerImageSize(segment.speaker, petStage);
    const offsets = getSpeakerOffsets(segment.speaker, petStage);
    const speakerColor = getSpeakerColor(segment.speaker, isDarkMode);

    return (
        <>
            {/* Speaker image - positioned above the card */}
            <View style={{ marginBottom: offsets.bottom, marginLeft: offsets.left, zIndex: 10 }}>
                <Image
                    source={speakerImage}
                    style={{
                        width: imageSize,
                        height: imageSize,
                        borderRadius: isBrigo ? 10 : 0,
                    }}
                    resizeMode="contain"
                />
            </View>

            {/* Card content */}
            <View
                style={{
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: 20,
                    paddingTop: 16,
                    paddingBottom: 20,
                    paddingHorizontal: 20,
                    borderWidth: 1,
                    borderColor: colors.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDarkMode ? 0.3 : 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}
            >
                {/* Speaker name */}
                <Text
                    style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: speakerColor,
                        fontFamily: 'Nunito-Bold',
                        marginBottom: 8,
                    }}
                >
                    {segment.speaker || 'Speaker'}
                </Text>

                {/* Dialogue text - scrollable for long segments */}
                <ScrollView
                    style={{ maxHeight: 180 }}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                >
                    <MarkdownText
                        style={{
                            fontSize: 16,
                            lineHeight: 24,
                            color: colors.text,
                            fontFamily: 'Nunito-Regular',
                        }}
                    >
                        {`"${segment.text || ''}"`}
                    </MarkdownText>
                </ScrollView>
            </View>
        </>
    );
});

export function SubtitleDisplay({
    script,
    currentTime,
    duration,
    isVisible,
    onToggleVisibility,
}: SubtitleDisplayProps) {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    // Get pet stage for speaker image
    const petStage = useStore(state => state.petState?.stage || 1) as 1 | 2 | 3;

    // Parse script into segments (memoized)
    const { segments, totalChars } = useMemo(() => {
        const parsed = parseScript(script);
        const total = script.length;
        return { segments: parsed, totalChars: total };
    }, [script]);

    // Get current segment based on playback position
    const currentSegment = useMemo(() => {
        return getCurrentSegment(currentTime, duration, segments, totalChars);
    }, [currentTime, duration, segments, totalChars]);

    // Crossfade state: track two layers
    const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');
    const [layerASegment, setLayerASegment] = useState<ScriptSegment | null>(null);
    const [layerBSegment, setLayerBSegment] = useState<ScriptSegment | null>(null);

    // Animation values for each layer
    const layerAOpacity = useRef(new Animated.Value(1)).current;
    const layerBOpacity = useRef(new Animated.Value(0)).current;

    const isAnimatingRef = useRef(false);

    // Initialize first segment
    useEffect(() => {
        if (currentSegment && !layerASegment && !layerBSegment) {
            setLayerASegment(currentSegment);
            setActiveLayer('A');
            layerAOpacity.setValue(1);
            layerBOpacity.setValue(0);
        }
    }, [currentSegment, layerASegment, layerBSegment]);

    // Handle segment changes with crossfade
    useEffect(() => {
        if (!currentSegment || isAnimatingRef.current) return;

        const currentDisplayed = activeLayer === 'A' ? layerASegment : layerBSegment;
        if (currentDisplayed?.text === currentSegment.text) return;

        isAnimatingRef.current = true;

        if (activeLayer === 'A') {
            // Layer A is visible, fade in Layer B with new content
            setLayerBSegment(currentSegment);

            // Crossfade: A fades out, B fades in simultaneously
            Animated.parallel([
                Animated.timing(layerAOpacity, {
                    toValue: 0,
                    duration: CROSSFADE_DURATION,
                    useNativeDriver: true,
                }),
                Animated.timing(layerBOpacity, {
                    toValue: 1,
                    duration: CROSSFADE_DURATION,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setActiveLayer('B');
                isAnimatingRef.current = false;
            });
        } else {
            // Layer B is visible, fade in Layer A with new content
            setLayerASegment(currentSegment);

            // Crossfade: B fades out, A fades in simultaneously
            Animated.parallel([
                Animated.timing(layerBOpacity, {
                    toValue: 0,
                    duration: CROSSFADE_DURATION,
                    useNativeDriver: true,
                }),
                Animated.timing(layerAOpacity, {
                    toValue: 1,
                    duration: CROSSFADE_DURATION,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setActiveLayer('A');
                isAnimatingRef.current = false;
            });
        }
    }, [currentSegment?.text, activeLayer]);

    // Don't render if no script or not visible
    if (!isVisible || !script || segments.length === 0) {
        return (
            <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
                {onToggleVisibility && (
                    <TouchableOpacity
                        onPress={onToggleVisibility}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            backgroundColor: colors.surfaceAlt,
                            borderRadius: 20,
                        }}
                    >
                        <Ionicons name="text" size={16} color={colors.textSecondary} />
                        <Text style={{ marginLeft: 6, color: colors.textSecondary, fontSize: 14 }}>
                            Show Subtitles
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={{ paddingHorizontal: 16, minHeight: 140 }}>
            {/* Toggle button */}
            {onToggleVisibility && (
                <TouchableOpacity
                    onPress={onToggleVisibility}
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 16,
                        padding: 8,
                        zIndex: 10,
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="eye-off-outline" size={18} color={colors.iconMuted} />
                </TouchableOpacity>
            )}

            {/* Crossfade container - two stacked layers */}
            <View style={styles.crossfadeContainer}>
                {/* Layer A */}
                {layerASegment && (
                    <Animated.View
                        style={[
                            styles.crossfadeLayer,
                            { opacity: layerAOpacity },
                        ]}
                        pointerEvents={activeLayer === 'A' ? 'auto' : 'none'}
                    >
                        <SpeakerBubble
                            segment={layerASegment}
                            petStage={petStage}
                            colors={colors}
                            isDarkMode={isDarkMode}
                        />
                    </Animated.View>
                )}

                {/* Layer B */}
                {layerBSegment && (
                    <Animated.View
                        style={[
                            styles.crossfadeLayer,
                            styles.crossfadeLayerAbsolute,
                            { opacity: layerBOpacity },
                        ]}
                        pointerEvents={activeLayer === 'B' ? 'auto' : 'none'}
                    >
                        <SpeakerBubble
                            segment={layerBSegment}
                            petStage={petStage}
                            colors={colors}
                            isDarkMode={isDarkMode}
                        />
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    crossfadeContainer: {
        position: 'relative',
    },
    crossfadeLayer: {
        // Layer A is in normal flow
    },
    crossfadeLayerAbsolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
});

export default SubtitleDisplay;
