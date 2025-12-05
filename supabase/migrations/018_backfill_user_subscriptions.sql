-- ============================================================================
-- MIGRATION 018: Backfill User Subscriptions
-- ============================================================================
-- Creates subscription records for existing users who don't have one
-- This handles users created before migration 017 was applied
-- ============================================================================

-- Insert subscriptions for all existing users who don't have one
-- Using 'active' status for trial users (tier='trial' with status='active' is valid)
-- trial_ends_at uses 10 days to match database default
-- Other columns (trial_started_at, created_at, updated_at) will use their defaults
INSERT INTO public.user_subscriptions (user_id, tier, status, trial_ends_at)
SELECT 
  id as user_id,
  'trial' as tier,
  'active' as status,
  (NOW() + INTERVAL '10 days') as trial_ends_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;
