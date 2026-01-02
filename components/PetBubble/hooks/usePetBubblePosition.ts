import { useState, useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  calculateInitialPosition,
  calculateBounds,
  clampPosition,
  getEdgeOffset,
  type Position,
  type ScreenDimensions,
  type Bounds,
} from '../utils/positionCalculations';
import { PET_SIZE, EDGE_PADDING } from '../constants';

interface UsePetBubblePositionParams {
  scale?: number;
  stage?: number;
  isDying?: boolean;
}

/**
 * Hook to manage pet bubble position state and screen dimension changes
 */
export function usePetBubblePosition(params: UsePetBubblePositionParams = {}) {
  const { scale = 1.0, stage = 1, isDying = false } = params;
  const insets = useSafeAreaInsets();
  const [screenDimensions, setScreenDimensions] = useState<ScreenDimensions>(
    Dimensions.get('window')
  );
  const [position, setPosition] = useState<Position>(() =>
    calculateInitialPosition(Dimensions.get('window'), insets, scale, stage, isDying)
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

  // Update position when insets, screen dimensions, scale, stage, or isDying change
  // Clamp position to new bounds, but preserve user's position if still valid
  // Also adjust for edge offset changes
  useEffect(() => {
    const bounds = calculateBounds(screenDimensions, insets, scale);
    const edgeOffset = getEdgeOffset(stage, isDying);

    setPosition((prevPosition) => {
      // Clamp position to new bounds
      const clamped = clampPosition(prevPosition, bounds);

      // Adjust for edge offset if at screen edge
      const size = PET_SIZE * scale;
      const halfSize = size / 2;
      const leftEdge = insets.left + halfSize + EDGE_PADDING + edgeOffset;
      const rightEdge = screenDimensions.width - insets.right - halfSize - EDGE_PADDING - edgeOffset;

      // If pet is near an edge, snap to the correct adjusted edge
      const isNearLeftEdge = Math.abs(clamped.x - (insets.left + halfSize + EDGE_PADDING)) < 20;
      const isNearRightEdge = Math.abs(clamped.x - (screenDimensions.width - insets.right - halfSize - EDGE_PADDING)) < 20;

      if (isNearLeftEdge) {
        return { ...clamped, x: leftEdge };
      } else if (isNearRightEdge) {
        return { ...clamped, x: rightEdge };
      }

      return clamped;
    });
  }, [insets.top, insets.left, insets.right, screenDimensions.width, screenDimensions.height, scale, stage, isDying]);

  // Get current bounds
  const bounds = calculateBounds(screenDimensions, insets, scale);

  return {
    position,
    setPosition,
    positionRef,
    screenDimensions,
    insets,
    bounds,
  };
}

