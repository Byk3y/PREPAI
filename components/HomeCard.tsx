/**
 * HomeCard - Large CTA card component for Home screen
 * Used for "Study for an Exam" and "Learn Something New" actions
 */

import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { MotiView } from 'moti';

interface HomeCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  color?: 'primary' | 'secondary' | 'accent';
}

export const HomeCard: React.FC<HomeCardProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  color = 'primary',
}) => {
  const bgColors = {
    primary: 'bg-primary-400',
    secondary: 'bg-secondary-400',
    accent: 'bg-accent-500',
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        className={`${bgColors[color]} rounded-xl p-6 mb-4 shadow-lg`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white mb-2">{title}</Text>
            <Text className="text-base text-white/90">{subtitle}</Text>
          </View>
          <Text className="text-5xl ml-4">{icon}</Text>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
};

