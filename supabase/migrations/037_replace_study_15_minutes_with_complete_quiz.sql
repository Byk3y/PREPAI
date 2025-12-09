-- ============================================================================
-- MIGRATION 037: Replace study_15_minutes task with complete_quiz
-- ============================================================================
-- Purpose:
--   - Create quiz_completions table to track completed quizzes
--   - Replace the broken study_15_minutes task with complete_quiz
--   - Update RPCs to handle the new task
--
-- Background:
--   - study_15_minutes was never implemented (useStudyTimer hook unused)
--   - study_sessions table has 0 rows - task was impossible to complete
--   - complete_quiz is server-verifiable and encourages deeper engagement
--
-- Changes:
--   1. Create quiz_completions table with RLS
--   2. Update pet_tasks: replace study_15_minutes with complete_quiz
--   3. Update get_daily_tasks RPC pool
--   4. Update get_task_progress RPC
--   5. Update award_task_points validation
--
-- Rollback Instructions:
--   See ROLLBACK section at bottom of file
-- ============================================================================

-- ============================================================================
-- 1. CREATE QUIZ_COMPLETIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES studio_quizzes(id) ON DELETE CASCADE,
  
  -- Results
  score INTEGER NOT NULL,           -- Number of correct answers
  total_questions INTEGER NOT NULL, -- Total questions in quiz
  score_percentage INTEGER NOT NULL, -- Calculated percentage (0-100)
  
  -- Timestamps
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quiz_completions_user 
  ON quiz_completions(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_completions_quiz 
  ON quiz_completions(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_completions_user_date 
  ON quiz_completions(user_id, completed_at DESC);

-- ============================================================================
-- 2. ENABLE RLS ON QUIZ_COMPLETIONS
-- ============================================================================
ALTER TABLE quiz_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view own quiz completions"
  ON quiz_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own quiz completions"
  ON quiz_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE or DELETE policies - completions are immutable

-- ============================================================================
-- 3. UPDATE PET_TASKS: REPLACE study_15_minutes WITH complete_quiz
-- ============================================================================
-- Update the existing task row to change its key and details
UPDATE pet_tasks
SET 
  task_key = 'complete_quiz',
  title = 'Complete a quiz',
  description = 'Answer all questions in any quiz.',
  trigger_event = 'quiz_completed',
  updated_at = NOW()
WHERE task_key = 'study_15_minutes';

-- ============================================================================
-- 4. UPDATE get_daily_tasks RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION get_daily_tasks(
  p_user_id UUID,
  p_timezone TEXT DEFAULT 'UTC'
) RETURNS SETOF JSONB AS $$
DECLARE
  v_completion_date DATE;
  v_start_of_day TIMESTAMPTZ;
  v_end_of_day TIMESTAMPTZ;
  v_streak_task JSONB;
  v_pool TEXT[] := ARRAY['complete_quiz', 'study_flashcards', 'listen_audio_overview'];
  v_selected TEXT[];
  v_task RECORD;
  v_completed BOOLEAN;
BEGIN
  -- 1. Determine today's date in user timezone
  IF p_timezone IS NULL OR p_timezone = '' THEN
    p_timezone := 'UTC';
  END IF;
  
  BEGIN
    v_completion_date := (NOW() AT TIME ZONE p_timezone)::DATE;
    v_start_of_day := (v_completion_date::TIMESTAMP AT TIME ZONE p_timezone);
    v_end_of_day := v_start_of_day + INTERVAL '1 day';
  EXCEPTION WHEN OTHERS THEN
    v_completion_date := CURRENT_DATE;
    v_start_of_day := v_completion_date::TIMESTAMPTZ;
    v_end_of_day := v_start_of_day + INTERVAL '1 day';
  END;

  -- 2. Always include maintain_streak task
  SELECT 
    pt.id, pt.task_key, pt.title, pt.description, pt.points, pt.trigger_event,
    EXISTS (
      SELECT 1 FROM pet_task_completions ptc 
      WHERE ptc.user_id = p_user_id 
        AND ptc.task_id = pt.id 
        AND ptc.completion_date = v_completion_date
    ) as is_completed
  INTO v_task
  FROM pet_tasks pt
  WHERE pt.task_key = 'maintain_streak';

  IF v_task IS NOT NULL THEN
    RETURN NEXT jsonb_build_object(
      'id', v_task.id,
      'task_key', v_task.task_key,
      'title', v_task.title,
      'description', v_task.description,
      'points', v_task.points,
      'trigger_event', v_task.trigger_event,
      'completed', v_task.is_completed
    );
  END IF;

  -- 3. Select 2 random tasks from pool using deterministic seed
  -- Seed based on user_id + date for consistent daily selection
  v_selected := (
    SELECT ARRAY(
      SELECT unnest 
      FROM unnest(v_pool) 
      ORDER BY md5(p_user_id::text || v_completion_date::text || unnest)
      LIMIT 2
    )
  );

  -- 4. Return selected tasks with completion status
  FOR v_task IN
    SELECT 
      pt.id, pt.task_key, pt.title, pt.description, pt.points, pt.trigger_event,
      EXISTS (
        SELECT 1 FROM pet_task_completions ptc 
        WHERE ptc.user_id = p_user_id 
          AND ptc.task_id = pt.id 
          AND ptc.completion_date = v_completion_date
      ) as is_completed
    FROM pet_tasks pt
    WHERE pt.task_key = ANY(v_selected)
    ORDER BY pt.display_order
  LOOP
    RETURN NEXT jsonb_build_object(
      'id', v_task.id,
      'task_key', v_task.task_key,
      'title', v_task.title,
      'description', v_task.description,
      'points', v_task.points,
      'trigger_event', v_task.trigger_event,
      'completed', v_task.is_completed
    );
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. UPDATE get_task_progress RPC
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
        
    WHEN 'complete_quiz' THEN
      v_goal := 1;
      v_unit := 'quiz';
      SELECT COUNT(*) INTO v_progress
      FROM quiz_completions
      WHERE user_id = p_user_id
        AND completed_at >= v_start_of_day
        AND completed_at < v_end_of_day;
        
    ELSE
      -- For binary tasks (streak, audio listen), progress is 0 or 1
      v_goal := 1;
      v_unit := 'count';
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

-- ============================================================================
-- 6. UPDATE award_task_points RPC VALIDATION
-- ============================================================================
CREATE OR REPLACE FUNCTION award_task_points(
  p_user_id UUID,
  p_task_key TEXT,
  p_completion_date DATE,
  p_timezone TEXT DEFAULT 'UTC'
) RETURNS JSONB AS $$
DECLARE
  v_task_id UUID;
  v_points INTEGER;
  v_task_type TEXT;
  v_exists BOOLEAN;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_new_stage INTEGER;
  v_criteria_met BOOLEAN := false;
  v_start_of_day TIMESTAMPTZ;
  v_end_of_day TIMESTAMPTZ;
BEGIN
  -- 1. Determine time boundaries for validation
  IF p_timezone IS NULL OR p_timezone = '' THEN
    p_timezone := 'UTC';
  END IF;
  
  BEGIN
    v_start_of_day := (p_completion_date::TIMESTAMP AT TIME ZONE p_timezone);
    v_end_of_day := v_start_of_day + INTERVAL '1 day';
  EXCEPTION WHEN OTHERS THEN
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
    
    WHEN 'complete_quiz' THEN
      -- Validate: User completed at least 1 quiz today
      SELECT COUNT(*) >= 1 INTO v_criteria_met
      FROM quiz_completions
      WHERE user_id = p_user_id
        AND completed_at >= v_start_of_day
        AND completed_at < v_end_of_day;
        
    WHEN 'study_flashcards' THEN
      -- Validate: Completed >= 5 flashcards today
      SELECT COUNT(*) >= 5 INTO v_criteria_met
      FROM flashcard_completions
      WHERE user_id = p_user_id
        AND created_at >= v_start_of_day
        AND created_at < v_end_of_day;
        
    WHEN 'listen_audio_overview' THEN
      -- Validate: User has at least one completed audio overview
      SELECT EXISTS (
        SELECT 1 FROM audio_overviews ao
        WHERE ao.user_id = p_user_id
          AND ao.status = 'completed'
      ) INTO v_criteria_met;
      
    WHEN 'maintain_streak' THEN
      -- Check that user has a positive streak AND profile was updated today
      SELECT 
        COALESCE(streak, 0) > 0 
        AND updated_at >= v_start_of_day
        AND updated_at < v_end_of_day
      INTO v_criteria_met
      FROM profiles
      WHERE id = p_user_id;
      v_criteria_met := COALESCE(v_criteria_met, false);
      
    -- ========== FOUNDATIONAL TASKS ==========
    
    WHEN 'name_pet' THEN
      SELECT name IS NOT NULL 
        AND name != 'Nova' 
        AND name != 'Pet' 
        AND name != 'Sparky'
        AND length(trim(name)) > 0 
      INTO v_criteria_met
      FROM pet_states
      WHERE user_id = p_user_id;
      v_criteria_met := COALESCE(v_criteria_met, false);
      
    WHEN 'add_material' THEN
      SELECT EXISTS (
        SELECT 1 FROM materials m
        JOIN notebooks n ON m.id = n.material_id
        WHERE n.user_id = p_user_id
        LIMIT 1
      ) INTO v_criteria_met;
      
    WHEN 'generate_audio_overview' THEN
      SELECT EXISTS (
        SELECT 1 FROM audio_overviews ao
        WHERE ao.user_id = p_user_id
          AND ao.status = 'completed'
      ) INTO v_criteria_met;
      
    ELSE
      -- Unknown task - fail validation
      v_criteria_met := false;
  END CASE;

  -- 5. Return error if criteria not met
  IF NOT v_criteria_met THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task criteria not met',
      'error_code', 'CRITERIA_NOT_MET',
      'task_key', p_task_key
    );
  END IF;

  -- 6. Award points - ensure pet_states row exists
  INSERT INTO pet_states (user_id, current_points, current_stage)
  VALUES (p_user_id, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update points
  UPDATE pet_states
  SET 
    current_points = current_points + v_points,
    current_stage = floor((current_points + v_points) / 100) + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING current_points, current_stage INTO v_new_points, v_new_stage;

  -- 7. Record completion
  INSERT INTO pet_task_completions (user_id, task_id, completion_date, points_awarded)
  VALUES (p_user_id, v_task_id, p_completion_date, v_points);

  -- 8. Return success
  RETURN jsonb_build_object(
    'success', true,
    'already_completed', false,
    'points_awarded', v_points,
    'new_total_points', v_new_points,
    'new_stage', v_new_stage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- -- 1. Restore original task
-- UPDATE pet_tasks
-- SET 
--   task_key = 'study_15_minutes',
--   title = 'Study for 15 minutes',
--   description = 'Stay in study mode for 15 minutes combined.',
--   trigger_event = 'study_session_updated',
--   updated_at = NOW()
-- WHERE task_key = 'complete_quiz';
--
-- -- 2. Drop quiz_completions table
-- DROP POLICY IF EXISTS "Users can insert own quiz completions" ON quiz_completions;
-- DROP POLICY IF EXISTS "Users can view own quiz completions" ON quiz_completions;
-- ALTER TABLE quiz_completions DISABLE ROW LEVEL SECURITY;
-- DROP INDEX IF EXISTS idx_quiz_completions_user_date;
-- DROP INDEX IF EXISTS idx_quiz_completions_quiz;
-- DROP INDEX IF EXISTS idx_quiz_completions_user;
-- DROP TABLE IF EXISTS quiz_completions;
--
-- -- 3. Restore original RPCs (run previous migration versions)
-- ============================================================================
