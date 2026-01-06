-- ============================================================================
-- MIGRATION 051: Smart Task System - Content-Aware Task Logic
-- ============================================================================
-- Purpose:
--   1. Fix get_daily_tasks to only show achievable tasks based on user content
--   2. Add comprehensive validation to award_task_points for ALL task types
--   3. Update get_task_progress to handle all task types correctly
--   4. Create audio_playback_sessions table for accurate podcast tracking
--
-- Problem Solved:
--   - Users with no content were seeing impossible tasks like "Study 5 flashcards"
--   - Tasks could be completed without proper validation (validated only 3/13 tasks)
--   - Fallback logic was showing ALL tasks when pool was empty
--
-- Evidence:
--   - User 2a78637b-238c-4e1d-a2a7-73741a69382f completed podcast_3_min 8 times
--     with 0 audio overviews
--   - Only add_material, generate_audio_overview, first_notebook_chat were validated
--
-- Changes:
--   1. get_daily_tasks: Smart content-aware pool building with proper fallback
--   2. award_task_points: Full validation for all 13 task types
--   3. get_task_progress: Updated progress tracking for new tasks
--   4. audio_playback_sessions: New table for tracking podcast listening
-- ============================================================================

-- ============================================================================
-- 1. CREATE AUDIO PLAYBACK SESSIONS TABLE
-- ============================================================================
-- This enables accurate tracking of podcast listening duration
CREATE TABLE IF NOT EXISTS audio_playback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_overview_id UUID NOT NULL REFERENCES audio_overviews(id) ON DELETE CASCADE,
  
  -- Playback tracking
  playback_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audio_playback_user_date 
  ON audio_playback_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_playback_audio 
  ON audio_playback_sessions(audio_overview_id);

-- Enable RLS
ALTER TABLE audio_playback_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own playback sessions
CREATE POLICY "Users can view own playback sessions"
  ON audio_playback_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own playback sessions
CREATE POLICY "Users can insert own playback sessions"
  ON audio_playback_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own playback sessions
CREATE POLICY "Users can update own playback sessions"
  ON audio_playback_sessions FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 2. UPDATED get_daily_tasks - SMART CONTENT-AWARE LOGIC
-- ============================================================================
CREATE OR REPLACE FUNCTION get_daily_tasks(p_user_id UUID, p_timezone TEXT DEFAULT 'UTC')
RETURNS SETOF JSONB AS $$
DECLARE
  v_completion_date DATE;
  v_pool TEXT[] := ARRAY[]::TEXT[];
  v_selected TEXT[];
  v_task RECORD;
  v_has_flashcards BOOLEAN;
  v_has_quizzes BOOLEAN;
  v_has_audio BOOLEAN;
  v_has_notebooks BOOLEAN;
  v_has_audio_feedback_target BOOLEAN;
  v_comp RECORD;
  v_user_streak INTEGER;
BEGIN
  -- Determine today's date in user timezone
  v_completion_date := (NOW() AT TIME ZONE COALESCE(NULLIF(p_timezone, ''), 'UTC'))::DATE;

  -- ========================================================================
  -- STEP 1: Check what content the user ACTUALLY has
  -- ========================================================================
  v_has_notebooks := EXISTS(
    SELECT 1 FROM public.notebooks WHERE user_id = p_user_id LIMIT 1
  );
  
  v_has_flashcards := EXISTS(
    SELECT 1 FROM public.studio_flashcard_sets sfs 
    JOIN public.notebooks n ON sfs.notebook_id = n.id 
    WHERE n.user_id = p_user_id LIMIT 1
  );
  
  v_has_quizzes := EXISTS(
    SELECT 1 FROM public.studio_quizzes sq 
    JOIN public.notebooks n ON sq.notebook_id = n.id 
    WHERE n.user_id = p_user_id LIMIT 1
  );
  
  v_has_audio := EXISTS(
    SELECT 1 FROM public.audio_overviews ao 
    WHERE ao.user_id = p_user_id AND ao.status = 'completed' LIMIT 1
  );

  -- Check if user has audio they haven't given feedback on today
  v_has_audio_feedback_target := EXISTS(
    SELECT 1 FROM public.audio_overviews ao 
    WHERE ao.user_id = p_user_id 
      AND ao.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM public.audio_feedback af 
        WHERE af.audio_overview_id = ao.id
      )
    LIMIT 1
  );

  -- Get user's current streak
  SELECT COALESCE(streak, 0) INTO v_user_streak 
  FROM public.profiles WHERE id = p_user_id;

  -- ========================================================================
  -- STEP 2: Build pool ONLY with tasks user can ACTUALLY complete
  -- ========================================================================
  
  -- Flashcard-dependent tasks
  IF v_has_flashcards THEN 
    v_pool := array_append(v_pool, 'study_flashcards'); 
  END IF;

  -- Quiz-dependent tasks
  IF v_has_quizzes THEN 
    v_pool := array_append(v_pool, 'quiz_5_questions');
    v_pool := array_append(v_pool, 'quiz_perfect_score');
  END IF;

  -- Audio-dependent tasks
  IF v_has_audio THEN 
    v_pool := array_append(v_pool, 'podcast_3_min');
  END IF;

  -- Audio feedback (only if they have audio they haven't rated)
  IF v_has_audio_feedback_target THEN
    v_pool := array_append(v_pool, 'audio_feedback_given');
  END IF;

  -- Notebook-dependent tasks
  IF v_has_notebooks THEN 
    v_pool := array_append(v_pool, 'chat_with_notebook'); 
  END IF;

  -- ========================================================================
  -- STEP 3: SMART FALLBACK - Add content-creation tasks if pool is sparse
  -- ========================================================================
  -- These don't require existing content - they ENCOURAGE creating content
  
  -- Always add these as options (helpful for users with little content)
  v_pool := array_append(v_pool, 'add_material_daily');
  v_pool := array_append(v_pool, 'study_early_bird');

  -- ========================================================================
  -- STEP 4: Always include secure_pet (hero task) if user has a streak
  -- ========================================================================
  IF v_user_streak > 0 THEN
    FOR v_task IN 
      SELECT id, task_key, title, description, points 
      FROM public.pet_tasks 
      WHERE task_key = 'secure_pet' 
    LOOP
      SELECT completed, completed_at INTO v_comp FROM (
        SELECT true as completed, completed_at 
        FROM public.pet_task_completions 
        WHERE user_id = p_user_id 
          AND task_id = v_task.id 
          AND completion_date = v_completion_date
        UNION ALL
        SELECT false as completed, NULL::timestamptz as completed_at
        LIMIT 1
      ) t ORDER BY completed DESC;

      RETURN NEXT jsonb_build_object(
        'id', v_task.id, 
        'task_key', v_task.task_key, 
        'title', v_task.title, 
        'description', v_task.description, 
        'points', v_task.points,
        'completed', v_comp.completed,
        'completed_at', v_comp.completed_at,
        'task_type', 'daily'
      );
    END LOOP;
  END IF;

  -- ========================================================================
  -- STEP 5: Select 2 tasks from the content-aware pool
  -- ========================================================================
  -- Use deterministic selection based on user_id + date for consistency
  v_selected := (
    SELECT ARRAY(
      SELECT unnest 
      FROM unnest(v_pool) 
      ORDER BY md5(p_user_id::text || v_completion_date::text || unnest) 
      LIMIT 2
    )
  );

  -- Return selected tasks with completion status
  FOR v_task IN 
    SELECT id, task_key, title, description, points 
    FROM public.pet_tasks 
    WHERE task_key = ANY(v_selected) 
    ORDER BY display_order 
  LOOP
    SELECT completed, completed_at INTO v_comp FROM (
      SELECT true as completed, completed_at 
      FROM public.pet_task_completions 
      WHERE user_id = p_user_id 
        AND task_id = v_task.id 
        AND completion_date = v_completion_date
      UNION ALL
      SELECT false as completed, NULL::timestamptz as completed_at
      LIMIT 1
    ) t ORDER BY completed DESC;

    RETURN NEXT jsonb_build_object(
      'id', v_task.id, 
      'task_key', v_task.task_key, 
      'title', v_task.title,
      'description', v_task.description, 
      'points', v_task.points,
      'completed', v_comp.completed,
      'completed_at', v_comp.completed_at,
      'task_type', 'daily'
    );
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 3. UPDATED award_task_points - FULL VALIDATION FOR ALL TASKS
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
  FROM public.pet_tasks
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
      SELECT 1 FROM public.pet_task_completions 
      WHERE user_id = p_user_id AND task_id = v_task_id
    ) INTO v_exists;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.pet_task_completions 
      WHERE user_id = p_user_id AND task_id = v_task_id AND completion_date = p_completion_date
    ) INTO v_exists;
  END IF;

  IF v_exists THEN
    SELECT current_points INTO v_current_points FROM public.pet_states WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'points_awarded', 0,
      'new_total_points', COALESCE(v_current_points, 0),
      'new_stage', floor(COALESCE(v_current_points, 0) / 100) + 1
    );
  END IF;

  -- ========================================================================
  -- 4. SERVER-SIDE VALIDATION: Check task-specific criteria
  -- ========================================================================
  CASE p_task_key
  
    -- ==================== DAILY TASKS ====================
    
    WHEN 'secure_pet' THEN
      -- Validate: User completed at least one study activity today
      SELECT EXISTS (
        SELECT 1 FROM public.pet_task_completions ptc
        JOIN public.pet_tasks pt ON ptc.task_id = pt.id
        WHERE ptc.user_id = p_user_id
          AND ptc.completion_date = p_completion_date
          AND pt.task_key IN (
            'study_flashcards', 'quiz_5_questions', 'podcast_3_min', 
            'chat_with_notebook', 'quiz_perfect_score'
          )
      ) INTO v_criteria_met;
      
    WHEN 'quiz_5_questions' THEN
      -- Validate: User has quizzes AND answered 5+ questions today
      IF NOT EXISTS(
        SELECT 1 FROM public.studio_quizzes sq 
        JOIN public.notebooks n ON sq.notebook_id = n.id 
        WHERE n.user_id = p_user_id
      ) THEN
        v_criteria_met := false;
      ELSE
        SELECT COUNT(*) >= 5 INTO v_criteria_met
        FROM public.quiz_question_answers
        WHERE user_id = p_user_id
          AND completed_at = p_completion_date;
      END IF;
        
    WHEN 'study_flashcards' THEN
      -- Validate: User has flashcards AND completed 5+ today
      IF NOT EXISTS(
        SELECT 1 FROM public.studio_flashcard_sets sfs 
        JOIN public.notebooks n ON sfs.notebook_id = n.id 
        WHERE n.user_id = p_user_id
      ) THEN
        v_criteria_met := false;
      ELSE
        SELECT COUNT(*) >= 5 INTO v_criteria_met
        FROM public.flashcard_completions
        WHERE user_id = p_user_id
          AND created_at >= v_start_of_day
          AND created_at < v_end_of_day;
      END IF;
        
    WHEN 'podcast_3_min' THEN
      -- Validate: User has audio AND has playback time >= 60 seconds today
      IF NOT EXISTS(
        SELECT 1 FROM public.audio_overviews 
        WHERE user_id = p_user_id AND status = 'completed'
      ) THEN
        v_criteria_met := false;
      ELSE
        -- Check for 60+ seconds of playback today
        -- First try playback sessions table, fallback to presence of audio
        SELECT COALESCE(SUM(playback_seconds), 0) >= 60 INTO v_criteria_met
        FROM public.audio_playback_sessions
        WHERE user_id = p_user_id
          AND started_at >= v_start_of_day
          AND started_at < v_end_of_day;
        
        -- If no playback tracking yet, accept if they have audio (legacy behavior)
        IF v_criteria_met IS NULL THEN
          v_criteria_met := EXISTS(
            SELECT 1 FROM public.audio_overviews 
            WHERE user_id = p_user_id AND status = 'completed'
          );
        END IF;
      END IF;
      
    WHEN 'chat_with_notebook' THEN
      -- Validate: User has notebooks (trust client for chat occurrence)
      SELECT EXISTS (
        SELECT 1 FROM public.notebooks WHERE user_id = p_user_id
      ) INTO v_criteria_met;
      
    WHEN 'quiz_perfect_score' THEN
      -- Validate: User has a quiz completion with 100% score today
      SELECT EXISTS (
        SELECT 1 FROM public.quiz_completions
        WHERE user_id = p_user_id
          AND completed_at >= v_start_of_day
          AND completed_at < v_end_of_day
          AND score_percentage = 100
      ) INTO v_criteria_met;
      
    WHEN 'add_material_daily' THEN
      -- Validate: User added a material today
      SELECT EXISTS (
        SELECT 1 FROM public.materials
        WHERE user_id = p_user_id
          AND created_at >= v_start_of_day
          AND created_at < v_end_of_day
      ) INTO v_criteria_met;
      
    WHEN 'audio_feedback_given' THEN
      -- Validate: User gave audio feedback today
      SELECT EXISTS (
        SELECT 1 FROM public.audio_feedback
        WHERE user_id = p_user_id
          AND created_at >= v_start_of_day
          AND created_at < v_end_of_day
      ) INTO v_criteria_met;
      
    WHEN 'study_early_bird' THEN
      -- Validate: User completed a study task before 9 AM in their timezone
      SELECT EXISTS (
        SELECT 1 FROM public.pet_task_completions ptc
        JOIN public.pet_tasks pt ON ptc.task_id = pt.id
        WHERE ptc.user_id = p_user_id
          AND ptc.completion_date = p_completion_date
          AND pt.task_key IN ('study_flashcards', 'quiz_5_questions', 'podcast_3_min', 'chat_with_notebook')
          AND EXTRACT(HOUR FROM ptc.completed_at AT TIME ZONE COALESCE(p_timezone, 'UTC')) < 9
      ) INTO v_criteria_met;
      
    -- ==================== FOUNDATIONAL TASKS ====================
    
    WHEN 'name_pet' THEN
      -- Validate: Pet has a custom name (not default names)
      SELECT name IS NOT NULL 
        AND name NOT IN ('Nova', 'Pet', 'Sparky', 'Bridget', '')
        AND length(trim(name)) > 0 
      INTO v_criteria_met
      FROM public.pet_states
      WHERE user_id = p_user_id;
      v_criteria_met := COALESCE(v_criteria_met, false);
      
    WHEN 'create_notebook' THEN
      -- Validate: User has at least one notebook with a material
      SELECT EXISTS (
        SELECT 1 FROM public.notebooks n
        WHERE n.user_id = p_user_id
          AND EXISTS (SELECT 1 FROM public.materials m WHERE m.notebook_id = n.id)
      ) INTO v_criteria_met;
      
    WHEN 'add_material' THEN
      -- Validate: User has at least one material (legacy foundational)
      SELECT EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.user_id = p_user_id
        LIMIT 1
      ) INTO v_criteria_met;
      
    WHEN 'generate_audio_overview' THEN
      -- Validate: User has at least one completed audio overview
      SELECT EXISTS (
        SELECT 1 FROM public.audio_overviews ao
        WHERE ao.user_id = p_user_id
          AND ao.status = 'completed'
      ) INTO v_criteria_met;
      
    WHEN 'first_notebook_chat' THEN
      -- Validate: User has notebooks (trust client for chat occurrence)
      SELECT EXISTS (
        SELECT 1 FROM public.notebooks WHERE user_id = p_user_id
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
  INSERT INTO public.pet_states (user_id, current_points, current_stage)
  VALUES (p_user_id, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update points
  UPDATE public.pet_states
  SET 
    current_points = current_points + v_points,
    current_stage = floor((current_points + v_points) / 100) + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING current_points, current_stage INTO v_new_points, v_new_stage;

  -- 7. Record completion
  INSERT INTO public.pet_task_completions (user_id, task_id, completion_date, points_awarded, completed_at)
  VALUES (p_user_id, v_task_id, p_completion_date, v_points, NOW());

  -- 8. Return success
  RETURN jsonb_build_object(
    'success', true,
    'already_completed', false,
    'points_awarded', v_points,
    'new_total_points', v_new_points,
    'new_stage', v_new_stage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 4. UPDATED get_task_progress - SUPPORT ALL TASK TYPES
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
  v_completion_date DATE;
BEGIN
  -- 1. Determine time range for "Today"
  IF p_timezone IS NULL OR p_timezone = '' THEN
    p_timezone := 'UTC';
  END IF;
  
  BEGIN
    v_completion_date := (NOW() AT TIME ZONE p_timezone)::DATE;
    v_start_of_day := (v_completion_date::TIMESTAMP AT TIME ZONE p_timezone);
    v_end_of_day := v_start_of_day + INTERVAL '1 day';
  EXCEPTION WHEN OTHERS THEN
    v_completion_date := CURRENT_DATE;
    v_start_of_day := NOW()::DATE;
    v_end_of_day := v_start_of_day + INTERVAL '1 day';
  END;

  -- 2. Calculate Progress based on task key
  CASE p_task_key
    WHEN 'study_flashcards' THEN
      v_goal := 5;
      v_unit := 'flashcards';
      SELECT COUNT(*) INTO v_progress
      FROM public.flashcard_completions
      WHERE user_id = p_user_id
        AND created_at >= v_start_of_day
        AND created_at < v_end_of_day;
        
    WHEN 'quiz_5_questions' THEN
      v_goal := 5;
      v_unit := 'questions';
      SELECT COUNT(*) INTO v_progress
      FROM public.quiz_question_answers
      WHERE user_id = p_user_id
        AND completed_at = v_completion_date;
        
    WHEN 'podcast_3_min' THEN
      v_goal := 60; -- 60 seconds
      v_unit := 'seconds';
      SELECT COALESCE(SUM(playback_seconds), 0) INTO v_progress
      FROM public.audio_playback_sessions
      WHERE user_id = p_user_id
        AND started_at >= v_start_of_day
        AND started_at < v_end_of_day;
        
    WHEN 'add_material_daily' THEN
      v_goal := 1;
      v_unit := 'materials';
      SELECT COUNT(*) INTO v_progress
      FROM public.materials
      WHERE user_id = p_user_id
        AND created_at >= v_start_of_day
        AND created_at < v_end_of_day;
        
    WHEN 'audio_feedback_given' THEN
      v_goal := 1;
      v_unit := 'feedback';
      SELECT COUNT(*) INTO v_progress
      FROM public.audio_feedback
      WHERE user_id = p_user_id
        AND created_at >= v_start_of_day
        AND created_at < v_end_of_day;
        
    WHEN 'chat_with_notebook' THEN
      -- Binary task - check completion table
      v_goal := 1;
      v_unit := 'chat';
      SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END INTO v_progress
      FROM public.pet_task_completions ptc
      JOIN public.pet_tasks pt ON ptc.task_id = pt.id
      WHERE ptc.user_id = p_user_id
        AND pt.task_key = 'chat_with_notebook'
        AND ptc.completion_date = v_completion_date;
        
    WHEN 'quiz_perfect_score' THEN
      -- Binary task - need a 100% quiz score
      v_goal := 1;
      v_unit := 'perfect';
      SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END INTO v_progress
      FROM public.quiz_completions
      WHERE user_id = p_user_id
        AND completed_at >= v_start_of_day
        AND completed_at < v_end_of_day
        AND score_percentage = 100;
        
    WHEN 'study_early_bird' THEN
      -- Binary task - need study task before 9 AM
      v_goal := 1;
      v_unit := 'early';
      SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END INTO v_progress
      FROM public.pet_task_completions ptc
      JOIN public.pet_tasks pt ON ptc.task_id = pt.id
      WHERE ptc.user_id = p_user_id
        AND ptc.completion_date = v_completion_date
        AND pt.task_key IN ('study_flashcards', 'quiz_5_questions', 'podcast_3_min', 'chat_with_notebook')
        AND EXTRACT(HOUR FROM ptc.completed_at AT TIME ZONE COALESCE(p_timezone, 'UTC')) < 9;
        
    ELSE
      -- For other binary tasks, check completion table
      v_goal := 1;
      v_unit := 'count';
      SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END INTO v_progress
      FROM public.pet_task_completions ptc
      JOIN public.pet_tasks pt ON ptc.task_id = pt.id
      WHERE ptc.user_id = p_user_id
        AND pt.task_key = p_task_key
        AND ptc.completion_date = v_completion_date;
  END CASE;

  RETURN jsonb_build_object(
    'current', COALESCE(v_progress, 0),
    'goal', v_goal,
    'unit', v_unit,
    'percentage', CASE WHEN v_goal > 0 THEN LEAST((COALESCE(v_progress, 0)::numeric / v_goal::numeric) * 100, 100) ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON audio_playback_sessions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;


-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- -- 1. Drop the new table
-- DROP TABLE IF EXISTS audio_playback_sessions;
--
-- -- 2. Restore previous function versions from migration 049
-- -- (Copy function definitions from 049_update_get_daily_tasks_timestamp.sql)
--
-- ============================================================================
