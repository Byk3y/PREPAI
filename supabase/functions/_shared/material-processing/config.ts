/**
 * Configuration constants for material processing
 */

/**
 * Preview generation configuration
 */
export const PREVIEW_CONFIG = {
  // Security: Reduced from 200k to 50k for LLM input sanitization
  MAX_CONTENT_LENGTH: 50000,

  // Overview word count constraints (elastic to avoid infinite retry loops)
  MIN_OVERVIEW_WORDS: 40,
  MAX_OVERVIEW_WORDS: 130,

  // Title constraints
  MAX_TITLE_LENGTH: 60,

  // Suggested questions constraints
  MAX_QUESTIONS: 10,
  MAX_QUESTION_LENGTH: 300,

  // LLM parameters
  TEMPERATURE: 0.6,
  MAX_RETRIES: 2,
} as const;

/**
 * Large PDF detection configuration
 * PDFs exceeding these thresholds are processed in background
 */
export const LARGE_PDF_CONFIG = {
  // Page count threshold - lowered from 50 to 20 for better UX
  THRESHOLD_PAGES: 20,

  // File size threshold - lowered from 10MB to 5MB for better UX
  THRESHOLD_BYTES: 5 * 1024 * 1024, // 5MB

  // Size threshold for checking page count (2MB)
  // PDFs over this size get page count estimation via range request
  SIZE_CHECK_THRESHOLD_BYTES: 2 * 1024 * 1024, // 2MB

  // Range request size for page estimation
  RANGE_REQUEST_BYTES: 1024, // 1KB
} as const;
