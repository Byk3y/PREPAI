-- ============================================================================
-- MIGRATION 050: Update Trial Duration to 7 Days
-- ============================================================================
-- Changes default trial period from 10/14 days to 7 days
-- Aligns with the weekly student lifecycle and increases conversion velocity
-- ============================================================================

-- Update default for new users
ALTER TABLE public.user_subscriptions 
ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- Note: This does not affect existing users who already have a trial_ends_at set.
