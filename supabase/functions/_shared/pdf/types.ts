/**
 * PDF Extraction Types
 * Shared types for the smart PDF extraction system
 */

export interface PDFExtractionResult {
  text: string;
  metadata: {
    service: 'gemini' | 'pdfjs' | 'google-vision';
    processingTime: number;
    attemptCount: number;
    fallbacksUsed: string[];
    quality: 'high' | 'medium' | 'low'; // low quality for OCR of poor scans
    pageCount?: number;
    tokenCount?: number; // For Gemini cost tracking
  };
}

export interface PDFService {
  name: string;
  extract(fileBuffer: Uint8Array, signal: AbortSignal): Promise<string>;
  isAvailable(): boolean;
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
