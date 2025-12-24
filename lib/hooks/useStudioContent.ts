import { useState, useCallback, useEffect, useRef } from 'react';
import { studioService } from '@/lib/services/studioService';
import { audioService } from '@/lib/services/audioService';
import type { StudioFlashcard, Quiz, AudioOverview, FlashcardSet } from '@/lib/store/types';

export const useStudioContent = (notebookId: string) => {
    const [flashcard_sets, setFlashcardSets] = useState<FlashcardSet[]>([]);
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

            const [studioContent, audioOverviewsData] = await Promise.all([
                studioService.fetchAll(notebookId),
                audioService.fetchByNotebook(notebookId),
            ]);

            clearTimeout(timeoutId);

            setFlashcardSets(studioContent.flashcard_sets);
            setQuizzes(studioContent.quizzes);
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
        flashcard_sets,
        quizzes,
        audioOverviews,
        setAudioOverviews,
        loading,
        refreshContent: fetchContent,
    };
};
