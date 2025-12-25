import { createClient } from 'supabase';
import { getRequiredEnv } from '../_shared/env.ts';
import { getCorsHeaders, getCorsPreflightHeaders } from '../_shared/cors.ts';

/**
 * Delete User Edge Function
 * Deletes the calling user's account and all associated data.
 * This function uses the service role key to perform admin actions.
 */
Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsPreflightHeaders(req) });
    }

    const corsHeaders = getCorsHeaders(req);

    try {
        const supabaseUrl = getRequiredEnv('SUPABASE_URL');
        const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

        // Use service role client for admin deletion
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. AUTHENTICATION
        const authHeader = req.headers.get('authorization');
        if (!authHeader) throw new Error('Missing authorization header');

        // Get user from the JWT to ensure we delete the correct person
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[Delete User] Starting deletion for user: ${user.id} (${user.email})`);

        // 2. DELETE FROM AUTH.USERS
        // This will trigger CASCADE deletion in all referencing public tables
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error('[Delete User] Auth deletion error:', deleteError);
            throw deleteError;
        }

        console.log(`[Delete User] Successfully deleted user: ${user.id}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Account and associated data deleted successfully.'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('[Delete User] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
