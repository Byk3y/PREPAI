/**
 * Website Content Extraction Module Types
 * Types for website content extraction
 */

import type { WebsiteExtractionResult } from '../common/types.ts';

// Re-export for backward compatibility
export type { WebsiteExtractionResult };

/**
 * Website extraction source
 */
export type ExtractionSource = 'jina-reader' | 'direct-fetch' | 'gemini';

/**
 * Website extractor service interface
 */
export interface WebsiteExtractor {
  name: ExtractionSource;
  extract(url: string, startTime: number): Promise<WebsiteExtractionResult>;
  isAvailable(): boolean;
}
