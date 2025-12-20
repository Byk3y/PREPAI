import { ImageSourcePropType } from 'react-native';

/**
 * Pet bubble images by stage - require() needs static strings
 */
export const PET_BUBBLE_IMAGES: Record<number, ImageSourcePropType> = {
  1: require('@/assets/pets/stage-1/bubble.png'),
  2: require('@/assets/pets/stage-2/bubble.png'),
};

/**
 * Pet bubble size in pixels
 */
export const PET_SIZE = 100;

/**
 * Padding from screen edges
 */
export const EDGE_PADDING = 0; // Reduced for closer edge snapping
export const TOP_PADDING = 80; // Increased to prevent reaching header/profile icon area
export const BOTTOM_PADDING = 100;

/**
 * Animation configuration
 */
export const ANIMATION_CONFIG = {
  // Spring animation for scale changes (grab, release)
  scaleSpring: {
    tension: 300,
    friction: 20,
  },
  // Spring animation for edge snapping
  snapSpring: {
    tension: 100,
    friction: 8,
  },
  // Idle bounce animation timing
  idleBounce: {
    scaleUp: 1.1,
    scaleDown: 1,
    duration: 2000,
  },
  // Grab scale
  grabScale: 1.2,
  // Tap detection threshold
  tapThreshold: 10, // pixels
  // Movement detection threshold
  movementThreshold: 3, // pixels for pan responder activation
  movementDetectionThreshold: 2, // pixels for hasMoved flag
  // Initial position offset from top (percentage)
  initialTopOffset: 0.2, // 20% from top
} as const;



