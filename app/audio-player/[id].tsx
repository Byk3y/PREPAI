/**
 * Audio Player Screen - Full-screen audio player
 * Route: /audio-player/[id]
 */

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Alert } from 'react-native';
import { audioService } from '@/lib/services/audioService';
import { audioDownloadService } from '@/lib/services/audioDownloadService';
import type { AudioOverview } from '@/lib/store/types';
import { TikTokLoader } from '@/components/TikTokLoader';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export default function AudioPlayerScreen() {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [audioOverview, setAudioOverview] = useState<AudioOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // Load audio overview on mount
    useEffect(() => {
        loadAudioOverview();
    }, [id]);

    const loadAudioOverview = async () => {
        try {
            setLoading(true);
            const overview = await audioService.getById(id);

            if (!overview) {
                setError('Podcast not found');
                Alert.alert('Error', 'Podcast not found', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
                return;
            }

            setAudioOverview(overview);
        } catch (err: any) {
            console.error('Failed to load podcast:', err);
            setError(err.message || 'Failed to load podcast');
            Alert.alert('Error', 'Failed to load podcast', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        router.back();
    };

    const handleDownload = async () => {
        if (!audioOverview || isDownloading) return;

        try {
            setIsDownloading(true);
            setDownloadProgress(0);

            const result = await audioDownloadService.downloadAudioFile(
                audioOverview.audio_url,
                audioOverview.title,
                audioOverview.storage_path,
                (progress) => {
                    setDownloadProgress(progress.percentage);
                }
            );

            if (result.success) {
                // Success - share sheet was presented, no need to show alert
                // User will see native share/save UI
                setDownloadProgress(100);
            } else {
                // Show error alert
                Alert.alert('Download Failed', result.message);
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Download Failed', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsDownloading(false);
            // Reset progress after a short delay
            setTimeout(() => setDownloadProgress(0), 1000);
        }
    };

    // Loading state
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <TikTokLoader size={16} color={colors.primary} containerWidth={80} />
                <Text style={{ marginTop: 24, color: colors.textSecondary, fontSize: 16 }}>Loading audio...</Text>
            </View>
        );
    }

    // Error state
    if (error || !audioOverview) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 }}>
                <Text style={{ fontSize: 16, color: '#ef4444', textAlign: 'center' }}>
                    {error || 'Podcast not found'}
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <AudioPlayer
                audioUrl={audioOverview.audio_url}
                audioOverviewId={id}
                notebookId={audioOverview.notebook_id}
                title={audioOverview.title}
                duration={audioOverview.duration}
                script={audioOverview.script}
                onClose={handleClose}
                onDownload={handleDownload}
                isDownloading={isDownloading}
                downloadProgress={downloadProgress}
            />
        </View>
    );
}
