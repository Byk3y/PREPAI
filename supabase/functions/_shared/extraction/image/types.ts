/**
 * Image OCR Module Types
 * Types and interfaces for Optical Character Recognition
 */

import type { OCRResult } from '../common/types.ts';

// Re-export for backward compatibility
export type { OCRResult };

/**
 * OCR engine type
 */
export type OCREngine = 'gemini' | 'google-vision' | 'tesseract';

/**
 * OCR service interface
 * All OCR services must implement this interface
 */
export interface OCRService {
  name: OCREngine;
  ocr(fileBuffer: Uint8Array, confidenceThreshold: number): Promise<OCRResult>;
  isAvailable(): boolean;
}

/**
 * Options for image text extraction
 */
export interface ExtractImageTextOptions {
  useGoogleVision?: boolean; // default: false (use Gemini)
  confidenceThreshold?: number; // default: 70
}
