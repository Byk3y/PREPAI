/**
 * AudioPlayer - A full-screen audio player UI component
 * Matches the reference design with header, progress bar, and playback controls
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import { useAudioPlaybackPosition } from '@/lib/hooks/useAudioPlaybackPosition';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { AudioVisualizer } from './AudioVisualizer';
import { useStore } from '@/lib/store';
import { audioFeedbackService } from '@/lib/services/audioFeedbackService';
import { configureAudioMode } from '@/lib/audioConfig';
import {
    CloseIcon,
    DownloadIcon,
    PlayIcon,
    PauseIcon,
    ThumbUpIcon,
    ThumbDownIcon
} from './AudioIcons';
import { formatTime } from '@/lib/utils';
import { BrigoLogo } from './BrigoLogo';

interface AudioPlayerProps {
    audioUrl: string; // Required: URL to audio file
    audioOverviewId: string; // Required: Unique ID for position tracking
    notebookId: string; // Required: Parent notebook ID
    title?: string;
    duration?: number; // in seconds
    onClose?: () => void;
    onDownload?: () => void;
    isDownloading?: boolean; // Optional: Show loading state on download button
    downloadProgress?: number; // Optional: Download progress percentage (0-100)
}

export function AudioPlayer({
    audioUrl,
    audioOverviewId,
    notebookId,
    title = 'Podcast',
    duration = 0,
    onClose,
    onDownload,
    isDownloading = false,
    downloadProgress = 0,
}: AudioPlayerProps) {
    const { handleError } = useErrorHandler();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [liked, setLiked] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    const sound = useRef<Audio.Sound | null>(null);
    const isDraggingSlider = useRef(false);
    const isSeeking = useRef(false);
    const hasAwardedTaskRef = useRef(false);
    const feedbackLoadingRef = useRef(false);
    const feedbackOperationRef = useRef(false); // Track if feedback operation is in progress

    const checkAndAwardTask = useStore((state) => state.checkAndAwardTask);
    const authUser = useStore((state) => state.authUser);

    // Position persistence hook
    const {
        savedPosition,
        saveCurrentPosition,
        clearSavedPosition,
    } = useAudioPlaybackPosition(audioOverviewId, notebookId, audioUrl, audioDuration);

    // Initialize audio on mount
    useEffect(() => {
        loadAudio();

        return () => {
            // Save position before unmount (when navigating away)
            if (sound.current) {
                sound.current.getStatusAsync().then((status) => {
                    if (status.isLoaded && status.positionMillis) {
                        const positionInSeconds = status.positionMillis / 1000;
                        saveCurrentPosition(positionInSeconds);
                    }
                });

                sound.current.unloadAsync();
            }
        };
    }, [audioUrl, saveCurrentPosition]);

    // Load existing feedback on mount
    useEffect(() => {
        if (!authUser?.id || feedbackLoadingRef.current) return;

        let isMounted = true;

        const loadFeedback = async () => {
            try {
                feedbackLoadingRef.current = true;
                const feedback = await audioFeedbackService.getFeedback(
                    authUser.id,
                    audioOverviewId
                );
                // Only update state if component is still mounted
                if (isMounted && feedback) {
                    setLiked(feedback.is_liked);
                }
            } catch (error) {
                // Non-critical error - log but don't block UI
                console.error('Failed to load audio feedback:', error);
            } finally {
                if (isMounted) {
                    feedbackLoadingRef.current = false;
                }
            }
        };

        loadFeedback();

        // Cleanup: prevent state updates if component unmounts
        return () => {
            isMounted = false;
        };
    }, [authUser?.id, audioOverviewId]);

    const loadAudio = async () => {
        try {
            setLoading(true);

            // Configure audio mode to allow background playback
            // and ensure it still mixes with other audio as per user requirements
            await configureAudioMode(true);

            // Load audio
            const { sound: audioSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: false, rate: playbackSpeed },
                onPlaybackStatusUpdate
            );

            sound.current = audioSound;

            // Get initial duration
            const status = await audioSound.getStatusAsync();
            if (status.isLoaded && status.durationMillis) {
                setAudioDuration(status.durationMillis / 1000);
            }

            // Restore saved position if exists and is significant (>5 seconds)
            if (savedPosition && savedPosition > 5) {
                await audioSound.setPositionAsync(savedPosition * 1000); // Convert to ms
                setCurrentTime(savedPosition);
            }

            setLoading(false);
        } catch (error: any) {
            setLoading(false);
            await handleError(error, {
                operation: 'load_audio_file',
                component: 'audio-player',
                metadata: { audioUrl }
            });
        }
    };

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (status.isLoaded) {
            const positionInSeconds = (status.positionMillis || 0) / 1000;
            setIsPlaying(status.isPlaying);

            if (status.durationMillis) {
                setAudioDuration(status.durationMillis / 1000);
            }

            // Save position periodically during playback
            if (status.isPlaying) {
                // Only update current time if not dragging slider to prevent jumping
                if (!isDraggingSlider.current) {
                    setCurrentTime(positionInSeconds);
                    saveCurrentPosition(positionInSeconds);
                }

                // Award "podcast_3_min" task if they've listened for 3 minutes (180s)
                if (positionInSeconds >= 180 && !hasAwardedTaskRef.current && checkAndAwardTask) {
                    hasAwardedTaskRef.current = true;
                    checkAndAwardTask('podcast_3_min');
                }
            }

            // Auto-stop at end and clear saved position
            if (status.didJustFinish) {
                setIsPlaying(false);
                setCurrentTime(0);
                sound.current?.setPositionAsync(0);
                clearSavedPosition(); // Clear saved position when audio finishes
            }
        }
    };

    // Safe seek helper to prevent "Interrupted" errors
    const safeSeek = useCallback(async (positionMillis: number) => {
        if (!sound.current || isSeeking.current) return;

        try {
            isSeeking.current = true;
            await sound.current.setPositionAsync(positionMillis);
        } catch (error: any) {
            // Ignore interruption errors which happen during rapid seeking
            if (error.message && error.message.includes('Seeking interrupted')) {
                console.log('Seeking interrupted (harmless)');
            } else {
                console.error('Seek error:', error);
            }
        } finally {
            isSeeking.current = false;
        }
    }, []);

    const handleSlidingStart = useCallback(() => {
        isDraggingSlider.current = true;
    }, []);

    const handleSlidingComplete = useCallback(async (value: number) => {
        if (!sound.current) return;
        const newPositionMillis = value * 1000;

        // Optimistic update
        setCurrentTime(value);

        await safeSeek(newPositionMillis);
        isDraggingSlider.current = false;
    }, [safeSeek]);

    const handlePlayPause = useCallback(async () => {
        if (!sound.current || loading) return;

        try {
            const status = await sound.current.getStatusAsync();
            if (status.isLoaded) {
                if (status.isPlaying) {
                    await sound.current.pauseAsync();
                    // Save position immediately on pause
                    const positionInSeconds = (status.positionMillis || 0) / 1000;
                    saveCurrentPosition(positionInSeconds);
                } else {
                    await sound.current.playAsync();
                }
            }
        } catch (error) {
            console.error('Play/Pause error:', error);
        }
    }, [loading, saveCurrentPosition, checkAndAwardTask]);

    const handleSeekBack = useCallback(async () => {
        if (!sound.current || loading) return;
        try {
            const status = await sound.current.getStatusAsync();
            if (status.isLoaded) {
                const newPosition = Math.max(0, (status.positionMillis || 0) - 10000);
                // Optimistic update
                setCurrentTime(newPosition / 1000);
                await safeSeek(newPosition);
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, [loading, safeSeek]);

    const handleSeekForward = useCallback(async () => {
        if (!sound.current || loading) return;
        try {
            const status = await sound.current.getStatusAsync();
            if (status.isLoaded && status.durationMillis) {
                const newPosition = Math.min(status.durationMillis, (status.positionMillis || 0) + 10000);
                // Optimistic update
                setCurrentTime(newPosition / 1000);
                await safeSeek(newPosition);
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, [loading, safeSeek]);

    const handleSpeedChange = useCallback(async () => {
        if (!sound.current || loading) return;

        try {
            const newSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
            await sound.current.setRateAsync(newSpeed, true);
            setPlaybackSpeed(newSpeed);
        } catch (error) {
            console.error('Speed change error:', error);
        }
    }, [playbackSpeed, loading]);

    const handleLike = useCallback(async () => {
        // Prevent concurrent operations
        if (feedbackOperationRef.current) return;

        // Capture current value before state update
        const previousValue = liked;
        const newValue = liked === true ? null : true;

        // Optimistic update
        setLiked(newValue);
        feedbackOperationRef.current = true;

        // Persist to database (non-blocking)
        if (authUser?.id) {
            try {
                if (newValue === null) {
                    // Remove feedback
                    await audioFeedbackService.removeFeedback(
                        authUser.id,
                        audioOverviewId
                    );
                } else {
                    // Save like
                    await audioFeedbackService.saveFeedback(
                        authUser.id,
                        audioOverviewId,
                        true
                    );
                }

                // Trigger "Reviewer" daily task
                if (checkAndAwardTask) {
                    checkAndAwardTask('audio_feedback_given');
                }
            } catch (error) {
                // Revert on error using functional update to get latest state
                setLiked((current) => {
                    // If state hasn't changed, revert to previous
                    return current === newValue ? previousValue : current;
                });
                console.error('Failed to save like:', error);
                // Non-critical - don't show error to user, just log
            } finally {
                feedbackOperationRef.current = false;
            }
        } else {
            feedbackOperationRef.current = false;
        }
    }, [liked, authUser?.id, audioOverviewId]);

    const handleDislike = useCallback(async () => {
        // Prevent concurrent operations
        if (feedbackOperationRef.current) return;

        // Capture current value before state update
        const previousValue = liked;
        const newValue = liked === false ? null : false;

        // Optimistic update
        setLiked(newValue);
        feedbackOperationRef.current = true;

        // Persist to database (non-blocking)
        if (authUser?.id) {
            try {
                if (newValue === null) {
                    // Remove feedback
                    await audioFeedbackService.removeFeedback(
                        authUser.id,
                        audioOverviewId
                    );
                } else {
                    // Save dislike
                    await audioFeedbackService.saveFeedback(
                        authUser.id,
                        audioOverviewId,
                        false
                    );
                }

                // Trigger "Reviewer" daily task
                if (checkAndAwardTask) {
                    checkAndAwardTask('audio_feedback_given');
                }
            } catch (error) {
                // Revert on error using functional update to get latest state
                setLiked((current) => {
                    // If state hasn't changed, revert to previous
                    return current === newValue ? previousValue : current;
                });
                console.error('Failed to save dislike:', error);
                // Non-critical - don't show error to user, just log
            } finally {
                feedbackOperationRef.current = false;
            }
        } else {
            feedbackOperationRef.current = false;
        }
    }, [liked, authUser?.id, audioOverviewId]);

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                    <TouchableOpacity
                        onPress={onClose}
                        className="p-2"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <CloseIcon size={22} color="#1a1a1a" />
                    </TouchableOpacity>

                    <View className="flex-1 mx-4">
                        <Text
                            className="text-base font-medium text-gray-900 text-center"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {title}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={onDownload}
                        disabled={isDownloading}
                        className="p-2"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ opacity: isDownloading ? 0.5 : 1 }}
                    >
                        {isDownloading ? (
                            <ActivityIndicator size="small" color="#1a1a1a" />
                        ) : (
                            <DownloadIcon size={22} color="#1a1a1a" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Download Progress Bar */}
                {isDownloading && downloadProgress > 0 && (
                    <View className="w-full bg-gray-100" style={{ height: 3 }}>
                        <View
                            className="h-full bg-[#4F5BD5]"
                            style={{ width: `${downloadProgress}%` }}
                        />
                    </View>
                )}

                {/* Content Area with Blue Line */}
                <View className="flex-1 justify-end">
                    {/* Blue Accent Line */}
                    <View className="w-full h-0.5 bg-[#4F5BD5] mb-8" />

                    {/* Main Content Area - Audio Visualization Space */}
                    <View className="flex-1 px-6 justify-center items-center">
                        <AudioVisualizer isPlaying={isPlaying} />
                    </View>

                    {/* Secondary Controls */}
                    <View className="flex-row items-center justify-center gap-12 mb-8 px-6">
                        <TouchableOpacity
                            onPress={handleSpeedChange}
                            className="items-center justify-center"
                        >
                            <Text className="text-base font-semibold text-gray-700">
                                {playbackSpeed}X
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLike}
                            className="items-center justify-center"
                        >
                            <ThumbUpIcon
                                size={24}
                                color={liked === true ? '#4F5BD5' : '#9ca3af'}
                                filled={liked === true}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleDislike}
                            className="items-center justify-center"
                        >
                            <ThumbDownIcon
                                size={24}
                                color={liked === false ? '#ef4444' : '#9ca3af'}
                                filled={liked === false}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View className="px-6 mb-8">
                        <View className="flex-row items-center">
                            <Text className="text-sm text-gray-500 w-12 font-medium">
                                {formatTime(currentTime)}
                            </Text>
                            <View className="flex-1 mx-3">
                                <Slider
                                    style={{ width: '100%', height: 40 }}
                                    minimumValue={0}
                                    maximumValue={audioDuration || 1}
                                    value={currentTime}
                                    onSlidingStart={handleSlidingStart}
                                    onSlidingComplete={handleSlidingComplete}
                                    minimumTrackTintColor="#4F5BD5"
                                    maximumTrackTintColor="#E5E7EB"
                                    thumbTintColor="#4F5BD5"
                                    tapToSeek={true}
                                />
                            </View>
                            <Text className="text-sm text-gray-500 w-12 text-right font-medium">
                                {formatTime(audioDuration)}
                            </Text>
                        </View>
                    </View>

                    {/* Primary Controls */}
                    <View className="flex-row items-center justify-center gap-10 mb-20">
                        <TouchableOpacity
                            onPress={handleSeekBack}
                            className="w-14 h-14 items-center justify-center"
                        >
                            <View className="items-center justify-center">
                                <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                                    {/* Circular arrow */}
                                    <Path
                                        d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10"
                                        stroke="#4F5BD5"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                    />
                                    {/* Arrow head */}
                                    <Path
                                        d="M16 2v8l-4-4"
                                        stroke="#4F5BD5"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                                <Text className="text-xs font-bold text-[#4F5BD5] absolute">
                                    10
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handlePlayPause}
                            disabled={loading}
                            className="w-20 h-20 rounded-full bg-[#4F5BD5] items-center justify-center shadow-lg"
                            style={{
                                shadowColor: '#4F5BD5',
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.4,
                                shadowRadius: 12,
                                elevation: 12,
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : isPlaying ? (
                                <PauseIcon size={36} color="#fff" />
                            ) : (
                                <PlayIcon size={36} color="#fff" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSeekForward}
                            className="w-14 h-14 items-center justify-center"
                        >
                            <View className="items-center justify-center">
                                <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                                    {/* Circular arrow */}
                                    <Path
                                        d="M16 6c5.523 0 10 4.477 10 10s-4.477 10-10 10S6 21.523 6 16"
                                        stroke="#4F5BD5"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                    />
                                    {/* Arrow head */}
                                    <Path
                                        d="M16 2v8l4-4"
                                        stroke="#4F5BD5"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                                <Text className="text-xs font-bold text-[#4F5BD5] absolute">
                                    10
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Powered by Brigo footer */}
                    <View className="flex-row items-center justify-center mb-4" style={{ gap: 6, opacity: 0.4 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Outfit-Light', color: '#6B7280' }}>
                            Powered by
                        </Text>
                        <BrigoLogo size={12} textColor="#6B7280" />
                    </View>
                </View>

                {/* Gradient Background at Bottom */}
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(167,243,208,0.4)', 'rgba(153,246,228,0.5)']}
                    locations={[0, 0.5, 1]}
                    className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                />
            </SafeAreaView>
        </View>
    );
}

export default AudioPlayer;
