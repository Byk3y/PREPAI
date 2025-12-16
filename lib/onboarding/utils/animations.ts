/**
 * Common Animation Configurations
 * Centralized animation presets for consistent UX across onboarding screens
 */

import { MotiTransition } from 'moti';

/**
 * Standard timing animation (fade in)
 */
export const fadeInTiming: MotiTransition = {
  type: 'timing',
  duration: 400,
};

/**
 * Standard timing animation with longer duration
 */
export const fadeInTimingLong: MotiTransition = {
  type: 'timing',
  duration: 500,
};

/**
 * Standard timing animation with extra long duration
 */
export const fadeInTimingExtraLong: MotiTransition = {
  type: 'timing',
  duration: 600,
};

/**
 * Slide up animation (common for text)
 */
export const slideUpTiming: MotiTransition = {
  type: 'timing',
  duration: 400,
};

/**
 * Spring animation for scale effects (emojis, icons)
 */
export const scaleSpring: MotiTransition = {
  type: 'spring',
  damping: 12,
  stiffness: 100,
};

/**
 * Spring animation for card/item animations
 */
export const cardSpring: MotiTransition = {
  type: 'spring',
  damping: 15,
  stiffness: 100,
};

/**
 * Spring animation for screen transitions
 */
export const screenSpring: MotiTransition = {
  type: 'spring',
  damping: 20,
  stiffness: 100,
};

/**
 * Spring animation for option/item selection
 */
export const optionSpring: MotiTransition = {
  type: 'spring',
  damping: 15,
  stiffness: 150,
};

/**
 * Standard delay increments for staggered animations
 */
export const DELAYS = {
  SHORT: 200,
  MEDIUM: 400,
  LONG: 600,
  EXTRA_LONG: 800,
  VERY_LONG: 1000,
} as const;

/**
 * Helper to calculate staggered delay for list items
 */
export const getStaggeredDelay = (index: number, baseDelay: number = 300, increment: number = 100): number => {
  return baseDelay + index * increment;
};


