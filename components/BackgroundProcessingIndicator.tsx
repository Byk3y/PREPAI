/**
 * BackgroundProcessingIndicator
 * Shows progress for large PDFs being processed in the background
 */

import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useBackgroundProcessing, ProcessingJobStatus } from '@/lib/hooks/useBackgroundProcessing';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface BackgroundProcessingIndicatorProps {
    notebookId: string;
    onComplete?: () => void;
    onError?: (error: string) => void;
    compact?: boolean; // For inline display
}

export function BackgroundProcessingIndicator({
    notebookId,
    onComplete,
    onError,
    compact = false,
}: BackgroundProcessingIndicatorProps) {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    const { job, isLoading, isProcessing, isComplete, isFailed, retryJob } =
        useBackgroundProcessing({
            notebookId,
            onComplete,
            onError,
        });

    // Pulse animation for processing state
    React.useEffect(() => {
        if (isProcessing) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.6,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [isProcessing, pulseAnim]);

    if (isLoading || !job) {
        return null;
    }

    // Don't show if completed (unless compact mode for inline status)
    if (isComplete && !compact) {
        return null;
    }

    const getStatusIcon = (): { name: keyof typeof Ionicons.glyphMap; color: string } => {
        switch (job.status) {
            case 'pending':
                return { name: 'time-outline', color: colors.warning };
            case 'processing':
                return { name: 'sync', color: colors.primary };
            case 'completed':
                return { name: 'checkmark-circle', color: colors.success };
            case 'failed':
                return { name: 'alert-circle', color: colors.error };
            case 'cancelled':
                return { name: 'close-circle', color: colors.textSecondary };
            default:
                return { name: 'help-circle', color: colors.textSecondary };
        }
    };

    const getStatusText = (): string => {
        if (job.progressMessage) {
            return job.progressMessage;
        }

        switch (job.status) {
            case 'pending':
                return 'Queued for processing...';
            case 'processing':
                return `Processing${job.estimatedPages ? ` (~${job.estimatedPages} pages)` : ''}...`;
            case 'completed':
                return 'Processing complete!';
            case 'failed':
                return job.errorMessage || 'Processing failed';
            case 'cancelled':
                return 'Processing cancelled';
            default:
                return 'Unknown status';
        }
    };

    const { name: iconName, color: iconColor } = getStatusIcon();

    if (compact) {
        return (
            <View style={[styles.compactContainer, { backgroundColor: colors.surface }]}>
                <Animated.View style={{ opacity: isProcessing ? pulseAnim : 1 }}>
                    <Ionicons name={iconName} size={16} color={iconColor} />
                </Animated.View>
                <Text style={[styles.compactText, { color: colors.textSecondary }]}>
                    {getStatusText()}
                </Text>
                {isProcessing && job.progress > 0 && (
                    <Text style={[styles.progressText, { color: colors.primary }]}>
                        {job.progress}%
                    </Text>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
                <Animated.View style={{ opacity: isProcessing ? pulseAnim : 1 }}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </Animated.View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Background Processing
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {getStatusText()}
                    </Text>
                </View>
            </View>

            {isProcessing && (
                <View style={styles.progressContainer}>
                    <View
                        style={[styles.progressBackground, { backgroundColor: colors.border }]}
                    >
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    backgroundColor: colors.primary,
                                    width: `${job.progress}%`,
                                },
                            ]}
                        />
                    </View>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        {job.progress}%
                        {job.processedPages && job.estimatedPages
                            ? ` (${job.processedPages}/${job.estimatedPages} pages)`
                            : ''}
                    </Text>
                </View>
            )}

            {isFailed && (
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: colors.error }]}>
                        {job.errorMessage || 'An error occurred during processing.'}
                    </Text>
                    <TouchableOpacity onPress={retryJob}>
                        <Text style={[styles.retryButton, { color: colors.primary }]}>
                            Tap to retry
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {job.estimatedPages && job.estimatedPages > 100 && isProcessing && (
                <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                    💡 Large documents take longer to process. You can navigate away - we'll notify you when
                    it's ready.
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
        gap: 12,
    },
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        gap: 8,
    },
    compactText: {
        flex: 1,
        fontSize: 12,
    },
    progressText: {
        fontSize: 12,
        fontVariant: ['tabular-nums'],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerText: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 14,
    },
    progressContainer: {
        gap: 4,
    },
    progressBackground: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressLabel: {
        fontSize: 12,
    },
    errorContainer: {
        gap: 8,
    },
    errorText: {
        fontSize: 14,
    },
    retryButton: {
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    infoText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
});

export default BackgroundProcessingIndicator;
