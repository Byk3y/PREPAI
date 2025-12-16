import { useCallback } from 'react';
import { Alert } from 'react-native';
import { generateStudioContent } from '@/lib/api/studioApi';
import { generateAudioOverview } from '@/lib/api/audioOverviewApi';
import { audioService } from '@/lib/services/audioService';
import { storageService } from '@/lib/storage/storageService';
import { useStore } from '@/lib/store';
import type { AudioOverview } from '@/lib/store/types';
import { useErrorHandler } from './useErrorHandler';

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
  const { handleError, withErrorHandling } = useErrorHandler();

  /**
   * Generate flashcards for the notebook
   */
  const handleGenerateFlashcards = useCallback(async () => {
    try {
      // TODO: Implement confirmation dialog with centralized error handling
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Generate Flashcards',
          flashcardsCount > 0
            ? `You already have ${flashcardsCount} flashcards. Generate more?`
            : 'Generate flashcards for this notebook?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Generate', onPress: () => resolve(true) }
          ]
        );
      });

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
      // Error already handled by API layer and displayed via ErrorNotificationContext
      // No need for Alert.alert - error UI will show automatically
    } finally {
      setGeneratingType(null);
    }
  }, [notebookId, flashcardsCount, setGeneratingType, refreshContent, checkAndAwardTask]);

  /**
   * Generate quiz for the notebook
   */
  const handleGenerateQuiz = useCallback(async () => {
    try {
      // TODO: Implement confirmation dialog with centralized error handling
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Generate Quiz',
          quizzesCount > 0
            ? `You already have ${quizzesCount} quizzes. Generate another?`
            : 'Generate a quiz for this notebook?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Generate', onPress: () => resolve(true) }
          ]
        );
      });

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
      // Error already handled by API layer and displayed via ErrorNotificationContext
      // No need for Alert.alert - error UI will show automatically
    } finally {
      setGeneratingType(null);
    }
  }, [notebookId, quizzesCount, setGeneratingType, refreshContent, checkAndAwardTask]);

  /**
   * Generate audio overview for the notebook
   */
  const handleGenerateAudioOverview = useCallback(async () => {
    try {
      // TODO: Implement confirmation dialog with centralized error handling
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Generate Audio Overview',
          audioOverviewsCount > 0
            ? `You already have ${audioOverviewsCount} audio overviews. Generate another?`
            : 'Generate an audio overview for this notebook?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Generate', onPress: () => resolve(true) }
          ]
        );
      });

      if (!ok) return;

      setGeneratingType('audio');

      const result = await generateAudioOverview(notebookId);
      setGeneratingAudioId(result.overview_id);

      // Start polling for status updates
      startAudioPolling(result.overview_id);
    } catch (error: any) {
      console.error('Error generating audio overview:', error);

      // Check if generation actually started on the server despite the error
      // This handles network errors that occur after generation starts
      if (error?.isNetworkError) {
        try {
          // Check for pending audio generation for this notebook
          const pendingAudio = await audioService.findPending(notebookId);

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

      // Error already handled by API layer and displayed via ErrorNotificationContext
      // No need for Alert.alert - error UI will show automatically
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
                  await storageService.deleteFile(overview.storage_path);
                }

                // Delete from database
                await audioService.delete(overview.id);

                // Update local state without refetching everything
                setAudioOverviews((prev) => prev.filter((a) => a.id !== overview.id));

                Alert.alert('Deleted', 'Audio overview has been deleted.');
              } catch (error: any) {
                // Error already handled by services and displayed via ErrorNotificationContext
                // No need for Alert.alert - error UI will show automatically
              }
            },
          },
        ]
      );
    },
    [setAudioOverviews, handleError]
  );

  return {
    handleGenerateFlashcards,
    handleGenerateQuiz,
    handleGenerateAudioOverview,
    handleDeleteAudioOverview,
  };
};