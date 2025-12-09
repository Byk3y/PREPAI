/**
 * Generate Audio Overview Edge Function
 * Creates NotebookLM-style podcast audio overviews using:
 * - Gemini 2.5 Pro for script generation
 * - Gemini 2.5 Flash TTS for audio generation
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkQuota, incrementQuota } from '../_shared/quota.ts';
import { generatePodcastScript, validateScript } from '../_shared/script-generator.ts';
import { generatePodcastAudioWithRetry, getAudioDuration } from '../_shared/gemini-tts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateAudioRequest {
  notebook_id: string;
}

interface GenerateAudioResponse {
  success: boolean;
  overview_id: string;
  status: string;
  estimated_completion_seconds?: number;
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase client (service role for database operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. AUTHENTICATE: Verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    // 3. Parse request
    const { notebook_id }: GenerateAudioRequest = await req.json();

    if (!notebook_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: notebook_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating audio overview for notebook ${notebook_id}`);

    // 4. Fetch notebook and AUTHORIZE (verify ownership)
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select('id, user_id, title, material_id')
      .eq('id', notebook_id)
      .single();

    if (notebookError || !notebook) {
      console.error('Notebook not found:', notebookError);
      return new Response(
        JSON.stringify({ error: 'Notebook not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (notebook.user_id !== user.id) {
      console.error('Unauthorized access attempt:', { userId: user.id, notebookUserId: notebook.user_id });
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this notebook' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. CHECK QUOTA (trial users: 3 audio overviews)
    const quotaCheck = await checkQuota(supabase, user.id, 'audio');
    if (!quotaCheck.allowed) {
      console.warn('Quota exceeded:', quotaCheck);
      return new Response(
        JSON.stringify({
          error: quotaCheck.reason,
          remaining: quotaCheck.remaining,
          limit: quotaCheck.limit,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Quota check passed. Remaining: ${quotaCheck.remaining}`);

    // 6. Fetch material content
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('content')
      .eq('id', notebook.material_id)
      .single();

    if (materialError || !material?.content) {
      console.error('Material not found or empty:', materialError);
      return new Response(
        JSON.stringify({ error: 'Material content not found or empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (material.content.length < 500) {
      return new Response(
        JSON.stringify({ error: 'Material content too short (minimum 500 characters required)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Material content length: ${material.content.length} chars`);

    // 6.5 Fetch User's Pet Name
    const { data: petData } = await supabase
      .from('pet_states')
      .select('name')
      .eq('user_id', user.id)
      .single();

    const petName = petData?.name || 'Sparky';
    console.log(`Using pet name: ${petName}`);

    // 7. Delete any existing failed records for this notebook (to avoid UNIQUE constraint violation)
    await supabase
      .from('audio_overviews')
      .delete()
      .eq('notebook_id', notebook_id)
      .eq('status', 'failed');

    // 8. Find the next available version number
    const { data: existingVersions } = await supabase
      .from('audio_overviews')
      .select('version')
      .eq('notebook_id', notebook_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingVersions && existingVersions.length > 0
      ? (existingVersions[0].version || 1) + 1
      : 1;

    // 9. Create audio_overviews record (status='generating_script')
    const { data: overview, error: createError } = await supabase
      .from('audio_overviews')
      .insert({
        notebook_id,
        user_id: user.id,
        title: `${notebook.title} - Audio Overview`,
        duration: 0, // Will be updated after generation
        storage_path: '', // Will be updated after upload
        script: '', // Will be updated after generation
        status: 'generating_script',
        version: nextVersion,
      })
      .select()
      .single();

    if (createError || !overview) {
      console.error('Failed to create audio overview record:', createError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create audio overview record',
          details: createError?.message || 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created audio overview record: ${overview.id} (version ${nextVersion})`);

    // 10. GENERATE SCRIPT (Gemini 2.5 Pro - two-stage)
    let scriptResult;
    try {
      scriptResult = await generatePodcastScript({
        materialContent: material.content,
        notebookTitle: notebook.title,
        petName: petName,
      });

      // Validate script
      const validation = validateScript(scriptResult.script);
      if (!validation.valid) {
        throw new Error(`Invalid script: ${validation.errors.join(', ')}`);
      }

      console.log(`Script generated: ${scriptResult.wordCount} words, ${scriptResult.estimatedMinutes.toFixed(1)}min`);

      // Update record with script
      await supabase
        .from('audio_overviews')
        .update({
          script: scriptResult.script,
          llm_tokens: scriptResult.llmTokens,
          status: 'generating_audio',
        })
        .eq('id', overview.id);

    } catch (error: any) {
      console.error('Script generation failed:', error);

      await supabase
        .from('audio_overviews')
        .update({
          status: 'failed',
          error_message: `Script generation failed: ${error.message}`,
        })
        .eq('id', overview.id);

      throw error;
    }

    // 11. GENERATE AUDIO (Gemini 2.5 Flash TTS)
    let audioResult;
    try {
      audioResult = await generatePodcastAudioWithRetry({
        script: scriptResult.script,
        speakerMap: scriptResult.speakerMap,
      });

      console.log(`Audio generated: ${audioResult.audioBytes.length} bytes, ${audioResult.durationSeconds.toFixed(1)}s`);

    } catch (error: any) {
      console.error('Audio generation failed:', error);

      await supabase
        .from('audio_overviews')
        .update({
          status: 'failed',
          error_message: `Audio generation failed: ${error.message}`,
        })
        .eq('id', overview.id);

      throw error;
    }

    // 12. UPLOAD TO STORAGE
    // Determine file extension from MIME type
    const mimeToExtension: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/L16': 'wav', // Raw PCM, treat as WAV
    };
    const fileExtension = mimeToExtension[audioResult.mimeType] || 'wav';
    const contentType = audioResult.mimeType.startsWith('audio/L16') ? 'audio/wav' : audioResult.mimeType;

    console.log(`Audio format: ${audioResult.mimeType} -> .${fileExtension}`);

    const storagePath = `${user.id}/audio_overviews/${notebook_id}/${overview.id}.${fileExtension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, audioResult.audioBytes, {
          contentType: contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      console.log(`Uploaded to storage: ${storagePath}`);

    } catch (error: any) {
      console.error('Storage upload failed:', error);

      await supabase
        .from('audio_overviews')
        .update({
          status: 'failed',
          error_message: `Storage upload failed: ${error.message}`,
        })
        .eq('id', overview.id);

      throw error;
    }

    // 13. GENERATE SIGNED URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('uploads')
      .createSignedUrl(storagePath, 7 * 24 * 3600); // 7 days

    if (signedUrlError) {
      console.error('Failed to generate signed URL:', signedUrlError);
    }

    const audioUrl = signedUrlData?.signedUrl || null;

    // 14. COMPLETE: Update record with final data
    // Prefer TTS-reported durationSeconds for accuracy; fall back to file-size heuristic only if missing.
    const actualDuration =
      typeof audioResult.durationSeconds === 'number' && !Number.isNaN(audioResult.durationSeconds)
        ? Math.max(1, Math.round(audioResult.durationSeconds * 10) / 10) // keep one decimal, min 1s
        : getAudioDuration(audioResult.audioBytes);
    const ttsCostCents = Math.ceil((audioResult.audioTokens / 1000) * 10); // $10 per 1M tokens
    const totalCostCents = scriptResult.costCents + ttsCostCents;

    await supabase
      .from('audio_overviews')
      .update({
        status: 'completed',
        duration: actualDuration,
        storage_path: storagePath,
        audio_url: audioUrl,
        file_size_bytes: audioResult.audioBytes.length,
        tts_audio_tokens: audioResult.audioTokens,
        generation_cost_cents: totalCostCents,
        completed_at: new Date().toISOString(),
      })
      .eq('id', overview.id);

    console.log(`Audio overview completed: ${overview.id} (${totalCostCents}¢)`);

    // 15. INCREMENT QUOTA (atomic)
    await incrementQuota(supabase, user.id, 'audio');
    console.log('Quota incremented');

    // 16. LOG USAGE
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      notebook_id,
      job_type: 'audio',
      model_used: 'gemini-2.5-pro + gemini-2.5-flash-tts',
      input_tokens: scriptResult.llmTokens,
      output_tokens: audioResult.audioTokens,
      total_tokens: scriptResult.llmTokens + audioResult.audioTokens,
      estimated_cost_cents: totalCostCents,
      status: 'success',
    });

    console.log('Usage logged');

    // 17. Return success
    const response: GenerateAudioResponse = {
      success: true,
      overview_id: overview.id,
      status: 'completed',
      message: `Successfully generated ${actualDuration.toFixed(1)}-second audio overview`,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating audio overview:', error);

    // Log failed attempt
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('usage_logs').insert({
        user_id: null,
        job_type: 'audio',
        status: 'error',
        error_message: error.message,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        stack: Deno.env.get('DENO_ENV') === 'development' ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
