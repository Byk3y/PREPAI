/**
 * Custom hook for Pet Sheet gesture handling
 * Centralizes PanResponder logic for swipe-to-dismiss and scroll coordination
 */

import { useRef, useEffect } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface UsePetSheetGesturesConfig {
    onDismiss: () => void;
    scrollY: React.MutableRefObject<number>;
}

export function usePetSheetGestures({ onDismiss, scrollY }: UsePetSheetGesturesConfig) {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const currentTranslateY = useRef(0);
    const hasMoved = useRef(false);

    // Track current translateY value
    useEffect(() => {
        const listenerId = translateY.addListener(({ value }) => {
            currentTranslateY.current = value;
        });
        return () => {
            translateY.removeListener(listenerId);
        };
    }, [translateY]);

    // Slide up animation on mount
    useEffect(() => {
        translateY.setValue(SCREEN_HEIGHT);

        // Use requestAnimationFrame to ensure the initial position is rendered 
        // before starting the animation, otherwise it might appear instantly.
        requestAnimationFrame(() => {
            Animated.spring(translateY, {
                toValue: 0,
                tension: 50, // Slightly reduced for a more elegant, less aggressive slide
                friction: 11,
                useNativeDriver: true,
            }).start();
        });
    }, [translateY]);

    // Common gesture handling logic
    const handleGestureGrant = () => {
        hasMoved.current = false;
        translateY.stopAnimation();
        translateY.setOffset(currentTranslateY.current);
        translateY.setValue(0);
    };

    const handleGestureMove = (dy: number, allowUpward: boolean = false) => {
        if (Math.abs(dy) > 5) {
            hasMoved.current = true;
        }
        if (dy > 0) {
            translateY.setValue(dy);
        } else if (allowUpward) {
            translateY.setValue(dy * 0.3);
        }
    };

    const handleGestureRelease = (dy: number, vy: number) => {
        translateY.flattenOffset();
        const totalDistance = Math.abs(dy);
        const isTap = !hasMoved.current && totalDistance < 10;

        if (!isTap && (dy > 150 || vy > 0.7)) {
            // Dismiss sheet
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                onDismiss();
            });
        } else if (!isTap) {
            // Snap back
            Animated.spring(translateY, {
                toValue: 0,
                tension: 65,
                friction: 11,
                useNativeDriver: true,
            }).start();
        } else {
            // Handle tap
            Animated.spring(translateY, {
                toValue: 0,
                tension: 65,
                friction: 11,
                useNativeDriver: true,
            }).start();
        }
    };

    // PanResponder for handle bar - always draggable
    const handleBarPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: handleGestureGrant,
            onPanResponderMove: (_, gestureState) => {
                handleGestureMove(gestureState.dy, true);
            },
            onPanResponderRelease: (_, gestureState) => {
                handleGestureRelease(gestureState.dy, gestureState.vy);
            },
        })
    ).current;

    // PanResponder for content area - only when scrolled to top
    const contentPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => {
                const isAtTop = scrollY.current <= 10;
                return isAtTop;
            },
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only take over if it's a downward gesture
                const isDownward = gestureState.dy > 5;
                const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.0;
                return isDownward && isVertical;
            },
            onPanResponderGrant: handleGestureGrant,
            onPanResponderMove: (_, gestureState) => {
                // Only move sheet downward - ignore upward movements
                if (gestureState.dy > 0) {
                    handleGestureMove(gestureState.dy, false);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                handleGestureRelease(gestureState.dy, gestureState.vy);
            },
        })
    ).current;

    const dismiss = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onDismiss();
        });
    };

    return {
        translateY,
        handleBarPanResponder,
        contentPanResponder,
        dismiss,
    };
}
