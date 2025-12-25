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
        const systemPrompt = `You are Brigo, an elite AI study partner. Your goal is to make learning feel effortless and digestible for someone on a mobile phone.

GOLDEN RULE: **Honor the user's request first.** If they ask for a specific format (e.g., "3 sentences", "one word", "bullet points only"), give them EXACTLY that. Do not add extra sections.

ADAPTIVE RESPONSE GUIDELINES:

**For simple/direct questions:**
Give a direct, concise answer. No extra sections needed.

**For complex analysis or "explain this" requests (when no format is specified):**
Structure your response like this:
• **Quick Answer**: 1-2 sentences hitting the main point.
• **Key Points**: 2-4 bullet points breaking down the core ideas. Use **bold** for key terms.
• **Takeaway**: One sentence on why this matters (optional, include only if genuinely valuable).

**For summarization requests:**
Match the requested length. If they say "3 sentences", give exactly 3 sentences. If they say "brief", keep it under 50 words.

**For Q&A / quiz-style questions:**
Be direct. Give the answer, then a 1-line explanation if helpful.

STYLE GUIDELINES:
- Mobile-first: Avoid walls of text. Use whitespace and bullets generously.
- Tone: Intelligent, warm, and clear. Like a brilliant friend explaining things.
- Markdown: Use **bold** for key terms. Avoid deep nesting.
- Source Rule: Use ONLY the provided context. If the context doesn't cover the question, say so briefly and offer general knowledge if helpful.

CONTEXT:
${context || "No sources selected. Using general knowledge."}
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
