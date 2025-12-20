/**
 * Generate Studio Content Edge Function
 * Generates flashcards or quiz questions from material content using Grok 4.1 Fast
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { callLLMWithRetry } from '../_shared/openrouter.ts';
import { checkQuota, incrementQuota } from '../_shared/quota.ts';
import { getRequiredEnv, getOptionalEnv } from '../_shared/env.ts';
import { getCorsHeaders, getCorsPreflightHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/ratelimit.ts';

interface GenerateStudioRequest {
  notebook_id: string;
  content_type: 'flashcards' | 'quiz';
}

interface GenerateStudioResponse {
  success: boolean;
  notebook_id: string;
  content_type: string;
  generated_count: number;
  content_id?: string; // quiz_id for quizzes
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsPreflightHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Initialize Supabase client (service role for database operations)
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
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
    const { notebook_id, content_type }: GenerateStudioRequest = await req.json();

    if (!notebook_id || !content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: notebook_id, content_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['flashcards', 'quiz'].includes(content_type)) {
      return new Response(
        JSON.stringify({ error: 'content_type must be "flashcards" or "quiz"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ${content_type} for notebook ${notebook_id}`);

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

    // 4.5. RATE LIMITING: Check if user is making too many requests
    const rateLimitResult = await checkRateLimit({
      identifier: user.id,
      limit: RATE_LIMITS.GENERATE_STUDIO.limit,
      window: RATE_LIMITS.GENERATE_STUDIO.window,
      endpoint: 'generate-studio-content',
    });

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please wait before generating more content.',
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
            'X-RateLimit-Limit': String(RATE_LIMITS.GENERATE_STUDIO.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        }
      );
    }

    // 5. CHECK QUOTA (trial users: 5 Studio jobs)
    const quotaCheck = await checkQuota(supabase, user.id, 'studio');
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

    // 7. Calculate dynamic quantity based on word count
    const wordCount = material.content.split(/\s+/).length;
    const quantity = content_type === 'flashcards'
      ? Math.max(5, Math.min(20, Math.floor(wordCount / 400)))
      : Math.max(3, Math.min(10, Math.floor(wordCount / 600)));

    console.log(`Calculated quantity: ${quantity} ${content_type} (${wordCount} words)`);

    // 8. Generate content via LLM
    const systemPrompt = getSystemPrompt(content_type, quantity);
    const userPrompt = getUserPrompt(content_type, quantity, notebook.title, material.content);

    console.log('Calling LLM...');
    const llmResult = await callLLMWithRetry(
      'studio',
      systemPrompt,
      userPrompt,
      { temperature: content_type === 'flashcards' ? 0.7 : 0.5 }
    );

    console.log(`LLM response received. Tokens: ${llmResult.usage.totalTokens}, Cost: ${llmResult.costCents}¢`);

    // 9. Parse and validate JSON (with markdown stripping)
    let parsed: any;
    try {
      let jsonContent = llmResult.content;

      // Strip markdown code blocks if present (LLMs sometimes wrap JSON in ```json ... ```)
      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      parsed = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', parseError);
      console.error('LLM response:', llmResult.content.substring(0, 500));
      throw new Error('Invalid JSON response from LLM');
    }

    // 10. Insert into database
    let generatedCount = 0;
    let contentId: string | undefined;

    if (content_type === 'flashcards') {
      if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
        throw new Error('Invalid flashcards response structure');
      }

      const { data: inserted, error: insertError } = await supabase
        .from('studio_flashcards')
        .insert(
          parsed.flashcards.map((fc: any) => ({
            notebook_id,
            question: fc.question,
            answer: fc.answer,
            explanation: fc.explanation || null,
            tags: fc.tags || [],
          }))
        )
        .select();

      if (insertError) {
        console.error('Failed to insert flashcards:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }

      generatedCount = inserted?.length || 0;
      console.log(`Inserted ${generatedCount} flashcards`);
    } else {
      // Quiz generation
      if (!parsed.quiz || !parsed.quiz.questions || !Array.isArray(parsed.quiz.questions)) {
        throw new Error('Invalid quiz response structure');
      }

      // Validate explanations structure
      for (const q of parsed.quiz.questions) {
        if (q.explanations) {
          const keys = Object.keys(q.explanations);
          if (!keys.includes('A') || !keys.includes('B') ||
              !keys.includes('C') || !keys.includes('D')) {
            console.warn(`Question missing explanation keys: ${q.question.substring(0, 50)}...`);
            // Set to null if incomplete rather than failing
            q.explanations = null;
          }
        }
      }

      // Rebalance options to avoid all correct answers on the same letter
      const balancedQuestions = rebalanceQuizQuestions(parsed.quiz.questions);

      // Insert quiz metadata
      const { data: quiz, error: quizError } = await supabase
        .from('studio_quizzes')
        .insert({
          notebook_id,
          title: parsed.quiz.title || `${notebook.title} Quiz`,
          total_questions: balancedQuestions.length,
        })
        .select()
        .single();

      if (quizError || !quiz) {
        console.error('Failed to insert quiz:', quizError);
        throw new Error(`Database error: ${quizError?.message || 'Failed to create quiz'}`);
      }

      contentId = quiz.id;
      console.log(`Created quiz: ${contentId}`);

      // Insert quiz questions
      const { error: questionsError } = await supabase
        .from('studio_quiz_questions')
        .insert(
          balancedQuestions.map((q: any, idx: number) => ({
            quiz_id: quiz.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correct,
            hint: q.hint || null,
            explanation: null,
            explanations: q.explanations || null,
            display_order: idx,
          }))
        );

      if (questionsError) {
        console.error('Failed to insert quiz questions:', questionsError);
        // Clean up orphaned quiz to prevent partial failure
        await supabase.from('studio_quizzes').delete().eq('id', quiz.id);
        console.log(`Cleaned up orphaned quiz: ${quiz.id}`);
        throw new Error(`Database error: ${questionsError.message}`);
      }

      generatedCount = parsed.quiz.questions.length;
      console.log(`Inserted ${generatedCount} quiz questions`);
    }

    // 11. INCREMENT QUOTA (atomic)
    await incrementQuota(supabase, user.id, 'studio');
    console.log('Quota incremented');

    // 12. LOG USAGE
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      notebook_id,
      job_type: 'studio',
      model_used: llmResult.model,
      input_tokens: llmResult.usage.inputTokens,
      output_tokens: llmResult.usage.outputTokens,
      total_tokens: llmResult.usage.totalTokens,
      estimated_cost_cents: llmResult.costCents,
      latency_ms: llmResult.latency,
      status: 'success',
    });

    console.log('Usage logged');

    // 13. Return success
    const response: GenerateStudioResponse = {
      success: true,
      notebook_id,
      content_type,
      generated_count: generatedCount,
      content_id: contentId,
      message: `Successfully generated ${generatedCount} ${content_type}`,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error generating studio content:', error);

    // Log failed attempt
    try {
      const supabaseUrl = getRequiredEnv('SUPABASE_URL');
      const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('usage_logs').insert({
        user_id: null, // May not have user context at this point
        job_type: 'studio',
        status: 'error',
        error_message: error.message,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

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
 * Get system prompt for LLM based on content type
 */
function getSystemPrompt(contentType: string, count: number): string {
  if (contentType === 'flashcards') {
    return `You are an expert educational content creator specialized in generating high-quality flashcards for active learning.

Your task: Create exactly ${count} flashcards from the provided material.

OUTPUT FORMAT (JSON only, no markdown):
{
  "flashcards": [
    {
      "question": "Clear, specific question testing understanding",
      "answer": "Concise answer (2-3 sentences max)",
      "explanation": "Brief context or reasoning (optional if answer is self-explanatory)",
      "tags": ["topic1", "topic2"]
    }
  ]
}

QUALITY RULES:
1. Test understanding, not memorization. Use "Why", "How", "Explain the difference"
2. Answers must be complete but concise (30 seconds to read)
3. Spread flashcards across ALL major topics - don't cluster on one area
4. Mix difficulty: 40% foundational, 40% intermediate, 20% advanced
5. No ambiguous questions - ONE clear correct answer
6. Assign 1-3 topic tags per card (lowercase-hyphenated)

CRITICAL: Generate EXACTLY ${count} flashcards. Do not generate fewer.`;
  } else {
    return `You are an expert assessment designer creating multiple-choice quizzes with educational explanations.

Your task: Create exactly ${count} quiz questions from the provided material.

OUTPUT FORMAT (JSON only):
{
  "quiz": {
    "title": "Descriptive quiz title based on content",
    "questions": [
      {
        "question": "Clear, unambiguous question",
        "options": {
          "A": "Option text",
          "B": "Option text",
          "C": "Option text",
          "D": "Option text"
        },
        "correct": "A",
        "hint": "Short nudge (1 sentence) that helps without giving the answer",
        "explanations": {
          "A": "Why this is correct/incorrect (1-3 sentences, educational tone)",
          "B": "Why this is correct/incorrect (1-3 sentences, educational tone)",
          "C": "Why this is correct/incorrect (1-3 sentences, educational tone)",
          "D": "Why this is correct/incorrect (1-3 sentences, educational tone)"
        }
      }
    ]
  }
}

QUALITY RULES:
1. ONE objectively correct answer per question - no trick questions
2. Distractors (wrong options) must be plausible but clearly incorrect
3. Difficulty: 30% easy (recall), 50% medium (application), 20% hard (analysis)
4. Cover ALL major topics - don't cluster on one area
5. Hint should NOT reveal the answer; give a gentle nudge only (≤25 words)
6. Avoid "All/None of the above" options
7. Balance correct answers across A/B/C/D (not all A's)
8. Shuffle options so the correct letter varies; do NOT leave the correct answer on the same letter across questions

EXPLANATION RULES (NEW):
9. Write explanations in natural, educational tone - NOT formulaic
10. For CORRECT answers: Explain WHY it's correct and what concept it demonstrates
11. For WRONG answers: Explain WHY it's incorrect without being condescending
12. Length: 1-3 sentences each (aim for 2 sentences)
13. Avoid starting with "This is correct/incorrect because..." - be more natural
14. Reference the material content when relevant
15. Example for CORRECT: "This syntax signals to Claude Code that the following instruction should be treated as a permanent rule that applies throughout the session."
16. Example for WRONG: "The video demonstrates using /plugins to open a management interface, but does not mention a --force-install flag for dependency issues."

CRITICAL: Generate EXACTLY ${count} questions. Do not generate fewer.`;
  }
}

/**
 * Get user prompt with material content
 */
function getUserPrompt(
  contentType: string,
  count: number,
  notebookTitle: string,
  materialContent: string
): string {
  if (contentType === 'flashcards') {
    return `Generate ${count} flashcards from this study material.

Material Title: ${notebookTitle}

Material Content:
${materialContent}

Generate exactly ${count} flashcards covering all major topics in the material. Return ONLY the JSON response, no other text.`;
  } else {
    return `Generate a ${count}-question quiz from this study material.

Material Title: ${notebookTitle}

Material Content:
${materialContent}

Generate exactly ${count} quiz questions covering all major topics. Return ONLY the JSON response, no other text.`;
  }
}

/**
 * Shuffle options per question and avoid all correct answers sharing the same letter.
 * Preserves option/explanation pairing and remaps the correct letter accordingly.
 */
function rebalanceQuizQuestions(questions: any[]): any[] {
  const LETTERS = ['A', 'B', 'C', 'D'] as const;

  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  let attempt = 0;
  const maxAttempts = 5;
  let result: any[] = [];

  do {
    attempt++;
    result = questions.map((q: any) => {
      const entries = LETTERS.map((key) => ({
        key,
        text: q.options?.[key],
        explanation: q.explanations ? q.explanations[key] : undefined,
        isCorrect: q.correct === key,
      }));

      const shuffled = shuffle(entries);
      const newOptions: Record<string, string> = {};
      const newExplanations: Record<string, string> | null = q.explanations ? {} : null;
      let newCorrect = 'A';

      shuffled.forEach((entry, idx) => {
        const newKey = LETTERS[idx];
        newOptions[newKey] = entry.text;
        if (newExplanations) {
          newExplanations[newKey] = entry.explanation ?? '';
        }
        if (entry.isCorrect) {
          newCorrect = newKey;
        }
      });

      return {
        ...q,
        options: newOptions,
        correct: newCorrect,
        explanations: q.explanations ? newExplanations : null,
      };
    });
  } while (
    attempt < maxAttempts &&
    result.length > 0 &&
    result.every((q) => q.correct === result[0].correct)
  );

  return result;
}
