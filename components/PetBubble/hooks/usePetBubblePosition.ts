import { useState, useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  calculateInitialPosition,
  calculateBounds,
  clampPosition,
  type Position,
  type ScreenDimensions,
  type Bounds,
} from '../utils/positionCalculations';

/**
 * Hook to manage pet bubble position state and screen dimension changes
 */
export function usePetBubblePosition() {
  const insets = useSafeAreaInsets();
  const [screenDimensions, setScreenDimensions] = useState<ScreenDimensions>(
    Dimensions.get('window')
  );
  const [position, setPosition] = useState<Position>(() =>
    calculateInitialPosition(Dimensions.get('window'), insets)
  );
  const positionRef = useRef<Position>(position);

  // Update ref whenever position changes
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Update screen dimensions on orientation change
  // Position clamping is handled by Effect 2 when screenDimensions change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, [insets.top, insets.bottom, insets.left, insets.right]);

  // Update position when insets or screen dimensions change
  // Clamp position to new bounds, but preserve user's position if still valid
  useEffect(() => {
    const bounds = calculateBounds(screenDimensions, insets);
    setPosition((prevPosition) => {
      // Clamp position to new bounds
      const clamped = clampPosition(prevPosition, bounds);
      return clamped;
    });
  }, [insets.top, insets.left, insets.right, screenDimensions.width, screenDimensions.height]);

  // Get current bounds
  const bounds = calculateBounds(screenDimensions, insets);

  return {
    position,
    setPosition,
    positionRef,
    screenDimensions,
    insets,
    bounds,
  };
}

