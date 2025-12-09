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
import { fetchFlashcardProgress } from '@/lib/api/studio';
import { supabase } from '@/lib/supabase';

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // notebook_id
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<StudioFlashcard[]>([]);
  const [notebookTitle, setNotebookTitle] = useState<string>('Flashcards');
  const [initialIndex, setInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlashcards();
  }, [id]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch notebook title and flashcards in parallel
      const [notebookResult, flashcardsResult, progressResult] = await Promise.all([
        supabase
          .from('notebooks')
          .select('title')
          .eq('id', id)
          .single(),
        supabase
          .from('studio_flashcards')
          .select('*')
          .eq('notebook_id', id)
          .order('created_at', { ascending: true }),
        fetchFlashcardProgress(id),
      ]);

      if (notebookResult.data) {
        setNotebookTitle(notebookResult.data.title || 'Flashcards');
      }

      if (flashcardsResult.error) {
        throw flashcardsResult.error;
      }

      if (!flashcardsResult.data || flashcardsResult.data.length === 0) {
        setError('No flashcards found for this notebook');
        return;
      }

      setFlashcards(flashcardsResult.data);

      // Determine starting card using progress (by id first, then index)
      const cards = flashcardsResult.data;
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
      <View className="flex-1 items-center justify-center bg-white">
        <TikTokLoader size={14} color="#6366f1" containerWidth={60} />
        <Text className="mt-4 text-neutral-600">Loading flashcards...</Text>
      </View>
    );
  }

  if (error || flashcards.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg font-semibold text-neutral-900 mb-2">
          {error || 'No flashcards available'}
        </Text>
        <Text className="text-neutral-600 text-center">
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
