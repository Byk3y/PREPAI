/**
 * PDF Extraction Types
 * Shared types for the smart PDF extraction system
 */

export type ServiceName = 'gemini' | 'pdfjs' | 'google-vision';

export interface PDFExtractionResult {
  text: string;
  metadata: {
    service: ServiceName;
    processingTime: number;
    attemptCount: number;
    fallbacksUsed: string[];
    quality: 'high' | 'medium' | 'low'; // low quality for OCR of poor scans
    pageCount?: number;
    tokenCount?: number; // For Gemini cost tracking
    timeoutHit?: boolean;
    adaptiveTimeoutMs?: number;
    failedChunks?: number;
    usedOcrChunks?: number;
    actualPageCount?: number;
  };
}

export interface PDFService {
  name: ServiceName;
  extract(fileBuffer: Uint8Array, signal: AbortSignal): Promise<string>;
  isAvailable(): boolean;
  /**
   * Optional capability: extract a specific page range (used for chunked flows).
   */
  extractPageRange?(
    fileBuffer: Uint8Array,
    startPage: number,
    endPage: number,
    signal: AbortSignal
  ): Promise<string>;
  /**
   * Optional capability: reuse a pre-loaded pdfjs document to extract a range.
   * Avoids re-parsing the PDF for each chunk.
   */
  extractPageRangeWithDocument?(
    pdfDocument: any,
    startPage: number,
    endPage: number,
    signal: AbortSignal
  ): Promise<string>;
}

export enum ErrorType {
  PERMANENT = 'permanent',
  TRANSIENT = 'transient',
  RATE_LIMIT = 'rate_limit',
}

export interface ServiceConfig {
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  enabled: boolean;
}
