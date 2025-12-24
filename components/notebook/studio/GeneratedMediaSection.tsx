/**
 * GeneratedMediaSection - Displays generated flashcards, quizzes, and podcasts
 */

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { useFeedback } from '@/lib/feedback';
import { TikTokLoader } from '@/components/TikTokLoader';
import { StudioMediaItem } from './StudioMediaItem';
import { StudioEmptyState } from './StudioEmptyState';
import { formatDuration, getTimeAgo } from '@/lib/utils/studio';
import { LOADING_MESSAGES } from '@/lib/constants/loadingMessages';
import type { StudioFlashcard, Quiz, AudioOverview, FlashcardSet } from '@/lib/store/types';

type GeneratingType = 'flashcards' | 'quiz' | 'audio' | null;

// Unified media item type for sorting
type MediaItem =
  | { type: 'flashcard_set'; data: FlashcardSet; createdAt: string }
  | { type: 'quiz'; data: Quiz; createdAt: string }
  | { type: 'audio'; data: AudioOverview; createdAt: string };

interface GeneratedMediaSectionProps {
  notebookId: string;
  notebookTitle: string;
  flashcard_sets: FlashcardSet[];
  quizzes: Quiz[];
  audioOverviews: AudioOverview[];
  loading: boolean;
  generatingType: GeneratingType;
  audioProgressStage: string;
  onDeleteAudio: (overview: AudioOverview) => void;
}

export const GeneratedMediaSection: React.FC<GeneratedMediaSectionProps> = ({
  notebookId,
  notebookTitle,
  flashcard_sets,
  quizzes,
  audioOverviews,
  loading,
  generatingType,
  audioProgressStage,
  onDeleteAudio,
}) => {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const { play } = useFeedback();

  // Combine and sort all media items chronologically (oldest first, newest at bottom)
  const sortedMediaItems = useMemo(() => {
    const items: MediaItem[] = [];

    // Add flashcard sets
    flashcard_sets.forEach((set) => {
      items.push({
        type: 'flashcard_set',
        data: set,
        createdAt: set.created_at,
      });
    });

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
  }, [flashcard_sets, quizzes, audioOverviews]);

  const renderMediaItem = (item: MediaItem) => {
    if (item.type === 'flashcard_set') {
      return (
        <StudioMediaItem
          key={item.data.id}
          icon="albums-outline"
          iconColor="#dc2626"
          title={item.data.title}
          subtitle={`${item.data.total_cards || 0} cards • ${getTimeAgo(item.createdAt)}`}
          onPress={() => {
            play('start');
            router.push({
              pathname: `/flashcards/${notebookId}`,
              params: { setId: item.data.id }
            });
          }}
        />
      );
    }

    if (item.type === 'quiz') {
      return (
        <StudioMediaItem
          key={item.data.id}
          icon="help-circle-outline"
          iconColor="#0891b2"
          title={item.data.title}
          subtitle={`${item.data.total_questions} questions • 1 source • ${getTimeAgo(item.createdAt)}`}
          onPress={() => {
            play('start');
            router.push(`/quiz/${item.data.id}`);
          }}
        />
      );
    }

    // Podcast
    return (
      <StudioMediaItem
        key={item.data.id}
        icon="stats-chart"
        iconColor="#4f46e5"
        title={item.data.title}
        subtitle={`${formatDuration(item.data.duration)} • ${getTimeAgo(item.createdAt)}`}
        onPress={() => router.push(`/audio-player/${item.data.id}`)}
        onDelete={() => onDeleteAudio(item.data)}
      />
    );
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: colors.textSecondary,
          marginBottom: 16,
          paddingHorizontal: 8,
        }}
      >
        Generated media
      </Text>

      {loading && sortedMediaItems.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <TikTokLoader size={12} color="#6366f1" containerWidth={60} />
        </View>
      ) : (
        <>
          {/* Sorted Media Items (chronologically, newest at bottom) */}
          {sortedMediaItems.map(renderMediaItem)}

          {/* Background loading indicator if needed */}
          {loading && sortedMediaItems.length > 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 16, opacity: 0.6 }}>
              <TikTokLoader size={8} color="#6366f1" containerWidth={40} />
            </View>
          )}

          {/* Generating States */}
          {generatingType === 'flashcards' && (
            <StudioMediaItem
              icon="albums-outline"
              iconColor="#737373"
              title="Flashcards"
              isGenerating={true}
              loadingColor="#2563eb"
              loadingText={LOADING_MESSAGES.flashcards}
            />
          )}

          {generatingType === 'quiz' && (
            <StudioMediaItem
              icon="help-circle-outline"
              iconColor="#737373"
              title="Quiz"
              isGenerating={true}
              loadingColor="#2563eb"
              loadingText={LOADING_MESSAGES.quiz}
            />
          )}

          {generatingType === 'audio' && (
            <StudioMediaItem
              icon="stats-chart"
              iconColor="#737373"
              title="Podcast"
              isGenerating={true}
              loadingColor="#4f46e5"
              loadingText={LOADING_MESSAGES.audio}
            />
          )}

          {/* Empty State */}
          {!generatingType && sortedMediaItems.length === 0 && <StudioEmptyState />}
        </>
      )}
    </View>
  );
};




















