import { useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import { PET_SIZE, ANIMATION_CONFIG } from '../constants';
import { convertCenterToTopLeft, type Position } from '../utils/positionCalculations';

/**
 * Hook to manage all pet bubble animations
 */
export function usePetBubbleAnimations(initialPosition: Position) {
  // Separate animated values to avoid useNativeDriver conflicts
  const scaleAnim = useRef(new Animated.Value(1)).current; // Uses native driver
  const panX = useRef(new Animated.Value(0)).current; // No native driver (for pan)
  const panY = useRef(new Animated.Value(0)).current; // No native driver (for pan)

  // Use Animated.Value for left/top to avoid layout recalculation flashes
  // Initialize based on initial position
  const getInitialLeft = () => {
    const topLeft = convertCenterToTopLeft(initialPosition);
    return topLeft.left;
  };
  const getInitialTop = () => {
    const topLeft = convertCenterToTopLeft(initialPosition);
    return topLeft.top;
  };
  const leftAnim = useRef(new Animated.Value(getInitialLeft())).current;
  const topAnim = useRef(new Animated.Value(getInitialTop())).current;

  // Track current pan values
  const currentPanX = useRef(0);
  const currentPanY = useRef(0);

  // Track the idle bounce animation so we can stop/restart it
  const idleBounceRef = useRef<Animated.CompositeAnimation | null>(null);
  const isDragging = useRef(false);

  // Idle animation (gentle bounce) - helper function to start/restart
  const startIdleAnimation = useCallback(() => {
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
          toValue: ANIMATION_CONFIG.idleBounce.scaleUp,
          duration: ANIMATION_CONFIG.idleBounce.duration,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: ANIMATION_CONFIG.idleBounce.scaleDown,
          duration: ANIMATION_CONFIG.idleBounce.duration,
          useNativeDriver: true,
        }),
      ])
    );

    idleBounceRef.current = bounce;
    bounce.start();
  }, [scaleAnim]);

  // Start idle animation on mount
  useEffect(() => {
    startIdleAnimation();
    return () => {
      if (idleBounceRef.current) {
        idleBounceRef.current.stop();
        idleBounceRef.current = null;
      }
    };
  }, [startIdleAnimation]);

  // Update animated left/top values when position changes
  const updatePosition = useCallback(
    (newPosition: Position) => {
      const topLeft = convertCenterToTopLeft(newPosition);
      leftAnim.setValue(topLeft.left);
      topAnim.setValue(topLeft.top);
    },
    [leftAnim, topAnim]
  );

  // Stop idle animation
  const stopIdleAnimation = useCallback(() => {
    if (idleBounceRef.current) {
      idleBounceRef.current.stop();
    }
    scaleAnim.stopAnimation();
  }, [scaleAnim]);

  // Scale up on grab
  const scaleUp = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION_CONFIG.grabScale,
      useNativeDriver: true,
      tension: ANIMATION_CONFIG.scaleSpring.tension,
      friction: ANIMATION_CONFIG.scaleSpring.friction,
    }).start();
  }, [scaleAnim]);

  // Scale down to normal
  const scaleDown = useCallback(
    (callback?: () => void) => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: ANIMATION_CONFIG.scaleSpring.tension,
        friction: ANIMATION_CONFIG.scaleSpring.friction,
      }).start(callback);
    },
    [scaleAnim]
  );

  // Reset pan values (for tap handling)
  const resetPanValues = useCallback(
    (needsResetX: boolean, needsResetY: boolean, callback?: () => void) => {
      if (needsResetX || needsResetY) {
        Animated.parallel([
          needsResetX
            ? Animated.spring(panX, {
                toValue: 0,
                useNativeDriver: false,
                tension: ANIMATION_CONFIG.scaleSpring.tension,
                friction: ANIMATION_CONFIG.scaleSpring.friction,
              })
            : Animated.timing(panX, { toValue: 0, duration: 0, useNativeDriver: false }),
          needsResetY
            ? Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: false,
                tension: ANIMATION_CONFIG.scaleSpring.tension,
                friction: ANIMATION_CONFIG.scaleSpring.friction,
              })
            : Animated.timing(panY, { toValue: 0, duration: 0, useNativeDriver: false }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: ANIMATION_CONFIG.scaleSpring.tension,
            friction: ANIMATION_CONFIG.scaleSpring.friction,
          }),
        ]).start(() => {
          currentPanX.current = 0;
          currentPanY.current = 0;
          if (callback) callback();
        });
      } else {
        scaleDown(callback);
      }
    },
    [panX, panY, scaleAnim, scaleDown]
  );

  // Animate edge snap
  const animateEdgeSnap = useCallback(
    (
      needsXAnimation: boolean,
      needsYAnimation: boolean,
      callback?: () => void
    ) => {
      const animations: Animated.CompositeAnimation[] = [];

      if (needsXAnimation) {
        animations.push(
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: false,
            tension: ANIMATION_CONFIG.snapSpring.tension,
            friction: ANIMATION_CONFIG.snapSpring.friction,
          })
        );
      } else {
        panX.setValue(0);
        currentPanX.current = 0;
      }

      if (needsYAnimation) {
        animations.push(
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
            tension: ANIMATION_CONFIG.snapSpring.tension,
            friction: ANIMATION_CONFIG.snapSpring.friction,
          })
        );
      } else {
        panY.setValue(0);
        currentPanY.current = 0;
      }

      // Always animate scale
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: ANIMATION_CONFIG.scaleSpring.tension,
          friction: ANIMATION_CONFIG.scaleSpring.friction,
        })
      );

      // Run all animations in parallel
      Animated.parallel(animations).start(() => {
        currentPanX.current = 0;
        currentPanY.current = 0;
        if (callback) callback();
      });
    },
    [panX, panY, scaleAnim]
  );

  // Set pan values directly (for drag handling)
  const setPanValues = useCallback((x: number, y: number) => {
    panX.setValue(x);
    panY.setValue(y);
    currentPanX.current = x;
    currentPanY.current = y;
  }, [panX, panY]);

  // Set all animated values synchronously (for edge snap without animation)
  const setAllAnimatedValues = useCallback(
    (position: Position, panXValue: number, panYValue: number) => {
      const topLeft = convertCenterToTopLeft(position);
      leftAnim.setValue(topLeft.left);
      topAnim.setValue(topLeft.top);
      panX.setValue(panXValue);
      panY.setValue(panYValue);
      currentPanX.current = panXValue;
      currentPanY.current = panYValue;
    },
    [leftAnim, topAnim, panX, panY]
  );

  return {
    // Animated values
    scaleAnim,
    panX,
    panY,
    leftAnim,
    topAnim,
    // Refs
    currentPanX,
    currentPanY,
    isDragging,
    // Functions
    startIdleAnimation,
    stopIdleAnimation,
    scaleUp,
    scaleDown,
    resetPanValues,
    animateEdgeSnap,
    setPanValues,
    setAllAnimatedValues,
    updatePosition,
  };
}







