import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAudioOverviews } from '@/lib/api/audio-overview';
import type { StudioFlashcard, Quiz, AudioOverview } from '@/lib/store/types';

export const useStudioContent = (notebookId: string) => {
    const [flashcards, setFlashcards] = useState<StudioFlashcard[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [audioOverviews, setAudioOverviews] = useState<AudioOverview[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchContent = useCallback(async () => {
        try {
            setLoading(true);

            const [flashcardResult, quizResult, audioOverviewsData] = await Promise.all([
                supabase
                    .from('studio_flashcards')
                    .select('*')
                    .eq('notebook_id', notebookId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('studio_quizzes')
                    .select('*')
                    .eq('notebook_id', notebookId)
                    .order('created_at', { ascending: false }),
                fetchAudioOverviews(notebookId),
            ]);

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
            console.error('Error fetching studio content:', error);
        } finally {
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
