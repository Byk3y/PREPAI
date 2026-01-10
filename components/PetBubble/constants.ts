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
  3: require('@/assets/pets/stage-3/dying.png'),
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
  1: 1.0,   // Base size
  2: 1.35,  // Increased from 1.15 to ensure it looks larger than stage 1
  3: 0.9,   // Reduced - stage 3 image is naturally larger
};

/**
 * Padding from screen edges
 */
export const EDGE_PADDING = 6; // Adjusted to provide breathing room from the screen edge
export const TOP_PADDING = 80; // Increased to prevent reaching header/profile icon area
export const BOTTOM_PADDING = 100;

/**
 * Per-image right edge offset compensation
 * Each image has different internal transparent padding, so we compensate
 * to ensure consistent VISUAL spacing from the edge (not canvas spacing)
 * 
 * Values are in pixels to ADD to the edge position (negative = closer to edge)
 * These values are tuned so the VISIBLE pet has consistent ~10px visual gap from edge
 */
export const PET_IMAGE_EDGE_OFFSETS: Record<string, number> = {
  // Stage 1: Small centered pet with lots of padding - needs significant compensation
  'stage1_normal': -15,
  'stage1_dying': -5,

  // Stage 2: Orange pet has moderate internal padding
  'stage2_normal': -26,  // Push closer to edge to compensate for image padding
  'stage2_dying': 0,     // Water bubble fills canvas - no compensation needed

  // Stage 3: Purple pet with arms extending out - minimal padding
  'stage3_normal': -5,
  'stage3_dying': -5,
};

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







