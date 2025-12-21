/**
 * OAuth Token Validator
 * Validates access and refresh tokens before using them with Supabase
 * Prevents injection attacks and malformed token errors
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an OAuth access token (JWT format)
 *
 * @param token - The access token to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateAccessToken(token: string | null | undefined): ValidationResult {
  // Check for null/undefined
  if (!token || typeof token !== 'string') {
    return { isValid: false, error: 'Access token is required' };
  }

  // Trim whitespace
  const trimmedToken = token.trim();
  if (trimmedToken === '') {
    return { isValid: false, error: 'Access token cannot be empty' };
  }

  // JWT format validation: header.payload.signature
  const parts = trimmedToken.split('.');
  if (parts.length !== 3) {
    return { isValid: false, error: 'Invalid JWT format - expected 3 parts separated by dots' };
  }

  // Validate each part is valid base64url
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i] || parts[i].length === 0) {
      return { isValid: false, error: `JWT part ${i + 1} is empty` };
    }
    if (!base64UrlPattern.test(parts[i])) {
      return { isValid: false, error: `JWT part ${i + 1} contains invalid characters` };
    }
  }

  // Length validation (typical JWT: 100-4000 chars, reject suspiciously short/long)
  if (trimmedToken.length < 50) {
    return { isValid: false, error: 'Access token is suspiciously short' };
  }
  if (trimmedToken.length > 4000) {
    return { isValid: false, error: 'Access token is suspiciously long' };
  }

  return { isValid: true };
}

/**
 * Validates an OAuth refresh token
 * Can be either JWT format, UUID format, or an opaque random string depending on provider/version
 *
 * @param token - The refresh token to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateRefreshToken(token: string | null | undefined): ValidationResult {
  // Check for null/undefined
  if (!token || typeof token !== 'string') {
    return { isValid: false, error: 'Refresh token is required' };
  }

  // Trim whitespace
  const trimmedToken = token.trim();
  if (trimmedToken === '') {
    return { isValid: false, error: 'Refresh token cannot be empty' };
  }

  // Check format: UUID (36 chars with dashes), JWT (3 parts), or Opaque String (alphanumeric)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedToken);
  const isJwt = trimmedToken.split('.').length === 3;

  // Newer Supabase tokens are short random strings (often 12-40 chars)
  // We allow alphanumeric and some special characters commonly used in tokens
  const isOpaque = /^[A-Za-z0-9._~-]+$/.test(trimmedToken);

  if (!isUuid && !isJwt && !isOpaque) {
    return { isValid: false, error: 'Invalid format - expected UUID, JWT, or valid token string' };
  }

  // If JWT format, validate it
  if (isJwt) {
    const jwtValidation = validateAccessToken(trimmedToken);
    if (!jwtValidation.isValid) {
      return { isValid: false, error: `JWT refresh token validation failed: ${jwtValidation.error}` };
    }
  }

  // Length validation
  // Newer Supabase tokens are shorter (e.g. 12 characters).
  // We use 10 as a safe lower bound.
  if (trimmedToken.length < 10) {
    return { isValid: false, error: 'Refresh token is suspiciously short' };
  }
  if (trimmedToken.length > 4000) {
    return { isValid: false, error: 'Refresh token is suspiciously long' };
  }

  return { isValid: true };
}

/**
 * Validates both access and refresh tokens together
 * Convenience function for validating a complete token pair
 *
 * @param accessToken - The access token to validate
 * @param refreshToken - The refresh token to validate
 * @returns Validation result - fails if either token is invalid
 */
export function validateTokens(
  accessToken: string | null | undefined,
  refreshToken: string | null | undefined
): ValidationResult {
  // Validate access token first
  const accessResult = validateAccessToken(accessToken);
  if (!accessResult.isValid) {
    return { isValid: false, error: `Access token invalid: ${accessResult.error}` };
  }

  // Validate refresh token
  const refreshResult = validateRefreshToken(refreshToken);
  if (!refreshResult.isValid) {
    return { isValid: false, error: `Refresh token invalid: ${refreshResult.error}` };
  }

  return { isValid: true };
}

/**
 * Sanitizes a token for safe logging
 * Returns only the first and last 4 characters, with middle replaced by asterisks
 *
 * @param token - The token to sanitize
 * @returns Sanitized token string safe for logging
 */
export function sanitizeTokenForLogging(token: string | null | undefined): string {
  if (!token || typeof token !== 'string' || token.length < 12) {
    return '[invalid token]';
  }

  const firstFour = token.substring(0, 4);
  const lastFour = token.substring(token.length - 4);
  const middleLength = Math.min(token.length - 8, 20); // Cap asterisks at 20
  const middle = '*'.repeat(middleLength);

  return `${firstFour}${middle}${lastFour}`;
}
