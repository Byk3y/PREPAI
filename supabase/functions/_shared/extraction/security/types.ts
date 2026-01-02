/**
 * Security Module Types
 * Types for URL validation and SSRF prevention
 */

/**
 * URL Security Validation Result
 */
export interface UrlValidationResult {
  allowed: boolean;
  reason?: string;
}
