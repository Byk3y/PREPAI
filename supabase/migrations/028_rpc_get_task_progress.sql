-- ============================================================================
-- RPC: get_task_progress
-- ============================================================================
-- Purpose:
--   - Returns current progress for a specific task and date
--   - Handles flashcard counts and study session duration
--
-- Parameters:
--   - p_user_id: UUID of user
--   - p_task_key: Key of task (e.g. 'study_flashcards')
--   - p_timezone: Text (for daily boundaries)
--
-- Returns:
--   - JSONB with progress value, goal, and unit
-- ============================================================================

CREATE OR REPLACE FUNCTION get_task_progress(
  p_user_id UUID,
  p_task_key TEXT,
  p_timezone TEXT DEFAULT 'UTC'
) RETURNS JSONB AS $$
DECLARE
  v_start_of_day TIMESTAMPTZ;
  v_end_of_day TIMESTAMPTZ;
  v_progress INTEGER := 0;
  v_goal INTEGER := 0;
  v_unit TEXT := '';
BEGIN
  -- 1. Determine time range for "Today"
  IF p_timezone IS NULL OR p_timezone = '' THEN
    p_timezone := 'UTC';
  END IF;
  
  BEGIN
    -- Start of day: Convert local midnight back to UTC
    v_start_of_day := ((NOW() AT TIME ZONE p_timezone)::DATE)::TIMESTAMP AT TIME ZONE p_timezone;
    v_end_of_day := v_start_of_day + INTERVAL '1 day';
  EXCEPTION WHEN OTHERS THEN
    v_start_of_day := NOW()::DATE;
    v_end_of_day := v_start_of_day + INTERVAL '1 day';
  END;

  -- 2. Calculate Progress based on task key
  CASE p_task_key
    WHEN 'study_flashcards' THEN
      v_goal := 5;
      v_unit := 'flashcards';
      SELECT COUNT(*) INTO v_progress
      FROM flashcard_completions
      WHERE user_id = p_user_id
        AND created_at >= v_start_of_day
        AND created_at < v_end_of_day;
        
    WHEN 'study_15_minutes' THEN
      v_goal := 900; -- seconds (15 mins)
      v_unit := 'seconds';
      -- Calculate total duration of sessions started today
      SELECT COALESCE(SUM(duration_seconds), 0) INTO v_progress
      FROM study_sessions
      WHERE user_id = p_user_id
        AND start_at >= v_start_of_day
        AND start_at < v_end_of_day;
        
    ELSE
      -- For binary tasks (streak, audio listen), progress is 0 or 1
      v_goal := 1;
      v_unit := 'count';
      -- Check if completed in completions table
      SELECT count(*) INTO v_progress
      FROM pet_task_completions ptc
      JOIN pet_tasks pt ON ptc.task_id = pt.id
      WHERE ptc.user_id = p_user_id
        AND pt.task_key = p_task_key
        AND ptc.completion_date = (v_start_of_day AT TIME ZONE p_timezone)::DATE;
  END CASE;

  RETURN jsonb_build_object(
    'current', v_progress,
    'goal', v_goal,
    'unit', v_unit,
    'percentage', CASE WHEN v_goal > 0 THEN LEAST((v_progress::numeric / v_goal::numeric) * 100, 100) ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
