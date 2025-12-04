/**
 * PreviewSkeleton - Skeleton loader for notebook preview
 * Matches NotebookLM style with subtle horizontal lines
 */

import React, { useEffect } from 'react';
import { View, Animated } from 'react-native';

interface PreviewSkeletonProps {
  lines?: number;
}

export const PreviewSkeleton: React.FC<PreviewSkeletonProps> = ({ lines = 6 }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View className="mb-6">
      {Array.from({ length: lines }).map((_, index) => (
        <Animated.View
          key={index}
          style={{
            opacity,
            height: 20,
            backgroundColor: '#D1D5DB',
            borderRadius: 4,
            marginBottom: index === lines - 1 ? 0 : 16,
            width: index === 0 ? '100%' : index === lines - 1 ? '65%' : '95%',
          }}
        />
      ))}
    </View>
  );
};

