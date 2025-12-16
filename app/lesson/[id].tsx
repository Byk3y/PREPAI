/**
 * Lesson Screen - Displays lesson content with PetWidget on the side
 * TODO: Replace mock content with real lesson data from Supabase
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import { useStore } from '@/lib/store';
import { PetWidget } from '@/components/PetWidget';

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lessons, completeLesson } = useStore();
  const [petReaction, setPetReaction] = useState<'happy' | 'sad' | 'excited' | null>(null);

  const lesson = lessons.find((l) => l.id === id) || lessons[0];

  const handleStartQuiz = () => {
    // Trigger pet reaction
    setPetReaction('excited');
    // TODO: Navigate to quiz/flashcard screen
    router.push(`/quiz/${id}`);
  };

  const handleCompleteLesson = () => {
    completeLesson(lesson.id);
    setPetReaction('happy');
    // TODO: Add XP to pet, update user progress in Supabase
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 bg-white border-b border-neutral-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-neutral-800">
            {lesson.title}
          </Text>
          <Text className="text-sm text-neutral-500">{lesson.subject}</Text>
        </View>
      </View>

      <View className="flex-1 flex-row">
        {/* Main Content Area */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6">
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 400 }}
            >
              <Text className="text-base text-neutral-700 leading-7 mb-6">
                {lesson.content}
              </Text>

              {/* Additional content sections */}
              <View className="bg-white rounded-lg p-4 mb-4 border border-neutral-200">
                <Text className="text-lg font-semibold text-neutral-800 mb-2">
                  Key Concepts
                </Text>
                <Text className="text-sm text-neutral-600">
                  • Understanding the fundamentals{'\n'}
                  • Practical applications{'\n'}
                  • Real-world examples
                </Text>
              </View>

              {/* CTA Buttons */}
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  onPress={handleStartQuiz}
                  className="flex-1 bg-primary-500 py-4 rounded-lg items-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold text-lg">
                    Start Quiz
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCompleteLesson}
                  className="flex-1 bg-secondary-500 py-4 rounded-lg items-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold text-lg">
                    Mark Complete
                  </Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          </View>
        </ScrollView>

        {/* Pet Widget Sidebar */}
        <View className="w-32 bg-neutral-100 border-l border-neutral-200 items-center pt-6">
          <PetWidget reaction={petReaction} onReactionComplete={() => setPetReaction(null)} />
        </View>
      </View>
    </SafeAreaView>
  );
}

