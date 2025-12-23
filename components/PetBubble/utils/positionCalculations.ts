import { EDGE_PADDING, TOP_PADDING, BOTTOM_PADDING, PET_SIZE, ANIMATION_CONFIG } from '../constants';

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
  insets: SafeAreaInsets
): Bounds {
  const horizontalInset = getHorizontalInset(insets);
  
  return {
    minX: horizontalInset + PET_SIZE / 2 + EDGE_PADDING,
    maxX: screenDimensions.width - horizontalInset - PET_SIZE / 2 - EDGE_PADDING,
    minY: insets.top + PET_SIZE / 2 + TOP_PADDING,
    maxY: screenDimensions.height - insets.bottom - PET_SIZE / 2 - BOTTOM_PADDING,
  };
}

/**
 * Calculate bounds for the top-left corner of the bubble
 */
export function calculateTopLeftBounds(
  screenDimensions: ScreenDimensions,
  insets: SafeAreaInsets
): { minLeft: number; maxLeft: number; minTop: number; maxTop: number } {
  const horizontalInset = getHorizontalInset(insets);
  
  return {
    minLeft: horizontalInset + EDGE_PADDING,
    maxLeft: screenDimensions.width - horizontalInset - PET_SIZE - EDGE_PADDING,
    minTop: insets.top + TOP_PADDING,
    maxTop: screenDimensions.height - insets.bottom - PET_SIZE - BOTTOM_PADDING,
  };
}

/**
 * Calculate initial position (upper-right area, about 20% from top)
 */
export function calculateInitialPosition(
  screenDimensions: ScreenDimensions,
  insets: SafeAreaInsets
): Position {
  const horizontalInset = getHorizontalInset(insets);
  
  return {
    x: screenDimensions.width - horizontalInset - PET_SIZE / 2 - EDGE_PADDING,
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
export function convertCenterToTopLeft(center: Position): { left: number; top: number } {
  return {
    left: center.x - PET_SIZE / 2,
    top: center.y - PET_SIZE / 2,
  };
}

/**
 * Convert top-left corner to center coordinates
 */
export function convertTopLeftToCenter(left: number, top: number): Position {
  return {
    x: left + PET_SIZE / 2,
    y: top + PET_SIZE / 2,
  };
}

/**
 * Determine which edge to snap to (horizontal only)
 * Returns the target X coordinate for edge snapping
 */
export function calculateEdgeSnapTarget(
  currentX: number,
  screenDimensions: ScreenDimensions,
  insets: SafeAreaInsets
): number {
  const horizontalInset = getHorizontalInset(insets);
  const screenMidpoint = screenDimensions.width / 2;
  const leftEdgeX = horizontalInset + PET_SIZE / 2 + EDGE_PADDING;
  const rightEdgeX = screenDimensions.width - horizontalInset - PET_SIZE / 2 - EDGE_PADDING;
  
  const targetX = currentX < screenMidpoint ? leftEdgeX : rightEdgeX;
  
  // Clamp to valid bounds
  const finalMinCenterX = horizontalInset + PET_SIZE / 2 + EDGE_PADDING;
  const finalMaxCenterX = screenDimensions.width - horizontalInset - PET_SIZE / 2 - EDGE_PADDING;
  
  return Math.max(finalMinCenterX, Math.min(finalMaxCenterX, targetX));
}

/**
 * Calculate symmetric padding for rendering
 */
export function getSymmetricPadding(insets: SafeAreaInsets): number {
  return getHorizontalInset(insets) + EDGE_PADDING;
}







