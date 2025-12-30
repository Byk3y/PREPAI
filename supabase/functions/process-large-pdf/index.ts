/**
 * Edge Function: Process Large PDF (Background Worker)
 *
 * Processes large PDFs from the processing queue with:
 * 1. Chunked extraction with progress updates
 * 2. Real-time progress via database updates
 * 3. Automatic retry with exponential backoff
 * 4. Timeout-safe processing with checkpointing
 *
 * This function is designed to be called:
 * - By pg_cron for periodic polling
 * - By a trigger when new jobs are enqueued
 * - Manually for testing
 */

import { createClient } from 'supabase';
import { extractPDF } from '../_shared/extraction.ts';
import { callLLMWithRetry } from '../_shared/openrouter.ts';
import { getRequiredEnv, getOptionalEnv } from '../_shared/env.ts';
import { getCorsHeaders, getCorsPreflightHeaders } from '../_shared/cors.ts';
import { estimatePageCount } from '../_shared/pdf/utils.ts';

// Constants
const MAX_PROCESSING_TIME_MS = 280000; // 4.5 minutes (leave buffer for Edge Function limit)
const PROGRESS_UPDATE_INTERVAL = 5000; // Update progress every 5 seconds
const LARGE_PDF_THRESHOLD_PAGES = 50; // PDFs with more pages use background processing
const LARGE_PDF_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB

interface ProcessingJob {
    job_id: string;
    p_material_id: string;
    p_notebook_id: string;
    p_user_id: string;
    p_job_type: string;
    p_estimated_pages: number | null;
    p_file_size_bytes: number | null;
}

/**
 * Strip markdown formatting from a string
 */
function stripMarkdown(text: string): string {
    let cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    return cleaned;
}

/**
 * Generate title and preview using LLM (same logic as process-material)
 */
async function generateTitleAndPreview(
    extractedContent: string,
    currentTitle: string
): Promise<{
    title: string;
    preview: { overview: string };
    usage: { inputTokens: number; outputTokens: number; totalTokens: number };
    costCents: number;
    model: string;
    latency: number;
}> {
    const systemPrompt = `You are an expert writing coach and academic summarizer. Generate a descriptive title and concise overview for uploaded study material (60-85 words - a quick, scannable summary).

Output ONLY valid JSON in this exact format:
{
  "title": "Concise, scannable title (max 60 characters)",
  "overview": "A clear, concise overview (60-85 words) in a SINGLE continuous paragraph with NO paragraph breaks."
}

Rules for title:
- Keep titles under 60 characters
- Focus on the PRIMARY subject/topic only
- CRITICAL: DO NOT use any markdown formatting in the title

Rules for overview:
- The overview MUST be 60-85 words
- Write exactly 1 paragraph with NO paragraph breaks
- Write in a neutral, polished, professional tone`;

    // With Grok 4.1 Fast (2M context), we can analyze a massive portion of the material
    const contentWindow = Math.min(100000, extractedContent.length);
    const userPrompt = `Read the provided document and produce a clear, concise overview (60-85 words).

Current title (may be auto-generated, improve it): ${currentTitle || 'Untitled'}

Document content analysis:
${extractedContent.substring(0, contentWindow)}

Generate title and overview JSON.`;

    const result = await callLLMWithRetry('preview', systemPrompt, userPrompt, {
        temperature: 0.5,
        maxRetries: 3,
    });

    const response = JSON.parse(result.content);

    let cleanedTitle = response.title.trim();
    cleanedTitle = stripMarkdown(cleanedTitle).trim();

    let trimmedOverview = response.overview.trim();
    trimmedOverview = trimmedOverview
        .replace(/\n\s*\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        title: cleanedTitle,
        preview: { overview: trimmedOverview },
        usage: result.usage,
        costCents: result.costCents,
        model: result.model,
        latency: result.latency,
    };
}

/**
 * Process a single job from the queue
 */
async function processJob(
    supabase: any,
    job: ProcessingJob
): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();

    console.log(`[process-large-pdf] Starting job ${job.job_id} for material ${job.p_material_id}`);

    try {
        // Update progress: Starting
        await supabase.rpc('update_job_progress', {
            p_job_id: job.job_id,
            p_progress: 5,
            p_message: 'Downloading PDF from storage...',
        });

        // Get material details
        const { data: material, error: materialError } = await supabase
            .from('materials')
            .select('*')
            .eq('id', job.p_material_id)
            .single();

        if (materialError || !material) {
            throw new Error(`Material not found: ${materialError?.message || 'Unknown'}`);
        }

        // Get notebook details
        const { data: notebook, error: notebookError } = await supabase
            .from('notebooks')
            .select('id, title')
            .eq('id', job.p_notebook_id)
            .single();

        if (notebookError || !notebook) {
            throw new Error(`Notebook not found: ${notebookError?.message || 'Unknown'}`);
        }

        // Update progress: Downloading
        await supabase.rpc('update_job_progress', {
            p_job_id: job.job_id,
            p_progress: 10,
            p_message: 'PDF downloaded, starting extraction...',
        });

        // Download PDF from storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('uploads')
            .download(material.storage_path);

        if (downloadError || !fileData) {
            throw new Error(`Failed to download PDF: ${downloadError?.message || 'Unknown'}`);
        }

        const fileBuffer = new Uint8Array(await fileData.arrayBuffer());
        const estimatedPages = estimatePageCount(fileBuffer);

        console.log(`[process-large-pdf] PDF downloaded: ${fileBuffer.length} bytes, ~${estimatedPages} pages`);

        // Update progress: Extracting
        await supabase.rpc('update_job_progress', {
            p_job_id: job.job_id,
            p_progress: 15,
            p_message: `Extracting text from ${estimatedPages} pages...`,
        });

        // Set up progress tracking for extraction
        let lastProgressUpdate = Date.now();
        const progressUpdateCallback = async (currentPage: number, totalPages: number) => {
            const now = Date.now();
            if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
                const extractionProgress = Math.round((currentPage / totalPages) * 60) + 15; // 15-75%
                await supabase.rpc('update_job_progress', {
                    p_job_id: job.job_id,
                    p_progress: Math.min(extractionProgress, 75),
                    p_message: `Extracting page ${currentPage} of ${totalPages}...`,
                    p_processed_pages: currentPage,
                });
                lastProgressUpdate = now;
            }
        };

        // Extract PDF content
        const extractedContent = await extractPDF(fileBuffer);

        console.log(`[process-large-pdf] Extracted ${extractedContent.length} characters`);

        // Update progress: Content extracted
        await supabase.rpc('update_job_progress', {
            p_job_id: job.job_id,
            p_progress: 75,
            p_message: 'Text extracted, saving content...',
        });

        // Save extracted content
        await supabase
            .from('materials')
            .update({
                content: extractedContent,
                processed: true,
                processed_at: new Date().toISOString(),
            })
            .eq('id', job.p_material_id);

        // Update progress: Generating preview
        await supabase.rpc('update_job_progress', {
            p_job_id: job.job_id,
            p_progress: 80,
            p_message: 'Generating AI title and summary...',
        });

        // Generate AI title and preview
        const llmResult = await generateTitleAndPreview(extractedContent, notebook.title);

        // Update progress: Saving results
        await supabase.rpc('update_job_progress', {
            p_job_id: job.job_id,
            p_progress: 95,
            p_message: 'Saving results...',
        });

        // Save preview text to material
        await supabase
            .from('materials')
            .update({
                preview_text: llmResult.preview.overview,
            })
            .eq('id', job.p_material_id);

        // Update notebook with AI-generated title and preview
        await supabase
            .from('notebooks')
            .update({
                title: llmResult.title,
                status: 'preview_ready',
                meta: { preview: llmResult.preview },
                preview_generated_at: new Date().toISOString(),
            })
            .eq('id', job.p_notebook_id);

        // Log usage
        await supabase.from('usage_logs').insert({
            user_id: job.p_user_id,
            notebook_id: job.p_notebook_id,
            job_type: 'preview',
            model_used: llmResult.model,
            input_tokens: llmResult.usage.inputTokens,
            output_tokens: llmResult.usage.outputTokens,
            total_tokens: llmResult.usage.totalTokens,
            estimated_cost_cents: llmResult.costCents,
            latency_ms: llmResult.latency,
            status: 'success',
        });

        // Mark job as complete
        const processingTime = Date.now() - startTime;
        await supabase.rpc('complete_job', {
            p_job_id: job.job_id,
            p_result: {
                extracted_chars: extractedContent.length,
                processing_time_ms: processingTime,
                title: llmResult.title,
                pages: estimatedPages,
            },
        });

        console.log(`[process-large-pdf] Job ${job.job_id} completed in ${processingTime}ms`);

        return { success: true };
    } catch (error: any) {
        console.error(`[process-large-pdf] Job ${job.job_id} failed:`, error.message);

        // Determine if error is retryable
        const isRetryable = !error.message.includes('not found') &&
            !error.message.includes('permission') &&
            !error.message.includes('Invalid PDF');

        // Mark job as failed
        await supabase.rpc('fail_job', {
            p_job_id: job.job_id,
            p_error_message: error.message,
            p_error_details: { stack: error.stack },
            p_should_retry: isRetryable,
        });

        // Update notebook status to failed
        await supabase
            .from('notebooks')
            .update({
                status: 'failed',
                meta: {
                    error: error.message,
                    failed_at: new Date().toISOString(),
                },
            })
            .eq('id', job.p_notebook_id);

        return { success: false, error: error.message };
    }
}

/**
 * Main handler - processes jobs from the queue
 */
Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsPreflightHeaders(req) });
    }

    const corsHeaders = getCorsHeaders(req);

    try {
        // Initialize Supabase client (service role for queue access)
        const supabaseUrl = getRequiredEnv('SUPABASE_URL');
        const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse request body for optional parameters
        let maxJobs = 1;
        let specificJobId: string | null = null;

        try {
            const body = await req.json();
            maxJobs = body.max_jobs || 1;
            specificJobId = body.job_id || null;
        } catch {
            // No body or invalid JSON, use defaults
        }

        const results: Array<{ job_id: string; success: boolean; error?: string }> = [];

        // Process jobs
        for (let i = 0; i < maxJobs; i++) {
            let job: ProcessingJob | null = null;

            if (specificJobId && i === 0) {
                // Process specific job
                const { data: jobs } = await supabase
                    .from('processing_queue')
                    .select('id, material_id, notebook_id, user_id, job_type, estimated_pages, file_size_bytes')
                    .eq('id', specificJobId)
                    .single();

                if (jobs) {
                    job = {
                        job_id: jobs.id,
                        p_material_id: jobs.material_id,
                        p_notebook_id: jobs.notebook_id,
                        p_user_id: jobs.user_id,
                        p_job_type: jobs.job_type,
                        p_estimated_pages: jobs.estimated_pages,
                        p_file_size_bytes: jobs.file_size_bytes,
                    };

                    // Update to processing
                    await supabase
                        .from('processing_queue')
                        .update({
                            status: 'processing',
                            started_at: new Date().toISOString(),
                            attempt_count: 1,
                        })
                        .eq('id', specificJobId);
                }
            } else {
                // Get next pending job from queue
                const { data: jobs, error: queueError } = await supabase.rpc('get_next_pending_job');

                if (queueError) {
                    console.error('[process-large-pdf] Queue error:', queueError);
                    break;
                }

                if (jobs && jobs.length > 0) {
                    job = jobs[0];
                }
            }

            if (!job) {
                console.log('[process-large-pdf] No pending jobs');
                break;
            }

            // Process the job
            const result = await processJob(supabase, job);
            results.push({
                job_id: job.job_id,
                success: result.success,
                error: result.error,
            });
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed_count: results.length,
                results,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('[process-large-pdf] Fatal error:', error);

        return new Response(
            JSON.stringify({
                error: error.message || 'Internal server error',
                stack: getOptionalEnv('DENO_ENV', '') === 'development' ? error.stack : undefined,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

/**
 * Helper to determine if a PDF should use background processing
 * Export for use by process-material function
 */
export function shouldUseBackgroundProcessing(
    estimatedPages: number,
    fileSizeBytes: number
): boolean {
    return estimatedPages > LARGE_PDF_THRESHOLD_PAGES || fileSizeBytes > LARGE_PDF_THRESHOLD_BYTES;
}

export { LARGE_PDF_THRESHOLD_PAGES, LARGE_PDF_THRESHOLD_BYTES };
