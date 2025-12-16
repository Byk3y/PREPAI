/**
 * Flashcards Screen - Full-screen flashcard viewer
 * Route: /flashcards/[id] where id = notebook_id
 */

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashcardViewer } from '@/components/studio/FlashcardViewer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TikTokLoader } from '@/components/TikTokLoader';
import type { StudioFlashcard } from '@/lib/store/types';
import { studioService } from '@/lib/services/studioService';
import { notebookService } from '@/lib/services/notebookService';
import { useStore } from '@/lib/store';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // notebook_id
  const router = useRouter();
  const authUser = useStore((state) => state.authUser);
  const [flashcards, setFlashcards] = useState<StudioFlashcard[]>([]);
  const [notebookTitle, setNotebookTitle] = useState<string>('Flashcards');
  const [initialIndex, setInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  useEffect(() => {
    fetchFlashcards();
  }, [id]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch notebook title and flashcards in parallel
      const [notebookTitleResult, flashcardsResult, progressResult] = await Promise.all([
        notebookService.getNotebookTitle(id),
        studioService.fetchFlashcards(id),
        authUser ? studioService.fetchFlashcardProgress(id, authUser.id) : Promise.resolve(null),
      ]);

      if (notebookTitleResult) {
        setNotebookTitle(notebookTitleResult);
      }

      if (!flashcardsResult || flashcardsResult.length === 0) {
        setError('No flashcards found for this notebook');
        return;
      }

      setFlashcards(flashcardsResult);

      // Determine starting card using progress (by id first, then index)
      const cards = flashcardsResult;
      let startIndex = 0;
      if (progressResult && cards.length > 0) {
        if (progressResult.last_flashcard_id) {
          const foundIndex = cards.findIndex((c) => c.id === progressResult.last_flashcard_id);
          if (foundIndex >= 0) {
            startIndex = foundIndex;
          } else {
            startIndex = Math.min(
              Math.max(progressResult.last_index ?? 0, 0),
              cards.length - 1
            );
          }
        } else {
          startIndex = Math.min(Math.max(progressResult.last_index ?? 0, 0), cards.length - 1);
        }
      }
      setInitialIndex(startIndex);
    } catch (err: any) {
      console.error('Error fetching flashcards:', err);
      setError(err.message || 'Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <TikTokLoader size={14} color="#6366f1" containerWidth={60} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading flashcards...</Text>
      </View>
    );
  }

  if (error || flashcards.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
          {error || 'No flashcards available'}
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Generate flashcards from the Studio tab to start studying
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <FlashcardViewer
          flashcards={flashcards}
          initialIndex={initialIndex}
          onClose={handleClose}
          title={notebookTitle}
        />
      </View>
    </GestureHandlerRootView>
  );
}
