/**
 * StudioTab - Generate flashcards and quizzes
 * Shows "Generate new" cards and "Generated media" section
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import type { Notebook, AudioOverview, StudioFlashcard, Quiz } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { generateStudioContent } from '@/lib/api/studio';
import { generateAudioOverview } from '@/lib/api/audio-overview';
import { TikTokLoader } from '@/components/TikTokLoader';

// Hooks
import { useStudioContent } from '@/lib/hooks/useStudioContent';
import { useAudioGeneration } from '@/lib/hooks/useAudioGeneration';
import { useAppState } from '@/lib/hooks/useAppState';

// Components
import { AudioReadyNotification } from '@/components/AudioReadyNotification';

// Components
import { GenerateOption } from './studio/GenerateOption';
import { StudioMediaItem } from './studio/StudioMediaItem';
import { StudioEmptyState } from './studio/StudioEmptyState';

interface StudioTabProps {
  notebook: Notebook;
  onGenerateQuiz?: () => void;
}

export const StudioTab: React.FC<StudioTabProps> = ({ notebook, onGenerateQuiz }) => {
  const isExtracting = notebook.status === 'extracting';
  const router = useRouter();

  // Helper to format duration (e.g. 125 -> "2m 5s")
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  // Helper to format relative time (e.g. "2h ago")
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Custom Hooks
  const {
    flashcards,
    quizzes,
    audioOverviews,
    setAudioOverviews,
    loading,
    refreshContent
  } = useStudioContent(notebook.id);

  // Unified media item type for sorting
  type MediaItem = 
    | { type: 'flashcard'; data: { count: number } }
    | { type: 'quiz'; data: Quiz }
    | { type: 'audio'; data: AudioOverview };

  // Combine and sort all media items chronologically (oldest first, newest at bottom)
  const sortedMediaItems = useMemo(() => {
    const items: Array<MediaItem & { createdAt: string }> = [];

    // Add flashcards (if any exist)
    if (flashcards.length > 0) {
      // Use the most recent flashcard's created_at as the date
      const latestFlashcard = flashcards[0]; // Already sorted descending from query
      items.push({
        type: 'flashcard',
        data: { count: flashcards.length },
        createdAt: latestFlashcard.created_at,
      });
    }

    // Add quizzes
    quizzes.forEach((quiz) => {
      items.push({
        type: 'quiz',
        data: quiz,
        createdAt: quiz.created_at,
      });
    });

    // Add audio overviews
    audioOverviews.forEach((overview) => {
      items.push({
        type: 'audio',
        data: overview,
        createdAt: overview.generated_at,
      });
    });

    // Sort by creation date ascending (oldest first, newest at bottom)
    return items.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });
  }, [flashcards, quizzes, audioOverviews]);

  const {
    generatingType,
    setGeneratingType,
    generatingAudioId,
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

  // Check for in-progress audio generation on mount (handles navigation back)
  useEffect(() => {
    checkForPendingAudio();
  }, [checkForPendingAudio]);

  // Monitor app state to recover from backgrounding
  useAppState({
    onForeground: () => {
      // Re-check for pending audio when app comes to foreground
      // This handles cases where app was backgrounded during generation
      console.log('[StudioTab] App foregrounded, checking for pending audio...');
      checkForPendingAudio();
    },
  });

  const handleGenerateAudioOverview = async () => {
    try {
      setGeneratingType('audio');

      const result = await generateAudioOverview(notebook.id);
      setGeneratingAudioId(result.overview_id);

      // Start polling
      startAudioPolling(result.overview_id);

    } catch (error: any) {
      console.error('Error generating audio overview:', error);
      
      // Check if this is a network error (app backgrounding, connection issues)
      const isNetworkError = error?.isNetworkError || 
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('network') ||
        error?.message?.includes('fetch') ||
        error?.name === 'TypeError' ||
        error?.name === 'AbortError';

      // For network errors, check if generation actually started on the server
      if (isNetworkError) {
        console.log('[StudioTab] Network error detected, checking if generation started...');
        
        try {
          // Check for pending audio generation for this notebook
          const { data: pendingAudio } = await supabase
            .from('audio_overviews')
            .select('id, status')
            .eq('notebook_id', notebook.id)
            .in('status', ['pending', 'generating_script', 'generating_audio'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (pendingAudio) {
            // Generation actually started! Restore state and continue polling
            console.log('[StudioTab] Found pending audio generation, restoring state:', pendingAudio.id);
            setGeneratingType('audio');
            setGeneratingAudioId(pendingAudio.id);
            startAudioPolling(pendingAudio.id);
            
            // Don't show error - generation is in progress
            return;
          }
        } catch (recoveryError) {
          console.log('[StudioTab] No pending audio found, treating as real error');
          // Fall through to show error
        }
      }

      // Only clear state and show error if generation didn't actually start
      setGeneratingType(null);
      setGeneratingAudioId(null);
      
      // Extract user-friendly error message
      const errorMessage = error.message || 'Failed to generate audio overview';
      
      // Check if it's a quota error and provide better messaging
      let userMessage = errorMessage;
      let title = 'Generation Failed';
      
      if (errorMessage.includes('Trial limit reached') || errorMessage.includes('quota')) {
        title = 'Limit Reached';
        // Extract remaining/limit info if available
        if (error.remaining !== undefined && error.limit !== undefined) {
          userMessage = `You've used all ${error.limit} audio overviews in your trial. Upgrade to Premium for unlimited audio summaries!`;
        } else {
          userMessage = 'You\'ve reached your trial limit for audio overviews. Upgrade to Premium for unlimited access!';
        }
      } else if (errorMessage.includes('trial has expired')) {
        title = 'Trial Expired';
        userMessage = 'Your trial has ended. Upgrade to Premium to continue creating audio summaries!';
      } else if (errorMessage.includes('Not authenticated')) {
        title = 'Authentication Required';
        userMessage = 'Please sign in to generate audio overviews.';
      } else if (errorMessage.includes('Material content too short')) {
        title = 'Content Too Short';
        userMessage = 'Your material needs at least 500 characters to generate an audio overview.';
      } else if (isNetworkError) {
        // Network error that couldn't be recovered
        title = 'Connection Issue';
        userMessage = 'Unable to start audio generation. Please check your connection and try again.';
      } else {
        // Generic error - don't expose technical details
        userMessage = 'Unable to generate audio overview. Please check your connection and try again.';
      }
      
      Alert.alert(
        title,
        userMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteAudioOverview = (overview: AudioOverview) => {
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
              setAudioOverviews(prev => prev.filter(a => a.id !== overview.id));

              Alert.alert('Deleted', 'Audio overview has been deleted.');
            } catch (error: any) {
              console.error('Error deleting audio overview:', error);
              Alert.alert('Error', 'Failed to delete audio overview.');
            }
          }
        }
      ]
    );
  };

  const handleGenerateFlashcards = async () => {
    try {
      setGeneratingType('flashcards');

      const result = await generateStudioContent({
        notebook_id: notebook.id,
        content_type: 'flashcards',
      });

      // Refresh studio content
      await refreshContent();

      Alert.alert(
        'Success!',
        `Generated ${result.generated_count} flashcards. Tap to view them below.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error generating flashcards:', error);
      
      // Extract user-friendly error message
      const errorMessage = error.message || 'Failed to generate flashcards';
      let userMessage = errorMessage;
      let title = 'Generation Failed';
      
      if (errorMessage.includes('Trial limit reached') || errorMessage.includes('quota')) {
        title = 'Limit Reached';
        if (error.remaining !== undefined && error.limit !== undefined) {
          userMessage = `You've used all ${error.limit} Studio jobs in your trial. Upgrade to Premium for unlimited flashcards and quizzes!`;
        } else {
          userMessage = 'You\'ve reached your trial limit. Upgrade to Premium for unlimited access!';
        }
      } else if (errorMessage.includes('trial has expired')) {
        title = 'Trial Expired';
        userMessage = 'Your trial has ended. Upgrade to Premium to continue creating flashcards!';
      } else if (errorMessage.includes('Not authenticated')) {
        title = 'Authentication Required';
        userMessage = 'Please sign in to generate flashcards.';
      } else if (errorMessage.includes('Material content too short')) {
        title = 'Content Too Short';
        userMessage = 'Your material needs at least 500 characters to generate flashcards.';
      } else {
        userMessage = 'Unable to generate flashcards. Please check your connection and try again.';
      }
      
      Alert.alert(
        title,
        userMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingType(null);
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      setGeneratingType('quiz');

      const result = await generateStudioContent({
        notebook_id: notebook.id,
        content_type: 'quiz',
      });

      // Refresh studio content
      await refreshContent();

      Alert.alert(
        'Success!',
        `Generated a ${result.generated_count}-question quiz. Tap to take it below.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      
      // Extract user-friendly error message
      const errorMessage = error.message || 'Failed to generate quiz';
      let userMessage = errorMessage;
      let title = 'Generation Failed';
      
      if (errorMessage.includes('Trial limit reached') || errorMessage.includes('quota')) {
        title = 'Limit Reached';
        if (error.remaining !== undefined && error.limit !== undefined) {
          userMessage = `You've used all ${error.limit} Studio jobs in your trial. Upgrade to Premium for unlimited flashcards and quizzes!`;
        } else {
          userMessage = 'You\'ve reached your trial limit. Upgrade to Premium for unlimited access!';
        }
      } else if (errorMessage.includes('trial has expired')) {
        title = 'Trial Expired';
        userMessage = 'Your trial has ended. Upgrade to Premium to continue creating quizzes!';
      } else if (errorMessage.includes('Not authenticated')) {
        title = 'Authentication Required';
        userMessage = 'Please sign in to generate quizzes.';
      } else if (errorMessage.includes('Material content too short')) {
        title = 'Content Too Short';
        userMessage = 'Your material needs at least 500 characters to generate a quiz.';
      } else {
        userMessage = 'Unable to generate quiz. Please check your connection and try again.';
      }
      
      Alert.alert(
        title,
        userMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingType(null);
    }
  };

  // Ref to prevent duplicate generation from external trigger
  const hasTriggeredQuiz = useRef(false);

  // Trigger quiz generation from external source (only once)
  useEffect(() => {
    if (onGenerateQuiz && !hasTriggeredQuiz.current) {
      hasTriggeredQuiz.current = true;
      handleGenerateQuiz();
    }
  }, [onGenerateQuiz]);

  // Loading state
  if (isExtracting) {
    return (
      <ScrollView className="flex-1 bg-white">
        <View className="items-center justify-center py-20 px-6">
          <View className="w-20 h-20 bg-neutral-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="sparkles" size={32} color="#a3a3a3" />
          </View>
          <Text className="text-lg font-semibold text-neutral-900 text-center mb-2">
            Processing material...
          </Text>
          <Text className="text-sm text-neutral-600 text-center">
            Studio features will be available once your material is processed.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Ready to generate
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView className="flex-1 bg-white">
        {/* Generate New Section */}
        <View className="px-4 py-6">
          <Text className="text-sm font-medium text-neutral-500 mb-4 px-2">
            Generate new
          </Text>

          {/* Audio Overview Option */}
          <GenerateOption
            type="audio"
            icon="stats-chart"
            color="#4f46e5"
            label="Audio Overview"
            bgColor="bg-indigo-50"
            textColor="text-indigo-600"
            isGenerating={generatingType === 'audio'}
            onPress={handleGenerateAudioOverview}
            disabled={generatingType !== null}
          />

          {/* Flashcards Option */}
          <GenerateOption
            type="flashcards"
            icon="albums-outline"
            color="#dc2626"
            label="Flashcards"
            bgColor="bg-red-50"
            textColor="text-red-600"
            isGenerating={generatingType === 'flashcards'}
            onPress={handleGenerateFlashcards}
            disabled={generatingType !== null}
          />

          {/* Quiz Option */}
          <GenerateOption
            type="quiz"
            icon="help-circle-outline"
            color="#0891b2"
            label="Quiz"
            bgColor="bg-cyan-50"
            textColor="text-cyan-600"
            isGenerating={generatingType === 'quiz'}
            onPress={handleGenerateQuiz}
            disabled={generatingType !== null}
          />
        </View>

        {/* Generated Media Section */}
        <View className="px-4 py-2">
          <Text className="text-sm font-medium text-neutral-500 mb-4 px-2">
            Generated media
          </Text>

          {loading ? (
            <View className="items-center py-12">
              <TikTokLoader size={12} color="#6366f1" containerWidth={60} />
            </View>
          ) : (
            <>
              {/* Sorted Media Items (chronologically, newest at bottom) */}
              {sortedMediaItems.map((item) => {
                if (item.type === 'flashcard') {
                  return (
                    <StudioMediaItem
                      key="flashcards"
                      icon="albums-outline"
                      iconColor="#dc2626"
                      title={`${notebook.title} Flashcards`}
                      subtitle={`${item.data.count} cards • 1 source • ${getTimeAgo(item.createdAt)}`}
                      onPress={() => router.push(`/flashcards/${notebook.id}`)}
                    />
                  );
                } else if (item.type === 'quiz') {
                  return (
                    <StudioMediaItem
                      key={item.data.id}
                      icon="help-circle-outline"
                      iconColor="#0891b2"
                      title={item.data.title}
                      subtitle={`${item.data.total_questions} questions • 1 source • ${getTimeAgo(item.createdAt)}`}
                      onPress={() => router.push(`/quiz/${item.data.id}`)}
                    />
                  );
                } else {
                  // Audio overview
                  return (
                    <StudioMediaItem
                      key={item.data.id}
                      icon="stats-chart"
                      iconColor="#4f46e5"
                      title={item.data.title}
                      subtitle={`${formatDuration(item.data.duration)} • ${getTimeAgo(item.createdAt)}`}
                      onPress={() => router.push(`/audio-player/${item.data.id}`)}
                      onDelete={() => handleDeleteAudioOverview(item.data)}
                    />
                  );
                }
              })}

              {/* Generating States */}
              {generatingType === 'flashcards' && (
                <StudioMediaItem
                  icon="albums-outline"
                  iconColor="#737373"
                  title="Flashcards"
                  isGenerating={true}
                  loadingColor="#2563eb"
                  loadingText="Generating..."
                />
              )}

              {generatingType === 'quiz' && (
                <StudioMediaItem
                  icon="help-circle-outline"
                  iconColor="#737373"
                  title="Quiz"
                  isGenerating={true}
                  loadingColor="#2563eb"
                  loadingText="Generating..."
                />
              )}

              {generatingType === 'audio' && (
                <StudioMediaItem
                  icon="stats-chart"
                  iconColor="#737373"
                  title="Audio Overview"
                  isGenerating={true}
                  loadingColor="#4f46e5"
                  loadingText={audioProgress.stage}
                />
              )}

              {/* Empty State */}
              {!generatingType && sortedMediaItems.length === 0 && (
                <StudioEmptyState />
              )}
            </>
          )}
        </View>
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
