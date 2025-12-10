/**
 * PetBubble - Draggable pet bubble with edge-snapping
 * Opens the pet half-sheet modal when tapped
 * Can be dragged around the screen and snaps to nearest edge on release
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, PanResponder, Dimensions, Animated, Image, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';

// Pet bubble images by stage - require() needs static strings
const PET_BUBBLE_IMAGES: Record<number, ImageSourcePropType> = {
  1: require('@/assets/pets/stage-1/bubble.png'),
  2: require('@/assets/pets/stage-2/bubble.png'),
};

const PET_SIZE = 100;
const EDGE_PADDING = 0; // Reduced for closer edge snapping
const TOP_PADDING = 80; // Increased to prevent reaching header/profile icon area
const BOTTOM_PADDING = 100;

export const PetBubble: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    authUser,
    petStateReady,
    petState,
  } = useStore();
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  
  // Get the correct bubble image for current stage (clamp to available stages 1-2)
  const currentStage = Math.min(Math.max(petState.stage, 1), 2);
  const bubbleImage = PET_BUBBLE_IMAGES[currentStage] || PET_BUBBLE_IMAGES[1];

  // Calculate usable screen area (excluding safe areas)
  // Use the maximum of left/right insets to ensure symmetric padding
  const horizontalInset = Math.max(insets.left, insets.right);
  const usableWidth = screenDimensions.width;
  const usableHeight = screenDimensions.height - insets.top - insets.bottom;
  const minY = insets.top + PET_SIZE / 2 + TOP_PADDING;
  const maxY = screenDimensions.height - insets.bottom - PET_SIZE / 2 - BOTTOM_PADDING;
  const minX = horizontalInset + PET_SIZE / 2 + EDGE_PADDING; // Left edge boundary (symmetric padding)
  const maxX = screenDimensions.width - horizontalInset - PET_SIZE / 2 - EDGE_PADDING; // Right edge boundary (symmetric padding)

  // Calculate initial position based on safe area - upper right (not at very top)
  const getInitialPosition = () => {
    const width = screenDimensions.width;
    const height = screenDimensions.height;
    // Position in upper-right area, about 20% from top
    return {
      x: width - horizontalInset - PET_SIZE / 2 - EDGE_PADDING,
      y: insets.top + (height * 0.2),
    };
  };

  const [position, setPosition] = useState(getInitialPosition());
  const positionRef = useRef(position);

  // Update ref whenever position changes
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Separate animated values to avoid useNativeDriver conflicts
  const scaleAnim = useRef(new Animated.Value(1)).current; // Uses native driver
  const panX = useRef(new Animated.Value(0)).current; // No native driver (for pan)
  const panY = useRef(new Animated.Value(0)).current; // No native driver (for pan)

  // Use Animated.Value for left/top to avoid layout recalculation flashes
  // Initialize based on initial position
  const getInitialLeft = () => {
    const initialPos = getInitialPosition();
    return initialPos.x - PET_SIZE / 2;
  };
  const getInitialTop = () => {
    const initialPos = getInitialPosition();
    return initialPos.y - PET_SIZE / 2;
  };
  const leftAnim = useRef(new Animated.Value(getInitialLeft())).current;
  const topAnim = useRef(new Animated.Value(getInitialTop())).current;

  const isDragging = useRef(false);
  const hasMoved = useRef(false); // Track if user actually moved during gesture
  const currentPanX = useRef(0); // Track current pan X value
  const currentPanY = useRef(0); // Track current pan Y value

  // Update screen dimensions on orientation change and recalculate bounds
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
      // Recalculate position to stay within bounds
      const currentHorizontalInset = Math.max(insets.left, insets.right);
      const newMinY = insets.top + PET_SIZE / 2 + TOP_PADDING;
      const newMaxY = window.height - insets.bottom - PET_SIZE / 2 - BOTTOM_PADDING;
      const newMinX = currentHorizontalInset + PET_SIZE / 2 + EDGE_PADDING;
      const newMaxX = window.width - currentHorizontalInset - PET_SIZE / 2 - EDGE_PADDING;
      setPosition((prev) => ({
        x: Math.max(newMinX, Math.min(newMaxX, prev.x)),
        y: Math.max(newMinY, Math.min(newMaxY, prev.y)),
      }));
    });
    return () => subscription?.remove();
  }, [insets.top, insets.bottom, insets.left, insets.right]);

  // Update initial position when insets change
  useEffect(() => {
    const height = screenDimensions.height;
    // Recalculate horizontalInset here to ensure we use the latest values
    const currentHorizontalInset = Math.max(insets.left, insets.right);
    setPosition({
      x: screenDimensions.width - currentHorizontalInset - PET_SIZE / 2 - EDGE_PADDING,
      y: insets.top + (height * 0.2), // Upper-right, about 20% from top
    });
  }, [insets.top, insets.left, insets.right, screenDimensions.width, screenDimensions.height]);

  // Track the idle bounce animation so we can stop/restart it
  const idleBounceRef = useRef<Animated.CompositeAnimation | null>(null);

  // Idle animation (gentle bounce) - helper function to start/restart
  const startIdleAnimation = React.useCallback(() => {
    if (isDragging.current) {
      return; // Don't start if currently dragging
    }

    // Stop any existing idle animation
    if (idleBounceRef.current) {
      idleBounceRef.current.stop();
    }

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    idleBounceRef.current = bounce;
    bounce.start();
  }, [scaleAnim]);

  // Start idle animation on mount
  React.useEffect(() => {
    startIdleAnimation();
    return () => {
      if (idleBounceRef.current) {
        idleBounceRef.current.stop();
        idleBounceRef.current = null;
      }
    };
  }, [startIdleAnimation]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only activate if movement is significant (prevents accidental activation)
        const moveDistance = Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2);
        return moveDistance > 3; // 3 pixel threshold
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        hasMoved.current = false; // Reset movement flag
        currentPanX.current = 0; // Reset pan tracking
        currentPanY.current = 0; // Reset pan tracking
        // Stop idle animation
        if (idleBounceRef.current) {
          idleBounceRef.current.stop();
        }
        scaleAnim.stopAnimation();

        // Scale up on grab
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          useNativeDriver: true,
          tension: 300,
          friction: 20,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        // Mark that user has moved
        if (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2) {
          hasMoved.current = true;
        }

        // Use ref to get latest position (avoids stale closure)
        const currentPos = positionRef.current;

        // Calculate the base visual position (top-left corner)
        const baseLeft = currentPos.x - PET_SIZE / 2;
        const baseTop = currentPos.y - PET_SIZE / 2;

        // Define absolute bounds for the top-left corner of the bubble
        // Use max of left/right insets for symmetric padding
        const minLeft = horizontalInset + EDGE_PADDING;
        const maxLeft = screenDimensions.width - horizontalInset - PET_SIZE - EDGE_PADDING;
        const minTop = insets.top + TOP_PADDING;
        const maxTop = screenDimensions.height - insets.bottom - PET_SIZE - BOTTOM_PADDING;

        // Calculate where the bubble would be with the gesture movement
        const potentialLeft = baseLeft + gestureState.dx;
        const potentialTop = baseTop + gestureState.dy;

        // Clamp the potential position to stay within bounds (creating the "wall" effect)
        const clampedLeft = Math.max(minLeft, Math.min(maxLeft, potentialLeft));
        const clampedTop = Math.max(minTop, Math.min(maxTop, potentialTop));

        // Calculate how much we can actually move (the clamped deltas)
        const clampedDx = clampedLeft - baseLeft;
        const clampedDy = clampedTop - baseTop;

        // Update pan values with clamped deltas - this creates the "wall" that prevents
        // the bubble from visually entering the edge area
        panX.setValue(clampedDx);
        panY.setValue(clampedDy);
        // Track current pan values
        currentPanX.current = clampedDx;
        currentPanY.current = clampedDy;
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;

        // Detect tap vs drag - use both movement flag and distance
        const totalDistance = Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2);
        const isTap = !hasMoved.current && totalDistance < 10; // Increased threshold to 10px

        if (isTap) {
          const openPetSheet = () => {
            if (!authUser) return;
            router.push('/pet-sheet');
          };

          // Tap detected - only reset if pan values are non-zero to avoid jump
          const needsResetX = Math.abs(currentPanX.current) > 0.1;
          const needsResetY = Math.abs(currentPanY.current) > 0.1;

          if (needsResetX || needsResetY) {
            // Reset pan values smoothly if they exist
            Animated.parallel([
              needsResetX ? Animated.spring(panX, {
                toValue: 0,
                useNativeDriver: false,
                tension: 300,
                friction: 20,
              }) : Animated.timing(panX, { toValue: 0, duration: 0, useNativeDriver: false }),
              needsResetY ? Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: false,
                tension: 300,
                friction: 20,
              }) : Animated.timing(panY, { toValue: 0, duration: 0, useNativeDriver: false }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 300,
                friction: 20,
              }),
            ]).start(() => {
              currentPanX.current = 0;
              currentPanY.current = 0;
              // Restart idle bounce animation
              startIdleAnimation();
              openPetSheet();
            });
          } else {
            // No movement, just open sheet directly
            Animated.spring(scaleAnim, {
              toValue: 1,
              useNativeDriver: true,
              tension: 300,
              friction: 20,
            }).start(() => {
              // Restart idle bounce animation
              startIdleAnimation();
              openPetSheet();
            });
          }
          return;
        }

        // Drag detected - calculate new position with edge snapping
        // Use ref to get latest position (avoids stale closure)
        const currentPos = positionRef.current;

        // Calculate the base visual position (top-left corner)
        const baseLeft = currentPos.x - PET_SIZE / 2;
        const baseTop = currentPos.y - PET_SIZE / 2;

        // Define absolute bounds for the top-left corner of the bubble
        // Use max of left/right insets for symmetric padding
        const minLeft = horizontalInset + EDGE_PADDING;
        const maxLeft = screenDimensions.width - horizontalInset - PET_SIZE - EDGE_PADDING;
        const minTop = insets.top + TOP_PADDING;
        const maxTop = screenDimensions.height - insets.bottom - PET_SIZE - BOTTOM_PADDING;

        // Calculate where the bubble would be with the gesture movement
        const potentialLeft = baseLeft + gestureState.dx;
        const potentialTop = baseTop + gestureState.dy;

        // Clamp the potential position to stay within bounds
        const clampedLeft = Math.max(minLeft, Math.min(maxLeft, potentialLeft));
        const clampedTop = Math.max(minTop, Math.min(maxTop, potentialTop));

        // Convert back to center coordinates for position state
        const clampedX = clampedLeft + PET_SIZE / 2;
        const clampedY = clampedTop + PET_SIZE / 2;

        // Double-check: Clamp center Y to proper bounds (should match the render bounds)
        const minCenterY = insets.top + PET_SIZE / 2 + TOP_PADDING;
        const maxCenterY = screenDimensions.height - insets.bottom - PET_SIZE / 2 - BOTTOM_PADDING;
        const finalClampedY = Math.max(minCenterY, Math.min(maxCenterY, clampedY));

        // Determine which edge to snap to (horizontal only)
        // Use max of left/right insets for symmetric padding
        const screenMidpoint = screenDimensions.width / 2;
        const leftEdgeX = horizontalInset + PET_SIZE / 2 + EDGE_PADDING;
        const rightEdgeX = screenDimensions.width - horizontalInset - PET_SIZE / 2 - EDGE_PADDING;
        const targetX = clampedX < screenMidpoint ? leftEdgeX : rightEdgeX;

        // Calculate target position
        const finalMinCenterX = horizontalInset + PET_SIZE / 2 + EDGE_PADDING;
        const finalMaxCenterX = screenDimensions.width - horizontalInset - PET_SIZE / 2 - EDGE_PADDING;
        const symmetricTargetX = Math.max(finalMinCenterX, Math.min(finalMaxCenterX, targetX));

        // Calculate current position and pan values
        const currentX = currentPos.x;
        const currentY = currentPos.y;
        const currentPanXValue = currentPanX.current;
        const currentPanYValue = currentPanY.current;

        // Calculate current visual position (where bubble actually is on screen)
        const currentVisualX = currentX + currentPanXValue;
        const currentVisualY = currentY + currentPanYValue;

        // Calculate the offset needed to reach target from current visual position
        const visualOffsetX = symmetricTargetX - currentVisualX;
        const visualOffsetY = finalClampedY - currentVisualY;

        // Check which axes need animation
        const needsXAnimation = Math.abs(visualOffsetX) > 0.1;
        const needsYAnimation = Math.abs(visualOffsetY) > 0.1;

        if (!needsXAnimation && !needsYAnimation) {
          // Already at target - need to update position WITHOUT visual jump
          // Calculate new left/top values (top-left corner from center coordinates)
          const newLeft = symmetricTargetX - PET_SIZE / 2;
          const newTop = finalClampedY - PET_SIZE / 2;

          // CRITICAL: Set ALL animated values synchronously BEFORE React state update
          // This prevents layout recalculation flash
          leftAnim.setValue(newLeft);
          topAnim.setValue(newTop);
          panX.setValue(0);
          panY.setValue(0);
          currentPanX.current = 0;
          currentPanY.current = 0;

          // Now update position state - React will render but animated values are already correct
          setPosition({ x: symmetricTargetX, y: finalClampedY });
          positionRef.current = { x: symmetricTargetX, y: finalClampedY };

          // Scale back to normal
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 20,
          }).start(() => {
            startIdleAnimation();
          });
          return;
        }

        // CRITICAL FIX: Update position state accounting for current pan values
        // Strategy: Set position to target, but adjust pan values to maintain visual position
        // Then animate pan values to 0, which smoothly moves visual position to target
        // 
        // Before: visual = currentX + currentPanXValue
        // After setPosition: visual = targetX + adjustedPanX (should equal currentVisualX)
        // After animation: visual = targetX + 0 = targetX ✓

        // Calculate what pan values should be to maintain current visual position
        // visual = position + pan, so pan = visual - position
        const adjustedPanX = currentVisualX - symmetricTargetX;
        const adjustedPanY = currentVisualY - finalClampedY;

        // Calculate new left/top values (top-left corner from center coordinates)
        const newLeft = symmetricTargetX - PET_SIZE / 2;
        const newTop = finalClampedY - PET_SIZE / 2;

        // CRITICAL FIX: Set ALL animated values synchronously BEFORE any React state update
        // This ensures native animated values are correct when React renders
        // No layout recalculation flash because we're updating animated values, not layout props
        leftAnim.setValue(newLeft);
        topAnim.setValue(newTop);
        panX.setValue(adjustedPanX);
        panY.setValue(adjustedPanY);
        currentPanX.current = adjustedPanX;
        currentPanY.current = adjustedPanY;

        // Now update position state - React will render but animated values are already correct
        setPosition({ x: symmetricTargetX, y: finalClampedY });
        positionRef.current = { x: symmetricTargetX, y: finalClampedY };

        // Build animation array - only animate axes that need it
        const animations: Animated.CompositeAnimation[] = [];

        if (needsXAnimation) {
          animations.push(
            Animated.spring(panX, {
              toValue: 0,
              useNativeDriver: false,
              tension: 100,
              friction: 8,
              // Remove velocity to prevent physics-based momentum/overshoot
            })
          );
        } else {
          // No X animation needed - reset immediately
          panX.setValue(0);
          currentPanX.current = 0;
        }

        if (needsYAnimation) {
          animations.push(
            Animated.spring(panY, {
              toValue: 0,
              useNativeDriver: false,
              tension: 100,
              friction: 8,
              // Remove velocity to prevent physics-based momentum/overshoot
            })
          );
        } else {
          // No Y animation needed - reset immediately
          panY.setValue(0);
          currentPanY.current = 0;
        }

        // Always animate scale
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 20,
          })
        );

        // Run all animations in parallel
        Animated.parallel(animations).start(() => {
          // Ensure all refs are reset
          currentPanX.current = 0;
          currentPanY.current = 0;

          // Restart idle bounce animation now that dragging is complete
          startIdleAnimation();
        });
      },
    })
  ).current;

  // Calculate visual position (top-left corner of bubble)
  // position.x and position.y are the center coordinates
  // We subtract PET_SIZE/2 to get the top-left corner

  // Use exact same padding calculation on both sides for perfect symmetry
  const symmetricPadding = horizontalInset + EDGE_PADDING;

  // Define bounds for center coordinates
  const minCenterX = symmetricPadding + PET_SIZE / 2;
  const maxCenterX = screenDimensions.width - symmetricPadding - PET_SIZE / 2;

  // Clamp center position to symmetric bounds ONCE
  const clampedCenterX = Math.max(minCenterX, Math.min(maxCenterX, position.x));
  const clampedCenterY = Math.max(
    insets.top + PET_SIZE / 2 + TOP_PADDING,
    Math.min(screenDimensions.height - insets.bottom - PET_SIZE / 2 - BOTTOM_PADDING, position.y)
  );

  // Convert clamped center to top-left corner
  const leftValue = clampedCenterX - PET_SIZE / 2;
  const topValue = clampedCenterY - PET_SIZE / 2;

  // Update animated left/top values when position state changes
  // This keeps them in sync without causing layout recalculation flashes


  useEffect(() => {
    leftAnim.setValue(leftValue);
    topAnim.setValue(topValue);
  }, [position.x, position.y, leftValue, topValue]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: leftAnim,
        top: topAnim,
        transform: [
          { translateX: panX },
          { translateY: panY },
        ],
        zIndex: 50,
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
        className="items-center justify-center"
      >
        {/* Living Pet Bubble - changes based on stage */}
        <Image
          source={bubbleImage}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
};
