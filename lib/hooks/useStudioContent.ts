import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAudioOverviews } from '@/lib/api/audio-overview';
import type { StudioFlashcard, Quiz, AudioOverview } from '@/lib/store/types';

export const useStudioContent = (notebookId: string) => {
    const [flashcards, setFlashcards] = useState<StudioFlashcard[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [audioOverviews, setAudioOverviews] = useState<AudioOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const inFlightRef = useRef<AbortController | null>(null);

    const fetchContent = useCallback(async () => {
        // Abort any previous request to avoid hangs after backgrounding
        if (inFlightRef.current) {
            inFlightRef.current.abort();
        }

        const controller = new AbortController();
        inFlightRef.current = controller;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
            setLoading(true);

            // Safety timeout so we never stay stuck loading
            timeoutId = setTimeout(() => controller.abort(), 10000);

            const [flashcardResult, quizResult, audioOverviewsData] = await Promise.all([
                supabase
                    .from('studio_flashcards')
                    .select('*')
                    .eq('notebook_id', notebookId)
                    .order('created_at', { ascending: false })
                    .abortSignal(controller.signal),
                supabase
                    .from('studio_quizzes')
                    .select('*')
                    .eq('notebook_id', notebookId)
                    .order('created_at', { ascending: false })
                    .abortSignal(controller.signal),
                fetchAudioOverviews(notebookId),
            ]);

            clearTimeout(timeoutId);

            if (flashcardResult.error) {
                console.error('Error fetching flashcards:', flashcardResult.error);
            } else if (flashcardResult.data) {
                setFlashcards(flashcardResult.data);
            }

            if (quizResult.error) {
                console.error('Error fetching quizzes:', quizResult.error);
            } else if (quizResult.data) {
                setQuizzes(quizResult.data);
            }

            setAudioOverviews(audioOverviewsData);
        } catch (error) {
            // Ignore intentional aborts (timeout or new fetch)
            const isAbort =
                controller.signal.aborted ||
                (error instanceof DOMException && error.name === 'AbortError');
            if (isAbort) {
                return;
            }
            console.error('Error fetching studio content:', error);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (inFlightRef.current === controller) {
                inFlightRef.current = null;
            }
            setLoading(false);
        }
    }, [notebookId]);

    // Initial fetch
    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    return {
        flashcards,
        quizzes,
        audioOverviews,
        setAudioOverviews,
        loading,
        refreshContent: fetchContent,
    };
};
