/**
 * Flashcards Screen - Full-screen flashcard viewer
 * Route: /flashcards/[id] where id = notebook_id
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { track } from '@/lib/services/analyticsService';

export default function FlashcardsScreen() {
  const { id, setId } = useLocalSearchParams<{ id: string; setId?: string }>(); // id is notebook_id
  const router = useRouter();
  const authUser = useStore((state) => state.authUser);
  const [flashcards, setFlashcards] = useState<StudioFlashcard[]>([]);
  const [notebookTitle, setNotebookTitle] = useState<string>('Flashcards');
  const [initialIndex, setInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionStartRef = useRef(Date.now());

  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  useEffect(() => {
    fetchFlashcards();
  }, [id, setId]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine which cards to load
      let activeSetId = setId;

      if (!activeSetId) {
        // Fallback: Get most recent set for this notebook
        const sets = await studioService.fetchFlashcardSets(id);
        if (sets && sets.length > 0) {
          activeSetId = sets[0].id;
        }
      }

      // Fetch notebook title and flashcards/progress in parallel
      const [notebookTitleResult, flashcardsResult, progressResult] = await Promise.all([
        notebookService.getNotebookTitle(id),
        activeSetId
          ? studioService.fetchFlashcardsBySet(activeSetId)
          : Promise.resolve([]),
        authUser ? studioService.fetchFlashcardProgress(id, authUser.id, activeSetId) : Promise.resolve(null),
      ]);

      if (notebookTitleResult) {
        setNotebookTitle(notebookTitleResult);
      }

      const targetCards = flashcardsResult || [];
      if (targetCards.length === 0) {
        setError('No flashcards found for this set');
        return;
      }

      setFlashcards(targetCards);

      // Track flashcard session started
      track('flashcard_session_started', {
        notebook_id: id,
        set_id: activeSetId,
        total_cards: targetCards.length,
      });

      // Determine starting card specifically for this set
      let startIndex = 0;
      if (progressResult && targetCards.length > 0) {
        if (progressResult.last_flashcard_id) {
          const foundIndex = targetCards.findIndex((c) => c.id === progressResult.last_flashcard_id);
          if (foundIndex >= 0) {
            startIndex = foundIndex;
          } else {
            startIndex = Math.min(
              Math.max(progressResult.last_index ?? 0, 0),
              targetCards.length - 1
            );
          }
        } else {
          startIndex = Math.min(Math.max(progressResult.last_index ?? 0, 0), targetCards.length - 1);
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
    // Track session end
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    track('flashcard_session_ended', {
      notebook_id: id,
      set_id: setId,
      total_cards: flashcards.length,
      duration_seconds: durationSeconds,
    });
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
          {error ? 'Try generating a new set or check your connection' : 'Generate flashcards from the Studio tab to start studying'}
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
          setId={setId || undefined}
        />
      </View>
    </GestureHandlerRootView>
  );
}
