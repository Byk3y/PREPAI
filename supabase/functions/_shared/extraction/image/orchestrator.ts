/**
 * Image OCR Orchestrator
 * Main entry point for image text extraction
 */

import type { OCRResult, ExtractImageTextOptions } from './types.ts';
import { GeminiOCRService, GoogleVisionOCRService } from './services.ts';
import { DEFAULT_OCR_CONFIDENCE_THRESHOLD } from '../common/constants.ts';

/**
 * Extract text from image using OCR
 * Primary: Gemini 2.0 Flash (multimodal AI, same as PDF extraction)
 * Fallback: Google Vision API (if explicitly requested)
 */
export async function extractImageText(
  fileBuffer: Uint8Array,
  options: ExtractImageTextOptions = {}
): Promise<OCRResult> {
  const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_OCR_CONFIDENCE_THRESHOLD;

  // SECURITY: Validate file magic bytes to ensure it's actually an image
  const { validateFileMagicBytes } = await import('../../validation.ts');
  const fileValidation = validateFileMagicBytes(fileBuffer, 'image');
  if (!fileValidation.isValid) {
    console.error(
      '[extractImageText] SECURITY: File magic byte validation failed:',
      fileValidation.error
    );
    throw new Error(fileValidation.error || 'Invalid image file');
  }
  console.log(
    '[extractImageText] File magic bytes validated - confirmed image:',
    fileValidation.detectedType
  );

  if (options.useGoogleVision) {
    // Google Vision OCR (fallback option)
    const service = new GoogleVisionOCRService();
    return await service.ocr(fileBuffer, confidenceThreshold);
  } else {
    // Gemini OCR (primary - multimodal AI)
    const service = new GeminiOCRService();
    return await service.ocr(fileBuffer, confidenceThreshold);
  }
}
