/**
 * GeneratedMediaSection - Displays generated flashcards, quizzes, and audio overviews
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
import type { StudioFlashcard, Quiz, AudioOverview } from '@/lib/store/types';

type GeneratingType = 'flashcards' | 'quiz' | 'audio' | null;

// Unified media item type for sorting
type MediaItem =
  | { type: 'flashcard'; data: { count: number }; createdAt: string }
  | { type: 'quiz'; data: Quiz; createdAt: string }
  | { type: 'audio'; data: AudioOverview; createdAt: string };

interface GeneratedMediaSectionProps {
  notebookId: string;
  notebookTitle: string;
  flashcards: StudioFlashcard[];
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
  flashcards,
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

  const renderMediaItem = (item: MediaItem) => {
    if (item.type === 'flashcard') {
      return (
        <StudioMediaItem
          key="flashcards"
          icon="albums-outline"
          iconColor="#dc2626"
          title={`${notebookTitle} Flashcards`}
          subtitle={`${item.data.count} cards • 1 source • ${getTimeAgo(item.createdAt)}`}
          onPress={() => {
            play('start');
            router.push(`/flashcards/${notebookId}`);
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

    // Audio overview
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

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <TikTokLoader size={12} color="#6366f1" containerWidth={60} />
        </View>
      ) : (
        <>
          {/* Sorted Media Items (chronologically, newest at bottom) */}
          {sortedMediaItems.map(renderMediaItem)}

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
              loadingText={audioProgressStage}
            />
          )}

          {/* Empty State */}
          {!generatingType && sortedMediaItems.length === 0 && <StudioEmptyState />}
        </>
      )}
    </View>
  );
};
















