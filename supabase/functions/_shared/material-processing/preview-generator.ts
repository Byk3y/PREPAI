/**
 * Preview Generator
 * Generates AI-powered titles and previews for study materials
 */

import { callLLMWithRetry } from '../openrouter.ts';
import { sanitizeForLLM, sanitizeTitle } from '../sanitization.ts';
import { validateString } from '../validation.ts';
import { stripMarkdown } from './utils.ts';
import { PREVIEW_CONFIG } from './config.ts';
import type {
  PreviewGenerationResult,
  ContentClassification,
  LLMPreviewResponse,
} from './types.ts';

/**
 * PreviewGenerator class
 * Handles AI-powered title and preview generation for materials
 */
export class PreviewGenerator {
  /**
   * Generate title and preview using LLM
   *
   * @param extractedContent - The extracted content from the material
   * @param currentTitle - The current title of the notebook
   * @returns Preview generation result with title, preview, classification, and usage stats
   */
  async generate(
    extractedContent: string,
    currentTitle: string
  ): Promise<PreviewGenerationResult> {
    // SECURITY: Sanitize inputs before sending to LLM
    const sanitizedCurrentTitle = sanitizeTitle(currentTitle || 'Untitled', 100);
    const sanitizedContent = sanitizeForLLM(extractedContent, {
      maxLength: PREVIEW_CONFIG.MAX_CONTENT_LENGTH,
      preserveNewlines: true,
    });

    // Build prompts
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(sanitizedContent, sanitizedCurrentTitle);

    // Call LLM with retry
    const result = await callLLMWithRetry('preview', systemPrompt, userPrompt, {
      temperature: PREVIEW_CONFIG.TEMPERATURE,
      maxRetries: PREVIEW_CONFIG.MAX_RETRIES,
    });

    // Parse and validate response
    return this.parseAndValidateResponse(result);
  }

  /**
   * Build the system prompt for preview generation
   */
  private buildSystemPrompt(): string {
    return `You are Brigo, an AI Study Coach specializing in exam preparation.

TASK: Analyze this study material and generate:
1. A clear title and overview
2. A classification of what type of content this is
3. Three study questions

CONTENT CLASSIFICATION (analyze first):
Before generating the overview, classify the material:

- TYPE: What is this material?
  • "past_paper" - Contains exam questions, mark schemes, or test papers
  • "lecture_notes" - Class notes, slides, or lecture transcripts
  • "textbook_chapter" - Formal educational content from a textbook
  • "article" - News, blog, or informational article
  • "video_transcript" - Transcribed video content
  • "general" - Other study material

- EXAM_RELEVANCE: How exam-focused is this content?
  • "high" - Contains actual exam questions or exam-style content
  • "medium" - Educational content useful for exam prep
  • "low" - General information, not directly exam-related

- DETECTED_FORMAT (only if past_paper):
  • "multiple_choice" - MCQ format
  • "short_answer" - Short answer questions
  • "essay" - Long-form essay questions
  • "mixed" - Combination of formats
  • null - Not applicable (not a past paper)

- SUBJECT_AREA: Academic subject (e.g., "Biology", "Law", "History", "Computer Science")

OUTPUT FORMAT (JSON only):
{
  "title": "Clear topic title (max 60 chars)",
  "emoji": "Relevant subject emoji",
  "color": "blue | green | orange | purple | pink",
  "content_classification": {
    "type": "past_paper | lecture_notes | textbook_chapter | article | video_transcript | general",
    "exam_relevance": "high | medium | low",
    "detected_format": "multiple_choice | short_answer | essay | mixed | null",
    "subject_area": "Subject name or null"
  },
  "overview": "80-120 word summary. Bold 2-3 key exam terms. End with one concept to research further.",
  "suggested_questions": ["Question 1", "Question 2", "Question 3"]
}

RULES:
1. Jump directly into content - never start with "This text discusses..."
2. Focus on exam-relevant concepts
3. For past papers: mention what topics are being tested
4. Questions should spark curiosity about the material
5. Bold only the 2-3 most important terms`;
  }

  /**
   * Build the user prompt with content and current title
   */
  private buildUserPrompt(sanitizedContent: string, sanitizedCurrentTitle: string): string {
    return `Existing Notebook Title: ${sanitizedCurrentTitle}
Combined Material Content:
${sanitizedContent}

Provide the premium preview JSON that synthesizes all available source material.`;
  }

  /**
   * Parse and validate the LLM response
   */
  private parseAndValidateResponse(result: any): PreviewGenerationResult {
    try {
      // Strip markdown code blocks if present (LLMs often wrap JSON in ```json ... ```)
      let jsonContent = result.content.trim();
      if (jsonContent.startsWith('```')) {
        // Remove opening code fence (```json or ```)
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing code fence
        jsonContent = jsonContent.replace(/\n?```\s*$/, '');
      }

      const response: LLMPreviewResponse = JSON.parse(jsonContent);

      // SECURITY: Validate LLM response structure
      const titleValidation = validateString(response.title, {
        fieldName: 'title',
        required: true,
        maxLength: 100,
        allowNewlines: false,
      });
      if (!titleValidation.isValid) {
        throw new Error(`Invalid title from LLM: ${titleValidation.error}`);
      }

      const overviewValidation = validateString(response.overview, {
        fieldName: 'overview',
        required: true,
        maxLength: 2000,
      });
      if (!overviewValidation.isValid) {
        throw new Error(`Invalid overview from LLM: ${overviewValidation.error}`);
      }

      if (!response.emoji || typeof response.emoji !== 'string') {
        throw new Error('Invalid or missing emoji from LLM');
      }

      // Clean and validate title
      let cleanedTitle = stripMarkdown(titleValidation.sanitized!).substring(
        0,
        PREVIEW_CONFIG.MAX_TITLE_LENGTH
      );

      // Clean and validate overview
      let trimmedOverview = overviewValidation
        .sanitized!.replace(/\n\s*\n/g, ' ') // Replace multiple newlines with space
        .replace(/\n/g, ' ') // Replace single newlines with space
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();

      const wordCount = trimmedOverview.split(/\s+/).length;

      // ELASTIC CONSTRAINTS: Only retry if it's way off
      // We want to avoid "infinite retry loops" that cause 500s for users
      if (wordCount < PREVIEW_CONFIG.MIN_OVERVIEW_WORDS) {
        throw new Error(
          `Overview too short (${wordCount} words). Brigo requires more depth.`
        );
      }
      if (wordCount > PREVIEW_CONFIG.MAX_OVERVIEW_WORDS) {
        throw new Error(
          `Overview too long (${wordCount} words). Brigo requires more conciseness.`
        );
      }

      // Extract and validate content classification
      const contentClassification = this.validateClassification(
        response.content_classification
      );

      // SECURITY: Validate suggested_questions array from LLM
      let sanitizedQuestions: string[] = [];
      if (response.suggested_questions && Array.isArray(response.suggested_questions)) {
        sanitizedQuestions = response.suggested_questions
          .slice(0, PREVIEW_CONFIG.MAX_QUESTIONS) // Max questions
          .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
          .map((q: string) => q.trim().substring(0, PREVIEW_CONFIG.MAX_QUESTION_LENGTH));
      }

      // Return cleaned result with actual usage statistics
      return {
        title: cleanedTitle,
        emoji: response.emoji,
        color: response.color || 'blue',
        content_classification: contentClassification,
        preview: {
          overview: trimmedOverview,
          suggested_questions: sanitizedQuestions,
        },
        usage: result.usage,
        costCents: result.costCents,
        model: result.model,
        latency: result.latency,
      };
    } catch (parseError: any) {
      console.error('Failed to parse LLM response:', result.content);
      throw new Error(
        `Preview generation failed to produce valid JSON: ${parseError.message}`
      );
    }
  }

  /**
   * Validate and normalize content classification
   */
  private validateClassification(classification: any): ContentClassification {
    const contentClassification: ContentClassification = {
      type: classification?.type || 'general',
      exam_relevance: classification?.exam_relevance || 'medium',
      detected_format: classification?.detected_format || null,
      subject_area: classification?.subject_area || null,
    };

    // Validate classification type
    const validTypes = [
      'past_paper',
      'lecture_notes',
      'textbook_chapter',
      'article',
      'video_transcript',
      'general',
    ];
    if (!validTypes.includes(contentClassification.type)) {
      contentClassification.type = 'general';
    }

    return contentClassification;
  }
}
