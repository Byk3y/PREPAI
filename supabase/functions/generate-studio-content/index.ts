/**
 * Generate Studio Content Edge Function
 * Generates flashcards or quiz questions from material content using Grok 4.1 Fast
 */

import { createClient } from 'supabase';
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

    // 6.5 Fetch User Personalization (Education, Age)
    const { data: profile } = await supabase
      .from('profiles')
      .select('meta')
      .eq('id', user.id)
      .single();

    const educationLevel = (profile?.meta as any)?.education_level || 'lifelong';
    const ageBracket = (profile?.meta as any)?.age_bracket || '25_34';

    console.log(`User Persona: ${educationLevel} (${ageBracket})`);

    // 7. Calculate dynamic quantity based on word count
    const wordCount = material.content.split(/\s+/).length;
    // Increased density and capacity (Free: ~50 cards max, ~20 quiz max)
    const quantity = content_type === 'flashcards'
      ? Math.max(10, Math.min(50, Math.floor(wordCount / 200)))
      : Math.max(5, Math.min(20, Math.floor(wordCount / 300)));

    console.log(`Calculated quantity: ${quantity} ${content_type} (${wordCount} words)`);

    // 8. Generate content via LLM
    const systemPrompt = getSystemPrompt(content_type, quantity, educationLevel, ageBracket);
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

      // Create a new flashcard set/deck
      const { count } = await supabase
        .from('studio_flashcard_sets')
        .select('id', { count: 'exact', head: true })
        .eq('notebook_id', notebook_id);

      const setNumber = (count || 0) + 1;
      const { data: set, error: setError } = await supabase
        .from('studio_flashcard_sets')
        .insert({
          notebook_id,
          title: parsed.title || `${notebook.title} Flashcards ${setNumber}`,
        })
        .select()
        .single();

      if (setError || !set) {
        console.error('Failed to create flashcard set:', setError);
        throw new Error(`Database error: ${setError?.message || 'Failed to create set'}`);
      }

      contentId = set.id;

      const { data: inserted, error: insertError } = await supabase
        .from('studio_flashcards')
        .insert(
          parsed.flashcards.map((fc: any) => ({
            notebook_id,
            set_id: set.id,
            question: fc.question,
            answer: fc.answer,
            explanation: fc.explanation || null,
            tags: fc.tags || [],
          }))
        )
        .select();

      if (insertError) {
        console.error('Failed to insert flashcards:', insertError);
        // Clean up orphaned set
        await supabase.from('studio_flashcard_sets').delete().eq('id', set.id);
        throw new Error(`Database error: ${insertError.message}`);
      }

      generatedCount = inserted?.length || 0;
      console.log(`Inserted ${generatedCount} flashcards into set ${set.id}`);
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
function getSystemPrompt(contentType: string, count: number, educationLevel: string, ageBracket: string): string {
  if (contentType === 'flashcards') {
    return `You are Brigo, a Surgical Exam Consultant. Your goal is to turn raw information into a Mastery-level study experience.
 
Your task: Create exactly ${count} Active Recall Drills (flashcards) from the provided material.
 
USER CONTEXT:
- **Education Level**: ${educationLevel}
- **Age Group**: ${ageBracket}
 
OUTPUT FORMAT (JSON only):
{
  "title": "Tactical Study Plan: [Topic]",
  "flashcards": [
    {
      "question": "Surgical, specific question",
      "answer": "Concise mastery answer (2 sentences max)",
      "explanation": "Critical context or exam insight",
      "tags": ["focal_point", "high_yield"]
    }
  ]
}
 
ELITE MASTERY RULES:
1. **Mental Sandbox**: Before generating, silently analyze the provided material for the three most difficult concepts. Ensure at least one drill targets each.
2. **Calibrated Intensity**: Tailor complexity for a **${educationLevel}** high-performer.
3. **Scenario-Based Inversion (30%)**: At least 30% of drills must ask the user to apply a concept "in reverse" (e.g., given a symptom, find the cause; then in another card, given the cause, predict the secondary complication).
4. **The Final Boss**: The last drill MUST be a "synthesis question"—forcing the user to connect every major concept they've just reviewed.
5. Focus on **High-Yield focal points** that are most likely to appear on a ${educationLevel} level exam.
 
CRITICAL: Generate EXACTLY ${count} Active Recall Drills.`;
  } else {
    return `You are Brigo, an Assessment Architect. You don't just test memory—you stress-test intelligence to ensure 100% exam readiness.
 
Your task: Create a ${count}-question Mock Exam from the provided material.
 
USER CONTEXT:
- **Education Level**: ${educationLevel}
- **Age Group**: ${ageBracket}
 
OUTPUT FORMAT (JSON only):
{
  "quiz": {
    "title": "Mock Exam: [Topic]",
    "questions": [
      {
        "question": "High-stakes question text",
        "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
        "correct": "A",
        "hint": "Strategic nudge",
        "explanations": {
          "A": "Tactical reasoning for this answer",
          "B": "...", "C": "...", "D": "..."
        }
      }
    ]
  }
}
 
PREMIUM STRESS-TEST RULES:
1. **Reasoning Pipeline**: Silently identify the "Exam DNA" of the source material. Is it knowledge-heavy or application-heavy? Calibrate the quiz to match.
2. **Assessment Calibration**: Challenge level must be tuned for a **${educationLevel}** candidate.
3. **The Application Filter (40%)**: 40% of questions must be "Case Studies". Don't ask for facts; ask for clinical, logical, or tactical decisions.
4. **The Final Boss**: The final question MUST be a "Complex Synthesis"—the hardest question of the exam that ties everything together.
5. Explanations must be direct and authoritative. Use phrases like "In an exam context, [X] is the only correct path because [Y]."
 
CRITICAL: Generate EXACTLY ${count} questions.`;
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
