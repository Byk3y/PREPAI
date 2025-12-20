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
  const systemPrompt = `You are an expert writing coach and academic summarizer. Generate a descriptive title and concise overview for uploaded study material (60-85 words - a quick, scannable summary).

Output ONLY valid JSON in this exact format:
{
  "title": "Concise, scannable title (max 60 characters)",
  "overview": "A clear, concise overview (60-85 words) in a SINGLE continuous paragraph with NO paragraph breaks. It should explain what the document is about, the central themes, the author's perspective or background (if present), the purpose and context of the writing, and why the material matters. Write in a neutral, polished, professional tone. Do not write a TL;DR or bullet list. Produce a coherent narrative summary in one flowing paragraph."
}

CRITICAL RULES FOR OVERVIEW:
- The overview MUST be 60-85 words. This is NOT optional.
- Write exactly 1 paragraph with NO paragraph breaks, line breaks, or blank lines within it. The entire overview must be a single continuous paragraph.
- Explain: what the document is about, central themes, author's perspective/background, purpose and context, why it matters.
- Write in a neutral, polished, professional tone.
- Do NOT write a TL;DR or bullet list.
- Do NOT split into multiple paragraphs - use a single continuous paragraph only.
- Produce a coherent narrative summary in one flowing paragraph.
- Aim for concise but informative - a quick, scannable overview (60-85 words).

FORMATTING RULES (IMPORTANT - Follow NotebookLM's style):
- Use **bold markdown** (double asterisks) to emphasize important concepts, key themes, significant actions, and critical phrases. Examples: **dopamine acts as a hidden driver**, **managing cultural campaigns**, **formalize this literary trajectory**.
- Use *italic markdown* (single asterisks) for titles of works, manuscripts, books, or proper nouns that are works. Examples: *Dopamine: The New Addiction*, *ShineTTW*, *Lokaa*.
- Bold should be used strategically for 3-5 key phrases per overview to highlight the most important concepts.
- Italic should be used for work titles and proper nouns that are creative works or platforms.

Rules for title:
- Keep titles under 60 characters - think like a newspaper headline: concise, punchy, and scannable.
- Focus on the PRIMARY subject/topic only - avoid including secondary details that belong in the overview.
- Prioritize the main topic over exhaustive descriptions. The overview contains all details; the title should be instantly recognizable.
- Examples of good concise titles: "Cognitive Psychology Fundamentals", "Industrial Revolution", "Francis Chukwuma on Dopamine", "Employment Certificate", "ShineTTW Contract".
- Avoid overly descriptive titles like "Ore-sax Employment Certificate for ShineTTW's Standing Ovation Master" - instead use "Employment Certificate" or "ShineTTW Contract".
- Make it specific and engaging, but prioritize brevity over completeness.
- CRITICAL: DO NOT use any markdown formatting in the title. No asterisks (*), no bold (**), no italic. The title must be plain text only.`;

  // Use more content for better context (7000 chars instead of 3000)
  const contentWindow = Math.min(7000, extractedContent.length);
  const userPrompt = `Read the provided document and produce a clear, concise overview (60-85 words).

Current title (may be auto-generated, improve it): ${currentTitle || 'Untitled'}

Document content (first ${contentWindow} characters):
${extractedContent.substring(0, contentWindow)}

Generate title and overview JSON. The overview should explain what the document is about, the central themes, the author's perspective or background (if present), the purpose and context of the writing, and why the material matters. Write in a neutral, polished, professional tone. Do not write a TL;DR or bullet list. Produce a coherent narrative summary of 60-85 words in a SINGLE continuous paragraph with NO paragraph breaks or line breaks (a quick, scannable overview).

CRITICAL FOR TITLE: Keep it under 60 characters. Focus on the main topic only - think like a headline. Avoid including secondary details. The overview contains all the details; the title should be instantly scannable.

IMPORTANT: Use markdown formatting for emphasis IN THE OVERVIEW ONLY:
- Use **bold** (double asterisks) for 3-5 key important concepts, themes, or significant phrases
- Use *italic* (single asterisks) for titles of works, manuscripts, or creative platforms
- Follow NotebookLM's style of strategically emphasizing the most important information with bold formatting.
- REMEMBER: The title field must be plain text with NO markdown formatting whatsoever.`;

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
      throw new Error(`Title too long: ${cleanedTitle.length} characters (max 60)`);
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
        `Overview too short: ${wordCount} words (minimum 60 words required). ` +
        `The overview must be a clear, concise narrative (60-85 words), not a brief summary. ` +
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

    // Extract preview (only overview, no who_for or next_step)
    const preview = {
      overview: trimmedOverview,
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
    //   - Audio jobs (audio overview generation) - 3 for trial
    // Quota check will be added in Phase 3 (Studio) and Phase 4 (Audio)

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
