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
    // For now, return the URL so the AI can at least try to talk about it or we can implement the fetcher next
    return {
      text: `YouTube Video URL: ${external_url}\n\n[Transcript extraction in progress...]`
    };
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
  const systemPrompt = `You are an elite academic summarizer. Generate a scannable title, a concise narrative overview, and three curiosity-gap suggested questions for study material.

Output ONLY valid JSON in this exact format:
{
  "title": "Concise headline (max 60 characters)",
  "overview": "A clear, narrative overview (60-85 words) as a single continuous paragraph. Explain the central themes, why it matters, and the author's key point.",
  "suggested_questions": [
    "A content-specific question that sparks curiosity",
    "A practical application question",
    "A deep-dive question about a core concept"
  ]
}

CRITICAL RULES:
1. The overview MUST be 60-85 words.
2. Write exactly 1 paragraph for the overview.
3. Use **bold** strategically (3-5 key phrases) in the overview only.
4. suggested_questions MUST be specific to the text. For example, if it's about physics, ask about a specific law mentioned.
5. DO NOT generate the answers to the questions. Just the questions.
6. The title field must be plain text with NO markdown formatting.`;

  // Use more content for better context (7000 chars instead of 3000)
  const contentWindow = Math.min(7000, extractedContent.length);
  const userPrompt = `Read the provided document and produce the requested JSON.

Current title (improve it): ${currentTitle || 'Untitled'}

Document content (first ${contentWindow} characters):
${extractedContent.substring(0, contentWindow)}

Generate the JSON with title, narrative overview, and suggested questions.`;

  // Call LLM with retry (uses cheap model: Grok)
  // Increased temperature to 0.5 for better synthesis
  const result = await callLLMWithRetry('preview', systemPrompt, userPrompt, {
    temperature: 0.5,
    maxRetries: 3,
  });

  // Parse JSON response
  try {
    const response = JSON.parse(result.content);

    // Validate structure and types
    if (
      !response.title ||
      typeof response.title !== 'string' ||
      !response.overview ||
      typeof response.overview !== 'string'
    ) {
      throw new Error('Invalid response structure: missing or invalid fields');
    }

    // Trim, strip markdown, and validate title length
    let cleanedTitle = response.title.trim();
    // Strip any markdown formatting that might have been added (defensive programming)
    cleanedTitle = stripMarkdown(cleanedTitle).trim();
    if (cleanedTitle.length === 0) {
      throw new Error('Title cannot be empty');
    }
    if (cleanedTitle.length > 60) {
      throw new Error(`Title too long: ${cleanedTitle.length} characters(max 60)`);
    }

    // Validate overview length (60-85 words target - quick, scannable overview)
    // Remove any paragraph breaks/newlines and convert to single paragraph
    let trimmedOverview = response.overview.trim();
    // Replace multiple newlines/paragraph breaks with a single space
    trimmedOverview = trimmedOverview.replace(/\n\s*\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    if (trimmedOverview.length === 0) {
      throw new Error('Overview cannot be empty');
    }
    const wordCount = trimmedOverview.split(/\s+/).length;

    // STRICT VALIDATION: Reject if less than 55 words (allowing small margin for 60 word minimum)
    if (wordCount < 55) {
      // Throw error to force retry - the model must generate a proper overview
      throw new Error(
        `Overview too short: ${wordCount} words(minimum 60 words required). ` +
        `The overview must be a clear, concise narrative(60 - 85 words), not a brief summary. ` +
        `It should explain what the document is about, central themes, author's perspective, purpose and context, and why it matters. ` +
        `Write in a neutral, polished, professional tone. Do not write a TL;DR or bullet list. Aim for concise but informative.`
      );
    }
    // STRICT VALIDATION: Reject if too long (over 90 words - allowing small margin for 85 word maximum)
    if (wordCount > 90) {
      // Throw error to force retry - the model must generate a concise overview
      throw new Error(
        `Overview too long: ${wordCount} words (maximum 85 words required). ` +
        `The overview must be a quick, scannable summary (60-85 words), not a lengthy description. ` +
        `Focus on the most important information: what the document is about, central themes, and why it matters. ` +
        `Write in a neutral, polished, professional tone. Be concise and informative.`
      );
    }
    // Warn if slightly outside ideal range but still acceptable
    if (wordCount < 60 || wordCount > 85) {
      console.log(`Overview word count: ${wordCount} (target: 60-85 words for quick, scannable overview)`);
    }

    // Extract preview
    const preview = {
      overview: trimmedOverview,
      suggested_questions: response.suggested_questions || [],
    };

    // Return cleaned title (markdown stripped), preview with actual usage statistics from LLM
    return {
      title: cleanedTitle,
      preview,
      usage: result.usage,
      costCents: result.costCents,
      model: result.model,
      latency: result.latency,
    };
  } catch (parseError) {
    console.error('Failed to parse LLM response:', result.content);
    const errorDetails = parseError instanceof Error ? parseError.message : String(parseError);
    const responsePreview = result.content?.substring(0, 200) || '[empty response]';
    throw new Error(
      `Failed to parse LLM response: ${errorDetails}. Response preview: ${responsePreview}`
    );
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
      return new Response(
        JSON.stringify({
          error: 'Material not found',
          details: materialError,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get notebook and verify user ownership
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select('id, user_id, title')
      .eq('material_id', material_id)
      .single();

    if (notebookError || !notebook) {
      return new Response(JSON.stringify({ error: 'Associated notebook not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const notebookId = notebook.id;
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

      // Guard: Validate content length before processing
      if (!extractedContent || extractedContent.trim().length < 10) {
        throw new Error(
          'Content too short to generate meaningful title and preview (minimum 10 characters required)'
        );
      }

      // STEP 2: Save extracted content (partial success - show even if preview fails)
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

      // STEP 3: Generate AI title and preview
      console.log('Generating AI title and preview...');
      const previewStartTime = Date.now();

      const llmResult = await generateTitleAndPreview(extractedContent, notebook.title);
      const aiTitle = llmResult.title;
      const preview = llmResult.preview;

      const previewLatency = Date.now() - previewStartTime;
      console.log(`AI title and preview generated in ${previewLatency}ms`);

      // STEP 4: Update material with preview_text (use overview for preview_text)
      await supabase
        .from('materials')
        .update({
          preview_text: preview.overview,
        })
        .eq('id', material_id);

      // STEP 5: Update notebook with AI-generated title and preview
      await supabase
        .from('notebooks')
        .update({
          title: aiTitle,
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
