import { ImageSourcePropType } from 'react-native';

/**
 * Pet bubble images by stage - require() needs static strings
 */
export const PET_BUBBLE_IMAGES: Record<number, ImageSourcePropType> = {
  1: require('@/assets/pets/stage-1/bubble.png'),
  2: require('@/assets/pets/stage-2/bubble.png'),
  3: require('@/assets/pets/stage-3/bubble.png'),
};

export const PET_DYING_IMAGES: Record<number, ImageSourcePropType> = {
  1: require('@/assets/pets/stage-1/dying.png'),
  2: require('@/assets/pets/stage-2/dying.png'),
  3: require('@/assets/pets/stage-2/dying.png'), // Fallback until stage-3 dying is added
};

/**
 * Pet bubble size in pixels
 */
export const PET_SIZE = 110;

/**
 * Stage-specific scale factors to ensure visual consistency
 * (e.g., if one stage's artwork naturally appears larger than others)
 */
export const PET_STAGE_SCALES: Record<number, number> = {
  1: 1.0,  // Base size
  2: 1.35, // Increased from 1.15 to ensure it looks larger than stage 1
  3: 1.5,  // Increased from 1.1 to ensure visual progression
};

/**
 * Padding from screen edges
 */
export const EDGE_PADDING = 6; // Adjusted to provide breathing room from the screen edge
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
  initialTopOffset: 0.4, // 40% from top (changed from 0.2 for better reachability)
} as const;







