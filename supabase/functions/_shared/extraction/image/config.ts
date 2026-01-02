/**
 * Image OCR Configuration
 * Configuration for OCR services (Gemini, Google Vision, Tesseract)
 */

import { getRequiredEnv } from '../../env.ts';

/**
 * Configuration for OCR services
 */
export const OCR_CONFIG = {
  gemini: {
    enabled: true,
    apiKeyEnvVar: 'GOOGLE_AI_API_KEY',
    model: 'gemini-2.0-flash',
    baseConfidence: 90,
    temperature: 0.1,
    topP: 1,
    topK: 32,
    maxOutputTokens: 4096,
    systemPrompt:
      'Extract all text from this image. Return only the extracted text without any commentary or explanation. If there is no text, respond with "No text detected".',
  },
  googleVision: {
    enabled: true,
    apiKeyEnvVar: 'GOOGLE_VISION_API_KEY',
    baseConfidence: 85,
  },
  tesseract: {
    enabled: false, // Not compatible with Deno Edge Functions
  },
} as const;

/**
 * Get API key for Gemini OCR
 */
export function getGeminiApiKey(): string {
  return getRequiredEnv(OCR_CONFIG.gemini.apiKeyEnvVar);
}

/**
 * Get API key for Google Vision OCR
 */
export function getGoogleVisionApiKey(): string {
  return getRequiredEnv(OCR_CONFIG.googleVision.apiKeyEnvVar);
}
