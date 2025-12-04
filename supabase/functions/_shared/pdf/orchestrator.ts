/**
 * Smart PDF Extractor Orchestrator
 * Coordinates fallback logic between Gemini and pdfjs services
 */

import type { PDFExtractionResult, PDFService } from './types.ts';
import { classifyError, shouldRetry, shouldFallback } from './error-classifier.ts';
import { GeminiService, PdfjsService, GoogleVisionPDFService } from './services.ts';
import { SERVICE_CONFIG, PDF_LIMITS, QUALITY_THRESHOLDS } from './config.ts';

export class SmartPDFExtractor {
  private services: PDFService[];

  constructor() {
    console.log('[SmartPDFExtractor] Constructor START');
    try {
      console.log('[SmartPDFExtractor] Creating GeminiService...');
      const geminiService = new GeminiService();
      console.log('[SmartPDFExtractor] GeminiService created, checking availability...');
      const geminiAvailable = geminiService.isAvailable();
      console.log('[SmartPDFExtractor] GeminiService available:', geminiAvailable);

      console.log('[SmartPDFExtractor] Creating PdfjsService...');
      const pdfjsService = new PdfjsService();
      console.log('[SmartPDFExtractor] PdfjsService created, checking availability...');
      const pdfjsAvailable = pdfjsService.isAvailable();
      console.log('[SmartPDFExtractor] PdfjsService available:', pdfjsAvailable);

      console.log('[SmartPDFExtractor] Creating GoogleVisionPDFService...');
      const googleVisionService = new GoogleVisionPDFService();
      console.log('[SmartPDFExtractor] GoogleVisionPDFService created, checking availability...');
      const googleVisionAvailable = googleVisionService.isAvailable();
      console.log('[SmartPDFExtractor] GoogleVisionPDFService available:', googleVisionAvailable);

      // Initialize services in priority order: Gemini → pdfjs → Google Vision (OCR for scanned PDFs)
      this.services = [geminiService, pdfjsService, googleVisionService].filter((s) => s.isAvailable());
      console.log('[SmartPDFExtractor] Filtered services count:', this.services.length);

      if (this.services.length === 0) {
        throw new Error(
          'No PDF extraction services available. Please configure GOOGLE_AI_API_KEY or ensure pdfjs-dist is available.'
        );
      }

      console.log(
        `[SmartPDFExtractor] Initialized with services: ${this.services.map((s) => s.name).join(', ')}`
      );
    } catch (error) {
      console.error('[SmartPDFExtractor] Constructor ERROR:', error);
      throw error;
    }
  }

  async extract(fileBuffer: Uint8Array): Promise<PDFExtractionResult> {
    // Validate PDF size
    if (fileBuffer.length > PDF_LIMITS.MAX_SIZE_BYTES) {
      throw new Error(
        `PDF too large (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB). ` +
          `Maximum size: ${PDF_LIMITS.MAX_SIZE_BYTES / 1024 / 1024}MB`
      );
    }

    // Validate PDF signature (magic bytes: %PDF)
    if (
      fileBuffer[0] !== 0x25 ||
      fileBuffer[1] !== 0x50 ||
      fileBuffer[2] !== 0x44 ||
      fileBuffer[3] !== 0x46
    ) {
      throw new Error(
        'Invalid PDF file: File header does not match PDF signature (%PDF)'
      );
    }

    const startTime = Date.now();
    const attemptLog: string[] = [];
    let lastError: Error | null = null;

    for (const service of this.services) {
      const config = SERVICE_CONFIG[service.name];

      if (!config.enabled) {
        console.log(`[SmartPDFExtractor] ${service.name} is disabled, skipping`);
        continue;
      }

      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeout);

        try {
          console.log(
            `[SmartPDFExtractor] Trying ${service.name} (timeout: ${config.timeout}ms)`
          );

          const text = await service.extract(fileBuffer, controller.signal);
          clearTimeout(timeout);

          // Validate extracted text quality
          if (!this.validateTextQuality(text)) {
            throw new Error('Low quality extraction - text validation failed');
          }

          // SUCCESS!
          const processingTime = Date.now() - startTime;
          console.log(
            `[SmartPDFExtractor] ✅ Success with ${service.name} in ${processingTime}ms`
          );

          // Determine quality based on service
          let quality: 'high' | 'medium' | 'low';
          if (service.name === 'gemini') {
            quality = 'high'; // Multimodal AI, best quality
          } else if (service.name === 'pdfjs') {
            quality = 'medium'; // Local extraction, good for text PDFs
          } else {
            quality = 'low'; // OCR fallback, scanned documents
          }

          return {
            text,
            metadata: {
              service: service.name as 'gemini' | 'pdfjs' | 'google-vision',
              processingTime,
              attemptCount: attemptLog.length + 1,
              fallbacksUsed: attemptLog,
              quality,
              pageCount: this.estimatePageCount(text),
            },
          };
        } catch (error) {
          clearTimeout(timeout);
          throw error;
        }
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message || String(error);
        attemptLog.push(`${service.name}: ${errorMsg}`);

        console.warn(`[SmartPDFExtractor] ${service.name} failed: ${errorMsg}`);

        // Classify error
        const errorType = classifyError(error, error.statusCode);
        console.log(`[SmartPDFExtractor] Error type: ${errorType}`);

        // If PERMANENT or RATE_LIMIT, skip to next service immediately
        if (shouldFallback(errorType)) {
          console.log(
            `[SmartPDFExtractor] ${errorType} error, trying next service...`
          );
          continue;
        }

        // If TRANSIENT, retry once
        if (shouldRetry(errorType) && config.maxRetries > 0) {
          console.log(
            `[SmartPDFExtractor] Transient error, retrying after ${config.retryDelay}ms...`
          );
          await this.sleep(config.retryDelay);

          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), config.timeout);

            const text = await service.extract(fileBuffer, controller.signal);
            clearTimeout(timeout);

            // Validate quality
            if (!this.validateTextQuality(text)) {
              throw new Error('Low quality extraction on retry');
            }

            // Retry succeeded!
            const processingTime = Date.now() - startTime;
            console.log(
              `[SmartPDFExtractor] ✅ Retry success with ${service.name} in ${processingTime}ms`
            );

            // Determine quality based on service
            let quality: 'high' | 'medium' | 'low';
            if (service.name === 'gemini') {
              quality = 'high';
            } else if (service.name === 'pdfjs') {
              quality = 'medium';
            } else {
              quality = 'low';
            }

            return {
              text,
              metadata: {
                service: service.name as 'gemini' | 'pdfjs' | 'google-vision',
                processingTime,
                attemptCount: attemptLog.length + 1,
                fallbacksUsed: attemptLog,
                quality,
                pageCount: this.estimatePageCount(text),
              },
            };
          } catch (retryError: any) {
            console.warn(
              `[SmartPDFExtractor] ${service.name} retry failed: ${retryError.message}`
            );
            attemptLog.push(`${service.name} (retry): ${retryError.message}`);
          }
        }

        // Continue to next service
        console.log(`[SmartPDFExtractor] Trying next service...`);
      }
    }

    // All services failed
    throw new Error(
      `All PDF extraction services failed. Attempts: ${attemptLog.join('; ')}`
    );
  }

  private validateTextQuality(text: string): boolean {
    // Check minimum length
    const trimmedText = text.trim();
    if (trimmedText.length < QUALITY_THRESHOLDS.MIN_TEXT_LENGTH) {
      console.warn(
        `[SmartPDFExtractor] Text too short: ${trimmedText.length} chars (min: ${QUALITY_THRESHOLDS.MIN_TEXT_LENGTH})`
      );
      return false;
    }

    // Check for garbage text (too many special characters)
    const specialCharCount = (trimmedText.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const specialCharRatio = specialCharCount / trimmedText.length;

    if (specialCharRatio > QUALITY_THRESHOLDS.MAX_SPECIAL_CHAR_RATIO) {
      console.warn(
        `[SmartPDFExtractor] Too many special characters: ${(specialCharRatio * 100).toFixed(1)}% (max: ${QUALITY_THRESHOLDS.MAX_SPECIAL_CHAR_RATIO * 100}%)`
      );
      return false;
    }

    // Check for repeated patterns (extraction errors)
    if (/(.)\1{20,}/.test(trimmedText)) {
      console.warn(
        '[SmartPDFExtractor] Repeated pattern detected (potential extraction error)'
      );
      return false;
    }

    return true;
  }

  private estimatePageCount(text: string): number {
    // Rough estimate: ~2000 characters per page
    return Math.max(1, Math.ceil(text.length / 2000));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
