/**
 * Input Validation and Sanitization Utilities
 * Comprehensive validation for security-critical inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: any;
}

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return UUID_REGEX.test(id);
}

/**
 * Validate and sanitize a string input
 * @param value - Input string to validate
 * @param options - Validation options
 */
export function validateString(
  value: any,
  options: {
    fieldName: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    allowNewlines?: boolean;
  }
): ValidationResult {
  const { fieldName, required = true, minLength, maxLength, allowNewlines = true } = options;

  // Type check
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmed = value.trim();

  // Required check
  if (required && trimmed.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  // Min length check
  if (minLength !== undefined && trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  // Max length check
  if (maxLength !== undefined && trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at most ${maxLength} characters`,
    };
  }

  // Newline check (for single-line inputs)
  if (!allowNewlines && /[\n\r]/.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} cannot contain line breaks`,
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
}

/**
 * Validate UUID
 */
export function validateUUID(value: any, fieldName: string): ValidationResult {
  if (!value || typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be a valid UUID`,
    };
  }

  if (!isValidUUID(value)) {
    return {
      isValid: false,
      error: `${fieldName} has invalid UUID format`,
    };
  }

  return {
    isValid: true,
    sanitized: value.toLowerCase(),
  };
}

/**
 * Validate array of UUIDs
 * @param value - Array to validate
 * @param options - Validation options
 */
export function validateUUIDArray(
  value: any,
  options: {
    fieldName: string;
    required?: boolean;
    minItems?: number;
    maxItems?: number;
  }
): ValidationResult {
  const { fieldName, required = false, minItems, maxItems } = options;

  // Type check
  if (!Array.isArray(value)) {
    if (!required && !value) {
      return { isValid: true, sanitized: [] };
    }
    return {
      isValid: false,
      error: `${fieldName} must be an array`,
    };
  }

  // Required check
  if (required && value.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty`,
    };
  }

  // Min items check
  if (minItems !== undefined && value.length < minItems) {
    return {
      isValid: false,
      error: `${fieldName} must contain at least ${minItems} items`,
    };
  }

  // Max items check
  if (maxItems !== undefined && value.length > maxItems) {
    return {
      isValid: false,
      error: `${fieldName} cannot contain more than ${maxItems} items`,
    };
  }

  // Validate each UUID
  for (let i = 0; i < value.length; i++) {
    if (!isValidUUID(value[i])) {
      return {
        isValid: false,
        error: `${fieldName}[${i}] is not a valid UUID`,
      };
    }
  }

  return {
    isValid: true,
    sanitized: value.map((id: string) => id.toLowerCase()),
  };
}

/**
 * Validate content_type enum
 */
export function validateContentType(value: any): ValidationResult {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'content_type must be a string',
    };
  }

  const normalized = value.toLowerCase().trim();
  const validTypes = ['flashcards', 'quiz'];

  if (!validTypes.includes(normalized)) {
    return {
      isValid: false,
      error: 'content_type must be "flashcards" or "quiz"',
    };
  }

  return {
    isValid: true,
    sanitized: normalized as 'flashcards' | 'quiz',
  };
}
