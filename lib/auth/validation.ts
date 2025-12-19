/**
 * Auth Flow Validation Utilities
 */

import {
  EMAIL_REGEX,
  COMMON_EMAIL_TYPOS,
  MIN_OTP_LENGTH,
  VALIDATION_MESSAGES,
} from './constants';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Validates email address
 * Checks for:
 * - Empty/whitespace
 * - Valid format
 * - Common typos
 */
export function validateEmail(email: string): ValidationResult {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return {
      valid: false,
      error: VALIDATION_MESSAGES.EMAIL_REQUIRED,
    };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      valid: false,
      error: VALIDATION_MESSAGES.EMAIL_INVALID,
    };
  }

  // Check for common typos
  const domain = trimmedEmail.split('@')[1];
  if (domain && COMMON_EMAIL_TYPOS[domain]) {
    const suggestedEmail = trimmedEmail.replace(domain, COMMON_EMAIL_TYPOS[domain]);
    return {
      valid: true, // Still valid, just provide a suggestion
      suggestion: VALIDATION_MESSAGES.EMAIL_TYPO_SUGGESTION(domain, COMMON_EMAIL_TYPOS[domain]),
    };
  }

  return { valid: true };
}

/**
 * Validates OTP code
 * Checks for:
 * - Empty/whitespace
 * - Minimum length
 */
export function validateOTP(otp: string): ValidationResult {
  const trimmedOTP = otp.trim();

  if (!trimmedOTP) {
    return {
      valid: false,
      error: VALIDATION_MESSAGES.OTP_REQUIRED,
    };
  }

  if (trimmedOTP.length < MIN_OTP_LENGTH) {
    return {
      valid: false,
      error: VALIDATION_MESSAGES.OTP_TOO_SHORT,
    };
  }

  return { valid: true };
}

/**
 * Validates a name field (first name or last name)
 * Checks for:
 * - Empty/whitespace
 * - Contains @ symbol (likely email instead of name)
 */
export function validateName(name: string, fieldName: 'first' | 'last'): ValidationResult {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      valid: false,
      error:
        fieldName === 'first'
          ? VALIDATION_MESSAGES.FIRST_NAME_REQUIRED
          : VALIDATION_MESSAGES.LAST_NAME_REQUIRED,
    };
  }

  // Check if name contains @ (likely email)
  if (trimmedName.includes('@')) {
    return {
      valid: false,
      error: VALIDATION_MESSAGES.NAME_CONTAINS_EMAIL,
    };
  }

  return { valid: true };
}

/**
 * Validates both first and last names together
 */
export function validateNames(
  firstName: string,
  lastName: string
): { valid: boolean; errors: { firstName?: string; lastName?: string } } {
  const firstNameResult = validateName(firstName, 'first');
  const lastNameResult = validateName(lastName, 'last');

  return {
    valid: firstNameResult.valid && lastNameResult.valid,
    errors: {
      firstName: firstNameResult.error,
      lastName: lastNameResult.error,
    },
  };
}
