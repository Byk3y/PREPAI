-- ============================================================================
-- MIGRATION 040: Add Onboarding Assessment Data Support
-- ============================================================================
-- Adds support for storing onboarding assessment data in profiles.meta
-- Assessment data includes learning style, study goals, preferences, and commitment
-- ============================================================================

-- Step 1: Create GIN index on meta field for efficient querying
-- This allows fast queries on nested JSONB fields
CREATE INDEX IF NOT EXISTS idx_profiles_meta_gin
ON profiles USING GIN (meta);

-- Step 2: Add comment documenting the meta structure
COMMENT ON COLUMN profiles.meta IS
'JSONB field storing user profile metadata. Structure:
{
  "has_created_notebook": boolean,
  "has_completed_onboarding": boolean,
  "onboarding_completed_at": "ISO timestamp",
  "learning_style": "visual|auditory|reading|practice",
  "study_goal": "exam_prep|retention|quick_review|all",
  "daily_commitment_minutes": integer,
  "commitment_made_at": "ISO timestamp",
  "assessment_completed_at": "ISO timestamp",
  "assessment_version": "string"
}';

-- Step 3: Create helper function for safely updating meta (merging instead of replacing)
-- This prevents overwriting existing meta fields
CREATE OR REPLACE FUNCTION merge_profile_meta(
  p_user_id UUID,
  p_new_meta JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_meta JSONB;
BEGIN
  -- Get current meta
  SELECT COALESCE(meta, '{}'::jsonb) INTO v_current_meta
  FROM profiles
  WHERE id = p_user_id;

  -- Merge new meta with existing (new values override old)
  UPDATE profiles
  SET
    meta = v_current_meta || p_new_meta,  -- || operator merges JSONB objects
    updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', p_user_id;
  END IF;
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION merge_profile_meta(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_profile_meta(UUID, JSONB) TO service_role;

-- Step 5: Add comment for function
COMMENT ON FUNCTION merge_profile_meta IS
'Safely merges new meta data with existing profile meta, preventing overwrite of existing fields. Use this instead of direct UPDATE when modifying meta field.';
