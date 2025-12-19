/**
 * PetBubble - Draggable pet bubble with edge-snapping
 * Opens the pet half-sheet modal when tapped
 * Can be dragged around the screen and snaps to nearest edge on release
 */

import React, { useEffect } from 'react';
import { Animated, Image } from 'react-native';
import { useStore } from '@/lib/store';
import { PET_SIZE } from './PetBubble/constants';
import { getPetBubbleImage } from './PetBubble/utils/getPetBubbleImage';
import { usePetBubblePosition } from './PetBubble/hooks/usePetBubblePosition';
import { usePetBubbleAnimations } from './PetBubble/hooks/usePetBubbleAnimations';
import { usePetBubbleGestures } from './PetBubble/hooks/usePetBubbleGestures';

export const PetBubble: React.FC = () => {
  const { petState } = useStore();

  // Get the correct bubble image for current stage
  const bubbleImage = getPetBubbleImage(petState.stage);

  // Position management
  const { position, setPosition, positionRef, screenDimensions, insets } = usePetBubblePosition();

  // Animation management
  const animations = usePetBubbleAnimations(position);

  // Update animated position when position state changes
  useEffect(() => {
    animations.updatePosition(position);
  }, [position.x, position.y, animations.updatePosition]);

  // Gesture handling
  const { panResponder } = usePetBubbleGestures({
    position,
    positionRef,
    setPosition,
    screenDimensions,
    insets,
    scaleAnim: animations.scaleAnim,
    panX: animations.panX,
    panY: animations.panY,
    leftAnim: animations.leftAnim,
    topAnim: animations.topAnim,
    currentPanX: animations.currentPanX,
    currentPanY: animations.currentPanY,
    isDragging: animations.isDragging,
    stopIdleAnimation: animations.stopIdleAnimation,
    scaleUp: animations.scaleUp,
    scaleDown: animations.scaleDown,
    resetPanValues: animations.resetPanValues,
    animateEdgeSnap: animations.animateEdgeSnap,
    setPanValues: animations.setPanValues,
    setAllAnimatedValues: animations.setAllAnimatedValues,
    startIdleAnimation: animations.startIdleAnimation,
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: animations.leftAnim,
        top: animations.topAnim,
        transform: [
          { translateX: animations.panX },
          { translateY: animations.panY },
        ],
        zIndex: 50,
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={{
          transform: [{ scale: animations.scaleAnim }],
        }}
        className="items-center justify-center"
      >
        {/* Living Pet Bubble - changes based on stage */}
        <Image
          source={bubbleImage}
          style={{ width: PET_SIZE, height: PET_SIZE }}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
};
