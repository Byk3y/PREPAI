import { createClient } from 'supabase';
import { getRequiredEnv } from '../_shared/env.ts';
import { getCorsHeaders, getCorsPreflightHeaders } from '../_shared/cors.ts';
import { callLLMWithRetry } from '../_shared/openrouter.ts';

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

        // 2. PARSE REQUEST & FETCH METADATA
        const { notebook_id, message, selected_material_ids } = await req.json() as ChatRequest;

        // Fetch User Personalization (Pet Name, Education, Age)
        const [{ data: petData }, { data: profile }] = await Promise.all([
            supabase
                .from('pet_states')
                .select('name')
                .eq('user_id', user.id)
                .single(),
            supabase
                .from('profiles')
                .select('meta')
                .eq('id', user.id)
                .single()
        ]);

        const petName = petData?.name || 'Sparky';
        const educationLevel = (profile?.meta as any)?.education_level || 'lifelong';
        const ageBracket = (profile?.meta as any)?.age_bracket || '25_34';

        // 3. FETCH CHAT HISTORY (Last 10 messages)
        const { data: historyData } = await supabase
            .from('notebook_chat_messages')
            .select('role, content')
            .eq('notebook_id', notebook_id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        const history = (historyData || [])
            .reverse()
            .map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

        // 4. CONTEXT RETRIEVAL
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

        // 5. SAVE USER MESSAGE (Optimistic save already happened in UI, but we save to DB here)
        await supabase.from('notebook_chat_messages').insert({
            notebook_id,
            user_id: user.id,
            role: 'user',
            content: message,
            sources: selected_material_ids || [],
        });

        // 6. CALL LLM (Brigo Persona 4.0 - Surgical Consultant)
        const systemPrompt = `You are Brigo, a Surgical Exam Consultant. You provide elite, tactical advice for high-performers preparing for exams. Your job is to extract maximum value from the provided material.

OPERATIONAL RULES:
- **No Headers or Templates**: Do not use headers like "SYNOPSIS" or "STRATEGIC BREAKDOWN". Reply with naturally structured intelligence.
- **Surgical Precision**: If you can explain a concept in 2 powerhouse sentences, do it. Never summarize just to fill space.
- **The Tactical Edge**: Identify gaps in the user's logic and push them toward mastery. Use bolding ONLY for critical exam concepts.
- **Strict Professionalism**: Do not mention the pet (${petName}) or act as a "companion". You are a senior specialist conducting a consultation.
- **Clinically Authoritative Citations**: When referencing the provided material, integrate the source naturally (e.g., "According to your notes on [Topic]..." or "Based on the [FileName] past paper..."). Do not use academic bracket citations like [1].

TONE:
- Direct, clinical, and high-stakes. You are a senior partner guiding a high-performer.

CONTEXT:
${context || "No source materials currently active. Providing baseline tactical knowledge."}`;

        // Append the current message to history for the call
        const fullConversation = [...history, { role: 'user' as const, content: message }];

        const llmResponse = await callLLMWithRetry(
            'notebook_chat',
            systemPrompt,
            fullConversation,
            { temperature: 0.75 }
        );

        const assistantContent = llmResponse.content;

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
