/**
 * Onboarding Screen Constants
 * Centralized screen indices to prevent magic numbers and improve maintainability
 */

/**
 * Screen indices (0-based)
 * Maps screen names to their array indices in the onboarding flow
 */
export const SCREEN_INDICES = {
  SCREEN_1_PROBLEM: 0,
  SCREEN_2_SCIENCE: 1,
  SCREEN_3_SOLUTION: 2,
  SCREEN_4_ASSESSMENT: 3,
  SCREEN_4_RESULTS: 4,
  SCREEN_4_PET_NAMING: 5,
  SCREEN_4_NOTIFICATIONS: 6,
  SCREEN_5_DREAM: 7,
  SCREEN_6_SOCIAL_PROOF: 8,
  SCREEN_7_TRIAL_OFFER: 9,
} as const;

/**
 * Total number of screens in the onboarding flow
 */
export const TOTAL_SCREENS = 10;

/**
 * First screen index (always 0)
 */
export const FIRST_SCREEN = SCREEN_INDICES.SCREEN_1_PROBLEM;

/**
 * Last screen index (TOTAL_SCREENS - 1)
 */
export const LAST_SCREEN = TOTAL_SCREENS - 1;

/**
 * Screen index where auth is required (Screen 3 - Solution)
 * Users must authenticate before proceeding past this screen
 */
export const AUTH_REQUIRED_SCREEN = SCREEN_INDICES.SCREEN_3_SOLUTION;

/**
 * Screen index where assessment starts
 * Used for resuming onboarding after auth
 */
export const ASSESSMENT_START_SCREEN = SCREEN_INDICES.SCREEN_4_ASSESSMENT;

/**
 * Helper function to check if a screen is the last screen
 */
export const isLastScreen = (currentScreen: number): boolean => {
  return currentScreen === LAST_SCREEN;
};

/**
 * Helper function to check if a screen is the first screen
 */
export const isFirstScreen = (currentScreen: number): boolean => {
  return currentScreen === FIRST_SCREEN;
};

/**
 * Helper function to check if a screen should hide the footer button
 * (Screens with their own navigation/buttons)
 */
export const shouldHideFooter = (currentScreen: number): boolean => {
  return (
    currentScreen === SCREEN_INDICES.SCREEN_3_SOLUTION ||
    currentScreen === SCREEN_INDICES.SCREEN_4_ASSESSMENT ||
    currentScreen === SCREEN_INDICES.SCREEN_4_NOTIFICATIONS
  );
};

/**
 * Helper function to get the next screen index
 */
export const getNextScreen = (currentScreen: number): number => {
  return currentScreen + 1;
};


