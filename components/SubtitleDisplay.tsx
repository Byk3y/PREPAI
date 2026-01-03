/**
 * SubtitleDisplay - Chat bubble style subtitle component for podcasts
 * Shows current speaker with their dialogue in a conversational format
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    parseScript,
    getCurrentSegment,
    getSpeakerColor,
    getSpeakerInitials,
    type ScriptSegment,
} from '@/lib/utils/scriptParser';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

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
    const speakerInitials = displayedSegment ? getSpeakerInitials(displayedSegment.speaker) : '?';

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

            {/* Subtitle bubble */}
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: 20,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: colors.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDarkMode ? 0.3 : 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}
            >
                {/* Speaker header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    {/* Avatar circle */}
                    <View
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: speakerColor,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                            {speakerInitials}
                        </Text>
                    </View>

                    {/* Speaker name */}
                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: speakerColor,
                            fontFamily: 'Nunito-Bold',
                        }}
                    >
                        {displayedSegment?.speaker || 'Speaker'}
                    </Text>
                </View>

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
            </Animated.View>
        </View>
    );
}

export default SubtitleDisplay;
