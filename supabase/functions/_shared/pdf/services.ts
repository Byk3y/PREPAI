/**
 * PDF Extraction Services
 * GeminiService (primary) and PdfjsService (fallback)
 */

import type { PDFService } from './types.ts';

/**
 * GeminiService - Primary PDF extraction using Gemini 2.0 Flash
 * Multimodal AI with native PDF support (text + images + tables + charts)
 */
export class GeminiService implements PDFService {
  name = 'gemini';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async extract(fileBuffer: Uint8Array, signal: AbortSignal): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    try {
      // Convert buffer to base64 using chunked binary string conversion to avoid stack overflow
      // For large files (>1MB), String.fromCharCode(...fileBuffer) causes "Maximum call stack size exceeded"
      // First convert to binary string in chunks, then encode the entire string to base64
      const CHUNK_SIZE = 8192; // Process 8KB chunks at a time
      let binaryString = '';

      // Step 1: Convert Uint8Array to binary string in chunks
      for (let i = 0; i < fileBuffer.length; i += CHUNK_SIZE) {
        const chunk = fileBuffer.slice(i, i + CHUNK_SIZE);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }

      // Step 2: Encode the entire binary string to base64
      const base64Pdf = btoa(binaryString);

      console.log(`[GeminiService] Processing PDF (${fileBuffer.length} bytes, base64: ${base64Pdf.length} chars)...`);

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
              maxOutputTokens: 8192,
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
}

/**
 * PdfjsService - Fallback PDF extraction using pdfjs-dist
 * Local extraction, always available, basic text-only
 */
export class PdfjsService implements PDFService {
  name = 'pdfjs';

  isAvailable(): boolean {
    return true; // Always available (no API key needed)
  }

  async extract(fileBuffer: Uint8Array, signal: AbortSignal): Promise<string> {
    try {
      console.log(`[PdfjsService] Processing PDF (${fileBuffer.length} bytes)...`);

      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');

      // Explicitly disable workers and set GlobalWorkerOptions to prevent worker errors
      // Deno doesn't support web workers, so we must disable them completely
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = ''; // Empty string disables worker
      }

      // Load PDF document WITHOUT worker (Deno doesn't support workers)
      const loadingTask = pdfjsLib.getDocument({
        data: fileBuffer,
        useSystemFonts: true,
        disableFontFace: true,
        useWorkerFetch: false,
        isEvalSupported: false,
        disableWorker: true,
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
 * Handles image-based PDFs that Gemini and pdfjs can't extract
 */
export class GoogleVisionPDFService implements PDFService {
  name = 'google-vision';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async extract(fileBuffer: Uint8Array, signal: AbortSignal): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_VISION_API_KEY not configured');
    }

    try {
      // Convert buffer to base64 using chunked conversion to avoid stack overflow
      const CHUNK_SIZE = 8192;
      let binaryString = '';

      for (let i = 0; i < fileBuffer.length; i += CHUNK_SIZE) {
        const chunk = fileBuffer.slice(i, i + CHUNK_SIZE);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }

      const base64Pdf = btoa(binaryString);

      console.log(
        `[GoogleVisionPDFService] Processing PDF with OCR (${fileBuffer.length} bytes, base64: ${base64Pdf.length} chars)...`
      );

      // Google Vision API supports PDFs directly using DOCUMENT_TEXT_DETECTION
      // This is specifically designed for multi-page scanned documents
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                inputConfig: {
                  content: base64Pdf,
                  mimeType: 'application/pdf',
                },
                features: [
                  {
                    type: 'DOCUMENT_TEXT_DETECTION', // Optimized for documents
                    maxResults: 1,
                  },
                ],
              },
            ],
          }),
          signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        const error: any = new Error(
          `Google Vision API error: ${response.status} - ${errorText}`
        );
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();

      // Extract text from response
      const annotations = data.responses?.[0]?.fullTextAnnotation;
      if (!annotations || !annotations.text) {
        throw new Error('Google Vision returned no text annotations');
      }

      const extractedText = annotations.text.trim();

      console.log(
        `[GoogleVisionPDFService] Successfully extracted ${extractedText.length} characters via OCR`
      );

      return extractedText;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[GoogleVisionPDFService] Extraction failed:', errorMsg);
      throw new Error(`Google Vision OCR error: ${errorMsg}`);
    }
  }
}
