-- ============================================================================
-- MIGRATION 047: Streak Restore System
-- ============================================================================
-- Adds streak restores functionality:
-- 1. Profiles table updates (restores count + refill tracking)
-- 2. Enhanced increment_streak RPC (monthly refill + reset detection)
-- 3. New restore_streak RPC (consume restore to recover streak)
-- ============================================================================

-- Step 1: Add streak restore columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS streak_restores INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS last_restore_reset TEXT DEFAULT TO_CHAR(CURRENT_DATE, 'YYYYMM');

-- Step 2: Create improved increment_streak function
-- This handles monthly refill and detects when a streak is reset
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
  v_current_month TEXT;
  v_last_reset TEXT;
  v_restores_left INTEGER;
BEGIN
  -- Validate and set timezone
  v_tz := COALESCE(NULLIF(p_timezone, ''), 'UTC');
  
  -- Get user's timezone-aware "today"
  BEGIN
    v_today := (NOW() AT TIME ZONE v_tz)::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_today := CURRENT_DATE;
  END;

  v_current_month := TO_CHAR(v_today, 'YYYYMM');

  -- Get current profile data with lock
  SELECT 
    COALESCE(streak, 0),
    last_streak_date,
    COALESCE(streak_restores, 3),
    last_restore_reset
  INTO 
    v_current_streak,
    v_last_streak_date,
    v_restores_left,
    v_last_reset
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Profile check
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Monthly restore refill logic
  IF v_last_reset IS NULL OR v_last_reset != v_current_month THEN
    v_restores_left := 3;
    v_last_reset := v_current_month;
  END IF;

  -- Calculate new streak
  IF v_last_streak_date = v_today THEN
    -- Already updated today
    v_new_streak := v_current_streak;
    v_was_incremented := false;
  ELSIF v_last_streak_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_new_streak := v_current_streak + 1;
    v_was_incremented := true;
  ELSIF v_current_streak = 0 AND (v_last_streak_date IS NULL OR v_last_streak_date < v_today) THEN
    -- New account or first use
    v_new_streak := 1;
    v_was_incremented := true;
  ELSE
    -- MISSED DAY: Mark as reset but track what it WOULD have been for restore
    v_new_streak := 1;
    v_was_incremented := false;
    v_was_reset := (v_current_streak > 0);
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    streak = v_new_streak,
    last_streak_date = v_today,
    streak_restores = v_restores_left,
    last_restore_reset = v_last_reset,
    updated_at = NOW(),
    meta = CASE 
      WHEN v_was_reset THEN meta || jsonb_build_object('last_recoverable_streak', v_current_streak)
      ELSE meta
    END
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_streak', v_current_streak,
    'new_streak', v_new_streak,
    'was_incremented', v_was_incremented,
    'was_reset', v_was_reset,
    'streak_restores', v_restores_left
  );
END;
$$;

-- Step 3: Create restore_streak function
-- Allows user to use a restore to regain their lost streak
CREATE OR REPLACE FUNCTION restore_streak(
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recoverable_streak INTEGER;
  v_restores_left INTEGER;
  v_meta JSONB;
BEGIN
  -- Get current state
  SELECT 
    streak_restores,
    meta
  INTO 
    v_restores_left,
    v_meta
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Check if they have restores left
  IF COALESCE(v_restores_left, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No restores remaining this month', 'error_code', 'NO_RESTORES_LEFT');
  END IF;

  -- Get the recoverable streak value from meta
  v_recoverable_streak := (v_meta->>'last_recoverable_streak')::INTEGER;

  IF v_recoverable_streak IS NULL OR v_recoverable_streak <= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No recoverable streak found', 'error_code', 'NO_RECOVERABLE_STREAK');
  END IF;

  -- Perform Restore
  -- The restored streak is the old streak + 1 (since the restore happens on an activity day)
  UPDATE profiles
  SET 
    streak = v_recoverable_streak + 1,
    streak_restores = v_restores_left - 1,
    meta = meta - 'last_recoverable_streak', -- Remove the key once used
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Note: We don't update last_streak_date here because increment_streak already set it to today
  -- during the reset event that preceded this.

  RETURN jsonb_build_object(
    'success', true,
    'restored_streak', v_recoverable_streak + 1,
    'previous_streak', v_recoverable_streak,
    'restores_left', v_restores_left - 1
  );
END;
$$;

-- Step 4: Permissions
GRANT EXECUTE ON FUNCTION increment_streak(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_streak(UUID) TO authenticated;
