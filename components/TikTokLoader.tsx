/**
 * TikTokLoader - Two balls moving left to right animation
 * Unique loading state inspired by TikTok's loading animation
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface TikTokLoaderProps {
  size?: number;
  color?: string;
  containerWidth?: number;
}

export const TikTokLoader: React.FC<TikTokLoaderProps> = ({
  size = 12,
  color = '#6366f1',
  containerWidth = 60,
}) => {
  const ball1Anim = useRef(new Animated.Value(0)).current;
  const ball2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create staggered animation for two balls (TikTok style)
    const createAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: containerWidth - size,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createAnimation(ball1Anim, 0);
    const animation2 = createAnimation(ball2Anim, 150); // Stagger by 150ms for smoother effect

    animation1.start();
    animation2.start();

    return () => {
      animation1.stop();
      animation2.stop();
    };
  }, [ball1Anim, ball2Anim, containerWidth, size]);

  return (
    <View
      style={[
        styles.container,
        {
          width: containerWidth,
          height: size,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.ball,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ translateX: ball1Anim }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ball,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: 0.6,
            transform: [{ translateX: ball2Anim }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  ball: {
    position: 'absolute',
  },
});

