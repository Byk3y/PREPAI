import { EDGE_PADDING, TOP_PADDING, BOTTOM_PADDING, PET_SIZE, ANIMATION_CONFIG, PET_IMAGE_EDGE_OFFSETS } from '../constants';

export interface Position {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Calculate horizontal inset (symmetric padding)
 */
export function getHorizontalInset(insets: SafeAreaInsets): number {
  return Math.max(insets.left, insets.right);
}

/**
 * Calculate bounds for the pet bubble center coordinates
 */
export function calculateBounds(
  screenDimensions: ScreenDimensions,
  insets: SafeAreaInsets,
  scale: number = 1.0
): Bounds {
  const size = PET_SIZE * scale;
  const halfSize = size / 2;

  return {
    minX: insets.left + halfSize + EDGE_PADDING,
    maxX: screenDimensions.width - insets.right - halfSize - EDGE_PADDING,
    minY: insets.top + halfSize + TOP_PADDING,
    maxY: screenDimensions.height - insets.bottom - halfSize - BOTTOM_PADDING,
  };
}

/**
 * Calculate bounds for the top-left corner of the bubble
 */
export function calculateTopLeftBounds(
  screenDimensions: ScreenDimensions,
  insets: SafeAreaInsets,
  scale: number = 1.0
): { minLeft: number; maxLeft: number; minTop: number; maxTop: number } {
  const size = PET_SIZE * scale;

  return {
    minLeft: insets.left + EDGE_PADDING,
    maxLeft: screenDimensions.width - insets.right - size - EDGE_PADDING,
    minTop: insets.top + TOP_PADDING,
    maxTop: screenDimensions.height - insets.bottom - size - BOTTOM_PADDING,
  };
}

/**
 * Calculate initial position (upper-right area, about 40% from top)
 */
export function calculateInitialPosition(
  screenDimensions: ScreenDimensions,
  insets: SafeAreaInsets,
  scale: number = 1.0,
  stage: number = 1,
  isDying: boolean = false
): Position {
  const size = PET_SIZE * scale;
  const edgeOffset = getEdgeOffset(stage, isDying);

  return {
    x: screenDimensions.width - insets.right - size / 2 - EDGE_PADDING - edgeOffset,
    y: insets.top + (screenDimensions.height * ANIMATION_CONFIG.initialTopOffset),
  };
}

/**
 * Clamp position to valid bounds
 */
export function clampPosition(position: Position, bounds: Bounds): Position {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, position.y)),
  };
}

/**
 * Clamp top-left corner position to valid bounds
 */
export function clampTopLeftPosition(
  left: number,
  top: number,
  bounds: { minLeft: number; maxLeft: number; minTop: number; maxTop: number }
): { left: number; top: number } {
  return {
    left: Math.max(bounds.minLeft, Math.min(bounds.maxLeft, left)),
    top: Math.max(bounds.minTop, Math.min(bounds.maxTop, top)),
  };
}

/**
 * Convert center coordinates to top-left corner
 */
export function convertCenterToTopLeft(center: Position, scale: number = 1.0): { left: number; top: number } {
  const halfSize = (PET_SIZE * scale) / 2;
  return {
    left: center.x - halfSize,
    top: center.y - halfSize,
  };
}

/**
 * Convert top-left corner to center coordinates
 */
export function convertTopLeftToCenter(left: number, top: number, scale: number = 1.0): Position {
  const halfSize = (PET_SIZE * scale) / 2;
  return {
    x: left + halfSize,
    y: top + halfSize,
  };
}

/**
 * Get the edge offset for a specific pet state
 * Returns the number of pixels to adjust edge position
 */
export function getEdgeOffset(stage: number, isDying: boolean): number {
  const key = `stage${stage}_${isDying ? 'dying' : 'normal'}`;
  return PET_IMAGE_EDGE_OFFSETS[key] ?? 0;
}

/**
 * Determine which edge to snap to (horizontal only)
 * Returns the target X coordinate for edge snapping
 * @param stage - Pet stage (1, 2, or 3)
 * @param isDying - Whether pet is in dying state
 */
export function calculateEdgeSnapTarget(
  currentX: number,
  screenDimensions: ScreenDimensions,
  insets: SafeAreaInsets,
  scale: number = 1.0,
  stage: number = 1,
  isDying: boolean = false
): number {
  const screenMidpoint = screenDimensions.width / 2;
  const size = PET_SIZE * scale;
  const halfSize = size / 2;

  // Get per-image edge offset compensation
  const edgeOffset = getEdgeOffset(stage, isDying);

  // Directly calculate the possible min/max center X values
  // Apply edge offset to compensate for transparent padding in images
  const minCenterX = insets.left + halfSize + EDGE_PADDING + edgeOffset;
  const maxCenterX = screenDimensions.width - insets.right - halfSize - EDGE_PADDING - edgeOffset;

  const targetX = currentX < screenMidpoint ? minCenterX : maxCenterX;

  return Math.max(minCenterX, Math.min(maxCenterX, targetX));
}

/**
 * Calculate symmetric padding for rendering
 */
export function getSymmetricPadding(insets: SafeAreaInsets): number {
  return getHorizontalInset(insets) + EDGE_PADDING;
}







