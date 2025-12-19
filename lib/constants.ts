/**
 * App-wide Constants
 * Centralized configuration for URLs, app settings, and other constants
 */

/**
 * External URLs
 */
export const APP_URLS = {
  TERMS: 'https://prepai.app/terms',
  PRIVACY: 'https://prepai.app/privacy',
  WEBSITE: 'https://prepai.app',
} as const;

/**
 * App Configuration
 */
export const APP_CONFIG = {
  APP_NAME: 'PrepAI',
  SUPPORT_EMAIL: 'support@prepai.app',
} as const;

/**
 * Subscription & Trial Constants
 */
export const SUBSCRIPTION_CONSTANTS = {
  LIMITED_ACCESS_NOTEBOOK_COUNT: 3,
  LOCKED_NOTEBOOK_OVERLAY_DELAY_MS: 2500,
  TRIAL_REMINDER_DAYS_THRESHOLD: 3,
  TRIAL_REMINDER_DISMISSED_KEY: 'trial_reminder_dismissed',
  TRIAL_EXPIRED_MODAL_SHOWN_KEY: 'trial_expired_modal_shown',
} as const;





