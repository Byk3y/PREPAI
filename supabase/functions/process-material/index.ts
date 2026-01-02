/**
 * Edge Function: Process Material
 *
 * Processes uploaded materials by:
 * 1. Extracting content (PDF→text, image→OCR, audio→transcript)
 * 2. Generating AI title and concise overview (60-85 words - quick, scannable summary)
 * 3. Updating material and notebook records
 * 4. Logging usage for cost tracking
 *
 * Phase 2 Implementation with:
 * - Gemini 2.0 Flash PDF extraction (multimodal AI)
 * - Gemini 2.0 Flash OCR for camera photos (same API as PDFs)
 * - AssemblyAI audio transcription
 * - OpenRouter LLM title and preview generation
 */

import { createClient } from 'supabase';
import { callLLMWithRetry } from '../_shared/openrouter.ts';
import { extractPDF, extractImageText, transcribeAudio, extractWebsiteContent } from '../_shared/extraction.ts';
import { checkQuota } from '../_shared/quota.ts';
import { getRequiredEnv, getOptionalEnv } from '../_shared/env.ts';
import { getCorsHeaders, getCorsPreflightHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/ratelimit.ts';
import { estimatePageCount } from '../_shared/pdf/utils.ts';
import { validateUUID, validateString } from '../_shared/validation.ts';
import { sanitizeForLLM, sanitizeTitle } from '../_shared/sanitization.ts';

// Large PDF thresholds - PDFs exceeding these are processed in background
const LARGE_PDF_THRESHOLD_PAGES = 20; // Lowered from 50
const LARGE_PDF_THRESHOLD_BYTES = 5 * 1024 * 1024; // Lowered from 10MB

/**
 * Extract content based on material type
 */
async function extractContent(
  material: any,
  supabase: any
): Promise<{ text: string; metadata?: any }> {
  const { kind, storage_path, external_url, content } = material;

  // If content already exists (text/note), return it
  if (content && (kind === 'text' || kind === 'note' || kind === 'copied-text')) {
    return { text: content };
  }

  // Extract from files
  if (kind === 'pdf') {
    // Download PDF from storage
    const { data: fileData, error } = await supabase.storage
      .from('uploads')
      .download(storage_path);

    if (error || !fileData) {
      throw new Error(`Failed to download PDF: ${error?.message || 'Unknown error'}`);
    }

    const fileBuffer = new Uint8Array(await fileData.arrayBuffer());
    const text = await extractPDF(fileBuffer);

    return { text };
  } else if (kind === 'image' || kind === 'photo') {
    // Download image from storage
    const { data: fileData, error } = await supabase.storage
      .from('uploads')
      .download(storage_path);

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
  } else if (kind === 'audio') {
    // Get signed URL for audio file
    const { data: signedUrlData, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(storage_path, 3600); // 1 hour

    if (error || !signedUrlData) {
      throw new Error(`Failed to get audio URL: ${error?.message || 'Unknown error'}`);
    }

    const text = await transcribeAudio(signedUrlData.signedUrl);

    return { text };
  } else if (kind === 'website') {
    // Extract content from website URL using Jina Reader
    if (!external_url) {
      throw new Error('Website material missing external_url');
    }

    const websiteResult = await extractWebsiteContent(external_url);

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
  } else if (kind === 'youtube') {
    const { getRequiredEnv } = await import('../_shared/env.ts');
    const { getYoutubeTranscript, cleanTranscriptWithAI } = await import('../_shared/youtube.ts');

    const apiKey = getRequiredEnv('GOOGLE_AI_API_KEY');
    const rapidApiKey = getRequiredEnv('RAPIDAPI_KEY');

    try {
      // Step 1: Fetch raw transcript via Professional API (handles blocks/fallbacks)
      const rawTranscript = await getYoutubeTranscript(external_url, rapidApiKey);

      // Step 2: Clean it up with AI for that "Premium" Brigo feel
      const cleanedText = await cleanTranscriptWithAI(rawTranscript, apiKey);

      return { text: cleanedText };
    } catch (error: any) {
      console.warn(`[extractContent] YouTube transcript failed, falling back to audio: ${error.message}`);

      // TODO: Implement the Audio Fallback (extracting audio from video and using transcribeAudio)
      // For now, re-throw to show error in UI
      throw new Error(`YouTube Import Failed: ${error.message}`);
    }
  }

  throw new Error(`Unsupported material kind: ${kind}`);
}

/**
 * Strip markdown formatting from a string (removes **bold** and *italic* markers)
 */
function stripMarkdown(text: string): string {
  // Remove **bold** markers (double asterisks)
  let cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  // Remove *italic* markers (single asterisks)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  return cleaned;
}

/**
 * Content classification types for intelligent prompt adaptation
 */
interface ContentClassification {
  type: 'past_paper' | 'lecture_notes' | 'textbook_chapter' | 'article' | 'video_transcript' | 'general';
  exam_relevance: 'high' | 'medium' | 'low';
  detected_format: 'multiple_choice' | 'short_answer' | 'essay' | 'mixed' | null;
  subject_area: string | null;
}

/**
 * Generate title and preview using LLM
 * Returns title, preview, content classification, and LLM usage statistics
 */
async function generateTitleAndPreview(
  extractedContent: string,
  currentTitle: string
): Promise<{
  title: string;
  emoji: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'pink';
  content_classification: ContentClassification;
  preview: {
    overview: string;
    suggested_questions: string[];
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costCents: number;
  model: string;
  latency: number;
}> {
  // SECURITY: Sanitize inputs before sending to LLM
  const sanitizedCurrentTitle = sanitizeTitle(currentTitle || 'Untitled', 100);
  const sanitizedContent = sanitizeForLLM(extractedContent, {
    maxLength: 50000, // SECURITY FIX: Reduced from 200k to 50k
    preserveNewlines: true,
  });

  const systemPrompt = `You are Brigo, an AI Study Coach specializing in exam preparation.

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

  const userPrompt = `Existing Notebook Title: ${sanitizedCurrentTitle}
Combined Material Content:
${sanitizedContent}

Provide the premium preview JSON that synthesizes all available source material.`;

  // Call LLM with retry
  const result = await callLLMWithRetry('preview', systemPrompt, userPrompt, {
    temperature: 0.6,
    maxRetries: 2,
  });

  try {
    // Strip markdown code blocks if present (LLMs often wrap JSON in ```json ... ```)
    let jsonContent = result.content.trim();
    if (jsonContent.startsWith('```')) {
      // Remove opening code fence (```json or ```)
      jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, '');
      // Remove closing code fence
      jsonContent = jsonContent.replace(/\n?```\s*$/, '');
    }

    const response = JSON.parse(jsonContent);

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

    let cleanedTitle = stripMarkdown(titleValidation.sanitized!).substring(0, 60);
    // Replace multiple newlines/paragraph breaks with a single space
    let trimmedOverview = overviewValidation.sanitized!.replace(/\n\s*\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    const wordCount = trimmedOverview.split(/\s+/).length;

    // ELASTIC CONSTRAINTS: Only retry if it's way off.
    // We want to avoid "infinite retry loops" that cause 500s for users.
    if (wordCount < 40) {
      throw new Error(`Overview too short (${wordCount} words). Brigo requires more depth.`);
    }
    if (wordCount > 130) {
      throw new Error(`Overview too long (${wordCount} words). Brigo requires more conciseness.`);
    }

    // Extract and validate content classification with defaults
    const contentClassification: ContentClassification = {
      type: response.content_classification?.type || 'general',
      exam_relevance: response.content_classification?.exam_relevance || 'medium',
      detected_format: response.content_classification?.detected_format || null,
      subject_area: response.content_classification?.subject_area || null,
    };

    // Validate classification type
    const validTypes = ['past_paper', 'lecture_notes', 'textbook_chapter', 'article', 'video_transcript', 'general'];
    if (!validTypes.includes(contentClassification.type)) {
      contentClassification.type = 'general';
    }

    // SECURITY: Validate suggested_questions array from LLM
    let sanitizedQuestions: string[] = [];
    if (response.suggested_questions && Array.isArray(response.suggested_questions)) {
      sanitizedQuestions = response.suggested_questions
        .slice(0, 10) // Max 10 questions
        .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
        .map((q: string) => q.trim().substring(0, 300)); // Max 300 chars each
    }

    // Return cleaned title, preview, classification with actual usage statistics
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
    throw new Error(`Preview generation failed to produce valid JSON: ${parseError.message}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsPreflightHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Initialize Supabase client (service role)
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // AUTHENTICATION: Verify user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    const { material_id } = await req.json();

    // Validate material_id
    const materialIdValidation = validateUUID(material_id, 'material_id');
    if (!materialIdValidation.isValid) {
      return new Response(JSON.stringify({ error: materialIdValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch material and verify ownership
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', material_id)
      .single();

    if (materialError || !material) {
      return new Response(JSON.stringify({ error: 'Material not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get notebook from the new notebook_id column
    const notebookId = material.notebook_id;

    if (!notebookId) {
      return new Response(JSON.stringify({ error: 'Material is not associated with a notebook' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select('id, user_id, title, emoji, color')
      .eq('id', notebookId)
      .single();

    if (notebookError || !notebook) {
      return new Response(JSON.stringify({ error: 'Notebook not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // AUTHORIZATION: Verify user owns this notebook/material
    if (notebook.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: You do not have permission to access this material',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = notebook.user_id;
    const originalTitle = notebook.title; // Store original title for error recovery

    // RATE LIMITING: Check if user is making too many requests
    const rateLimitResult = await checkRateLimit({
      identifier: userId,
      limit: RATE_LIMITS.PROCESS_MATERIAL.limit,
      window: RATE_LIMITS.PROCESS_MATERIAL.window,
      endpoint: 'process-material',
    });

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please wait before processing more materials.',
          retryAfter: rateLimitResult.retryAfter,
          remaining: 0,
          resetAt: rateLimitResult.resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMITS.PROCESS_MATERIAL.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        }
      );
    }

    // QUOTA NOTE: Preview generation is unlimited for all users (trial + premium)
    // Quota enforcement only applies to:
    //   - Studio jobs (flashcards/quiz generation) - 5 for trial
    //   - Audio jobs (podcast generation) - 3 for trial
    // Quota check will be added in Phase 3 (Studio) and Phase 4 (Audio)

    // LARGE PDF DETECTION: Route large PDFs to background processing
    if (material.kind === 'pdf' && material.storage_path) {
      try {
        // Get file metadata to check size
        const { data: fileList, error: listError } = await supabase.storage
          .from('uploads')
          .list(material.storage_path.substring(0, material.storage_path.lastIndexOf('/')), {
            search: material.storage_path.substring(material.storage_path.lastIndexOf('/') + 1),
          });

        let fileSizeBytes = 0;
        if (fileList && fileList.length > 0) {
          fileSizeBytes = fileList[0].metadata?.size || 0;
        }

        // If file is large, check page count by downloading header
        let estimatedPages = 0;
        const isLargeBySize = fileSizeBytes > LARGE_PDF_THRESHOLD_BYTES;

        if (material.kind === 'pdf') {
          // If file is large or we suspect it might be, check page count
          // Range check: if > 2MB, check for page count. 
          // 2MB is a safe threshold where even text-heavy PDFs might have many pages.
          if (fileSizeBytes > 2 * 1024 * 1024 || fileSizeBytes === 0) {
            try {
              // Create a signed URL to fetch just the header using Range
              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('uploads')
                .createSignedUrl(material.storage_path, 60);

              if (signedUrlError) {
                console.warn('[process-material] Failed to get signed URL for estimation:', signedUrlError);
              } else if (signedUrlData) {
                // Fetch only the first 1KB - enough for most PDF headers and metadata
                const response = await fetch(signedUrlData.signedUrl, {
                  headers: { 'Range': 'bytes=0-1024' }
                });

                if (response.ok || response.status === 206) {
                  const buffer = new Uint8Array(await response.arrayBuffer());
                  estimatedPages = estimatePageCount(buffer);
                  console.log(`[process-material] Estimated pages from header: ${estimatedPages}`);
                }
              }
            } catch (e) {
              console.warn('[process-material] Error estimating pages with range request:', e);
            }
          } else {
            // Small file (< 2MB), unlikely to be > 50 pages unless it's pure text
            // We'll still do a quick estimation if we have the buffer, but usually 
            // these are safe for synchronous processing.
          }
        }

        const isLargePDF = isLargeBySize || estimatedPages > LARGE_PDF_THRESHOLD_PAGES;

        if (isLargePDF) {
          console.log(
            `[process-material] Large PDF detected: ${estimatedPages} pages, ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB. ` +
            `Routing to background processing.`
          );

          // Update notebook status to indicate background processing
          await supabase
            .from('notebooks')
            .update({
              status: 'extracting',
              meta: {
                background_processing: true,
                estimated_pages: estimatedPages,
                file_size_bytes: fileSizeBytes,
              },
            })
            .eq('id', notebookId);

          // Enqueue job for background processing
          const { data: jobId, error: enqueueError } = await supabase.rpc('enqueue_processing_job', {
            p_user_id: userId,
            p_material_id: material_id,
            p_notebook_id: notebookId,
            p_job_type: 'pdf_extraction',
            p_estimated_pages: estimatedPages,
            p_file_size_bytes: fileSizeBytes,
            p_priority: 0,
          });

          if (enqueueError) {
            console.error('[process-material] Failed to enqueue job:', enqueueError);
            // Fall through to synchronous processing as fallback
          } else {
            // Trigger background worker (fire-and-forget)
            supabase.functions.invoke('process-large-pdf', {
              body: { job_id: jobId },
            }).catch((err: any) => {
              console.warn('[process-material] Background worker trigger failed, job will be picked up by scheduler:', err.message);
            });

            return new Response(
              JSON.stringify({
                success: true,
                material_id,
                notebook_id: notebookId,
                background_processing: true,
                job_id: jobId,
                estimated_pages: estimatedPages,
                message: 'Large PDF queued for background processing. Check status via realtime subscription.',
              }),
              { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (sizeCheckError: any) {
        console.warn('[process-material] Could not check PDF size, proceeding with sync processing:', sizeCheckError.message);
        // Continue with synchronous processing
      }
    }

    // Update notebook status to 'extracting' for processing
    await supabase
      .from('notebooks')
      .update({ status: 'extracting' })
      .eq('id', notebookId);

    try {
      // STEP 1: Extract content
      console.log(`Extracting content from ${material.kind}: ${material_id}`);
      const { text: extractedContent, metadata: extractMetadata } = await extractContent(
        material,
        supabase
      );

      console.log(`Extracted ${extractedContent.length} characters`);

      // STEP 2: Save extracted content
      await supabase
        .from('materials')
        .update({
          content: extractedContent,
          processed: true,
          processed_at: new Date().toISOString(),
          meta: {
            ...(material.meta || {}),
            ...(extractMetadata || {}),
          },
        })
        .eq('id', material_id);

      // STEP 3: Fetch ALL processed materials for this notebook to generate a combined preview
      const { data: allMaterials } = await supabase
        .from('materials')
        .select('content, meta, kind')
        .eq('notebook_id', notebookId)
        .eq('processed', true);

      let combinedContent = "";
      if (allMaterials && allMaterials.length > 0) {
        combinedContent = allMaterials
          .map((m: any, i: number) => {
            const title = m.meta?.title || m.meta?.filename || `Source ${i + 1}`;
            return `--- SOURCE: ${title} (${m.kind}) ---\n${m.content}\n--- END ---`;
          })
          .join('\n\n');
      } else {
        combinedContent = extractedContent; // Fallback to current
      }

      // STEP 4: Generate AI title and preview based on COMBINED content
      console.log('Generating AI title and preview from combined sources...');
      const previewStartTime = Date.now();

      const llmResult = await generateTitleAndPreview(combinedContent, notebook.title);
      const aiTitle = llmResult.title;
      const preview = llmResult.preview;
      const contentClassification = llmResult.content_classification;

      const previewLatency = Date.now() - previewStartTime;
      console.log(`AI title and preview generated in ${previewLatency}ms`);
      console.log(`Content classified as: ${contentClassification.type} (${contentClassification.exam_relevance} exam relevance)`);

      // STEP 5: Update material with preview_text AND content classification
      await supabase
        .from('materials')
        .update({
          preview_text: preview.overview.substring(0, 500), // Scannable preview
          meta: {
            ...(material.meta || {}),
            content_classification: contentClassification,
          },
        })
        .eq('id', material_id);

      // STEP 5.5: Build content summary from ALL materials in this notebook
      // Re-fetch all materials to get updated classifications
      const { data: updatedMaterials } = await supabase
        .from('materials')
        .select('meta, kind')
        .eq('notebook_id', notebookId);

      // Build content summary for multi-material awareness
      const materialClassifications = (updatedMaterials || [])
        .map((m: any) => m.meta?.content_classification)
        .filter(Boolean);

      const contentSummary = {
        material_count: updatedMaterials?.length || 1,
        has_past_paper: materialClassifications.some((c: any) => c.type === 'past_paper'),
        has_notes: materialClassifications.some((c: any) =>
          c.type === 'lecture_notes' || c.type === 'textbook_chapter'
        ),
        has_video: materialClassifications.some((c: any) => c.type === 'video_transcript'),
        material_types: [...new Set(materialClassifications.map((c: any) => c.type))],
        // Use highest exam relevance from any material
        exam_relevance: materialClassifications.some((c: any) => c.exam_relevance === 'high')
          ? 'high'
          : materialClassifications.some((c: any) => c.exam_relevance === 'medium')
            ? 'medium'
            : 'low',
        primary_subject: contentClassification.subject_area, // From latest material
      };

      console.log(`Content summary: ${contentSummary.material_count} materials, has_past_paper: ${contentSummary.has_past_paper}, has_notes: ${contentSummary.has_notes}`);

      // STEP 6: Update notebook with AI-generated title, preview, classification, and summary
      const notebookUpdate: any = {
        title: aiTitle,
        status: 'preview_ready',
        meta: {
          preview,
          content_classification: contentClassification, // Latest material's classification
          content_summary: contentSummary, // Summary of ALL materials
        },
        preview_generated_at: new Date().toISOString(),
      };

      // PERSISTENCE FIRST: Only set emoji and color if they don't already exist.
      // This prevents the "ruler changing to chart" issue when adding new sources.
      if (!notebook.emoji) {
        notebookUpdate.emoji = llmResult.emoji;
      }
      if (!notebook.color) {
        notebookUpdate.color = llmResult.color;
      }

      await supabase
        .from('notebooks')
        .update(notebookUpdate)
        .eq('id', notebookId);

      // STEP 6: Log usage with ACTUAL token counts from LLM API
      await supabase.from('usage_logs').insert({
        user_id: userId,
        notebook_id: notebookId,
        job_type: 'preview',
        model_used: llmResult.model,
        input_tokens: llmResult.usage.inputTokens,
        output_tokens: llmResult.usage.outputTokens,
        total_tokens: llmResult.usage.totalTokens,
        estimated_cost_cents: llmResult.costCents,
        latency_ms: llmResult.latency,
        status: 'success',
      });

      console.log('Material processed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          material_id,
          notebook_id: notebookId,
          preview,
          message: 'Material processed and preview generated',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (processingError: any) {
      console.error('Processing error:', processingError);

      // Clean up uploaded file from storage if it exists
      if (material.storage_path) {
        console.log(`Cleaning up storage file: ${material.storage_path}`);
        try {
          const { error: deleteError } = await supabase.storage
            .from('uploads')
            .remove([material.storage_path]);

          if (deleteError) {
            console.error('Failed to clean up storage:', deleteError);
          } else {
            console.log('Storage file cleaned up successfully');
          }
        } catch (cleanupError) {
          console.error('Storage cleanup error:', cleanupError);
          // Don't throw - cleanup is best effort
        }
      }

      // Update notebook with error (preserve original title and extracted content if it exists)
      await supabase
        .from('notebooks')
        .update({
          title: originalTitle, // Preserve original title on error
          status: 'extracting', // Keep in extracting state so user can retry
          meta: {
            error: processingError.message,
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', notebookId);

      // Log failed usage (no token counts since it failed)
      await supabase.from('usage_logs').insert({
        user_id: userId,
        notebook_id: notebookId,
        job_type: 'preview',
        model_used: null,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        estimated_cost_cents: 0,
        latency_ms: 0,
        status: 'error',
        error_message: processingError.message,
      });

      throw processingError;
    }
  } catch (error: any) {
    console.error('Fatal error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        stack: getOptionalEnv('DENO_ENV', '') === 'development' ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
