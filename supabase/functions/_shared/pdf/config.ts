/**
 * PDF Service Configuration
 * Timeouts, retry delays, and limits for each service
 */

import type { ServiceConfig } from './types.ts';

export const SERVICE_CONFIG: Record<string, ServiceConfig> = {
  gemini: {
    timeout: 30000, // 30s for AI processing
    maxRetries: 1,
    retryDelay: 2000, // 2s between retries
    enabled: Deno.env.get('DISABLE_GEMINI') !== 'true',
  },
  pdfjs: {
    timeout: 10000, // 10s for local extraction
    maxRetries: 0, // No retry for local processing
    retryDelay: 0,
    enabled: true, // Always available as fallback
  },
  'google-vision': {
    timeout: 45000, // 45s for OCR processing (slower than Gemini)
    maxRetries: 1,
    retryDelay: 2000, // 2s between retries
    enabled: Deno.env.get('DISABLE_GOOGLE_VISION') !== 'true',
  },
};

// PDF size and page limits
export const PDF_LIMITS = {
  MAX_SIZE_BYTES: parseInt(Deno.env.get('MAX_PDF_SIZE_MB') || '50') * 1024 * 1024, // 50MB default
  MAX_PAGES: parseInt(Deno.env.get('MAX_PDF_PAGES') || '1000'), // 1000 pages default
};

// Text quality validation
export const QUALITY_THRESHOLDS = {
  MIN_TEXT_LENGTH: 10, // Minimum 10 characters
  MAX_SPECIAL_CHAR_RATIO: 0.5, // Max 50% special characters (garbage detection)
};
