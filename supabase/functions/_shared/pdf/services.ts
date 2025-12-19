/**
 * PDF Extraction Services
 * GeminiService (primary) and PdfjsService (fallback)
 */

import type { PDFService, ServiceName } from './types.ts';
import { getRequiredEnv } from '../env.ts';

/**
 * GeminiService - Primary PDF extraction using Gemini 2.0 Flash
 * Multimodal AI with native PDF support (text + images + tables + charts)
 */
export class GeminiService implements PDFService {
  name: ServiceName = 'gemini';
  private apiKey: string | undefined;

  constructor() {
    try {
      this.apiKey = getRequiredEnv('GOOGLE_AI_API_KEY');
    } catch {
      this.apiKey = undefined;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Extract text from a specific page range for chunked extraction
   * NOTE: Currently uses pdfjs for fast text extraction per chunk.
   * Future enhancement: Convert pages to images and use Gemini OCR for scanned PDFs.
   * Used for chunked extraction of large PDFs when full PDF extraction might timeout.
   */
  async extractPageRange(
    fileBuffer: Uint8Array,
    startPage: number,
    endPage: number,
    signal: AbortSignal
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    try {
      // Use pdfjs to render pages as images, then send to Gemini
      const pdfjsLib = await import('pdfjs-dist');

      // Configure GlobalWorkerOptions
      if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      } else {
        (pdfjsLib as any).GlobalWorkerOptions = { workerSrc: '' };
      }

      // Load PDF
      const loadingTask = pdfjsLib.getDocument({
        data: fileBuffer,
        useSystemFonts: true,
        disableFontFace: true,
        useWorkerFetch: false,
        isEvalSupported: false,
        verbosity: 0,
      });

      const pdf = await loadingTask.promise;
      return await this.extractPageRangeWithDocument(pdf, startPage, endPage, signal);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[GeminiService] Page range extraction failed: ${errorMsg}`);
      throw new Error(`Gemini chunked extraction error: ${errorMsg}`);
    }
  }

  async extractPageRangeWithDocument(
    pdfDocument: any,
    startPage: number,
    endPage: number,
    signal: AbortSignal
  ): Promise<string> {
    const actualEndPage = Math.min(endPage, pdfDocument.numPages);

    console.log(
      `[GeminiService] Extracting pages ${startPage}-${actualEndPage} using shared pdfjs document`
    );

    const extractedText = await this.extractRangeFromPdfDoc(
      pdfDocument,
      startPage,
      actualEndPage,
      signal
    );

    if (extractedText.length < 100 && actualEndPage - startPage + 1 > 0) {
      console.warn(
        `[GeminiService] Chunk ${startPage}-${actualEndPage} has very little text, ` +
          `might be scanned. Consider image-based extraction.`
      );
    }

    return extractedText;
  }

  async extract(fileBuffer: Uint8Array, signal: AbortSignal): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    try {
      const base64Pdf = this.encodeToBase64(fileBuffer);

      console.log(`[GeminiService] Processing PDF (${fileBuffer.length} bytes, base64: ${base64Pdf.length} chars)...`);

      // Estimate pages to determine maxOutputTokens (larger PDFs need more tokens)
      // Rough estimate: ~50KB per page, so estimate pages from size
      const estimatedPages = Math.max(1, Math.ceil(fileBuffer.length / (50 * 1024)));
      // Calculate maxOutputTokens: base 8192 + 2048 per 10 pages
      // Cap at 32768 (Gemini's max for flash model)
      const maxOutputTokens = Math.min(32768, 8192 + Math.floor(estimatedPages / 10) * 2048);

      console.log(
        `[GeminiService] Estimated ${estimatedPages} pages, using maxOutputTokens: ${maxOutputTokens}`
      );

      // Call Gemini 2.0 Flash API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: 'application/pdf',
                      data: base64Pdf,
                    },
                  },
                  {
                    text: 'Extract all text content from this PDF document. Return only the extracted text without any commentary, formatting, or additional explanations. Preserve the original structure and order of the text.',
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1, // Low temperature for accurate extraction
              topP: 1,
              topK: 32,
              maxOutputTokens: maxOutputTokens, // Adaptive based on PDF size
            },
          }),
          signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        const error: any = new Error(
          `Gemini API error: ${response.status} - ${errorText}`
        );
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();

      // Extract text from Gemini response
      const candidates = data.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error('Gemini returned no candidates');
      }

      const content = candidates[0]?.content;
      if (!content || !content.parts || content.parts.length === 0) {
        throw new Error('Gemini returned empty content');
      }

      const extractedText = content.parts[0]?.text;
      if (!extractedText) {
        throw new Error('No text found in Gemini response');
      }

      console.log(
        `[GeminiService] Successfully extracted ${extractedText.length} characters`
      );

      return extractedText.trim();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[GeminiService] Extraction failed:', errorMsg);
      throw new Error(`Gemini extraction error: ${errorMsg}`);
    }
  }

  /**
   * Shared helper to extract text from a preloaded pdfjs document for a range.
   */
  private async extractRangeFromPdfDoc(
    pdf: any,
    startPage: number,
    endPage: number,
    signal: AbortSignal
  ): Promise<string> {
    const textParts: string[] = [];

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      if (signal.aborted) {
        throw new Error('PDF extraction aborted');
      }

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      textParts.push(pageText);
    }

    return textParts.join('\n\n').trim();
  }

  /**
   * OCR a page range by asking Gemini to focus on specific pages of the PDF.
   * This uses the full PDF payload but scopes the instruction to the page range.
   */
  async ocrPageRange(
    fileBuffer: Uint8Array,
    startPage: number,
    endPage: number,
    signal: AbortSignal
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    try {
      const base64Pdf = this.encodeToBase64(fileBuffer);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: 'application/pdf',
                      data: base64Pdf,
                    },
                  },
                  {
                    text: `Extract text only from pages ${startPage}-${endPage} of this PDF. Perform OCR if the pages are scanned. Return only raw extracted text for those pages in order, without commentary.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              topP: 1,
              topK: 32,
              maxOutputTokens: 8192,
            },
          }),
          signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        const error: any = new Error(
          `Gemini OCR error: ${response.status} - ${errorText}`
        );
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || !text.trim()) {
        throw new Error('Gemini OCR returned empty text');
      }

      return text.trim();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[GeminiService] OCR extraction failed:', errorMsg);
      throw new Error(`Gemini OCR extraction error: ${errorMsg}`);
    }
  }

  /**
   * Encode a Uint8Array into base64 using chunked assembly to avoid large call stacks.
   */
  private encodeToBase64(fileBuffer: Uint8Array): string {
    const CHUNK_SIZE = 8192;
    const binaryChunks: string[] = [];

    for (let i = 0; i < fileBuffer.length; i += CHUNK_SIZE) {
      const chunk = fileBuffer.slice(i, i + CHUNK_SIZE);
      binaryChunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }

    return btoa(binaryChunks.join(''));
  }
}

/**
 * PdfjsService - Fallback PDF extraction using pdfjs-dist
 * Local extraction, always available, basic text-only
 */
export class PdfjsService implements PDFService {
  name: ServiceName = 'pdfjs';

  isAvailable(): boolean {
    return true; // Always available (no API key needed)
  }

  async extract(fileBuffer: Uint8Array, signal: AbortSignal): Promise<string> {
    try {
      console.log(`[PdfjsService] Processing PDF (${fileBuffer.length} bytes)...`);

      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');

      // Configure GlobalWorkerOptions BEFORE any PDF operations
      // Deno Edge Functions don't support Web Workers, so we disable them
      if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
        // Set to empty string to disable worker (Deno-compatible)
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      } else {
        // If GlobalWorkerOptions doesn't exist, create it
        (pdfjsLib as any).GlobalWorkerOptions = { workerSrc: '' };
      }

      // Load PDF document WITHOUT worker (Deno doesn't support workers)
      const loadingTask = pdfjsLib.getDocument({
        data: fileBuffer,
        useSystemFonts: true,
        disableFontFace: true,
        useWorkerFetch: false,
        isEvalSupported: false,
        verbosity: 0, // Suppress warnings
      });

      const pdf = await loadingTask.promise;
      const textParts: string[] = [];

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        // Check if aborted
        if (signal.aborted) {
          throw new Error('PDF extraction aborted');
        }

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const pageText = textContent.items.map((item: any) => item.str).join(' ');

        textParts.push(pageText);
      }

      const extractedText = textParts.join('\n\n').trim();

      console.log(
        `[PdfjsService] Successfully extracted ${extractedText.length} characters from ${pdf.numPages} pages`
      );

      return extractedText;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[PdfjsService] Extraction failed:', errorMsg);
      throw new Error(`pdfjs extraction error: ${errorMsg}`);
    }
  }
}

/**
 * GoogleVisionPDFService - OCR fallback for scanned PDFs using Google Vision API
 * NOTE: Currently disabled for PDFs - the images:annotate endpoint doesn't support PDFs.
 * PDFs require files:asyncBatchAnnotate with GCS storage, which is complex to implement.
 * For now, we rely on Gemini (primary) and pdfjs (fallback) for PDF extraction.
 * Google Vision is still available for image OCR via extractImageText().
 */
export class GoogleVisionPDFService implements PDFService {
  name: ServiceName = 'google-vision';
  private apiKey: string | undefined;

  constructor() {
    try {
      this.apiKey = getRequiredEnv('GOOGLE_VISION_API_KEY');
    } catch {
      this.apiKey = undefined;
    }
  }

  isAvailable(): boolean {
    // Disable for PDFs - requires files:asyncBatchAnnotate with GCS (not implemented)
    // Google Vision is still used for image OCR, but not for PDF extraction
    return false;
  }

  async extract(fileBuffer: Uint8Array, signal: AbortSignal): Promise<string> {
    // This service is disabled for PDFs - the images:annotate endpoint doesn't support PDFs.
    // PDFs require files:asyncBatchAnnotate with GCS storage, which is complex to implement.
    // This method should never be called since isAvailable() returns false.
    throw new Error(
      'Google Vision PDF extraction is not available. ' +
      'PDFs require files:asyncBatchAnnotate with GCS storage (not implemented). ' +
      'Use Gemini or pdfjs services instead.'
    );
  }
}
