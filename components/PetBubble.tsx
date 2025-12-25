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
import { getLocalDateString } from '@/lib/utils/time';

export const PetBubble: React.FC = () => {
  const { user, petState, dailyTasks } = useStore();

  // Check if secure_pet task is already completed today
  const isSecureTaskCompleted = dailyTasks?.find(t => t.task_key === 'secure_pet')?.completed;

  // A streak is "at risk" if it hasn't been secured today
  const today = getLocalDateString();
  const isAtRisk = user.last_streak_date !== today && !isSecureTaskCompleted;

  // A streak is "lost" if it's 0 but there's a recoverable streak in meta
  const recoverableStreak = user.meta?.last_recoverable_streak ?? 0;
  const isStreakLost = user.streak === 0 && recoverableStreak > 0;

  const isDying = isAtRisk || isStreakLost;

  // Get the correct bubble image for current stage
  const bubbleImage = getPetBubbleImage(petState.stage, isDying);

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
          // Add urgency glow if dying
          ...(isDying && {
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 12,
            elevation: 8,
          })
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
