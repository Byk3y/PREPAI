/**
 * PDF Utility Functions
 * Helper functions for PDF processing, page estimation, and chunking
 */

import { EDGE_TIMEOUT_CAP_MS } from './config.ts';

/**
 * Estimate PDF page count by scanning for page objects.
 * This is a fast estimation without loading the full PDF.
 */
export function estimatePageCount(fileBuffer: Uint8Array): number {
  try {
    // Convert buffer to string for searching
    // Scan first 256KB for better accuracy on larger/linearized PDFs
    const scanLength = Math.min(256 * 1024, fileBuffer.length);
    const pdfText = new TextDecoder('latin1').decode(fileBuffer.slice(0, scanLength));

    // Method 1: Look for /Count in page tree (most accurate)
    const countMatch = pdfText.match(/\/Count\s+(\d+)/);
    if (countMatch) {
      const count = parseInt(countMatch[1], 10);
      if (count > 0 && count < 10000) {
        return count;
      }
    }

    // Method 2: Count /Type\s*\/Page occurrences (less accurate but works for most PDFs)
    const pageMatches = pdfText.match(/\/Type\s*\/Page\b/gi);
    if (pageMatches && pageMatches.length > 0) {
      return Math.max(1, pageMatches.length);
    }

    // Method 3: Estimate based on file size (fallback)
    // Rough estimate: ~50KB per page for typical PDFs
    const estimatedPages = Math.max(1, Math.ceil(fileBuffer.length / (50 * 1024)));

    // Cap at reasonable maximum
    return Math.min(estimatedPages, 1000);
  } catch (error) {
    console.warn('[estimatePageCount] Error estimating pages, using size-based estimate:', error);
    // Fallback: estimate based on size
    return Math.max(1, Math.ceil(fileBuffer.length / (50 * 1024)));
  }
}

/**
 * Calculate adaptive timeout based on PDF size and estimated pages
 * 
 * @param fileBuffer - PDF file as Uint8Array
 * @param baseTimeout - Base timeout in milliseconds
 * @param knownPageCount - Optional actual page count (preferred over estimate)
 * @returns Calculated timeout in milliseconds (capped at Supabase limit)
 */
export function calculateAdaptiveTimeout(
  fileBuffer: Uint8Array,
  baseTimeout: number,
  knownPageCount?: number
): number {
  const estimatedPages = knownPageCount ?? estimatePageCount(fileBuffer);
  const fileSizeMB = fileBuffer.length / (1024 * 1024);
  
  // Calculate timeout:
  // - Base timeout for small PDFs
  // - Add 2s per page for medium PDFs (10-30 pages)
  // - Add 3s per page for large PDFs (30+ pages)
  // - Add buffer for large file sizes
  
  let timeout = baseTimeout;
  
  if (estimatedPages <= 10) {
    // Small PDFs: base timeout is sufficient
    timeout = baseTimeout;
  } else if (estimatedPages <= 30) {
    // Medium PDFs: add 2s per page
    timeout = baseTimeout + (estimatedPages - 10) * 2000;
  } else {
    // Large PDFs: add 3s per page
    timeout = baseTimeout + 20 * 2000 + (estimatedPages - 30) * 3000;
  }
  
  // Add buffer for large file sizes (processing overhead)
  if (fileSizeMB > 10) {
    timeout += Math.ceil((fileSizeMB - 10) * 2000); // 2s per MB over 10MB
  }
  
  // Cap at Supabase Edge Function limit (150s for free, 400s for paid)
  // Use 140s to leave buffer for other operations
  const maxTimeout = EDGE_TIMEOUT_CAP_MS; // configurable cap
  
  return Math.min(timeout, maxTimeout);
}

/**
 * Determine if PDF should be chunked based on size/pages
 * 
 * @param fileBuffer - PDF file as Uint8Array
 * @returns Object with shouldChunk flag and chunk size if needed
 */
export function shouldChunkPDF(fileBuffer: Uint8Array): {
  shouldChunk: boolean;
  chunkSize: number; // pages per chunk
} {
  const estimatedPages = estimatePageCount(fileBuffer);
  const fileSizeMB = fileBuffer.length / (1024 * 1024);
  
  // Chunk if:
  // - More than 30 pages (lowered threshold for better reliability), OR
  // - Larger than 15MB
  if (estimatedPages > 30 || fileSizeMB > 15) {
    // Determine chunk size based on PDF size
    let chunkSize = 10; // Default: 10 pages per chunk
    
    if (estimatedPages > 100) {
      chunkSize = 5; // Very large PDFs: smaller chunks
    } else if (estimatedPages > 50) {
      chunkSize = 8; // Large PDFs: medium chunks
    } else if (estimatedPages > 30) {
      chunkSize = 10; // Medium-large PDFs: standard chunks
    }
    
    return { shouldChunk: true, chunkSize };
  }
  
  return { shouldChunk: false, chunkSize: 0 };
}

/**
 * Generate page ranges for chunked extraction
 * 
 * @param totalPages - Total number of pages in PDF
 * @param chunkSize - Number of pages per chunk
 * @returns Array of {start, end} page ranges
 */
export function generatePageRanges(
  totalPages: number,
  chunkSize: number
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  
  for (let start = 1; start <= totalPages; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, totalPages);
    ranges.push({ start, end });
  }
  
  return ranges;
}
