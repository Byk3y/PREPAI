-- ============================================================================
-- MIGRATION 048: Security and Performance Cleanup
-- ============================================================================
-- 1. SECURITY: Move extensions to a dedicated schema
--    This is a Supabase security best practice to prevent naming collisions
--    and enhance schema security.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move vector extension if it's in public
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER EXTENSION vector SET SCHEMA extensions;
    END IF;
END $$;

-- Move pg_net extension if it's in public
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        ALTER EXTENSION pg_net SET SCHEMA extensions;
    END IF;
END $$;

-- Update search_embeddings function to include extensions in search_path
-- This ensures the function can still find the vector type
ALTER FUNCTION public.search_embeddings SET search_path = public, extensions;

-- ============================================================================
-- 2. PERFORMANCE: Add missing indexes for foreign keys
--    Identified by Supabase performance advisors to improve query performance.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notebook_chat_messages_user_id ON public.notebook_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_shares_created_by ON public.notebook_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_suggested_actions_user_id ON public.suggested_actions(user_id);

-- ============================================================================
-- 3. PERFORMANCE: Drop duplicate/redundant indexes
--    Identified by Supabase performance advisors to reduce storage and write overhead.
-- ============================================================================

-- Table: usage_logs
DROP INDEX IF EXISTS public.idx_usage_logs_created; -- Redundant with idx_usage_logs_created_at
DROP INDEX IF EXISTS public.idx_usage_logs_user;    -- Redundant with idx_usage_logs_user_id

-- Table: user_subscriptions
DROP INDEX IF EXISTS public.idx_subscriptions_user; -- Redundant with idx_user_subscriptions_user_id
