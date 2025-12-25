/**
 * Content Extraction Utilities
 * Handles PDF, Image OCR, Audio transcription, and text chunking
 */

// Imports are dynamic to avoid initialization issues

interface OCRResult {
  text: string;
  confidence: number; // 0-100
  metadata: {
    engine: 'tesseract' | 'google-vision';
    lowQuality: boolean; // true if confidence < threshold or very short text
    language: string;
    processingTime: number;
    warning?: string; // Optional warning message for very short text
  };
}

// Import SmartPDFExtractor statically (dynamic imports don't get bundled)
import { SmartPDFExtractor } from './pdf/orchestrator.ts';

/**
 * Extract text from PDF file using Smart PDF Extractor
 * - Primary: Gemini 2.0 Flash (multimodal AI, NotebookLM-grade)
 * - Fallback: pdfjs-dist (local extraction)
 * - Intelligent fallback on rate limits or errors
 */
export async function extractPDF(fileBuffer: Uint8Array): Promise<string> {
  console.log('[extractPDF] START - Buffer size:', fileBuffer.length);
  const startTime = Date.now();

  try {
    console.log('[extractPDF] Importing SmartPDFExtractor...');
    // Use SmartPDFExtractor with Gemini → pdfjs fallback
    const extractor = new SmartPDFExtractor();
    console.log('[extractPDF] SmartPDFExtractor initialized successfully');

    console.log('[extractPDF] Starting extraction...');
    const result = await extractor.extract(fileBuffer);
    console.log('[extractPDF] Extraction completed successfully');

    const processingTime = Date.now() - startTime;
    console.log(
      `[extractPDF] SUCCESS: ${result.text.length} chars extracted in ${processingTime}ms ` +
      `using ${result.metadata.service} (quality: ${result.metadata.quality}, ` +
      `attempts: ${result.metadata.attemptCount})`
    );

    // Log fallbacks for monitoring
    if (result.metadata.fallbacksUsed.length > 0) {
      console.warn('[extractPDF] Fallbacks used:', result.metadata.fallbacksUsed);
    }

    return result.text;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('[extractPDF] ERROR:', errorMsg);
    console.error('[extractPDF] ERROR STACK:', errorStack);
    console.error('[extractPDF] ERROR OBJECT:', JSON.stringify(error, null, 2));
    throw new Error(`PDF extraction error: ${errorMsg}`);
  }
}

/**
 * Extract text from image using OCR
 * Primary: Gemini 2.0 Flash (multimodal AI, same as PDF extraction)
 * Fallback: Google Vision API (if explicitly requested)
 */
export async function extractImageText(
  fileBuffer: Uint8Array,
  options: {
    useGoogleVision?: boolean; // default: false (use Gemini)
    confidenceThreshold?: number; // default: 70
  } = {}
): Promise<OCRResult> {
  const confidenceThreshold = options.confidenceThreshold ?? 70;

  if (options.useGoogleVision) {
    // Google Vision OCR (fallback option)
    return await googleVisionOCR(fileBuffer, confidenceThreshold);
  } else {
    // Gemini OCR (primary - multimodal AI)
    return await geminiOCR(fileBuffer, confidenceThreshold);
  }
}

/**
 * Tesseract OCR implementation
 * NOTE: Tesseract.js is NOT compatible with Deno Edge Functions (Worker.prototype.constructor not implemented)
 * TODO: Implement cloud OCR (Google Vision, AWS Textract, etc.) for production use
 */
async function tesseractOCR(
  fileBuffer: Uint8Array,
  confidenceThreshold: number
): Promise<OCRResult> {
  const startTime = Date.now();

  // Tesseract.js requires Web Workers which are not fully supported in Deno Edge Functions
  // Return a placeholder response until cloud OCR is implemented
  console.warn('Tesseract OCR is disabled in Edge Functions. Cloud OCR integration needed.');

  return {
    text: '[Image OCR temporarily disabled - Cloud OCR integration coming soon]',
    confidence: 0,
    metadata: {
      engine: 'tesseract',
      lowQuality: true,
      language: 'eng',
      processingTime: Date.now() - startTime,
      warning: 'Image OCR is temporarily disabled. Tesseract.js is not compatible with Deno Edge Functions. Cloud OCR (Google Vision, AWS Textract) integration coming soon.',
    },
  };
}

/**
 * Gemini OCR - Multimodal AI text extraction
 * Uses Gemini 2.0 Flash for high-quality text extraction from images
 * Same API as PDF extraction - handles handwriting, watermarks, complex layouts
 */
async function geminiOCR(
  fileBuffer: Uint8Array,
  confidenceThreshold: number
): Promise<OCRResult> {
  const { getRequiredEnv } = await import('./env.ts');
  const apiKey = getRequiredEnv('GOOGLE_AI_API_KEY');

  const startTime = Date.now();

  try {
    // Convert buffer to base64 using chunked conversion to avoid stack overflow
    const CHUNK_SIZE = 8192; // Process 8KB chunks
    let binaryString = '';

    for (let i = 0; i < fileBuffer.length; i += CHUNK_SIZE) {
      const chunk = fileBuffer.slice(i, i + CHUNK_SIZE);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }

    const base64Image = btoa(binaryString);

    // Detect MIME type from buffer (simple check)
    let mimeType = 'image/jpeg';
    if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50) {
      mimeType = 'image/png';
    } else if (fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8) {
      mimeType = 'image/jpeg';
    }

    // Call Gemini 2.0 Flash API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
                {
                  text: 'Extract all text from this image. Return only the extracted text without any commentary or explanation. If there is no text, respond with "No text detected".',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 1,
            topK: 32,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text || text.trim() === '' || text.includes('No text detected')) {
      throw new Error('No text detected in image');
    }

    const processingTime = Date.now() - startTime;

    // Estimate confidence based on text length and processing success
    // Longer text = higher confidence in extraction quality
    let confidence = 90; // Base confidence for Gemini
    if (text.length < 50) {
      confidence = 75; // Lower confidence for very short text
    } else if (text.length < 100) {
      confidence = 85;
    }

    return {
      text: text.trim(),
      confidence,
      metadata: {
        engine: 'google-vision', // Keep same engine type for compatibility
        lowQuality: confidence < confidenceThreshold,
        language: 'eng',
        processingTime,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini OCR error: ${message}`);
  }
}

/**
 * Google Vision OCR (fallback option)
 * Premium OCR for handwritten notes and low-quality photos
 */
async function googleVisionOCR(
  fileBuffer: Uint8Array,
  confidenceThreshold: number
): Promise<OCRResult> {
  const { getRequiredEnv } = await import('./env.ts');
  const apiKey = getRequiredEnv('GOOGLE_VISION_API_KEY');

  const startTime = Date.now();

  try {
    // Convert buffer to base64 using chunked conversion to avoid stack overflow
    const CHUNK_SIZE = 8192; // Process 8KB chunks
    let binaryString = '';

    for (let i = 0; i < fileBuffer.length; i += CHUNK_SIZE) {
      const chunk = fileBuffer.slice(i, i + CHUNK_SIZE);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }

    const base64Image = btoa(binaryString);

    // Call Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const textAnnotations = data.responses?.[0]?.textAnnotations;

    if (!textAnnotations || textAnnotations.length === 0) {
      throw new Error('No text detected in image');
    }

    // First annotation contains full text
    const text = textAnnotations[0].description;
    const processingTime = Date.now() - startTime;

    // Google Vision doesn't provide confidence per image, estimate from detection
    const confidence = 85; // Assume good quality if detected

    return {
      text: text.trim(),
      confidence,
      metadata: {
        engine: 'google-vision',
        lowQuality: confidence < confidenceThreshold,
        language: 'eng', // TODO: Detect from response
        processingTime,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Google Vision OCR error: ${message}`);
  }
}

/**
 * Transcribe audio to text using Gemini 2.0 Flash (Multimodal AI)
 * Faster, cheaper, and more accurate than AssemblyAI for study materials
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const { getRequiredEnv } = await import('./env.ts');
  const apiKey = getRequiredEnv('GOOGLE_AI_API_KEY');

  console.log('[transcribeAudio] START - Fetching audio from:', audioUrl);
  const startTime = Date.now();

  try {
    // Step 1: Fetch audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
    }
    const audioBuffer = new Uint8Array(await audioResponse.arrayBuffer());
    console.log('[transcribeAudio] Downloaded buffer size:', audioBuffer.length);

    // Step 2: Convert to base64 using chunked conversion
    const CHUNK_SIZE = 8192;
    let binaryString = '';
    for (let i = 0; i < audioBuffer.length; i += CHUNK_SIZE) {
      const chunk = audioBuffer.slice(i, i + CHUNK_SIZE);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Audio = btoa(binaryString);

    // Step 3: Detect MIME type (fallback to mp3)
    let mimeType = 'audio/mpeg';
    if (audioUrl.toLowerCase().endsWith('.wav')) mimeType = 'audio/wav';
    else if (audioUrl.toLowerCase().endsWith('.m4a')) mimeType = 'audio/mp4';
    else if (audioUrl.toLowerCase().endsWith('.aac')) mimeType = 'audio/aac';
    else if (audioUrl.toLowerCase().endsWith('.ogg')) mimeType = 'audio/ogg';
    else if (audioUrl.toLowerCase().endsWith('.flac')) mimeType = 'audio/flac';

    // Step 4: Call Gemini 2.0 Flash API (multimodal)
    console.log('[transcribeAudio] Requesting transcription from Gemini...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: 'You are an expert academic transcriptionist. Provide a precise and cleanly formatted transcription of this audio. Break it into logical paragraphs. Include speaker labels (Speaker A, Speaker B, etc.) if there are multiple people. Return only the transcript text without any commentary.',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 20480, // Allow for long recordings
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Audio API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text || text.trim() === '') {
      throw new Error('Gemini returned an empty transcription');
    }

    const duration = Date.now() - startTime;
    console.log(`[transcribeAudio] SUCCESS: Transcribed in ${duration}ms`);

    return text.trim();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[transcribeAudio] ERROR:', message);
    throw new Error(`Audio transcription error: ${message}`);
  }
}

/**
 * Chunk text for RAG embeddings
 * Uses semantic chunking (paragraph-based) rather than arbitrary splits
 */
export function chunkText(text: string, maxChunkTokens = 800): string[] {
  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    // Rough token estimate: ~4 chars per token
    const currentTokens = currentChunk.length / 4;
    const paraTokens = para.length / 4;

    if (currentTokens + paraTokens > maxChunkTokens && currentChunk) {
      // Current chunk full, save and start new one
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Estimate token count (rough approximation)
 * For more accuracy, use tiktoken library
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
