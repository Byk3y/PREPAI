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
import { extractPDF, extractImageText, transcribeAudio } from '../_shared/extraction.ts';
import { checkQuota } from '../_shared/quota.ts';
import { getRequiredEnv, getOptionalEnv } from '../_shared/env.ts';
import { getCorsHeaders, getCorsPreflightHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/ratelimit.ts';
import { estimatePageCount } from '../_shared/pdf/utils.ts';

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
    // TODO: Implement website scraping
    throw new Error('Website scraping not implemented yet');
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
 * Generate title and preview using LLM
 * Returns both the title, preview and LLM usage statistics
 */
async function generateTitleAndPreview(
  extractedContent: string,
  currentTitle: string
): Promise<{
  title: string;
  emoji: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'pink';
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
  const systemPrompt = `You are Brigo, an elite academic architect. Your mission is to provide a "Premium Glimpse" into new study material. 

TASK: Generate a scannable title, a concise narrative overview, and three curiosity-gap suggested questions.

OUTPUT FORMAT (JSON only):
{
  "title": "Synthesis headline (max 60 chars)",
  "emoji": "Atmospheric/premium emoji (e.g. ✨, 🧬, 🌌)",
  "color": "One of: blue, green, orange, purple, pink",
  "overview": "Single continuous paragraph (60-85 words). Explain the central themes and the 'So what?' factor.",
  "suggested_questions": ["Question 1", "Question 2", "Question 3"]
}

ELITE RULES:
1. **NO META-COMMENTARY**: Jump directly into the insight. Never start with "This text..." or "In this video...".
2. **STYLE**: Use **bold** for 3-5 key concepts inside the overview.
3. **THE MASTERY GAP**: End the overview with a single tactical sentence identifying a concept NOT fully covered in the sources that the user should investigate next to be exam-ready.
4. **TITLE**: Professional and high-level. Avoid abbreviations.
5. **QUESTIONS**: Must be specific to the text, designed to spark a "need to know" feeling.
6. **WORD COUNT**: The overview (including the Mastery Gap) MUST be between 75 and 100 words. Quality over quantity.`;

  // With Grok 4.1 Fast (2M context), we can analyze a massive portion of the material
  const contentWindow = Math.min(200000, extractedContent.length);
  const userPrompt = `Existing Notebook Title: ${currentTitle || 'Untitled'}
Combined Material Content:
${extractedContent.substring(0, contentWindow)}

Provide the premium preview JSON that synthesizes all available source material.`;

  // Call LLM with retry
  const result = await callLLMWithRetry('preview', systemPrompt, userPrompt, {
    temperature: 0.6,
    maxRetries: 2,
  });

  try {
    const response = JSON.parse(result.content);

    // Basic structure validation
    if (!response.title || !response.emoji || !response.overview) {
      throw new Error('Invalid response structure from LLM');
    }

    let cleanedTitle = stripMarkdown(response.title.trim()).substring(0, 60);
    // Replace multiple newlines/paragraph breaks with a single space
    let trimmedOverview = response.overview.trim().replace(/\n\s*\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    const wordCount = trimmedOverview.split(/\s+/).length;

    // ELASTIC CONSTRAINTS: Only retry if it's way off.
    // We want to avoid "infinite retry loops" that cause 500s for users.
    if (wordCount < 40) {
      throw new Error(`Overview too short (${wordCount} words). Brigo requires more depth.`);
    }
    if (wordCount > 130) {
      throw new Error(`Overview too long (${wordCount} words). Brigo requires more conciseness.`);
    }

    // Return cleaned title, preview with actual usage statistics
    return {
      title: cleanedTitle,
      emoji: response.emoji,
      color: response.color || 'blue',
      preview: {
        overview: trimmedOverview,
        suggested_questions: response.suggested_questions || [],
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

    // Parse request body
    const { material_id } = await req.json();

    if (!material_id) {
      return new Response(JSON.stringify({ error: 'material_id is required' }), {
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
      .select('id, user_id, title')
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

      const previewLatency = Date.now() - previewStartTime;
      console.log(`AI title and preview generated in ${previewLatency}ms`);

      // STEP 5: Update material with preview_text (use overview for preview_text)
      await supabase
        .from('materials')
        .update({
          preview_text: preview.overview.substring(0, 500), // Scannable preview
        })
        .eq('id', material_id);

      // STEP 5: Update notebook with AI-generated title and preview
      await supabase
        .from('notebooks')
        .update({
          title: aiTitle,
          emoji: llmResult.emoji,
          color: llmResult.color,
          status: 'preview_ready',
          meta: { preview },
          preview_generated_at: new Date().toISOString(),
        })
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
