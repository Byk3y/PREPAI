/**
 * StudioTab - Generate flashcards and quizzes
 * Shows "Generate new" cards and "Generated media" section
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Notebook } from '@/lib/store';
import type { StudioFlashcard, Quiz } from '@/lib/store/types';
import { supabase } from '@/lib/supabase';
import { generateStudioContent } from '@/lib/api/studio';
import { TikTokLoader } from '@/components/TikTokLoader';

interface StudioTabProps {
  notebook: Notebook;
  onGenerateQuiz?: () => void;
}

export const StudioTab: React.FC<StudioTabProps> = ({ notebook, onGenerateQuiz }) => {
  const isExtracting = notebook.status === 'extracting';
  const router = useRouter();

  // State for real data
  const [flashcards, setFlashcards] = useState<StudioFlashcard[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<'flashcards' | 'quiz' | null>(null);

  const handleOpenAudioPlayer = (id: string, title: string, duration: number) => {
    // Navigate to audio player route (same behavior as flashcards)
    router.push({
      pathname: '/audio-player/[id]',
      params: { id, title, duration: duration.toString() }
    });
  };

  // Fetch studio content on mount and when notebook changes
  useEffect(() => {
    fetchStudioContent();
  }, [notebook.id]);

  const fetchStudioContent = async () => {
    try {
      setLoading(true);

      // Parallel fetch for better performance
      const [flashcardResult, quizResult] = await Promise.all([
        supabase
          .from('studio_flashcards')
          .select('*')
          .eq('notebook_id', notebook.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('studio_quizzes')
          .select('*')
          .eq('notebook_id', notebook.id)
          .order('created_at', { ascending: false }),
      ]);

      if (flashcardResult.error) {
        console.error('Error fetching flashcards:', flashcardResult.error);
      } else if (flashcardResult.data && flashcardResult.data.length > 0) {
        setFlashcards(flashcardResult.data);
      }

      if (quizResult.error) {
        console.error('Error fetching quizzes:', quizResult.error);
      } else if (quizResult.data) {
        setQuizzes(quizResult.data);
      }
    } catch (error) {
      console.error('Error fetching studio content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudioOverview = () => {
    Alert.alert(
      'Coming Soon',
      'Audio overview generation will be available in the next update.',
      [{ text: 'OK' }]
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
      await fetchStudioContent();

      Alert.alert(
        'Success!',
        `Generated ${result.generated_count} flashcards. Tap to view them below.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error generating flashcards:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate flashcards. Please try again.',
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
      await fetchStudioContent();

      Alert.alert(
        'Success!',
        `Generated a ${result.generated_count}-question quiz. Tap to take it below.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate quiz. Please try again.',
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
    <ScrollView className="flex-1 bg-white">
      {/* Generate New Section */}
      <View className="px-4 py-6">
        <Text className="text-sm font-medium text-neutral-500 mb-4 px-2">
          Generate new
        </Text>

        {/* Audio Overview Card */}
        <TouchableOpacity
          onPress={handleGenerateAudioOverview}
          className="bg-indigo-50 rounded-full p-4 flex-row items-center mb-3"
          activeOpacity={0.7}
        >
          <View className="mr-4 ml-1">
            <Ionicons name="stats-chart" size={24} color="#4f46e5" />
          </View>
          <Text className="flex-1 text-base font-semibold text-neutral-900">
            Audio Overview
          </Text>
          <View className="w-10 h-10 bg-black/5 rounded-full items-center justify-center">
            <Ionicons name="pencil" size={18} color="#525252" />
          </View>
        </TouchableOpacity>

        {/* Flashcards Card */}
        <TouchableOpacity
          onPress={handleGenerateFlashcards}
          disabled={generatingType !== null}
          className="bg-red-50 rounded-full p-4 flex-row items-center mb-3"
          activeOpacity={0.7}
        >
          <View className="mr-4 ml-1">
            <Ionicons name="albums-outline" size={24} color="#dc2626" />
          </View>
          <Text className="flex-1 text-base font-semibold text-neutral-900">
            Flashcards
          </Text>
          {generatingType === 'flashcards' ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <View className="w-10 h-10 bg-black/5 rounded-full items-center justify-center">
              <Ionicons name="pencil" size={18} color="#525252" />
            </View>
          )}
        </TouchableOpacity>

        {/* Quiz Card */}
        <TouchableOpacity
          onPress={handleGenerateQuiz}
          disabled={generatingType !== null}
          className="bg-cyan-50 rounded-full p-4 flex-row items-center"
          activeOpacity={0.7}
        >
          <View className="mr-4 ml-1">
            <Ionicons name="help-circle-outline" size={24} color="#0891b2" />
          </View>
          <Text className="flex-1 text-base font-semibold text-neutral-900">
            Quiz
          </Text>
          {generatingType === 'quiz' ? (
            <ActivityIndicator size="small" color="#0891b2" />
          ) : (
            <View className="w-10 h-10 bg-black/5 rounded-full items-center justify-center">
              <Ionicons name="pencil" size={18} color="#525252" />
            </View>
          )}
        </TouchableOpacity>
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
            {/* Real Flashcards */}
            {flashcards.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push(`/flashcards/${notebook.id}`)}
                className="p-3 mb-2 flex-row items-center"
                activeOpacity={0.7}
              >
                <View className="mr-4">
                  <Ionicons name="albums-outline" size={24} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-neutral-900">
                    {notebook.title} Flashcards
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {flashcards.length} cards • 1 source • Just now
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Real Quizzes */}
            {quizzes.map((quiz) => (
              <TouchableOpacity
                key={quiz.id}
                onPress={() => router.push(`/quiz/${quiz.id}`)}
                className="p-3 mb-2 flex-row items-center"
                activeOpacity={0.7}
              >
                <View className="mr-4">
                  <Ionicons name="help-circle-outline" size={24} color="#0891b2" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-neutral-900">
                    {quiz.title}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {quiz.total_questions} questions • 1 source • Just now
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Generating States */}
            {generatingType === 'flashcards' && (
              <View className="p-3 mb-2 flex-row items-center">
                <View className="mr-4">
                  <Ionicons name="albums-outline" size={24} color="#737373" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-neutral-900">
                    Flashcards
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <TikTokLoader size={10} color="#2563eb" containerWidth={50} />
                    <Text className="text-xs text-blue-600 ml-2">
                      Generating...
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {generatingType === 'quiz' && (
              <View className="p-3 mb-2 flex-row items-center">
                <View className="mr-4">
                  <Ionicons name="help-circle-outline" size={24} color="#737373" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-neutral-900">
                    Quiz
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <TikTokLoader size={10} color="#2563eb" containerWidth={50} />
                    <Text className="text-xs text-blue-600 ml-2">
                      Generating...
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Empty State */}
            {!generatingType && flashcards.length === 0 && quizzes.length === 0 && (
              <View className="items-center py-12">
                <View className="w-20 h-20 bg-neutral-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="sparkles-outline" size={32} color="#a3a3a3" />
                </View>
                <Text className="text-neutral-500 text-center">
                  No generated media yet
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};
