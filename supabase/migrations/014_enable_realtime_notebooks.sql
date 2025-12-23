-- ============================================================================
-- MIGRATION 014: Enable Realtime for notebooks table
-- ============================================================================
-- This migration enables real-time subscriptions for the notebooks table.
-- This allows the frontend to receive real-time updates when notebook status
-- changes (e.g., when Edge Function completes processing).
-- ============================================================================

-- Add notebooks table to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notebooks;




































