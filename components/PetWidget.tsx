/**
 * PetWidget - Full pet widget for Lesson screen
 * Shows animated pet with reactions
 * TODO: Make draggable with react-native-gesture-handler
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import { useStore } from '@/lib/store';

interface PetWidgetProps {
  reaction?: 'happy' | 'sad' | 'excited' | null;
  onReactionComplete?: () => void;
}

export const PetWidget: React.FC<PetWidgetProps> = ({ 
  reaction = null,
  onReactionComplete 
}) => {
  const { petState } = useStore();

  useEffect(() => {
    if (reaction && onReactionComplete) {
      // Trigger reaction animation, then call completion
      const timer = setTimeout(() => {
        onReactionComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [reaction, onReactionComplete]);

  return (
    <View className="items-center justify-center p-4">
      <MotiView
        from={{ scale: 1, translateY: 0 }}
        animate={{
          scale: reaction === 'happy' || reaction === 'excited' ? [1, 1.2, 1] : 1,
          translateY: reaction ? [0, -10, 0] : [0, -5, 0],
        }}
        transition={{
          type: 'timing',
          duration: reaction ? 600 : 2000,
          loop: !reaction,
          repeatReverse: true,
        }}
        className="w-32 h-32 rounded-full bg-primary-200 items-center justify-center mb-4"
      >
        {/* Placeholder pet - replace with Lottie animation */}
        <Text className="text-6xl">🐾</Text>
        
        {/* Glow effect for reactions */}
        {reaction && (
          <MotiView
            from={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 1] }}
            transition={{ type: 'timing', duration: 600 }}
            className="absolute inset-0 rounded-full bg-primary-400 opacity-30"
          />
        )}
      </MotiView>
      
      <Text className="text-lg font-semibold text-neutral-800">{petState.name}</Text>
      <Text className="text-sm text-neutral-500">Level {petState.level}</Text>
      
      {/* XP Bar */}
      <View className="w-full max-w-xs mt-2">
        <View className="h-2 bg-neutral-200 rounded-full overflow-hidden">
          <MotiView
            from={{ width: 0 }}
            animate={{ 
              width: `${(petState.xp / petState.xpToNext) * 100}%` 
            }}
            transition={{ type: 'timing', duration: 500 }}
            className="h-full bg-primary-500 rounded-full"
          />
        </View>
        <Text className="text-xs text-neutral-500 mt-1 text-center">
          {petState.xp} / {petState.xpToNext} XP
        </Text>
      </View>
    </View>
  );
};

