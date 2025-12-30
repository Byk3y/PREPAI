import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { generateStudioContent } from '@/lib/api/studioApi';
import { generateAudioOverview } from '@/lib/api/audioOverviewApi';
import { audioService } from '@/lib/services/audioService';
import { storageService } from '@/lib/storage/storageService';
import { useStore } from '@/lib/store';
import type { AudioOverview } from '@/lib/store/types';
import { useErrorHandler } from './useErrorHandler';
import { checkQuotaRemaining } from '@/lib/services/subscriptionService';
import type { LimitReason, SubscriptionData } from '@/lib/services/subscriptionService';
import { useUpgrade } from '@/lib/hooks/useUpgrade';

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
  const { checkAndAwardTask, tier, status, isExpired, studioJobsUsed, studioJobsLimit, audioJobsUsed, audioJobsLimit, trialEndsAt, trialStartedAt, subscriptionSyncedAt, user, notebooks, cachedPetState, flashcardsStudied, notify } = useStore();
  const { handleError, withErrorHandling } = useErrorHandler();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalSource, setUpgradeModalSource] = useState<'create_attempt' | null>(null);
  const [limitReason, setLimitReason] = useState<LimitReason>(null);
  const { trackCreateAttemptBlocked, trackUpgradeModalShown, trackUpgradeModalDismissed, trackUpgradeButtonClicked } = useUpgrade();

  // Memoize subscription object for quota checks to avoid unnecessary re-renders
  const subscription: SubscriptionData = useMemo(() => ({
    tier,
    status,
    trialEndsAt,
    trialStartedAt,
    studioJobsUsed,
    audioJobsUsed,
    studioJobsLimit,
    audioJobsLimit,
    isExpired,
    subscriptionSyncedAt,
  }), [tier, status, trialEndsAt, trialStartedAt, studioJobsUsed, audioJobsUsed, studioJobsLimit, audioJobsLimit, isExpired, subscriptionSyncedAt]);

  /**
   * Get notebook title for notifications
   */
  const notebookTitle = useMemo(() => {
    return notebooks.find(n => n.id === notebookId)?.title || 'your notebook';
  }, [notebooks, notebookId]);

  /**
   * Generate flashcards for the notebook
   */
  const handleGenerateFlashcards = useCallback(async () => {
    try {
      // Check quota before proceeding with detailed reason
      const quotaCheck = checkQuotaRemaining('studio', subscription);
      if (!quotaCheck.hasQuota) {
        trackCreateAttemptBlocked('flashcards');
        trackUpgradeModalShown('create_attempt');
        setUpgradeModalSource('create_attempt');
        setLimitReason(quotaCheck.reason);
        setShowUpgradeModal(true);
        return;
      }

      // TODO: Implement confirmation dialog with centralized error handling
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Active Drills',
          flashcardsCount > 0
            ? `You already have ${flashcardsCount} active drills. Generate more?`
            : 'Generate active drills for this notebook?',
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

      notify({
        type: 'flashcards',
        title: 'Active Drills Ready!',
        message: `Generated ${result.generated_count} drills for ${notebookTitle}`,
        data: { notebookId: notebookId, setId: result.content_id }
      });
    } catch (error: any) {
      // Error already handled by API layer and displayed via ErrorNotificationContext
      // No need for Alert.alert - error UI will show automatically
    } finally {
      setGeneratingType(null);
    }
  }, [notebookId, flashcardsCount, setGeneratingType, refreshContent, checkAndAwardTask, subscription, trackCreateAttemptBlocked, trackUpgradeModalShown]);

  /**
   * Generate quiz for the notebook
   */
  const handleGenerateQuiz = useCallback(async () => {
    try {
      // Check quota before proceeding with detailed reason
      const quotaCheck = checkQuotaRemaining('studio', subscription);
      if (!quotaCheck.hasQuota) {
        trackCreateAttemptBlocked('quiz');
        trackUpgradeModalShown('create_attempt');
        setUpgradeModalSource('create_attempt');
        setLimitReason(quotaCheck.reason);
        setShowUpgradeModal(true);
        return;
      }

      // TODO: Implement confirmation dialog with centralized error handling
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Mock Exam',
          quizzesCount > 0
            ? `You already have ${quizzesCount} mock exams. Generate another?`
            : 'Generate a mock exam for this notebook?',
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

      notify({
        type: 'quiz',
        title: 'Mock Exam Ready!',
        message: `${notebookTitle} is ready for testing`,
        data: { quizId: result.content_id }
      });
    } catch (error: any) {
      // Error already handled by API layer and displayed via ErrorNotificationContext
      // No need for Alert.alert - error UI will show automatically
    } finally {
      setGeneratingType(null);
    }
  }, [notebookId, quizzesCount, setGeneratingType, refreshContent, checkAndAwardTask, subscription, trackCreateAttemptBlocked, trackUpgradeModalShown]);

  /**
   * Generate audio overview for the notebook
   */
  const handleGenerateAudioOverview = useCallback(async () => {
    // Check quota before proceeding with detailed reason
    const quotaCheck = checkQuotaRemaining('audio', subscription);
    if (!quotaCheck.hasQuota) {
      trackCreateAttemptBlocked('audio_overview');
      trackUpgradeModalShown('create_attempt');
      setUpgradeModalSource('create_attempt');
      setLimitReason(quotaCheck.reason);
      setShowUpgradeModal(true);
      return;
    }
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
      // Check if generation actually started on the server despite the error
      // This handles network errors that occur after generation starts
      if (error?.isNetworkError) {
        // If API layer already confirmed generation started, use that info
        if (error?.generationStarted && error?.overviewId) {
          // Generation started! Restore state and continue polling
          setGeneratingType('audio');
          setGeneratingAudioId(error.overviewId);
          startAudioPolling(error.overviewId);
          return; // Don't show error - generation is in progress
        }

        // Otherwise, check for pending audio generation
        try {
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
    subscription,
    trackCreateAttemptBlocked,
    trackUpgradeModalShown,
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

  // Calculate pet level
  const petLevel = Math.floor((cachedPetState?.points || 0) / 50) + 1;
  const petName = cachedPetState?.name || 'Sparky';

  return {
    handleGenerateFlashcards,
    handleGenerateQuiz,
    handleGenerateAudioOverview,
    handleDeleteAudioOverview,
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeModalSource,
    upgradeModalProps: {
      notebooksCount: notebooks.length,
      flashcardsStudied: flashcardsStudied,
      streakDays: user.streak || 0,
      petName,
      petLevel,
      limitReason,
    },
  };
};