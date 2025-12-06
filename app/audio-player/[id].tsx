/**
 * Audio Player Screen - Full-screen audio player
 * Route: /audio-player/[id]
 */

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Alert } from 'react-native';
import { getAudioOverview } from '@/lib/api/audio-overview';
import type { AudioOverview } from '@/lib/store/types';
import { TikTokLoader } from '@/components/TikTokLoader';

export default function AudioPlayerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [audioOverview, setAudioOverview] = useState<AudioOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load audio overview on mount
    useEffect(() => {
        loadAudioOverview();
    }, [id]);

    const loadAudioOverview = async () => {
        try {
            setLoading(true);
            const overview = await getAudioOverview(id);

            if (!overview) {
                setError('Audio overview not found');
                Alert.alert('Error', 'Audio overview not found', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
                return;
            }

            setAudioOverview(overview);
        } catch (err: any) {
            console.error('Failed to load audio overview:', err);
            setError(err.message || 'Failed to load audio overview');
            Alert.alert('Error', 'Failed to load audio overview', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        router.back();
    };

    const handleDownload = () => {
        Alert.alert('Download', 'Download feature coming soon!');
    };

    // Loading state
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <TikTokLoader size={16} color="#4F5BD5" containerWidth={80} />
                <Text style={{ marginTop: 24, color: '#737373', fontSize: 16 }}>Loading audio...</Text>
            </View>
        );
    }

    // Error state
    if (error || !audioOverview) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
                <Text style={{ fontSize: 16, color: '#ef4444', textAlign: 'center' }}>
                    {error || 'Audio overview not found'}
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
                onClose={handleClose}
                onDownload={handleDownload}
            />
        </View>
    );
}
