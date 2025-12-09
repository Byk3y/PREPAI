/**
 * Smart PDF Extractor Orchestrator
 * Coordinates fallback logic between Gemini and pdfjs services
 */

import type { PDFExtractionResult, PDFService } from './types.ts';
import { classifyError, shouldRetry, shouldFallback } from './error-classifier.ts';
import { GeminiService, PdfjsService, GoogleVisionPDFService } from './services.ts';
import { SERVICE_CONFIG, PDF_LIMITS, QUALITY_THRESHOLDS, CHUNK_OCR_CONFIG } from './config.ts';
import {
  estimatePageCount,
  calculateAdaptiveTimeout,
  shouldChunkPDF,
  generatePageRanges,
} from './utils.ts';

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

      // Only instantiate Google Vision when explicitly enabled
      const services: PDFService[] = [geminiService, pdfjsService];
      if (SERVICE_CONFIG['google-vision'].enabled) {
        console.log('[SmartPDFExtractor] Google Vision enabled, creating service...');
        const googleVisionService = new GoogleVisionPDFService();
        if (googleVisionService.isAvailable()) {
          services.push(googleVisionService);
        }
      }

      // Initialize services in priority order: Gemini → pdfjs → Google Vision (if enabled)
      this.services = services.filter((s) => s.isAvailable());
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

    // Estimate page count and determine if chunking is needed
    const estimatedPages = estimatePageCount(fileBuffer);
    if (estimatedPages > PDF_LIMITS.MAX_PAGES) {
      throw new Error(
        `PDF too long (estimated ${estimatedPages} pages). Maximum allowed: ${PDF_LIMITS.MAX_PAGES} pages`
      );
    }
    const chunkingInfo = shouldChunkPDF(fileBuffer);
    
    console.log(
      `[SmartPDFExtractor] PDF info: ${estimatedPages} estimated pages, ` +
      `${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB, ` +
      `chunking: ${chunkingInfo.shouldChunk ? `yes (${chunkingInfo.chunkSize} pages/chunk)` : 'no'}`
    );

    const startTime = Date.now();
    const attemptLog: string[] = [];
    let lastError: Error | null = null;
    let timeoutHit = false;
    let lastAdaptiveTimeout = 0;
    let usedOcrChunks = 0;
    let failedChunksCount = 0;
    let actualPageCount: number | undefined;

    for (const service of this.services) {
      const config = SERVICE_CONFIG[service.name];

      if (!config.enabled) {
        console.log(`[SmartPDFExtractor] ${service.name} is disabled, skipping`);
        continue;
      }

      try {
        // Calculate adaptive timeout based on PDF size and pages
        const adaptiveTimeout = calculateAdaptiveTimeout(
          fileBuffer,
          config.timeout,
          estimatedPages
        );
        lastAdaptiveTimeout = adaptiveTimeout;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          timeoutHit = true;
          controller.abort();
        }, adaptiveTimeout);

        try {
          console.log(
            `[SmartPDFExtractor] Trying ${service.name} ` +
            `(base timeout: ${config.timeout}ms, adaptive: ${adaptiveTimeout}ms, ` +
            `estimated pages: ${estimatedPages})`
          );

          // Check if we should use chunked extraction for Gemini
          let text: string;
          if (
            service.name === 'gemini' &&
            chunkingInfo.shouldChunk &&
            'extractPageRange' in service
          ) {
            // Use chunked extraction for large PDFs
            const chunked = await this.extractChunked(
              service as any,
              fileBuffer,
              chunkingInfo.chunkSize,
              controller.signal
            );
            text = chunked.text;
            // Replace estimated pages with actual count when available
            if (chunked.pageCount) {
              actualPageCount = chunked.pageCount;
              (service as any).__lastPageCount = chunked.pageCount;
            }
            failedChunksCount = chunked.failedChunks;
            usedOcrChunks = chunked.usedOcrChunks;
          } else {
            // Standard extraction
            text = await service.extract(fileBuffer, controller.signal);
          }
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
              pageCount:
                (service as any).__lastPageCount ??
                actualPageCount ??
                estimatedPages, // Prefer actual when available
              timeoutHit: timeoutHit || undefined,
              adaptiveTimeoutMs: lastAdaptiveTimeout || undefined,
              failedChunks: failedChunksCount || undefined,
              usedOcrChunks: usedOcrChunks || undefined,
              actualPageCount: actualPageCount ?? undefined,
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
            // Use adaptive timeout for retry as well
            const adaptiveTimeout = calculateAdaptiveTimeout(
              fileBuffer,
              config.timeout
            );
          lastAdaptiveTimeout = adaptiveTimeout;
            
            const controller = new AbortController();
          const timeout = setTimeout(() => {
            timeoutHit = true;
            controller.abort();
          }, adaptiveTimeout);

            // Check if we should use chunked extraction for retry as well
            let text: string;
            if (
              service.name === 'gemini' &&
              chunkingInfo.shouldChunk &&
              'extractPageRange' in service
            ) {
              // Use chunked extraction for large PDFs on retry
              const chunked = await this.extractChunked(
                service as any,
                fileBuffer,
                chunkingInfo.chunkSize,
                controller.signal
              );
              text = chunked.text;
              if (chunked.pageCount) {
                actualPageCount = chunked.pageCount;
                (service as any).__lastPageCount = chunked.pageCount;
              }
              failedChunksCount = chunked.failedChunks;
              usedOcrChunks = chunked.usedOcrChunks;
            } else {
              // Standard extraction
              text = await service.extract(fileBuffer, controller.signal);
            }
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
                pageCount:
                  (service as any).__lastPageCount ??
                  actualPageCount ??
                  estimatedPages, // Prefer actual when available
                timeoutHit: timeoutHit || undefined,
                adaptiveTimeoutMs: lastAdaptiveTimeout || undefined,
                failedChunks: failedChunksCount || undefined,
                usedOcrChunks: usedOcrChunks || undefined,
                actualPageCount: actualPageCount ?? undefined,
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

  /**
   * Extract PDF using chunked approach (for large PDFs with Gemini)
   * Processes PDF in page ranges and merges results
   */
  private async extractChunked(
    geminiService: any,
    fileBuffer: Uint8Array,
    chunkSize: number,
    signal: AbortSignal
  ): Promise<{ text: string; pageCount: number; failedChunks: number; usedOcrChunks: number }> {
    console.log(
      `[SmartPDFExtractor] Starting chunked extraction with ${chunkSize} pages per chunk`
    );

    // First, get actual page count using pdfjs
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    } else {
      (pdfjsLib as any).GlobalWorkerOptions = { workerSrc: '' };
    }

    const loadingTask = pdfjsLib.getDocument({
      data: fileBuffer,
      useSystemFonts: true,
      disableFontFace: true,
      useWorkerFetch: false,
      isEvalSupported: false,
      verbosity: 0,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    if (totalPages > PDF_LIMITS.MAX_PAGES) {
      throw new Error(
        `PDF has ${totalPages} pages which exceeds limit of ${PDF_LIMITS.MAX_PAGES}`
      );
    }

    console.log(
      `[SmartPDFExtractor] PDF has ${totalPages} pages, processing in chunks`
    );

    // Generate page ranges
    const pageRanges = generatePageRanges(totalPages, chunkSize);
    const textChunks: string[] = [];
    let failedChunks = 0;
    let usedOcrChunks = 0;
    let ocrPagesBudget = CHUNK_OCR_CONFIG.MAX_PAGES;

    // Process each chunk
    for (let i = 0; i < pageRanges.length; i++) {
      const range = pageRanges[i];
      
      if (signal.aborted) {
        throw new Error('Chunked extraction aborted');
      }

      console.log(
        `[SmartPDFExtractor] Processing chunk ${i + 1}/${pageRanges.length} ` +
        `(pages ${range.start}-${range.end})`
      );

      try {
        let chunkText = await this.extractChunkWithRetry(
          geminiService,
          pdf,
          fileBuffer,
          range.start,
          range.end,
          signal
        );

        // If chunk looks too short/low-quality, attempt OCR fallback with Gemini (scoped to chunk pages)
        const needsOcr =
          CHUNK_OCR_CONFIG.ENABLED &&
          chunkText.trim().length < CHUNK_OCR_CONFIG.MIN_TEXT_LENGTH &&
          usedOcrChunks < CHUNK_OCR_CONFIG.MAX_CHUNKS &&
          (range.end - range.start + 1) <= ocrPagesBudget;

        if (needsOcr) {
          try {
            const ocrText = await this.ocrChunkWithGemini(
              geminiService,
              fileBuffer,
              range.start,
              range.end,
              signal
            );
            if (ocrText && ocrText.trim().length >= CHUNK_OCR_CONFIG.MIN_TEXT_LENGTH) {
              chunkText = ocrText;
              usedOcrChunks += 1;
              ocrPagesBudget -= (range.end - range.start + 1);
            }
          } catch (ocrErr: any) {
            console.warn(
              `[SmartPDFExtractor] OCR fallback failed for chunk ${i + 1}: ${ocrErr.message}`
            );
          }
        }

        if (chunkText && chunkText.trim().length > 0) {
          // Add page markers for context
          textChunks.push(
            `\n\n--- Page ${range.start}-${range.end} ---\n\n${chunkText}`
          );
        } else {
          console.warn(
            `[SmartPDFExtractor] Chunk ${i + 1} returned empty text`
          );
          failedChunks += 1;
        }
      } catch (chunkError: any) {
        console.error(
          `[SmartPDFExtractor] Error processing chunk ${i + 1}: ${chunkError.message}`
        );
        // Continue with other chunks even if one fails
        // Add placeholder to maintain page order
        textChunks.push(
          `\n\n--- Page ${range.start}-${range.end} (extraction failed) ---\n\n`
        );
        failedChunks += 1;
      }

      // Small delay between chunks to avoid rate limits
      if (i < pageRanges.length - 1) {
        await this.sleep(500); // 500ms delay between chunks
      }
    }

    // Merge all chunks
    const mergedText = textChunks.join('\n\n').trim();

    console.log(
      `[SmartPDFExtractor] Chunked extraction complete: ` +
      `${mergedText.length} characters from ${pageRanges.length} chunks`
    );

    // If too many chunks failed, abort
    if (failedChunks === pageRanges.length || failedChunks / pageRanges.length > 0.25) {
      throw new Error(
        `Chunked extraction failed for ${failedChunks}/${pageRanges.length} chunks`
      );
    }

    // Validate merged text quality
    if (!this.validateTextQuality(mergedText)) {
      throw new Error(
        `Chunked extraction failed quality validation: ` +
        `merged text too short or low quality (${mergedText.length} chars)`
      );
    }

    return { text: mergedText, pageCount: totalPages, failedChunks: failedChunks, usedOcrChunks };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async extractChunkWithRetry(
    geminiService: any,
    pdf: any,
    fileBuffer: Uint8Array,
    start: number,
    end: number,
    signal: AbortSignal
  ): Promise<string> {
    const maxAttempts = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Prefer shared-document path
        if (typeof geminiService.extractPageRangeWithDocument === 'function') {
          return await geminiService.extractPageRangeWithDocument(
            pdf,
            start,
            end,
            signal
          );
        }

        return await geminiService.extractPageRange(
          fileBuffer,
          start,
          end,
          signal
        );
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxAttempts - 1) {
          console.warn(
            `[SmartPDFExtractor] Chunk ${start}-${end} attempt ${attempt + 1} failed, retrying...`
          );
          await this.sleep(300);
        }
      }
    }

    throw lastError ?? new Error('Unknown chunk extraction error');
  }

  private async ocrChunkWithGemini(
    geminiService: any,
    fileBuffer: Uint8Array,
    start: number,
    end: number,
    signal: AbortSignal
  ): Promise<string> {
    if (typeof geminiService.ocrPageRange === 'function') {
      return await geminiService.ocrPageRange(fileBuffer, start, end, signal);
    }
    throw new Error('Gemini OCR not available for chunk');
  }
}
