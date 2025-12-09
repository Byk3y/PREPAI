-- ============================================================================
-- RPC: get_daily_tasks
-- ============================================================================
-- Purpose:
--   - Selects 3 daily tasks for the user based on deterministic logic
--   - Always includes 'maintain_streak'
--   - Selects 2 others from the pool: ['study_15_minutes', 'study_flashcards', 'listen_audio_overview']
--   - Rotation is seeded by user_id + date string
--
-- Parameters:
--   - p_user_id: UUID of user
--   - p_timezone: Text (e.g. 'America/New_York'), defaults to 'UTC'
--
-- Returns:
--   - JSONB array of task objects with status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_tasks(
  p_user_id UUID,
  p_timezone TEXT DEFAULT 'UTC'
) RETURNS JSONB AS $$
DECLARE
  v_date DATE;
  v_seed INTEGER;
  v_pool TEXT[] := ARRAY['study_15_minutes', 'study_flashcards', 'listen_audio_overview'];
  v_selected_keys TEXT[] := ARRAY['maintain_streak']; -- Always include hero task
  v_pool_size INTEGER := 3;
  v_index1 INTEGER;
  v_index2 INTEGER;
  v_tasks JSONB;
BEGIN
  -- 1. Determine local date
  IF p_timezone IS NULL OR p_timezone = '' THEN
    p_timezone := 'UTC';
  END IF;
  
  -- Handle invalid timezones by falling back to UTC if conversion fails
  BEGIN
    v_date := (NOW() AT TIME ZONE p_timezone)::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_date := NOW()::DATE;
  END;

  -- 2. Deterministic Selection Logic
  -- Generate a seed from user_id (hashes to int) + date (julian day)
  -- hashtext returns integer from string
  v_seed := abs(hashtext(p_user_id::text || v_date::text));
  
  -- Select 1st task from pool
  v_index1 := (v_seed % v_pool_size) + 1; -- 1-based index
  v_selected_keys := array_append(v_selected_keys, v_pool[v_index1]);
  
  -- Select 2nd task from remaining pool (simple rotation)
  -- To ensure no duplicates, we just pick the next one in the cycle
  v_index2 := ((v_seed + 1) % v_pool_size) + 1;
  v_selected_keys := array_append(v_selected_keys, v_pool[v_index2]);

  -- 3. Fetch task details and completion status
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'task_key', t.task_key,
      'title', t.title,
      'description', t.description,
      'points', t.points,
      'task_type', t.task_type,
      'completed', (c.id IS NOT NULL),
      'completed_at', c.created_at,
      'points_awarded', c.points_awarded
    ) ORDER BY t.display_order
  ) INTO v_tasks
  FROM pet_tasks t
  LEFT JOIN pet_task_completions c 
    ON t.id = c.task_id 
    AND c.user_id = p_user_id 
    AND c.completion_date = v_date
  WHERE t.task_key = ANY(v_selected_keys);

  RETURN COALESCE(v_tasks, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
