/**
 * Onboarding Screen Constants
 * Centralized screen indices to prevent magic numbers and improve maintainability
 */

/**
 * Screen indices (0-based)
 * Maps screen names to their array indices in the onboarding flow
 * 
 * MINIMAL FLOW (9 screens):
 * 1. Problem (hook)
 * 2. Science (explain why)
 * 3. Aha Moment (prove it works - PEAK EMOTION)
 * 4. Auth (capture while convinced!)
 * 5. Pet Naming (personalize companion)
 * 6. Education (one question: level)
 * 7. Learning Style (one question: how you learn)
 * 8. Time Goal (one question: daily commitment)
 * 9. Notifications (permission)
 * [Paywall handled separately after onboarding completes]
 */
export const SCREEN_INDICES = {
  SCREEN_1_PROBLEM: 0,
  SCREEN_2_SCIENCE: 1,
  SCREEN_3_AHA_MOMENT: 2,
  SCREEN_4_AUTH: 3,
  SCREEN_5_PET_NAMING: 4,
  SCREEN_6_EDUCATION: 5,
  SCREEN_7_LEARNING_STYLE: 6,
  SCREEN_8_TIME_GOAL: 7,
  SCREEN_9_NOTIFICATIONS: 8,
} as const;

/**
 * Total number of screens in the onboarding flow
 */
export const TOTAL_SCREENS = 9;

/**
 * First screen index (always 0)
 */
export const FIRST_SCREEN = SCREEN_INDICES.SCREEN_1_PROBLEM;

/**
 * Last screen index (TOTAL_SCREENS - 1)
 */
export const LAST_SCREEN = TOTAL_SCREENS - 1;

/**
 * Screen index where auth is required
 * Users must authenticate at this screen
 */
export const AUTH_REQUIRED_SCREEN = SCREEN_INDICES.SCREEN_4_AUTH;

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
    currentScreen === SCREEN_INDICES.SCREEN_3_AHA_MOMENT ||
    currentScreen === SCREEN_INDICES.SCREEN_4_AUTH ||
    currentScreen === SCREEN_INDICES.SCREEN_9_NOTIFICATIONS
  );
};

/**
 * Helper function to get the next screen index
 */
export const getNextScreen = (currentScreen: number): number => {
  return currentScreen + 1;
};
