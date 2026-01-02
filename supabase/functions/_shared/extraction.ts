/**
 * Content Extraction Utilities - Barrel Export
 *
 * This file maintains backward compatibility by re-exporting all extraction functions.
 * The actual implementations have been modularized into subdirectories:
 * - extraction/image/ - Image OCR functionality
 * - extraction/audio/ - Audio transcription
 * - extraction/website/ - Website content extraction
 * - extraction/security/ - URL validation
 * - extraction/common/ - Shared utilities and types
 */

// Import SmartPDFExtractor statically (dynamic imports don't get bundled)
import { SmartPDFExtractor } from './pdf/orchestrator.ts';

/**
 * Extract text from PDF file using Smart PDF Extractor
 * - Primary: Gemini 2.0 Flash (multimodal AI, NotebookLM-grade)
 * - Fallback: pdfjs-dist (local extraction)
 * - Intelligent fallback on rate limits or errors
 */
export async function extractPDF(fileBuffer: Uint8Array): Promise<string> {
  console.log('[extractPDF] START - Buffer size:', fileBuffer.length);
  const startTime = Date.now();

  // SECURITY: Validate file magic bytes to ensure it's actually a PDF
  const { validateFileMagicBytes } = await import('./validation.ts');
  const fileValidation = validateFileMagicBytes(fileBuffer, 'pdf');
  if (!fileValidation.isValid) {
    console.error(
      '[extractPDF] SECURITY: File magic byte validation failed:',
      fileValidation.error
    );
    throw new Error(fileValidation.error || 'Invalid PDF file');
  }
  console.log('[extractPDF] File magic bytes validated - confirmed PDF');

  try {
    console.log('[extractPDF] Importing SmartPDFExtractor...');
    // Use SmartPDFExtractor with Gemini → pdfjs fallback
    const extractor = new SmartPDFExtractor();
    console.log('[extractPDF] SmartPDFExtractor initialized successfully');

    console.log('[extractPDF] Starting extraction...');
    const result = await extractor.extract(fileBuffer);
    console.log('[extractPDF] Extraction completed successfully');

    const processingTime = Date.now() - startTime;
    console.log(
      `[extractPDF] SUCCESS: ${result.text.length} chars extracted in ${processingTime}ms ` +
        `using ${result.metadata.service} (quality: ${result.metadata.quality}, ` +
        `attempts: ${result.metadata.attemptCount})`
    );

    // Log fallbacks for monitoring
    if (result.metadata.fallbacksUsed.length > 0) {
      console.warn('[extractPDF] Fallbacks used:', result.metadata.fallbacksUsed);
    }

    return result.text;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('[extractPDF] ERROR:', errorMsg);
    console.error('[extractPDF] ERROR STACK:', errorStack);
    console.error('[extractPDF] ERROR OBJECT:', JSON.stringify(error, null, 2));
    throw new Error(`PDF extraction error: ${errorMsg}`);
  }
}

// ========================================
// Image OCR
// ========================================

export { extractImageText } from './extraction/image/orchestrator.ts';
export type { OCRResult } from './extraction/common/types.ts';

// ========================================
// Audio Transcription
// ========================================

export { transcribeAudio } from './extraction/audio/transcriber.ts';

// ========================================
// Website Content Extraction
// ========================================

export { extractWebsiteContent } from './extraction/website/orchestrator.ts';
export type { WebsiteExtractionResult } from './extraction/common/types.ts';

// ========================================
// Security Validation
// ========================================

export { validateUrlSecurity } from './extraction/security/url-validator.ts';
export type { UrlValidationResult } from './extraction/security/types.ts';
