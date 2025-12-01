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
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 1500,
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
            backgroundColor: '#E5E5E5',
            borderRadius: 2,
            marginBottom: index === lines - 1 ? 0 : 16,
            width: index === 0 ? '100%' : index === lines - 1 ? '65%' : '95%',
          }}
        />
      ))}
    </View>
  );
};

