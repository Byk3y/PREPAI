-- ============================================================================
-- MIGRATION 005: Create increment_quota Function
-- ============================================================================
-- Creates atomic quota increment function for trial users
-- Called by Edge Functions after successful job completion
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_quota(
  user_id_param UUID,
  quota_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate quota_type parameter
  IF quota_type NOT IN ('studio', 'audio') THEN
    RAISE EXCEPTION 'Invalid quota_type: %. Must be "studio" or "audio"', quota_type;
  END IF;

  -- Atomically increment the appropriate counter
  IF quota_type = 'studio' THEN
    UPDATE user_subscriptions
    SET trial_studio_jobs_used = COALESCE(trial_studio_jobs_used, 0) + 1,
        updated_at = NOW()
    WHERE user_id = user_id_param;
  ELSIF quota_type = 'audio' THEN
    UPDATE user_subscriptions
    SET trial_audio_jobs_used = COALESCE(trial_audio_jobs_used, 0) + 1,
        updated_at = NOW()
    WHERE user_id = user_id_param;
  END IF;

  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User subscription not found for user_id: %', user_id_param;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_quota(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_quota(UUID, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION increment_quota IS 'Atomically increments trial quota usage for studio or audio jobs';
