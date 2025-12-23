import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { audioService } from '@/lib/services/audioService';
import { useStore } from '@/lib/store';
import { useErrorHandler } from './useErrorHandler';

export const useAudioGeneration = (
    notebookId: string,
    notebookName: string,
    onGenerationComplete: () => void
) => {
    const router = useRouter();
    const { checkAndAwardTask } = useStore();
    const { handleError } = useErrorHandler();
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
                const status = await audioService.getStatus(overviewId);

                if (status.status === 'completed') {
                    stopPolling();
                    setGeneratingType(null);
                    setGeneratingAudioId(null);
                    setCompletedAudioId(overviewId);
                    setShowAudioNotification(true);

                    // Trigger "Generate first podcast" task
                    if (checkAndAwardTask) {
                        checkAndAwardTask('generate_audio_overview');
                    }

                    onGenerationComplete();
                } else if (status.status === 'failed') {
                    stopPolling();
                    setGeneratingType(null);
                    setGeneratingAudioId(null);

                    // Show error via centralized system
                    const error = new Error(status.error_message || 'Failed to generate podcast');
                    await handleError(error, {
                        operation: 'audio_generation_failed',
                        component: 'audio-generation',
                        metadata: { overviewId, status: status.status }
                    });
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

                // Use centralized error handling
                await handleError(error, {
                    operation: 'poll_audio_status',
                    component: 'audio-generation',
                    metadata: { overviewId, notebookId }
                });

                stopPolling();
                setGeneratingType(null);
                setGeneratingAudioId(null);
            }
        }, 2000); // Poll every 2 seconds
    }, [router, onGenerationComplete, stopPolling, checkAndAwardTask]);

    const checkForPendingAudio = useCallback(async () => {
        try {
            // Check for pending/generating audio first
            const pendingAudio = await audioService.findPending(notebookId);

            if (pendingAudio) {
                setGeneratingType('audio');
                setGeneratingAudioId(pendingAudio.id);
                startAudioPolling(pendingAudio.id);
            } else {
                // Recovery: Check for completed podcasts that might have missed task award
                // This handles cases where the app was backgrounded or component unmounted
                // before the polling detected completion.
                // Note: We check for ANY completed audio overview for the user (not just this notebook)
                // since the task is awarded once per user for their first completed podcast.
                const { data: { user } } = await supabase.auth.getUser();
                if (user && checkAndAwardTask) {
                    const hasCompleted = await audioService.hasCompleted(user.id);

                    if (hasCompleted) {
                        // Attempt to award the task retroactively
                        // This is idempotent - if already awarded, it will return success with already_completed: true
                        await checkAndAwardTask('generate_audio_overview');
                    }
                }
            }
        } catch (error) {
            // Non-critical error, just log
            await handleError(error, {
                operation: 'check_pending_audio',
                component: 'audio-generation',
                metadata: { notebookId }
            });
        }
    }, [notebookId, startAudioPolling, checkAndAwardTask]);

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
