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
 * MVP: Tesseract.js only
 * Supports Google Vision fallback (disabled for MVP)
 */
export async function extractImageText(
  fileBuffer: Uint8Array,
  options: {
    useGoogleVision?: boolean; // default: false
    confidenceThreshold?: number; // default: 70
  } = {}
): Promise<OCRResult> {
  const useGoogleVision =
    options.useGoogleVision ?? Deno.env.get('ENABLE_GOOGLE_VISION_OCR') === 'true';

  if (useGoogleVision) {
    // Google Vision OCR (hook for future)
    return await googleVisionOCR(fileBuffer, options.confidenceThreshold ?? 70);
  } else {
    // Tesseract OCR (MVP)
    return await tesseractOCR(fileBuffer, options.confidenceThreshold ?? 70);
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
 * Google Vision OCR (hook for future - not implemented in MVP)
 * Premium OCR for handwritten notes and low-quality photos
 */
async function googleVisionOCR(
  fileBuffer: Uint8Array,
  confidenceThreshold: number
): Promise<OCRResult> {
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');

  if (!apiKey) {
    throw new Error('Google Vision API key not configured');
  }

  const startTime = Date.now();

  try {
    // Convert buffer to base64
    const base64Image = btoa(String.fromCharCode(...fileBuffer));

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
  } catch (error) {
    throw new Error(`Google Vision OCR error: ${error.message}`);
  }
}

/**
 * Transcribe audio to text using AssemblyAI
 * Supports speaker diarization and timestamps
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY');

  if (!apiKey) {
    throw new Error('AssemblyAI API key not configured');
  }

  try {
    // Step 1: Upload audio file to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Transfer-Encoding': 'chunked',
      },
      body: await fetch(audioUrl).then((r) => r.arrayBuffer()),
    });

    if (!uploadResponse.ok) {
      throw new Error(`AssemblyAI upload failed: ${uploadResponse.status}`);
    }

    const { upload_url } = await uploadResponse.json();

    // Step 2: Request transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: true, // Enable speaker diarization
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptResponse.ok) {
      throw new Error(`AssemblyAI transcription request failed: ${transcriptResponse.status}`);
    }

    const { id } = await transcriptResponse.json();

    // Step 3: Poll for completion (max 10 minutes)
    const maxAttempts = 120; // 120 * 5s = 10 minutes
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { authorization: apiKey },
      });

      if (!statusResponse.ok) {
        throw new Error(`AssemblyAI status check failed: ${statusResponse.status}`);
      }

      const transcript = await statusResponse.json();

      if (transcript.status === 'completed') {
        return transcript.text;
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      // Wait 5 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error('Transcription timeout (10 minutes)');
  } catch (error) {
    throw new Error(`Audio transcription error: ${error.message}`);
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
