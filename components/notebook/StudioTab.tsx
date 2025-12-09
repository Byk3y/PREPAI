/**
 * StudioTab - Generate flashcards, quizzes, and audio overviews
 * Orchestrates the studio generation UI and displays generated content
 */

import React, { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Notebook } from '@/lib/store';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

// Hooks
import { useStudioContent } from '@/lib/hooks/useStudioContent';
import { useAudioGeneration } from '@/lib/hooks/useAudioGeneration';
import { useStudioGeneration } from '@/lib/hooks/useStudioGeneration';
import { useAppState } from '@/lib/hooks/useAppState';

// Components
import { AudioReadyNotification } from '@/components/AudioReadyNotification';
import { StudioExtractingState } from './studio/StudioExtractingState';
import { GenerateOptionsSection } from './studio/GenerateOptionsSection';
import { GeneratedMediaSection } from './studio/GeneratedMediaSection';

interface StudioTabProps {
  notebook: Notebook;
  onGenerateQuiz?: () => void;
}

export const StudioTab: React.FC<StudioTabProps> = ({ notebook, onGenerateQuiz }) => {
  const isExtracting = notebook.status === 'extracting';

  // Theme
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Fetch studio content (flashcards, quizzes, audio overviews)
  const {
    flashcards,
    quizzes,
    audioOverviews,
    setAudioOverviews,
    loading,
    refreshContent,
  } = useStudioContent(notebook.id);

  // Audio generation state and polling
  const {
    generatingType,
    setGeneratingType,
    setGeneratingAudioId,
    audioProgress,
    checkForPendingAudio,
    startAudioPolling,
    showAudioNotification,
    completedAudioId,
    notebookName,
    dismissNotification,
    handleListenNow,
  } = useAudioGeneration(notebook.id, notebook.title, refreshContent);

  // Generation handlers
  const {
    handleGenerateFlashcards,
    handleGenerateQuiz,
    handleGenerateAudioOverview,
    handleDeleteAudioOverview,
  } = useStudioGeneration({
    notebookId: notebook.id,
    flashcardsCount: flashcards.length,
    quizzesCount: quizzes.length,
    audioOverviewsCount: audioOverviews.length,
    setAudioOverviews,
    refreshContent,
    setGeneratingType,
    setGeneratingAudioId,
    startAudioPolling,
  });

  // Check for in-progress audio generation on mount (handles navigation back)
  useEffect(() => {
    checkForPendingAudio();
  }, [checkForPendingAudio]);

  // Monitor app state to recover from backgrounding
  useAppState({
    onForeground: () => {
      console.log('[StudioTab] App foregrounded, checking for pending audio...');
      checkForPendingAudio();
      refreshContent();
    },
  });

  // Ref to prevent duplicate generation from external trigger
  const hasTriggeredQuiz = useRef(false);

  // Trigger quiz generation from external source (only once)
  useEffect(() => {
    if (onGenerateQuiz && !hasTriggeredQuiz.current) {
      hasTriggeredQuiz.current = true;
      handleGenerateQuiz();
    }
  }, [onGenerateQuiz, handleGenerateQuiz]);

  // Show extracting state while material is processing
  if (isExtracting) {
    return <StudioExtractingState />;
  }

  // Main studio view
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Generate New Section */}
        <GenerateOptionsSection
          generatingType={generatingType}
          onGenerateAudio={handleGenerateAudioOverview}
          onGenerateFlashcards={handleGenerateFlashcards}
          onGenerateQuiz={handleGenerateQuiz}
        />

        {/* Generated Media Section */}
        <GeneratedMediaSection
          notebookId={notebook.id}
          notebookTitle={notebook.title}
          flashcards={flashcards}
          quizzes={quizzes}
          audioOverviews={audioOverviews}
          loading={loading}
          generatingType={generatingType}
          audioProgressStage={audioProgress.stage}
          onDeleteAudio={handleDeleteAudioOverview}
        />
      </ScrollView>

      {/* Audio Ready Notification */}
      {completedAudioId && (
        <AudioReadyNotification
          visible={showAudioNotification}
          notebookName={notebookName}
          overviewId={completedAudioId}
          onDismiss={dismissNotification}
          onListenNow={handleListenNow}
        />
      )}
    </GestureHandlerRootView>
  );
};
