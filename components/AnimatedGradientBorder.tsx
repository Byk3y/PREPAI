import React, { useState, useEffect } from 'react';
import { View, ViewStyle, LayoutChangeEvent, StyleSheet, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

interface AnimatedGradientBorderProps {
  children: React.ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  animationDuration?: number;
  colors?: string[];
  style?: ViewStyle;
}

// Type for LinearGradient colors to satisfy TypeScript
type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

/**
 * Elite Animated Gradient Border
 * Triple-layer rotating gradients for a complex, liquid-neon flow.
 */
export const AnimatedGradientBorder: React.FC<AnimatedGradientBorderProps> = ({
  children,
  borderRadius = 16,
  borderWidth = 1.5,
  animationDuration = 2400,
  style,
}) => {
  const { isDarkMode } = useTheme();
  const themeColors = getThemeColors(isDarkMode);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const rotation3 = useSharedValue(0);

  // High-contrast electric palette
  const colors1: GradientColors = ['#FF3D00', '#2E48FF', '#8CFF00', '#FF3D00'];
  const colors2: GradientColors = ['#FF00E5', '#00FFD1', '#FF3D00', '#FF00E5'];
  const colors3: GradientColors = ['#2E48FF', '#8CFF00', '#00FFD1', '#2E48FF'];

  useEffect(() => {
    rotation1.value = withRepeat(withTiming(360, { duration: animationDuration, easing: Easing.linear }), -1, false);
    rotation2.value = withRepeat(withTiming(-360, { duration: animationDuration * 1.5, easing: Easing.linear }), -1, false);
    rotation3.value = withRepeat(withTiming(360, { duration: animationDuration * 2.1, easing: Easing.linear }), -1, false);
  }, [animationDuration]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setLayout({ width, height });
  };

  const animatedStyle1 = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation1.value}deg` }] }));
  const animatedStyle2 = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation2.value}deg` }] }));
  const animatedStyle3 = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation3.value}deg` }] }));

  const diagonal = Math.sqrt(layout.width ** 2 + layout.height ** 2);
  const size = diagonal > 0 ? diagonal * 1.6 : 0;

  return (
    <View
      onLayout={onLayout}
      style={[{ borderRadius, overflow: 'hidden', padding: borderWidth, backgroundColor: 'transparent' }, style]}
    >
      {/* Dynamic Layered Flow */}
      {size > 0 && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Animated.View style={[animatedStyle1, { width: size, height: size, position: 'absolute' }]}>
            <LinearGradient colors={colors1} style={{ flex: 1 }} />
          </Animated.View>
          <Animated.View style={[animatedStyle2, { width: size, height: size, position: 'absolute', opacity: 0.7 }]}>
            <LinearGradient colors={colors2} style={{ flex: 1 }} />
          </Animated.View>
          <Animated.View style={[animatedStyle3, { width: size, height: size, position: 'absolute', opacity: 0.5 }]}>
            <LinearGradient colors={colors3} style={{ flex: 1 }} />
          </Animated.View>
        </View>
      )}

      {/* Content Mask */}
      <View style={{ borderRadius: borderRadius - borderWidth, overflow: 'hidden', backgroundColor: themeColors.surface, flexGrow: 1 }}>
        {children}
      </View>
    </View>
  );
};
