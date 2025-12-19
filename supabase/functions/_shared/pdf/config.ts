/**
 * PDF Service Configuration
 * Timeouts, retry delays, and limits for each service
 *
 * Note: Timeouts are base values - actual timeouts are calculated adaptively
 * based on PDF size and page count using calculateAdaptiveTimeout()
 */

import type { ServiceConfig, ServiceName } from './types.ts';
import { getOptionalEnv } from '../env.ts';

export const SERVICE_CONFIG: Record<ServiceName, ServiceConfig> = {
  gemini: {
    timeout: 60000, // Base 60s for AI processing (will be increased adaptively for large PDFs)
    maxRetries: 1,
    retryDelay: 2000, // 2s between retries
    enabled: getOptionalEnv('DISABLE_GEMINI', '') !== 'true',
  },
  pdfjs: {
    timeout: 30000, // Base 30s for local extraction (increased from 10s for large PDFs)
    maxRetries: 0, // No retry for local processing
    retryDelay: 0,
    enabled: true, // Always available as fallback
  },
  'google-vision': {
    timeout: 45000, // 45s for OCR processing (slower than Gemini)
    maxRetries: 1,
    retryDelay: 2000, // 2s between retries
    enabled: getOptionalEnv('DISABLE_GOOGLE_VISION', '') !== 'true',
  },
};

// PDF size and page limits
export const PDF_LIMITS = {
  MAX_SIZE_BYTES: parseInt(getOptionalEnv('MAX_PDF_SIZE_MB', '50')) * 1024 * 1024, // 50MB default
  MAX_PAGES: parseInt(getOptionalEnv('MAX_PDF_PAGES', '1000')), // 1000 pages default
};

// Edge function timeout cap (leave headroom from 150s free / 400s paid)
export const EDGE_TIMEOUT_CAP_MS = parseInt(
  getOptionalEnv('EDGE_TIMEOUT_CAP_MS', '140000')
);

// Chunk OCR controls
export const CHUNK_OCR_CONFIG = {
  ENABLED: getOptionalEnv('CHUNK_OCR_ENABLED', '') === 'true',
  MIN_TEXT_LENGTH: parseInt(getOptionalEnv('CHUNK_OCR_MIN_CHARS', '200')),
  MAX_CHUNKS: parseInt(getOptionalEnv('CHUNK_OCR_MAX_CHUNKS', '8')),
  MAX_PAGES: parseInt(getOptionalEnv('CHUNK_OCR_MAX_PAGES', '80')),
};

// Text quality validation
export const QUALITY_THRESHOLDS = {
  MIN_TEXT_LENGTH: 10, // Minimum 10 characters
  MAX_SPECIAL_CHAR_RATIO: 0.5, // Max 50% special characters (garbage detection)
};
