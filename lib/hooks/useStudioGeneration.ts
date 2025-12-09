/**
 * useStudioGeneration Hook
 * Handles all studio content generation logic (flashcards, quizzes, audio overviews)
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { generateStudioContent } from '@/lib/api/studio';
import { generateAudioOverview } from '@/lib/api/audio-overview';
import { useStore } from '@/lib/store';
import type { AudioOverview } from '@/lib/store/types';
import {
  confirmRepeatGeneration,
  formatStudioError,
  isNetworkError,
} from '@/lib/utils/studio';

interface UseStudioGenerationParams {
  notebookId: string;
  flashcardsCount: number;
  quizzesCount: number;
  audioOverviewsCount: number;
  setAudioOverviews: React.Dispatch<React.SetStateAction<AudioOverview[]>>;
  refreshContent: () => Promise<void>;
  // From useAudioGeneration hook
  setGeneratingType: (type: 'flashcards' | 'quiz' | 'audio' | null) => void;
  setGeneratingAudioId: (id: string | null) => void;
  startAudioPolling: (overviewId: string) => void;
}

export const useStudioGeneration = ({
  notebookId,
  flashcardsCount,
  quizzesCount,
  audioOverviewsCount,
  setAudioOverviews,
  refreshContent,
  setGeneratingType,
  setGeneratingAudioId,
  startAudioPolling,
}: UseStudioGenerationParams) => {
  const { checkAndAwardTask } = useStore();

  /**
   * Generate flashcards for the notebook
   */
  const handleGenerateFlashcards = useCallback(async () => {
    try {
      const ok = await confirmRepeatGeneration('Flashcards', flashcardsCount);
      if (!ok) return;

      setGeneratingType('flashcards');

      const result = await generateStudioContent({
        notebook_id: notebookId,
        content_type: 'flashcards',
      });

      // Award task if applicable
      if (checkAndAwardTask) {
        checkAndAwardTask('generate_flashcards');
      }

      // Refresh studio content
      await refreshContent();

      Alert.alert(
        'Success!',
        `Generated ${result.generated_count} flashcards. Tap to view them below.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error generating flashcards:', error);
      const { title, message } = formatStudioError(error, 'flashcards');
      Alert.alert(title, message, [{ text: 'OK' }]);
    } finally {
      setGeneratingType(null);
    }
  }, [notebookId, flashcardsCount, setGeneratingType, refreshContent, checkAndAwardTask]);

  /**
   * Generate quiz for the notebook
   */
  const handleGenerateQuiz = useCallback(async () => {
    try {
      const ok = await confirmRepeatGeneration('Quiz', quizzesCount);
      if (!ok) return;

      setGeneratingType('quiz');

      const result = await generateStudioContent({
        notebook_id: notebookId,
        content_type: 'quiz',
      });

      // Award task if applicable
      if (checkAndAwardTask) {
        checkAndAwardTask('generate_quiz');
      }

      // Refresh studio content
      await refreshContent();

      Alert.alert(
        'Success!',
        `Generated a ${result.generated_count}-question quiz. Tap to take it below.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      const { title, message } = formatStudioError(error, 'quiz');
      Alert.alert(title, message, [{ text: 'OK' }]);
    } finally {
      setGeneratingType(null);
    }
  }, [notebookId, quizzesCount, setGeneratingType, refreshContent, checkAndAwardTask]);

  /**
   * Generate audio overview for the notebook
   */
  const handleGenerateAudioOverview = useCallback(async () => {
    try {
      const ok = await confirmRepeatGeneration('Audio Overview', audioOverviewsCount);
      if (!ok) return;

      setGeneratingType('audio');

      const result = await generateAudioOverview(notebookId);
      setGeneratingAudioId(result.overview_id);

      // Start polling for status updates
      startAudioPolling(result.overview_id);
    } catch (error: any) {
      console.error('Error generating audio overview:', error);

      // For network errors, check if generation actually started on the server
      if (isNetworkError(error)) {
        try {
          // Check for pending audio generation for this notebook
          const { data: pendingAudio } = await supabase
            .from('audio_overviews')
            .select('id, status')
            .eq('notebook_id', notebookId)
            .in('status', ['pending', 'generating_script', 'generating_audio'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (pendingAudio) {
            // Generation actually started! Restore state and continue polling
            setGeneratingType('audio');
            setGeneratingAudioId(pendingAudio.id);
            startAudioPolling(pendingAudio.id);
            return; // Don't show error - generation is in progress
          }
        } catch {
          // No pending audio found, fall through to show error
        }
      }

      // Only clear state and show error if generation didn't actually start
      setGeneratingType(null);
      setGeneratingAudioId(null);

      const { title, message } = formatStudioError(error, 'audio');
      Alert.alert(title, message, [{ text: 'OK' }]);
    }
  }, [
    notebookId,
    audioOverviewsCount,
    setGeneratingType,
    setGeneratingAudioId,
    startAudioPolling,
  ]);

  /**
   * Delete an audio overview
   */
  const handleDeleteAudioOverview = useCallback(
    (overview: AudioOverview) => {
      Alert.alert(
        'Delete Audio Overview',
        `Are you sure you want to delete "${overview.title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete from storage if path exists
                if (overview.storage_path) {
                  const { error: storageError } = await supabase.storage
                    .from('uploads')
                    .remove([overview.storage_path]);

                  if (storageError) {
                    console.warn('Storage delete warning:', storageError);
                  }
                }

                // Delete from database
                const { error: dbError } = await supabase
                  .from('audio_overviews')
                  .delete()
                  .eq('id', overview.id);

                if (dbError) {
                  throw dbError;
                }

                // Update local state without refetching everything
                setAudioOverviews((prev) => prev.filter((a) => a.id !== overview.id));

                Alert.alert('Deleted', 'Audio overview has been deleted.');
              } catch (error: any) {
                console.error('Error deleting audio overview:', error);
                Alert.alert('Error', 'Failed to delete audio overview.');
              }
            },
          },
        ]
      );
    },
    [setAudioOverviews]
  );

  return {
    handleGenerateFlashcards,
    handleGenerateQuiz,
    handleGenerateAudioOverview,
    handleDeleteAudioOverview,
  };
};
