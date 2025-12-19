/**
 * Auth Flow Constants
 */

// Email validation regex
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common email typos to check for
export const COMMON_EMAIL_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
};

// OTP configuration
export const OTP_TIMEOUT_MS = 30000; // 30 seconds
export const MIN_OTP_LENGTH = 6;
export const MAX_OTP_LENGTH = 8;

// Validation messages
export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: 'Please enter your email address',
  EMAIL_INVALID: 'Please enter a valid email address',
  EMAIL_TYPO_SUGGESTION: (typo: string, correction: string) =>
    `Did you mean ${correction} instead of ${typo}?`,
  OTP_REQUIRED: 'Please enter the code from your email',
  OTP_TOO_SHORT: `Code must be at least ${MIN_OTP_LENGTH} characters`,
  FIRST_NAME_REQUIRED: 'Please enter your first name',
  FIRST_NAME_INVALID: 'Please enter a valid first name',
  LAST_NAME_REQUIRED: 'Please enter your last name',
  NAME_CONTAINS_EMAIL: 'Please enter your name, not your email',
};

// Success messages
export const SUCCESS_MESSAGES = {
  OTP_SENT: 'Check your email for a verification code',
  NAMES_SAVED: 'Welcome! Setting up your account...',
};

// Error operation names for tracking
export const ERROR_OPERATIONS = {
  SEND_OTP: 'send_otp',
  VERIFY_OTP: 'verify_otp',
  SAVE_NAMES: 'save_names',
  SOCIAL_LOGIN: 'social_login',
} as const;

// Component name for error tracking
export const ERROR_COMPONENT = 'magic-link-auth';
