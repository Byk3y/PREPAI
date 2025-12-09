-- ============================================================================
-- RPC: award_task_points
-- ============================================================================
-- Purpose:
--   - Atomically awards points for a task
--   - Records completion in pet_task_completions
--   - Updates pet_states (current_points, current_stage)
--
-- Parameters:
--   - p_user_id: UUID of user
--   - p_task_key: Key of task completed (e.g. 'name_pet')
--   - p_completion_date: Date of completion (for daily reset logic)
--
-- Returns:
--   - JSONB with success status, new points, and new stage
-- ============================================================================

CREATE OR REPLACE FUNCTION award_task_points(
  p_user_id UUID,
  p_task_key TEXT,
  p_completion_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_task_id UUID;
  v_points INTEGER;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_new_stage INTEGER;
  v_task_type TEXT;
  v_exists BOOLEAN;
BEGIN
  -- 1. Get task details
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

  -- 2. Check for existing completion (Idempotency)
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

  -- 3. Atomic Transaction
  -- Insert completion
  INSERT INTO pet_task_completions (user_id, task_id, completion_date, points_awarded)
  VALUES (p_user_id, v_task_id, p_completion_date, v_points);

  -- Update pet stats
  -- Handle case where pet_state might not exist yet (upsert default)
  INSERT INTO pet_states (user_id, current_points, current_stage)
  VALUES (p_user_id, v_points, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    current_points = pet_states.current_points + v_points,
    current_stage = floor((pet_states.current_points + v_points) / 100) + 1,
    updated_at = NOW()
  RETURNING current_points, current_stage INTO v_new_points, v_new_stage;

  -- 4. Return Success
  RETURN jsonb_build_object(
    'success', true,
    'already_completed', false,
    'points_awarded', v_points,
    'new_total_points', v_new_points,
    'new_stage', v_new_stage
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', 'DB_ERROR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
