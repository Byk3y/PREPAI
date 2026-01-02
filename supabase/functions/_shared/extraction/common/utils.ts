/**
 * Shared Utility Functions for Content Extraction
 * Common utilities used across extraction modules
 */

/**
 * Convert Uint8Array to base64 using chunked conversion to avoid stack overflow
 *
 * This function processes large buffers in chunks to prevent "Maximum call stack size exceeded"
 * errors that occur when using String.fromCharCode with very large arrays.
 *
 * Extracted from duplicate code in:
 * - geminiOCR() (extraction.ts lines 283-292)
 * - googleVisionOCR() (extraction.ts lines 387-396)
 * - transcribeAudio() (extraction.ts lines 478-485)
 *
 * @param fileBuffer - The buffer to convert to base64
 * @returns Base64-encoded string
 */
export function bufferToBase64(fileBuffer: Uint8Array): string {
  const CHUNK_SIZE = 8192; // Process 8KB chunks
  let binaryString = '';

  for (let i = 0; i < fileBuffer.length; i += CHUNK_SIZE) {
    const chunk = fileBuffer.slice(i, i + CHUNK_SIZE);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binaryString);
}

/**
 * Detect image MIME type from buffer magic bytes
 *
 * Examines the first few bytes of a file to determine the image format.
 * This is more reliable than using file extensions.
 *
 * Supported formats:
 * - PNG (89 50 4E 47)
 * - JPEG (FF D8)
 * - WebP (RIFF...WEBP)
 * - GIF (GIF87a or GIF89a)
 *
 * @param fileBuffer - The image buffer to analyze
 * @returns MIME type string (e.g., 'image/png', 'image/jpeg')
 */
export function detectImageMimeType(fileBuffer: Uint8Array): string {
  // PNG signature: 89 50 4E 47 (‰PNG)
  if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50) {
    return 'image/png';
  }

  // JPEG signature: FF D8
  if (fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8) {
    return 'image/jpeg';
  }

  // WebP signature: RIFF...WEBP
  if (
    fileBuffer[0] === 0x52 &&
    fileBuffer[1] === 0x49 &&
    fileBuffer[2] === 0x46 &&
    fileBuffer[3] === 0x46
  ) {
    if (fileBuffer.length >= 12) {
      const webpMarker = [0x57, 0x45, 0x42, 0x50]; // WEBP
      let isWebP = true;
      for (let i = 0; i < webpMarker.length; i++) {
        if (fileBuffer[8 + i] !== webpMarker[i]) {
          isWebP = false;
          break;
        }
      }
      if (isWebP) return 'image/webp';
    }
  }

  // GIF signature: GIF87a or GIF89a
  if (fileBuffer[0] === 0x47 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46) {
    return 'image/gif';
  }

  // Default fallback to JPEG (most common)
  return 'image/jpeg';
}

/**
 * Detect audio MIME type from URL extension (fallback method)
 *
 * Since we can't always inspect the file buffer before fetching,
 * this provides MIME type detection based on URL file extension.
 *
 * Supported formats:
 * - MP3 (.mp3) → audio/mpeg
 * - WAV (.wav) → audio/wav
 * - M4A (.m4a) → audio/mp4
 * - AAC (.aac) → audio/aac
 * - OGG (.ogg) → audio/ogg
 * - FLAC (.flac) → audio/flac
 *
 * @param url - The audio file URL
 * @returns MIME type string (e.g., 'audio/mpeg', 'audio/wav')
 */
export function detectAudioMimeTypeFromUrl(url: string): string {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.endsWith('.wav')) return 'audio/wav';
  if (lowerUrl.endsWith('.m4a')) return 'audio/mp4';
  if (lowerUrl.endsWith('.aac')) return 'audio/aac';
  if (lowerUrl.endsWith('.ogg')) return 'audio/ogg';
  if (lowerUrl.endsWith('.flac')) return 'audio/flac';

  // Default to MP3 (most common)
  return 'audio/mpeg';
}
