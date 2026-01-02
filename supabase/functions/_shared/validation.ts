/**
 * Input Validation and Sanitization Utilities
 * Comprehensive validation for security-critical inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: any;
}

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return UUID_REGEX.test(id);
}

/**
 * Validate and sanitize a string input
 * @param value - Input string to validate
 * @param options - Validation options
 */
export function validateString(
  value: any,
  options: {
    fieldName: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    allowNewlines?: boolean;
  }
): ValidationResult {
  const { fieldName, required = true, minLength, maxLength, allowNewlines = true } = options;

  // Type check
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmed = value.trim();

  // Required check
  if (required && trimmed.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  // Min length check
  if (minLength !== undefined && trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  // Max length check
  if (maxLength !== undefined && trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at most ${maxLength} characters`,
    };
  }

  // Newline check (for single-line inputs)
  if (!allowNewlines && /[\n\r]/.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} cannot contain line breaks`,
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
}

/**
 * Validate UUID
 */
export function validateUUID(value: any, fieldName: string): ValidationResult {
  if (!value || typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be a valid UUID`,
    };
  }

  if (!isValidUUID(value)) {
    return {
      isValid: false,
      error: `${fieldName} has invalid UUID format`,
    };
  }

  return {
    isValid: true,
    sanitized: value.toLowerCase(),
  };
}

/**
 * Validate array of UUIDs
 * @param value - Array to validate
 * @param options - Validation options
 */
export function validateUUIDArray(
  value: any,
  options: {
    fieldName: string;
    required?: boolean;
    minItems?: number;
    maxItems?: number;
  }
): ValidationResult {
  const { fieldName, required = false, minItems, maxItems } = options;

  // Type check
  if (!Array.isArray(value)) {
    if (!required && !value) {
      return { isValid: true, sanitized: [] };
    }
    return {
      isValid: false,
      error: `${fieldName} must be an array`,
    };
  }

  // Required check
  if (required && value.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty`,
    };
  }

  // Min items check
  if (minItems !== undefined && value.length < minItems) {
    return {
      isValid: false,
      error: `${fieldName} must contain at least ${minItems} items`,
    };
  }

  // Max items check
  if (maxItems !== undefined && value.length > maxItems) {
    return {
      isValid: false,
      error: `${fieldName} cannot contain more than ${maxItems} items`,
    };
  }

  // Validate each UUID
  for (let i = 0; i < value.length; i++) {
    if (!isValidUUID(value[i])) {
      return {
        isValid: false,
        error: `${fieldName}[${i}] is not a valid UUID`,
      };
    }
  }

  return {
    isValid: true,
    sanitized: value.map((id: string) => id.toLowerCase()),
  };
}

/**
 * Validate content_type enum
 */
export function validateContentType(value: any): ValidationResult {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'content_type must be a string',
    };
  }

  const normalized = value.toLowerCase().trim();
  const validTypes = ['flashcards', 'quiz'];

  if (!validTypes.includes(normalized)) {
    return {
      isValid: false,
      error: 'content_type must be "flashcards" or "quiz"',
    };
  }

  return {
    isValid: true,
    sanitized: normalized as 'flashcards' | 'quiz',
  };
}

/**
 * File Magic Bytes - Binary signatures for common file types
 * Used to verify files are actually the claimed type (security)
 */
const FILE_SIGNATURES = {
  // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  pdf: {
    signatures: [[0x25, 0x50, 0x44, 0x46, 0x2D]], // %PDF-
    description: 'PDF document',
  },

  // JPEG: FFD8FF (multiple variants)
  jpeg: {
    signatures: [
      [0xFF, 0xD8, 0xFF, 0xE0], // JFIF
      [0xFF, 0xD8, 0xFF, 0xE1], // EXIF
      [0xFF, 0xD8, 0xFF, 0xE2], // ICC Profile
      [0xFF, 0xD8, 0xFF, 0xE8], // SPIFF
      [0xFF, 0xD8, 0xFF, 0xDB], // Regular JPEG
      [0xFF, 0xD8, 0xFF, 0xEE], // Adobe JPEG
    ],
    description: 'JPEG image',
  },

  // PNG: 89504E47 0D0A1A0A
  png: {
    signatures: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    description: 'PNG image',
  },

  // GIF: GIF87a or GIF89a
  gif: {
    signatures: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
    description: 'GIF image',
  },

  // WebP: RIFF....WEBP
  webp: {
    signatures: [[0x52, 0x49, 0x46, 0x46]], // RIFF (need to also check for WEBP at offset 8)
    description: 'WebP image',
  },

  // MP3: ID3 tag or frame sync
  mp3: {
    signatures: [
      [0x49, 0x44, 0x33],       // ID3 tag (ID3v2)
      [0xFF, 0xFB],             // MPEG Audio Frame sync
      [0xFF, 0xFA],             // MPEG Audio Frame sync
      [0xFF, 0xF3],             // MPEG Audio Frame sync
      [0xFF, 0xF2],             // MPEG Audio Frame sync
    ],
    description: 'MP3 audio',
  },

  // WAV: RIFF....WAVE
  wav: {
    signatures: [[0x52, 0x49, 0x46, 0x46]], // RIFF (need to also check for WAVE at offset 8)
    description: 'WAV audio',
  },

  // M4A/AAC: ftyp variants
  m4a: {
    signatures: [
      [0x00, 0x00, 0x00], // Starts with size bytes, need to check ftyp at offset 4
    ],
    description: 'M4A/AAC audio',
  },
} as const;

/**
 * Supported file types for validation
 */
export type ValidatableFileType = 'pdf' | 'image' | 'audio';

/**
 * File validation result with detected type
 */
export interface FileValidationResult extends ValidationResult {
  detectedType?: string;
  mimeType?: string;
}

/**
 * Check if buffer starts with the given signature
 */
function matchesSignature(buffer: Uint8Array, signature: readonly number[]): boolean {
  if (buffer.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

/**
 * SECURITY: Validate file magic bytes to ensure file content matches claimed type
 * Prevents malware or malicious files disguised as legitimate documents
 * 
 * @param fileBuffer - The file buffer to validate
 * @param expectedType - The claimed/expected file type
 * @returns Validation result with detected type info
 */
export function validateFileMagicBytes(
  fileBuffer: Uint8Array,
  expectedType: ValidatableFileType
): FileValidationResult {

  // Minimum file size check (8 bytes for signature + some content)
  if (!fileBuffer || fileBuffer.length < 8) {
    return {
      isValid: false,
      error: 'File is too small or empty to be a valid document',
    };
  }

  // Maximum file size check (500MB)
  const MAX_FILE_SIZE = 500 * 1024 * 1024;
  if (fileBuffer.length > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File exceeds maximum allowed size of 500MB',
    };
  }

  switch (expectedType) {
    case 'pdf':
      return validatePDF(fileBuffer);
    case 'image':
      return validateImage(fileBuffer);
    case 'audio':
      return validateAudio(fileBuffer);
    default:
      return {
        isValid: false,
        error: `Unsupported file type: ${expectedType}`,
      };
  }
}

/**
 * Validate PDF file magic bytes
 */
function validatePDF(buffer: Uint8Array): FileValidationResult {
  for (const signature of FILE_SIGNATURES.pdf.signatures) {
    if (matchesSignature(buffer, signature)) {
      return {
        isValid: true,
        detectedType: 'pdf',
        mimeType: 'application/pdf',
      };
    }
  }

  return {
    isValid: false,
    error: 'File does not appear to be a valid PDF document. The file may be corrupted or is not actually a PDF.',
  };
}

/**
 * Validate image file magic bytes (JPEG, PNG, GIF, WebP)
 */
function validateImage(buffer: Uint8Array): FileValidationResult {
  // Check JPEG
  for (const signature of FILE_SIGNATURES.jpeg.signatures) {
    if (matchesSignature(buffer, signature)) {
      return {
        isValid: true,
        detectedType: 'jpeg',
        mimeType: 'image/jpeg',
      };
    }
  }

  // Check PNG
  for (const signature of FILE_SIGNATURES.png.signatures) {
    if (matchesSignature(buffer, signature)) {
      return {
        isValid: true,
        detectedType: 'png',
        mimeType: 'image/png',
      };
    }
  }

  // Check GIF
  for (const signature of FILE_SIGNATURES.gif.signatures) {
    if (matchesSignature(buffer, signature)) {
      return {
        isValid: true,
        detectedType: 'gif',
        mimeType: 'image/gif',
      };
    }
  }

  // Check WebP (RIFF + WEBP at offset 8)
  if (matchesSignature(buffer, FILE_SIGNATURES.webp.signatures[0]) && buffer.length >= 12) {
    const webpMarker = [0x57, 0x45, 0x42, 0x50]; // WEBP
    let isWebP = true;
    for (let i = 0; i < webpMarker.length; i++) {
      if (buffer[8 + i] !== webpMarker[i]) {
        isWebP = false;
        break;
      }
    }
    if (isWebP) {
      return {
        isValid: true,
        detectedType: 'webp',
        mimeType: 'image/webp',
      };
    }
  }

  return {
    isValid: false,
    error: 'File does not appear to be a valid image (JPEG, PNG, GIF, or WebP). The file may be corrupted or is not a supported image format.',
  };
}

/**
 * Validate audio file magic bytes (MP3, WAV, M4A)
 */
function validateAudio(buffer: Uint8Array): FileValidationResult {
  // Check MP3 (ID3 or frame sync)
  for (const signature of FILE_SIGNATURES.mp3.signatures) {
    if (matchesSignature(buffer, signature)) {
      return {
        isValid: true,
        detectedType: 'mp3',
        mimeType: 'audio/mpeg',
      };
    }
  }

  // Check WAV (RIFF + WAVE at offset 8)
  if (matchesSignature(buffer, FILE_SIGNATURES.wav.signatures[0]) && buffer.length >= 12) {
    const waveMarker = [0x57, 0x41, 0x56, 0x45]; // WAVE
    let isWav = true;
    for (let i = 0; i < waveMarker.length; i++) {
      if (buffer[8 + i] !== waveMarker[i]) {
        isWav = false;
        break;
      }
    }
    if (isWav) {
      return {
        isValid: true,
        detectedType: 'wav',
        mimeType: 'audio/wav',
      };
    }
  }

  // Check M4A/AAC (ftyp at offset 4)
  if (buffer.length >= 12) {
    const ftypMarker = [0x66, 0x74, 0x79, 0x70]; // ftyp
    let isFtyp = true;
    for (let i = 0; i < ftypMarker.length; i++) {
      if (buffer[4 + i] !== ftypMarker[i]) {
        isFtyp = false;
        break;
      }
    }
    if (isFtyp) {
      // Check for M4A brand names
      const brandStr = String.fromCharCode(...buffer.slice(8, 12));
      const m4aBrands = ['M4A ', 'isom', 'iso2', 'mp41', 'mp42', 'avc1', 'qt  '];
      if (m4aBrands.some(brand => brandStr.includes(brand.slice(0, brandStr.length)))) {
        return {
          isValid: true,
          detectedType: 'm4a',
          mimeType: 'audio/mp4',
        };
      }
    }
  }

  return {
    isValid: false,
    error: 'File does not appear to be a valid audio file (MP3, WAV, or M4A). The file may be corrupted or is not a supported audio format.',
  };
}
