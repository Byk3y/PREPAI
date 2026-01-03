/**
 * Content Extractor
 * Extracts content from various material types (PDF, image, audio, website, YouTube, text)
 */

import { extractPDF, extractImageText, transcribeAudio, extractWebsiteContent } from '../extraction.ts';
import type { Material, ContentExtractionResult } from './types.ts';

/**
 * Supabase client type (loose typing for compatibility)
 */
type SupabaseClient = any;

/**
 * ContentExtractor class
 * Handles content extraction for different material types
 */
export class ContentExtractor {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Extract content based on material type
   *
   * @param material - The material object to extract content from
   * @returns Extracted text and optional metadata
   */
  async extract(material: Material): Promise<ContentExtractionResult> {
    const { kind, storage_path, external_url, content } = material;

    // If content already exists (text/note), return it
    if (content && (kind === 'text' || kind === 'note' || kind === 'copied-text')) {
      return { text: content };
    }

    // Route to appropriate extractor based on material kind
    switch (kind) {
      case 'pdf':
        return await this.extractPDF(material);
      case 'image':
      case 'photo':
        return await this.extractImage(material);
      case 'audio':
        return await this.extractAudio(material);
      case 'website':
        return await this.extractWebsite(material);
      case 'youtube':
        return await this.extractYouTube(material);
      default:
        throw new Error(`Unsupported material kind: ${kind}`);
    }
  }

  /**
   * Extract content from PDF
   */
  private async extractPDF(material: Material): Promise<ContentExtractionResult> {
    // Download PDF from storage
    const { data: fileData, error } = await this.supabase.storage
      .from('uploads')
      .download(material.storage_path);

    if (error || !fileData) {
      throw new Error(`Failed to download PDF: ${error?.message || 'Unknown error'}`);
    }

    const fileBuffer = new Uint8Array(await fileData.arrayBuffer());
    const text = await extractPDF(fileBuffer);

    return { text };
  }

  /**
   * Extract content from image (OCR)
   */
  private async extractImage(material: Material): Promise<ContentExtractionResult> {
    // Download image from storage
    const { data: fileData, error } = await this.supabase.storage
      .from('uploads')
      .download(material.storage_path);

    if (error || !fileData) {
      throw new Error(`Failed to download image: ${error?.message || 'Unknown error'}`);
    }

    const fileBuffer = new Uint8Array(await fileData.arrayBuffer());

    // Run OCR using Gemini 2.0 Flash (multimodal AI, same as PDF extraction)
    const ocrResult = await extractImageText(fileBuffer, {
      confidenceThreshold: 70,
    });

    // Note: We process ALL photos, even with very short text
    // Quality warnings are shown in the UI via the ocr_quality metadata

    return {
      text: ocrResult.text,
      metadata: {
        ocr_quality: {
          confidence: ocrResult.confidence,
          lowQuality: ocrResult.metadata.lowQuality,
          engine: ocrResult.metadata.engine,
          processingTime: ocrResult.metadata.processingTime,
        },
      },
    };
  }

  /**
   * Extract content from audio (transcription)
   */
  private async extractAudio(material: Material): Promise<ContentExtractionResult> {
    // Get signed URL for audio file
    const { data: signedUrlData, error } = await this.supabase.storage
      .from('uploads')
      .createSignedUrl(material.storage_path, 3600); // 1 hour

    if (error || !signedUrlData) {
      throw new Error(`Failed to get audio URL: ${error?.message || 'Unknown error'}`);
    }

    const text = await transcribeAudio(signedUrlData.signedUrl);

    return { text };
  }

  /**
   * Extract content from website URL
   */
  private async extractWebsite(material: Material): Promise<ContentExtractionResult> {
    if (!material.external_url) {
      throw new Error('Website material missing external_url');
    }

    const websiteResult = await extractWebsiteContent(material.external_url);

    return {
      text: websiteResult.text,
      metadata: {
        website_extraction: {
          source: websiteResult.metadata.source,
          extractedTitle: websiteResult.title,
          url: websiteResult.metadata.url,
          processingTime: websiteResult.metadata.processingTime,
          contentLength: websiteResult.metadata.contentLength,
          warning: websiteResult.metadata.warning,
        },
      },
    };
  }

  /**
   * Extract content from YouTube video
   */
  private async extractYouTube(material: Material): Promise<ContentExtractionResult> {
    const { getRequiredEnv } = await import('../env.ts');
    const { getYoutubeTranscript, cleanTranscriptWithAI } = await import('../youtube.ts');

    const apiKey = getRequiredEnv('GOOGLE_AI_API_KEY');
    const rapidApiKey = getRequiredEnv('RAPIDAPI_KEY');

    try {
      // Step 1: Fetch raw transcript via Professional API (handles blocks/fallbacks)
      const rawTranscript = await getYoutubeTranscript(material.external_url!, rapidApiKey);

      // Step 2: Clean it up with AI for that "Premium" Brigo feel
      const cleanedText = await cleanTranscriptWithAI(rawTranscript, apiKey);

      return { text: cleanedText };
    } catch (error: any) {
      console.warn(`[ContentExtractor] YouTube transcript failed, falling back to audio: ${error.message}`);

      // TODO: Implement the Audio Fallback (extracting audio from video and using transcribeAudio)
      // For now, re-throw to show error in UI
      throw new Error(`YouTube Import Failed: ${error.message}`);
    }
  }
}
