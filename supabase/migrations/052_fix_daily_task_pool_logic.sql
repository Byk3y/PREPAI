-- ============================================================================
-- MIGRATION 052: Fix Daily Task Pool Logic
-- ============================================================================
-- Purpose:
--   Fix the task pool building logic so that `add_material_daily` only appears
--   for users who actually need to add content, not for users with many notebooks.
--
-- Problem:
--   User with 16 notebooks was seeing "Add more study material" because the
--   fallback tasks were unconditionally added to the pool for ALL users.
--
-- Solution:
--   1. Only add fallback tasks when content-dependent pool is sparse (< 2 items)
--   2. Only add `add_material_daily` when user has few notebooks (< 3)
--   3. Prioritize showing content-dependent tasks for users with content
--
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
  v_notebook_count INTEGER;
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

  -- Check if user has audio they haven't given feedback on
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

  -- Get user's notebook count (to determine if they need more content)
  SELECT COUNT(*) INTO v_notebook_count
  FROM public.notebooks WHERE user_id = p_user_id;

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
  -- STEP 3: SMART FALLBACK - Only add content-creation tasks when needed
  -- ========================================================================
  
  -- If pool is sparse (< 2 items), add fallback tasks
  IF array_length(v_pool, 1) IS NULL OR array_length(v_pool, 1) < 2 THEN
    -- User has sparse content, add creation and time-based tasks
    v_pool := array_append(v_pool, 'add_material_daily');
    v_pool := array_append(v_pool, 'study_early_bird');
    
  -- If user has few notebooks (< 3), occasionally show add_material
  ELSIF v_notebook_count < 3 THEN
    v_pool := array_append(v_pool, 'add_material_daily');
  END IF;
  
  -- Note: Users with plenty of content (3+ notebooks, content-dependent pool >= 2)
  -- will NOT see add_material_daily, only their actual study tasks

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
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback, restore the previous version from migration 051
-- ============================================================================
