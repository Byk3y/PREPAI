/**
 * AudioPlayer - A full-screen audio player UI component
 * Matches the reference design with header, progress bar, and playback controls
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============== SVG Icons ==============

const CloseIcon = ({ size = 24, color = '#1a1a1a' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 6L6 18M6 6l12 12"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const DownloadIcon = ({ size = 24, color = '#1a1a1a' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const PlayIcon = ({ size = 32, color = '#fff' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M8 5v14l11-7z" />
    </Svg>
);

const PauseIcon = ({ size = 32, color = '#fff' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </Svg>
);

const RewindIcon = ({ size = 28, color = '#4F5BD5' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M11 19a8 8 0 100-16 8 8 0 000 16z"
            stroke={color}
            strokeWidth={1.5}
        />
        <Path
            d="M11 19a8 8 0 110-16"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
        <G transform="translate(2, 0)">
            <Path
                d="M9 8v4l-2-2"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </G>
    </Svg>
);

const ForwardIcon = ({ size = 28, color = '#4F5BD5' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M13 19a8 8 0 110-16 8 8 0 010 16z"
            stroke={color}
            strokeWidth={1.5}
        />
        <Path
            d="M13 3a8 8 0 110 16"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
        <G transform="translate(-2, 0)">
            <Path
                d="M15 8v4l2-2"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </G>
    </Svg>
);

const ThumbUpIcon = ({ size = 24, color = '#9ca3af', filled = false }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color : 'none'}
        />
    </Svg>
);

const ThumbDownIcon = ({ size = 24, color = '#9ca3af', filled = false }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color : 'none'}
        />
    </Svg>
);

// ============== Helper Functions ==============

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============== Component Props ==============

interface AudioPlayerProps {
    title?: string;
    duration?: number; // in seconds
    onClose?: () => void;
    onDownload?: () => void;
}

// ============== Main Component ==============

export function AudioPlayer({
    title = 'Building the PAR Caregiving Companion ...',
    duration = 640, // 10:40 in seconds
    onClose,
    onDownload,
}: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [liked, setLiked] = useState<boolean | null>(null);

    const progress = duration > 0 ? currentTime / duration : 0;

    const handlePlayPause = useCallback(() => {
        setIsPlaying((prev) => !prev);
    }, []);

    const handleSeekBack = useCallback(() => {
        setCurrentTime((prev) => Math.max(0, prev - 10));
    }, []);

    const handleSeekForward = useCallback(() => {
        setCurrentTime((prev) => Math.min(duration, prev + 10));
    }, [duration]);

    const handleSpeedChange = useCallback(() => {
        setPlaybackSpeed((prev) => {
            if (prev === 1) return 1.5;
            if (prev === 1.5) return 2;
            return 1;
        });
    }, []);

    const handleLike = useCallback(() => {
        setLiked((prev) => (prev === true ? null : true));
    }, []);

    const handleDislike = useCallback(() => {
        setLiked((prev) => (prev === false ? null : false));
    }, []);

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
                        className="p-2"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <DownloadIcon size={22} color="#1a1a1a" />
                    </TouchableOpacity>
                </View>

                {/* Content Area with Blue Line */}
                <View className="flex-1 justify-end">
                    {/* Blue Accent Line */}
                    <View className="w-full h-0.5 bg-[#4F5BD5] mb-8" />

                    {/* Main Content Area - Empty/placeholder for visualizer */}
                    <View className="flex-1" />

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
                            <Text className="text-sm text-gray-500 w-12">
                                {formatTime(currentTime)}
                            </Text>
                            <View className="flex-1 h-1 bg-gray-200 rounded-full mx-3 overflow-hidden">
                                <View
                                    className="h-full bg-gray-400 rounded-full"
                                    style={{ width: `${progress * 100}%` }}
                                />
                            </View>
                            <Text className="text-sm text-gray-500 w-12 text-right">
                                {formatTime(duration)}
                            </Text>
                        </View>
                    </View>

                    {/* Primary Controls */}
                    <View className="flex-row items-center justify-center gap-8 mb-6">
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
                            className="w-16 h-16 rounded-full bg-[#4F5BD5] items-center justify-center shadow-lg"
                            style={{
                                shadowColor: '#4F5BD5',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 8,
                            }}
                        >
                            {isPlaying ? (
                                <PauseIcon size={28} color="#fff" />
                            ) : (
                                <PlayIcon size={28} color="#fff" />
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
