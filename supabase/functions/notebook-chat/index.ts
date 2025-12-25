import { createClient } from 'supabase';
import { getRequiredEnv } from '../_shared/env.ts';
import { getCorsHeaders, getCorsPreflightHeaders } from '../_shared/cors.ts';

interface ChatRequest {
    notebook_id: string;
    message: string;
    selected_material_ids?: string[];
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsPreflightHeaders(req) });
    }

    const corsHeaders = getCorsHeaders(req);

    try {
        const supabaseUrl = getRequiredEnv('SUPABASE_URL');
        const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const openRouterApiKey = getRequiredEnv('OPENROUTER_API_KEY');

        // 1. AUTHENTICATION
        const authHeader = req.headers.get('authorization');
        if (!authHeader) throw new Error('Missing authorization header');

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. PARSE REQUEST
        const { notebook_id, message, selected_material_ids } = await req.json() as ChatRequest;

        // 3. CONTEXT RETRIEVAL
        let context = "";
        if (selected_material_ids && selected_material_ids.length > 0) {
            const { data: materials } = await supabase
                .from('materials')
                .select('content, kind, meta')
                .in('id', selected_material_ids);

            if (materials) {
                context = materials
                    .filter((m: any) => m.content)
                    .map((m: any, i: number) => {
                        const title = m.meta?.title || m.meta?.filename || `Source ${i + 1}`;
                        return `--- SOURCE: ${title} (${m.kind}) ---\n${m.content}\n--- END ---`;
                    })
                    .join('\n\n');
            }
        }

        // 4. SAVE USER MESSAGE
        await supabase.from('notebook_chat_messages').insert({
            notebook_id,
            user_id: user.id,
            role: 'user',
            content: message,
            sources: selected_material_ids || [],
        });

        // 5. CALL LLM (NON-STREAMING)
        const systemPrompt = `You are Brigo, an elite AI study partner. Your goal is to make learning feel effortless and highly digestible for someone on a mobile phone.

        RESPONSE STRUCTURE (Follow Strictly):
        1. **The Lead**: Start with a 1-2 sentence direct answer or high-level summary.
        2. **Key Insights**: Break down the core concepts into 3-5 clear, punchy bullet points. 
           - Use bold headers within bullets like this: **Concept Name**: Brief explanation.
        3. **The "Why it Matters"**: A single short paragraph explaining the practical value or personal takeaway.
        4. **Check-in**: End with a one-sentence question to see if they understand or want to dive deeper.

        GUIDELINES:
        - NEVER output a "wall of text". Break up any analysis into bullets.
        - Use simple analogies to explain complex ideas.
        - Tone: Intelligent, encouraging, and clear. 
        - Formatting: Use Markdown. Bold key terms. Avoid deeply nested headers.
        - Source Rule: Use ONLY the provided context. If it's missing, mention you're using general knowledge.

        CONTEXT:
        ${context || "No sources selected. Use general knowledge."}
        `;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json',
                'X-Title': 'Brigo Chat',
            },
            body: JSON.stringify({
                model: 'x-ai/grok-4.1-fast',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                ],
                stream: false,
                temperature: 0.7,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`LLM Error: ${err}`);
        }

        const result = await response.json();
        const assistantContent = result.choices[0]?.message?.content || "I couldn't generate a response.";

        // 6. SAVE ASSISTANT MESSAGE
        await supabase.from('notebook_chat_messages').insert({
            notebook_id,
            user_id: user.id,
            role: 'assistant',
            content: assistantContent,
            sources: selected_material_ids || [],
        });

        return new Response(JSON.stringify({ content: assistantContent }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Chat error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
