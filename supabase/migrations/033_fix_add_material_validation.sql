-- ============================================================================
-- MIGRATION 033: Fix add_material task validation
-- ============================================================================
-- Problem:
--   award_task_points validated add_material by joining materials.notebook_id,
--   but materials has no notebook_id column. The join raised an error, so the
--   foundational task never completed even after adding material.
--
-- Fix:
--   Validate on materials.user_id existence instead of the bad join.
--   (Keeps all other task validations unchanged.)
-- ============================================================================

-- Drop existing function to replace it
DROP FUNCTION IF EXISTS award_task_points(UUID, TEXT, DATE, TEXT);

CREATE OR REPLACE FUNCTION award_task_points(
  p_user_id UUID,
  p_task_key TEXT,
  p_completion_date DATE,
  p_timezone TEXT DEFAULT 'UTC'
) RETURNS JSONB AS $$
DECLARE
  v_task_id UUID;
  v_points INTEGER;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_new_stage INTEGER;
  v_task_type TEXT;
  v_exists BOOLEAN;
  v_criteria_met BOOLEAN := false;
  v_start_of_day TIMESTAMPTZ;
  v_end_of_day TIMESTAMPTZ;
  v_tz TEXT;
BEGIN
  -- =========================================================================
  -- CRITICAL: Validate input parameters
  -- =========================================================================
  -- Validate completion_date is not NULL
  IF p_completion_date IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Completion date is required',
      'error_code', 'INVALID_DATE'
    );
  END IF;

  -- =========================================================================
  -- CRITICAL: Validate user ownership (Security vulnerability)
  -- =========================================================================
  -- Ensure user is authenticated and can only award points for themselves
  IF auth.uid() IS NULL OR p_user_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot award points for other users',
      'error_code', 'UNAUTHORIZED'
    );
  END IF;

  -- =========================================================================
  -- P1 FIX: Reject future completion dates (Security vulnerability)
  -- =========================================================================
  IF p_completion_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot complete tasks for future dates',
      'error_code', 'FUTURE_DATE_NOT_ALLOWED'
    );
  END IF;

  -- 1. Determine timezone (use parameter, fallback to UTC)
  v_tz := COALESCE(NULLIF(p_timezone, ''), 'UTC');
  
  -- Calculate start/end of day in user's timezone
  -- Handle invalid timezone gracefully by falling back to UTC
  BEGIN
    v_start_of_day := (p_completion_date::TIMESTAMP) AT TIME ZONE v_tz;
    v_end_of_day := v_start_of_day + INTERVAL '1 day';
  EXCEPTION 
    WHEN invalid_parameter_value THEN
      -- Invalid timezone string, fall back to UTC
      v_start_of_day := p_completion_date::TIMESTAMP;
      v_end_of_day := v_start_of_day + INTERVAL '1 day';
    WHEN OTHERS THEN
      -- Any other error during timezone conversion, fall back to UTC
      -- Log the error but don't fail the request
      v_start_of_day := p_completion_date::TIMESTAMP;
      v_end_of_day := v_start_of_day + INTERVAL '1 day';
  END;

  -- 2. Get task details
  SELECT id, points, task_type INTO v_task_id, v_points, v_task_type
  FROM pet_tasks
  WHERE task_key = p_task_key;

  IF v_task_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task not found',
      'error_code', 'TASK_NOT_FOUND'
    );
  END IF;

  -- 3. Check for existing completion (Idempotency)
  -- For daily tasks: check for completion on this specific date
  -- For foundational tasks: check for ANY completion ever
  IF v_task_type = 'foundational' THEN
    SELECT EXISTS (
      SELECT 1 FROM pet_task_completions 
      WHERE user_id = p_user_id AND task_id = v_task_id
    ) INTO v_exists;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM pet_task_completions 
      WHERE user_id = p_user_id AND task_id = v_task_id AND completion_date = p_completion_date
    ) INTO v_exists;
  END IF;

  IF v_exists THEN
    -- If already completed, return current state without error (idempotent success)
    SELECT current_points INTO v_current_points FROM pet_states WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'points_awarded', 0,
      'new_total_points', COALESCE(v_current_points, 0),
      'new_stage', floor(COALESCE(v_current_points, 0) / 100) + 1
    );
  END IF;

  -- 4. SERVER-SIDE VALIDATION: Check task-specific criteria
  CASE p_task_key
    -- ========== DAILY TASKS ==========
    
    WHEN 'study_15_minutes' THEN
      -- Validate: Total study time today >= 900 seconds (15 minutes)
      SELECT COALESCE(SUM(duration_seconds), 0) >= 900 INTO v_criteria_met
      FROM study_sessions
      WHERE user_id = p_user_id
        AND start_at >= v_start_of_day
        AND start_at < v_end_of_day;
        
    WHEN 'study_flashcards' THEN
      -- Validate: Completed >= 5 flashcards today
      SELECT COUNT(*) >= 5 INTO v_criteria_met
      FROM flashcard_completions
      WHERE user_id = p_user_id
        AND created_at >= v_start_of_day
        AND created_at < v_end_of_day;
        
    WHEN 'listen_audio_overview' THEN
      -- Basic server-side validation for audio playback: ensure user has at least one completed audio overview
      SELECT EXISTS (
        SELECT 1 FROM audio_overviews ao
        WHERE ao.user_id = p_user_id
          AND ao.status = 'completed'
      ) INTO v_criteria_met;
      
    WHEN 'maintain_streak' THEN
      -- Enhanced streak validation: streak > 0 and profile updated today
      SELECT 
        COALESCE(streak, 0) > 0 
        AND updated_at >= v_start_of_day
        AND updated_at < v_end_of_day
      INTO v_criteria_met
      FROM profiles
      WHERE id = p_user_id;
      
      -- Explicitly handle missing profiles row
      v_criteria_met := COALESCE(v_criteria_met, false);
      
    -- ========== FOUNDATIONAL TASKS ==========
    
    WHEN 'name_pet' THEN
      -- Validate: Pet name is not the default 'Nova' or 'Pet'
      SELECT name IS NOT NULL 
        AND name != 'Nova' 
        AND name != 'Pet' 
        AND length(trim(name)) > 0 
      INTO v_criteria_met
      FROM pet_states
      WHERE user_id = p_user_id;
      -- If no pet_state exists yet, criteria not met
      v_criteria_met := COALESCE(v_criteria_met, false);
      
    WHEN 'add_material' THEN
      -- FIX: Validate user has at least one material they own (no notebook_id join)
      SELECT EXISTS (
        SELECT 1 FROM materials m
        WHERE m.user_id = p_user_id
        LIMIT 1
      ) INTO v_criteria_met;
      
    WHEN 'generate_audio_overview' THEN
      -- Validate: User has at least one completed audio overview
      SELECT EXISTS (
        SELECT 1 FROM audio_overviews
        WHERE user_id = p_user_id
          AND status = 'completed'
        LIMIT 1
      ) INTO v_criteria_met;
      
    ELSE
      -- Unknown task key, reject
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unknown task key: ' || p_task_key,
        'error_code', 'INVALID_TASK_KEY'
      );
  END CASE;

  -- 5. Check if criteria are met
  IF NOT v_criteria_met THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task criteria not met',
      'error_code', 'CRITERIA_NOT_MET',
      'task_key', p_task_key
    );
  END IF;

  -- 6. Atomic Transaction: Award points
  -- Insert completion record
  INSERT INTO pet_task_completions (user_id, task_id, completion_date, points_awarded)
  VALUES (p_user_id, v_task_id, p_completion_date, v_points);

  -- Update pet stats with negative points protection
  -- Handle case where pet_state might not exist yet (upsert default)
  INSERT INTO pet_states (user_id, current_points, current_stage)
  VALUES (p_user_id, GREATEST(0, v_points), 1)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    current_points = GREATEST(0, pet_states.current_points + v_points),
    current_stage = floor(GREATEST(0, pet_states.current_points + v_points) / 100) + 1,
    updated_at = NOW()
  RETURNING current_points, current_stage INTO v_new_points, v_new_stage;

  -- 7. Return Success
  RETURN jsonb_build_object(
    'success', true,
    'already_completed', false,
    'points_awarded', v_points,
    'new_total_points', v_new_points,
    'new_stage', v_new_stage
  );

-- =========================================================================
-- Handle unique_violation specifically (race condition fix)
-- =========================================================================
EXCEPTION 
  WHEN unique_violation THEN
    -- Another concurrent request already completed this task
    -- Return idempotent success (same as if we checked existence first)
    SELECT current_points INTO v_current_points FROM pet_states WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'points_awarded', 0,
      'new_total_points', COALESCE(v_current_points, 0),
      'new_stage', floor(COALESCE(v_current_points, 0) / 100) + 1
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', 'DB_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant execute permission
-- ============================================================================
GRANT EXECUTE ON FUNCTION award_task_points(UUID, TEXT, DATE, TEXT) TO authenticated;




















