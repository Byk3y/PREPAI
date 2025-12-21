/**
 * Onboarding Status Utilities
 * Centralized logic for determining onboarding completion status
 * Handles both explicit flags and legacy inference from notebook creation
 */

/**
 * Profile metadata type from the database
 * Represents user_profile_meta table columns
 */
export interface ProfileMeta {
  has_completed_onboarding?: boolean | null;
  has_created_notebook?: boolean | null;
  [key: string]: any;
}

/**
 * Determines if onboarding is complete based on profile metadata
 *
 * Strategy:
 * 1. Check explicit has_completed_onboarding flag (new users)
 * 2. Fall back to has_created_notebook (legacy users who created notebooks before flag existed)
 * 3. Default to false if neither flag is set
 *
 * @param meta - Profile metadata from database (user_profile_meta table)
 * @returns true if onboarding is complete, false otherwise
 */
export function isOnboardingComplete(meta: ProfileMeta | null): boolean {
  if (!meta) {
    return false;
  }

  // Explicit flag takes precedence (new users)
  if (meta.has_completed_onboarding === true) {
    return true;
  }

  // Legacy: infer from notebook creation (existing users)
  // Users who created a notebook before the has_completed_onboarding flag was added
  // are considered to have completed onboarding
  if (meta.has_created_notebook === true) {
    return true;
  }

  return false;
}

/**
 * Onboarding action types
 * - 'complete': User has finished onboarding, should go to home
 * - 'resume': User is mid-onboarding, should resume at current screen
 * - 'start': User hasn't started onboarding, should begin at screen 0
 */
export type OnboardingAction = 'complete' | 'resume' | 'start';

/**
 * Determines what onboarding action to take based on profile and current screen
 *
 * @param meta - Profile metadata from database
 * @param currentScreen - Current onboarding screen number (0-8)
 * @returns Action to take: 'complete', 'resume', or 'start'
 */
export function getOnboardingAction(
  meta: ProfileMeta | null,
  currentScreen: number
): OnboardingAction {
  // Check if onboarding is complete
  if (isOnboardingComplete(meta)) {
    return 'complete';
  }

  // Mid-onboarding (screens 3-8 are post-auth)
  // User has authenticated and is partway through onboarding
  if (currentScreen >= 3 && currentScreen < 9) {
    return 'resume';
  }

  // Pre-auth screens (0-2) or not started
  return 'start';
}

/**
 * Gets the target route based on onboarding status
 *
 * @param meta - Profile metadata from database
 * @param currentScreen - Current onboarding screen number
 * @param isAuthenticated - Whether user is authenticated
 * @param currentRoute - Current route (for context)
 * @returns Route to navigate to: '/onboarding', '/', or null (stay on current)
 */
export function getOnboardingRoute(
  meta: ProfileMeta | null,
  currentScreen: number,
  isAuthenticated: boolean,
  currentRoute: string | undefined
): '/' | '/onboarding' | '/auth' | null {
  // Not authenticated - should be on auth or onboarding (pre-auth screens)
  if (!isAuthenticated) {
    // If on pre-auth onboarding screens (0-2), stay there
    if (currentRoute === 'onboarding' && currentScreen >= 0 && currentScreen < 3) {
      return null;
    }
    // Otherwise go to auth
    return '/auth';
  }

  // Authenticated - check onboarding status
  const action = getOnboardingAction(meta, currentScreen);

  switch (action) {
    case 'complete':
      // Onboarding complete - go to home (unless already there)
      if (currentRoute === 'onboarding' || currentRoute === 'auth') {
        return '/';
      }
      return null; // Stay on current route (deep links, etc.)

    case 'resume':
      // Mid-onboarding - go to onboarding screen (unless already there)
      if (currentRoute !== 'onboarding') {
        return '/onboarding';
      }
      return null;

    case 'start':
      // Starting onboarding - go to onboarding screen
      if (currentRoute === 'auth' || currentRoute === 'onboarding') {
        return '/onboarding';
      }
      return null;

    default:
      return null;
  }
}

/**
 * Validates onboarding screen number
 * Ensures screen number is within valid range
 *
 * @param screen - Screen number to validate
 * @returns true if screen number is valid (0-8), false otherwise
 */
export function isValidOnboardingScreen(screen: number): boolean {
  return Number.isInteger(screen) && screen >= 0 && screen < 9;
}

/**
 * Gets user-friendly onboarding status description
 * Useful for debugging and logging
 *
 * @param meta - Profile metadata from database
 * @param currentScreen - Current onboarding screen number
 * @returns Human-readable status description
 */
export function getOnboardingStatusDescription(
  meta: ProfileMeta | null,
  currentScreen: number
): string {
  if (!meta) {
    return 'No profile metadata - onboarding not started';
  }

  const isComplete = isOnboardingComplete(meta);
  const action = getOnboardingAction(meta, currentScreen);

  if (isComplete) {
    if (meta.has_completed_onboarding === true) {
      return 'Onboarding complete (explicit flag)';
    }
    if (meta.has_created_notebook === true) {
      return 'Onboarding complete (inferred from notebook creation - legacy user)';
    }
  }

  if (action === 'resume') {
    return `Onboarding in progress - at screen ${currentScreen}`;
  }

  if (action === 'start') {
    return `Onboarding not started - at screen ${currentScreen}`;
  }

  return 'Unknown onboarding status';
}
