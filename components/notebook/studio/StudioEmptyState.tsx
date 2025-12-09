import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const StudioEmptyState: React.FC = () => (
  <View className="items-center py-12 px-6">
    <View className="w-20 h-20 bg-neutral-100 rounded-full items-center justify-center mb-4">
      <Ionicons name="sparkles-outline" size={32} color="#a3a3a3" />
    </View>

    <Text className="text-neutral-500 text-center font-medium">
      No generated media yet
    </Text>
    <Text className="text-neutral-400 text-center mt-2">
      Tap a generator above to create audio, flashcards, or a quiz.
    </Text>
  </View>
);
