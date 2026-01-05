/**
 * SubtitleDisplay - Chat bubble style subtitle component for podcasts
 * Shows current speaker with their dialogue in a conversational format
 * Speaker images: Brigo icon for host, pet bubble for user's pet
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
const PET_BUBBLES = {
    1: require('@/assets/pets/stage-1/bubble.png'),
    2: require('@/assets/pets/stage-2/bubble.png'),
    3: require('@/assets/pets/stage-3/bubble.png'),
};

interface SubtitleDisplayProps {
    script: string;
    currentTime: number;
    duration: number;
    isVisible: boolean;
    onToggleVisibility?: () => void;
}

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

    // Track the actually displayed segment (updates after fade-out)
    const [displayedSegment, setDisplayedSegment] = useState<ScriptSegment | null>(null);
    const isAnimatingRef = useRef(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Initialize displayed segment
    useEffect(() => {
        if (currentSegment && !displayedSegment) {
            setDisplayedSegment(currentSegment);
        }
    }, [currentSegment, displayedSegment]);

    // Animate when segment changes
    useEffect(() => {
        // Skip if no change or already animating
        if (!currentSegment || isAnimatingRef.current) return;
        if (displayedSegment?.text === currentSegment.text) return;

        isAnimatingRef.current = true;

        // Quick fade out
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 50, // Very fast fade out
            useNativeDriver: true,
        }).start(() => {
            // Update content after fade out
            setDisplayedSegment(currentSegment);

            // Quick fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 80, // Fast fade in
                useNativeDriver: true,
            }).start(() => {
                isAnimatingRef.current = false;
            });
        });
    }, [currentSegment?.text]);

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

    const speakerColor = displayedSegment ? getSpeakerColor(displayedSegment.speaker, isDarkMode) : '#4F5BD5';

    // Determine if speaker is Brigo (host) or pet
    const isBrigo = displayedSegment?.speaker?.toLowerCase() === 'brigo';

    // Get the appropriate speaker image
    const speakerImage = isBrigo ? BRIGO_ICON : PET_BUBBLES[petStage];

    // Image sizing - Brigo icon is square, pet bubbles need more height
    const imageSize = isBrigo ? 36 : 44;

    return (
        <View style={{ paddingHorizontal: 16, minHeight: 140, paddingTop: 12 }}>
            {/* Toggle button */}
            {onToggleVisibility && (
                <TouchableOpacity
                    onPress={onToggleVisibility}
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 16,
                        padding: 8,
                        zIndex: 10,
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="eye-off-outline" size={18} color={colors.iconMuted} />
                </TouchableOpacity>
            )}

            {/* Subtitle bubble with speaker image */}
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    position: 'relative',
                }}
            >
                {/* Speaker image - positioned at top-left corner */}
                <Image
                    source={speakerImage}
                    style={{
                        position: 'absolute',
                        top: -8,
                        left: -4,
                        width: imageSize,
                        height: imageSize,
                        borderRadius: isBrigo ? 10 : 0,
                        zIndex: 10,
                    }}
                    resizeMode="contain"
                />

                {/* Card content */}
                <View
                    style={{
                        backgroundColor: colors.surfaceElevated,
                        borderRadius: 20,
                        paddingTop: 16,
                        paddingBottom: 20,
                        paddingHorizontal: 20,
                        paddingLeft: imageSize + 12, // Space for the image
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
                        {displayedSegment?.speaker || 'Speaker'}
                    </Text>

                    {/* Dialogue text - scrollable for long segments */}
                    <ScrollView
                        style={{ maxHeight: 180 }}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                lineHeight: 24,
                                color: colors.text,
                                fontFamily: 'Nunito-Regular',
                            }}
                        >
                            "{displayedSegment?.text || ''}"
                        </Text>
                    </ScrollView>
                </View>
            </Animated.View>
        </View>
    );
}

export default SubtitleDisplay;
