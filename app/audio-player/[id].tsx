/**
 * Audio Player Screen - Full-screen audio player
 * Route: /audio-player/[id]
 */

import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Alert } from 'react-native';

export default function AudioPlayerScreen() {
    const { id, title, duration } = useLocalSearchParams<{
        id: string;
        title?: string;
        duration?: string;
    }>();
    const router = useRouter();

    const handleClose = () => {
        router.back();
    };

    const handleDownload = () => {
        Alert.alert('Download', 'Download feature coming soon!');
    };

    // Parse duration from string to number (defaults to 640 = 10:40)
    const audioDuration = duration ? parseInt(duration, 10) : 640;

    return (
        <View style={{ flex: 1 }}>
            <AudioPlayer
                title={title || 'Audio Overview'}
                duration={audioDuration}
                onClose={handleClose}
                onDownload={handleDownload}
            />
        </View>
    );
}
