/**
 * Shared Constants for Content Extraction
 * Common configuration values used across extraction modules
 */

/**
 * Chunk size for base64 conversion to avoid stack overflow
 * Used in bufferToBase64() utility function
 */
export const BASE64_CHUNK_SIZE = 8192;

/**
 * Default confidence threshold for OCR quality assessment
 * Values below this threshold are marked as low quality
 */
export const DEFAULT_OCR_CONFIDENCE_THRESHOLD = 70;

/**
 * Minimum text length for valid OCR results
 * Results shorter than this may trigger warnings
 */
export const MIN_OCR_TEXT_LENGTH = 10;

/**
 * Minimum website content length
 * Content shorter than this is considered insufficient
 */
export const MIN_WEBSITE_CONTENT_LENGTH = 50;
