/**
 * ContinueCard - Resume card component for "Continue Studying" list
 * Shows progress and allows resuming lessons or exams
 */

import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';

interface ContinueCardProps {
  type: 'lesson' | 'exam';
  id: string;
  title: string;
  progress: number;
  subject?: string;
}

export const ContinueCard: React.FC<ContinueCardProps> = ({
  type,
  id,
  title,
  progress,
  subject,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (type === 'lesson') {
      router.push(`/lesson/${id}`);
    } else {
      router.push('/exam');
    }
  };

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-neutral-200"
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="text-base font-semibold text-neutral-800 mb-1">
              {title}
            </Text>
            {subject && (
              <Text className="text-sm text-neutral-500">{subject}</Text>
            )}
          </View>
          <Text className="text-2xl ml-3">
            {type === 'lesson' ? '📚' : '📝'}
          </Text>
        </View>
        
        {/* Progress bar */}
        <View className="mt-3">
          <View className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <MotiView
              from={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'timing', duration: 500 }}
              className="h-full bg-primary-500 rounded-full"
            />
          </View>
          <Text className="text-xs text-neutral-500 mt-1">
            {progress}% complete
          </Text>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
};

