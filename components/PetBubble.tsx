/**
 * PetBubble - Small pet bubble component for Home screen
 * Opens the pet half-sheet modal when tapped
 */

import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';

export const PetBubble: React.FC = () => {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/pet-sheet')}
      className="absolute bottom-6 right-6 z-50"
      activeOpacity={0.8}
    >
      <MotiView
        from={{ scale: 1 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          type: 'timing',
          duration: 2000,
          loop: true,
          repeatReverse: false,
        }}
        className="w-16 h-16 rounded-full bg-primary-400 items-center justify-center shadow-lg"
      >
        {/* Placeholder pet emoji - replace with actual pet image */}
        <Text className="text-3xl">🐾</Text>
      </MotiView>
    </TouchableOpacity>
  );
};

