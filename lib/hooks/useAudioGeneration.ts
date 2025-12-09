import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getAudioOverviewStatus } from '@/lib/api/audio-overview';
import { useStore } from '@/lib/store';

export const useAudioGeneration = (
    notebookId: string,
    notebookName: string,
    onGenerationComplete: () => void
) => {
    const router = useRouter();
    const { checkAndAwardTask } = useStore();
    const [generatingType, setGeneratingType] = useState<'flashcards' | 'quiz' | 'audio' | null>(null);
    const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
    const [audioProgress, setAudioProgress] = useState({ stage: '', percent: 0 });
    const [showAudioNotification, setShowAudioNotification] = useState(false);
    const [completedAudioId, setCompletedAudioId] = useState<string | null>(null);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    const startAudioPolling = useCallback((overviewId: string) => {
        stopPolling();

        pollIntervalRef.current = setInterval(async () => {
            try {
                const status = await getAudioOverviewStatus(overviewId);

                if (status.status === 'completed') {
                    stopPolling();
                    setGeneratingType(null);
                    setGeneratingAudioId(null);
                    setCompletedAudioId(overviewId);
                    setShowAudioNotification(true);

                    // Trigger "Generate first audio overview" task
                    if (checkAndAwardTask) {
                        checkAndAwardTask('generate_audio_overview');
                    }

                    onGenerationComplete();
                } else if (status.status === 'failed') {
                    stopPolling();
                    setGeneratingType(null);
                    setGeneratingAudioId(null);

                    Alert.alert(
                        'Generation Failed',
                        status.error_message || 'Failed to generate audio overview. Please try again.',
                        [{ text: 'OK' }]
                    );
                } else {
                    // Update progress
                    const stageText = {
                        'pending': 'Starting...',
                        'generating_script': 'Writing podcast script...',
                        'generating_audio': 'Creating audio...',
                    }[status.status] || 'Processing...';

                    setAudioProgress({
                        stage: stageText,
                        percent: status.progress || 0,
                    });
                }
            } catch (error: any) {
                // Ignore network errors from app backgrounding - generation continues on server
                const isNetworkError = error?.message?.includes('Network request failed') ||
                    error?.message?.includes('network') ||
                    error?.name === 'AbortError';

                if (isNetworkError) {
                    return; // Transient network error, will retry on next poll
                }

                console.error('Error polling status:', error);
                stopPolling();
                setGeneratingType(null);
                setGeneratingAudioId(null);
            }
        }, 2000); // Poll every 2 seconds
    }, [router, onGenerationComplete, stopPolling, checkAndAwardTask]);

    const checkForPendingAudio = useCallback(async () => {
        try {
            const { data: pendingAudio } = await supabase
                .from('audio_overviews')
                .select('id, status')
                .eq('notebook_id', notebookId)
                .in('status', ['pending', 'generating_script', 'generating_audio'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (pendingAudio) {
                setGeneratingType('audio');
                setGeneratingAudioId(pendingAudio.id);
                startAudioPolling(pendingAudio.id);
            }
        } catch {
            // No pending audio generation found
        }
    }, [notebookId, startAudioPolling]);

    // Restart polling when app comes to foreground (if we have a pending audio)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active' && generatingAudioId && !pollIntervalRef.current) {
                // App came to foreground - restart polling to resume status checks
                startAudioPolling(generatingAudioId);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [generatingAudioId, startAudioPolling]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    const dismissNotification = useCallback(() => {
        setShowAudioNotification(false);
        setCompletedAudioId(null);
    }, []);

    const handleListenNow = useCallback(() => {
        setShowAudioNotification(false);
        setCompletedAudioId(null);
    }, []);

    return {
        generatingType,
        setGeneratingType,
        generatingAudioId,
        setGeneratingAudioId,
        audioProgress,
        setAudioProgress,
        startAudioPolling,
        checkForPendingAudio,
        // Notification state
        showAudioNotification,
        completedAudioId,
        notebookName,
        dismissNotification,
        handleListenNow,
    };
};
