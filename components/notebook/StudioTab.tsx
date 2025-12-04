/**
 * StudioTab - Generate flashcards and quizzes
 * Shows "Generate new" cards and "Generated media" section
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Notebook } from '@/lib/store';

interface StudioTabProps {
  notebook: Notebook;
  onGenerateQuiz?: () => void;
}

export const StudioTab: React.FC<StudioTabProps> = ({ notebook, onGenerateQuiz }) => {
  const isExtracting = notebook.status === 'extracting';
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const handleGenerateAudioOverview = () => {
    Alert.alert(
      'Coming Soon',
      'Audio overview generation will be available in the next update.',
      [{ text: 'OK' }]
    );
  };

  const handleGenerateFlashcards = () => {
    Alert.alert(
      'Coming Soon',
      'Flashcard generation will be available in the next update.',
      [{ text: 'OK' }]
    );
  };

  const handleGenerateQuiz = () => {
    setGeneratingQuiz(true);
    // Simulate quiz generation
    setTimeout(() => {
      Alert.alert(
        'Coming Soon',
        'Quiz generation will be available in the next update.',
        [{ text: 'OK', onPress: () => setGeneratingQuiz(false) }]
      );
    }, 1500);
  };

  // Trigger quiz generation from external source
  React.useEffect(() => {
    if (onGenerateQuiz) {
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
    <ScrollView className="flex-1 bg-white px-6 py-6">
      {/* Generate New Section */}
      <Text className="text-base font-semibold text-neutral-900 mb-4">
        Generate new
      </Text>

      {/* Audio Overview Card */}
      <TouchableOpacity
        onPress={handleGenerateAudioOverview}
        className="bg-blue-50 rounded-xl py-3.5 px-4 mb-3 flex-row items-center"
        activeOpacity={0.7}
      >
        <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
          <Ionicons name="volume-high" size={20} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-neutral-900">
            Audio Overview
          </Text>
          <Text className="text-sm text-neutral-600 mt-0.5">
            Listen to a summary of your material
          </Text>
        </View>
        <TouchableOpacity className="w-8 h-8 items-center justify-center">
          <Ionicons name="arrow-forward-outline" size={18} color="#737373" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Flashcards Card */}
      <TouchableOpacity
        onPress={handleGenerateFlashcards}
        className="bg-amber-50 rounded-xl py-3.5 px-4 mb-3 flex-row items-center"
        activeOpacity={0.7}
      >
        <View className="w-10 h-10 bg-amber-100 rounded-lg items-center justify-center mr-3">
          <Ionicons name="layers-outline" size={20} color="#f59e0b" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-neutral-900">
            Flashcards
          </Text>
          <Text className="text-sm text-neutral-600 mt-0.5">
            Study with AI-generated flashcards
          </Text>
        </View>
        <TouchableOpacity className="w-8 h-8 items-center justify-center">
          <Ionicons name="arrow-forward-outline" size={18} color="#737373" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Quiz Card */}
      <TouchableOpacity
        onPress={handleGenerateQuiz}
        className="bg-cyan-50 rounded-xl py-3.5 px-4 mb-3 flex-row items-center"
        activeOpacity={0.7}
      >
        <View className="w-10 h-10 bg-cyan-100 rounded-lg items-center justify-center mr-3">
          <Ionicons name="help-circle-outline" size={20} color="#06b6d4" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-neutral-900">
            Quiz
          </Text>
          <Text className="text-sm text-neutral-600 mt-0.5">
            Test your understanding
          </Text>
        </View>
        <TouchableOpacity className="w-8 h-8 items-center justify-center">
          <Ionicons name="arrow-forward-outline" size={18} color="#737373" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Generated Media Section */}
      <Text className="text-base font-semibold text-neutral-900 mb-4">
        Generated media
      </Text>

      {/* Generating Quiz State */}
      {generatingQuiz && (
        <View className="bg-neutral-50 rounded-2xl p-5 mb-3 flex-row items-center">
          <View className="w-12 h-12 bg-neutral-100 rounded-xl items-center justify-center mr-4">
            <Ionicons name="help-circle-outline" size={24} color="#737373" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-neutral-900">
              Quiz
            </Text>
            <Text className="text-sm text-blue-600 mt-1">
              Generating...
            </Text>
          </View>
        </View>
      )}

      {/* Empty State */}
      {!generatingQuiz && (
        <View className="items-center py-12">
          <View className="w-16 h-16 bg-neutral-100 rounded-full items-center justify-center mb-3">
            <Ionicons name="sparkles-outline" size={28} color="#a3a3a3" />
          </View>
          <Text className="text-sm text-neutral-500 text-center">
            No generated content yet
          </Text>
          <Text className="text-xs text-neutral-400 text-center mt-1 max-w-xs">
            Create flashcards, quizzes, or audio overviews from your material
          </Text>
        </View>
      )}

      {/* Info Card */}
      <View className="bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 mt-40 mb-6">
        <View className="flex-row items-start">
          <Ionicons name="information-circle-outline" size={18} color="#6366f1" className="mr-2" />
          <View className="flex-1 ml-2">
            <Text className="text-xs font-semibold text-neutral-900 mb-0.5">
              How it works
            </Text>
            <Text className="text-xs text-neutral-600 leading-4">
              Studio uses advanced AI to analyze your material and generate personalized study
              content. Choose what you want to create above.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
