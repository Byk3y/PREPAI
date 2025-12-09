-- ============================================================================
-- MIGRATION 032: Improve Streak Tracking System
-- ============================================================================
-- Fixes streak tracking to use dedicated last_streak_date field and timezone support
-- Addresses bug where new accounts created today don't get streak = 1
-- ============================================================================

-- Step 1: Add last_streak_date column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_streak_date DATE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_streak_date 
ON profiles(last_streak_date);

-- Step 3: Backfill last_streak_date for existing users
-- For users with streak > 0, set last_streak_date to updated_at date
-- For users with streak = 0, leave as NULL (will be set on first increment)
UPDATE profiles
SET last_streak_date = updated_at::DATE
WHERE streak > 0 
  AND last_streak_date IS NULL;

-- Step 4: Drop old function if it exists (with old signature)
DROP FUNCTION IF EXISTS increment_streak(UUID);

-- Step 5: Create improved increment_streak function with timezone support
CREATE OR REPLACE FUNCTION increment_streak(
  p_user_id UUID,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_last_streak_date DATE;
  v_today DATE;
  v_tz TEXT;
  v_was_incremented BOOLEAN := false;
  v_was_reset BOOLEAN := false;
BEGIN
  -- Validate and set timezone
  v_tz := COALESCE(NULLIF(p_timezone, ''), 'UTC');
  
  -- Get user's timezone-aware "today"
  BEGIN
    v_today := (NOW() AT TIME ZONE v_tz)::DATE;
  EXCEPTION WHEN OTHERS THEN
    -- Invalid timezone, fall back to UTC
    v_today := CURRENT_DATE;
  END;

  -- Get current streak and last streak date with row lock to prevent race conditions
  SELECT 
    COALESCE(streak, 0),
    last_streak_date
  INTO 
    v_current_streak,
    v_last_streak_date
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE; -- Lock row to prevent concurrent updates

  -- If profile doesn't exist, return error
  IF v_last_streak_date IS NULL AND v_current_streak = 0 THEN
    -- Check if profile exists at all
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Profile not found',
        'error_code', 'PROFILE_NOT_FOUND'
      );
    END IF;
  END IF;

  -- Calculate new streak based on last activity
  IF v_last_streak_date = v_today THEN
    -- Already updated today, no change
    v_new_streak := v_current_streak;
    v_was_incremented := false;
  ELSIF v_last_streak_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day: increment streak
    v_new_streak := v_current_streak + 1;
    v_was_incremented := true;
  ELSIF v_current_streak = 0 AND (v_last_streak_date IS NULL OR v_last_streak_date < v_today) THEN
    -- NEW ACCOUNT or first time opening app: set to 1
    -- This fixes the bug where new accounts created today don't get streak = 1
    v_new_streak := 1;
    v_was_incremented := true;
  ELSE
    -- Missed day(s): reset to 1
    v_new_streak := 1;
    v_was_incremented := (v_current_streak = 0); -- Only true if going from 0 to 1
    v_was_reset := (v_current_streak > 0); -- True if streak was reset from > 0
  END IF;

  -- Update profile atomically
  UPDATE profiles
  SET 
    streak = v_new_streak,
    last_streak_date = v_today,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'previous_streak', v_current_streak,
    'new_streak', v_new_streak,
    'was_incremented', v_was_incremented,
    'was_reset', v_was_reset,
    'last_streak_date', v_today
  );
END;
$$;

-- Step 6: Grant execute permission
GRANT EXECUTE ON FUNCTION increment_streak(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_streak(UUID, TEXT) TO service_role;

-- Step 7: Add comment for documentation
COMMENT ON FUNCTION increment_streak IS 'Increments user streak with timezone support and proper handling of new accounts. Uses dedicated last_streak_date field to track streak activity separately from profile updates.';

-- Step 8: Add comment to column
COMMENT ON COLUMN profiles.last_streak_date IS 'Date when streak was last incremented (in user timezone). Separate from updated_at to track only streak activity.';


