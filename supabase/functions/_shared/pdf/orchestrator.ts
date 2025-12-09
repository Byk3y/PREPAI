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

/**
 * Context for tracking extraction state across attempts
 */
interface ExtractionContext {
  startTime: number;
  attemptLog: string[];
  timeoutHit: boolean;
  lastAdaptiveTimeout: number;
  usedOcrChunks: number;
  failedChunksCount: number;
  actualPageCount: number | undefined;
  estimatedPages: number;
}

/**
 * Result from a single extraction attempt
 */
interface AttemptResult {
  text: string;
  actualPageCount?: number;
  failedChunks: number;
  usedOcrChunks: number;
}

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
    // Validate PDF
    this.validatePDF(fileBuffer);

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

    // Initialize extraction context
    const ctx: ExtractionContext = {
      startTime: Date.now(),
      attemptLog: [],
      timeoutHit: false,
      lastAdaptiveTimeout: 0,
      usedOcrChunks: 0,
      failedChunksCount: 0,
      actualPageCount: undefined,
      estimatedPages,
    };

    for (const service of this.services) {
      const config = SERVICE_CONFIG[service.name];

      if (!config.enabled) {
        console.log(`[SmartPDFExtractor] ${service.name} is disabled, skipping`);
        continue;
      }

      // Try initial extraction
      const result = await this.tryServiceExtraction(
        service,
        fileBuffer,
        chunkingInfo,
        config,
        ctx,
        false // not a retry
      );

      if (result) {
        return result;
      }

      // If transient error, retry once
      const lastError = ctx.attemptLog[ctx.attemptLog.length - 1];
      const errorType = classifyError({ message: lastError }, undefined);

      if (shouldRetry(errorType) && config.maxRetries > 0) {
        console.log(
          `[SmartPDFExtractor] Transient error, retrying after ${config.retryDelay}ms...`
        );
        await this.sleep(config.retryDelay);

        const retryResult = await this.tryServiceExtraction(
          service,
          fileBuffer,
          chunkingInfo,
          config,
          ctx,
          true // is a retry
        );

        if (retryResult) {
          return retryResult;
        }
      }

      // Continue to next service
      console.log(`[SmartPDFExtractor] Trying next service...`);
    }

    // All services failed
    throw new Error(
      `All PDF extraction services failed. Attempts: ${ctx.attemptLog.join('; ')}`
    );
  }

  /**
   * Validate PDF file (size and signature)
   */
  private validatePDF(fileBuffer: Uint8Array): void {
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
  }

  /**
   * Attempt extraction with a single service
   * Returns PDFExtractionResult on success, null on failure
   */
  private async tryServiceExtraction(
    service: PDFService,
    fileBuffer: Uint8Array,
    chunkingInfo: { shouldChunk: boolean; chunkSize: number },
    config: { timeout: number; maxRetries: number; retryDelay: number },
    ctx: ExtractionContext,
    isRetry: boolean
  ): Promise<PDFExtractionResult | null> {
    try {
      // Calculate adaptive timeout based on PDF size and pages
      const adaptiveTimeout = calculateAdaptiveTimeout(
        fileBuffer,
        config.timeout,
        ctx.estimatedPages
      );
      ctx.lastAdaptiveTimeout = adaptiveTimeout;

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        ctx.timeoutHit = true;
        controller.abort();
      }, adaptiveTimeout);

      try {
        const attemptType = isRetry ? 'Retrying' : 'Trying';
        console.log(
          `[SmartPDFExtractor] ${attemptType} ${service.name} ` +
            `(base timeout: ${config.timeout}ms, adaptive: ${adaptiveTimeout}ms, ` +
            `estimated pages: ${ctx.estimatedPages})`
        );

        // Perform extraction (chunked or standard)
        const attemptResult = await this.performExtraction(
          service,
          fileBuffer,
          chunkingInfo,
          controller.signal
        );

        clearTimeout(timeout);

        // Update context with extraction results
        if (attemptResult.actualPageCount) {
          ctx.actualPageCount = attemptResult.actualPageCount;
          (service as any).__lastPageCount = attemptResult.actualPageCount;
        }
        ctx.failedChunksCount = attemptResult.failedChunks;
        ctx.usedOcrChunks = attemptResult.usedOcrChunks;

        // Validate extracted text quality
        if (!this.validateTextQuality(attemptResult.text)) {
          throw new Error('Low quality extraction - text validation failed');
        }

        // SUCCESS!
        const processingTime = Date.now() - ctx.startTime;
        const attemptType2 = isRetry ? 'Retry success' : 'Success';
        console.log(
          `[SmartPDFExtractor] ✅ ${attemptType2} with ${service.name} in ${processingTime}ms`
        );

        return this.buildSuccessResult(service, attemptResult.text, processingTime, ctx);
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      const logSuffix = isRetry ? ' (retry)' : '';
      ctx.attemptLog.push(`${service.name}${logSuffix}: ${errorMsg}`);

      console.warn(`[SmartPDFExtractor] ${service.name}${logSuffix} failed: ${errorMsg}`);

      // Classify error
      const errorType = classifyError(error, error.statusCode);
      console.log(`[SmartPDFExtractor] Error type: ${errorType}`);

      // If PERMANENT or RATE_LIMIT, skip to next service immediately
      if (shouldFallback(errorType)) {
        console.log(
          `[SmartPDFExtractor] ${errorType} error, trying next service...`
        );
      }

      return null;
    }
  }

  /**
   * Perform the actual extraction (chunked or standard)
   */
  private async performExtraction(
    service: PDFService,
    fileBuffer: Uint8Array,
    chunkingInfo: { shouldChunk: boolean; chunkSize: number },
    signal: AbortSignal
  ): Promise<AttemptResult> {
    // Check if we should use chunked extraction for Gemini
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
        signal
      );
      return {
        text: chunked.text,
        actualPageCount: chunked.pageCount,
        failedChunks: chunked.failedChunks,
        usedOcrChunks: chunked.usedOcrChunks,
      };
    }

    // Standard extraction
    const text = await service.extract(fileBuffer, signal);
    return {
      text,
      actualPageCount: undefined,
      failedChunks: 0,
      usedOcrChunks: 0,
    };
  }

  /**
   * Build the success result with metadata
   */
  private buildSuccessResult(
    service: PDFService,
    text: string,
    processingTime: number,
    ctx: ExtractionContext
  ): PDFExtractionResult {
    return {
      text,
      metadata: {
        service: service.name as 'gemini' | 'pdfjs' | 'google-vision',
        processingTime,
        attemptCount: ctx.attemptLog.length + 1,
        fallbacksUsed: ctx.attemptLog,
        quality: this.getServiceQuality(service.name),
        pageCount:
          (service as any).__lastPageCount ??
          ctx.actualPageCount ??
          ctx.estimatedPages,
        timeoutHit: ctx.timeoutHit || undefined,
        adaptiveTimeoutMs: ctx.lastAdaptiveTimeout || undefined,
        failedChunks: ctx.failedChunksCount || undefined,
        usedOcrChunks: ctx.usedOcrChunks || undefined,
        actualPageCount: ctx.actualPageCount ?? undefined,
      },
    };
  }

  /**
   * Determine quality rating based on service
   */
  private getServiceQuality(serviceName: string): 'high' | 'medium' | 'low' {
    if (serviceName === 'gemini') {
      return 'high'; // Multimodal AI, best quality
    } else if (serviceName === 'pdfjs') {
      return 'medium'; // Local extraction, good for text PDFs
    }
    return 'low'; // OCR fallback, scanned documents
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
          range.end - range.start + 1 <= ocrPagesBudget;

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
              ocrPagesBudget -= range.end - range.start + 1;
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
          console.warn(`[SmartPDFExtractor] Chunk ${i + 1} returned empty text`);
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

    return { text: mergedText, pageCount: totalPages, failedChunks, usedOcrChunks };
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
          return await geminiService.extractPageRangeWithDocument(pdf, start, end, signal);
        }

        return await geminiService.extractPageRange(fileBuffer, start, end, signal);
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
