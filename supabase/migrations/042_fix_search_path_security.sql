-- ============================================================================
-- MIGRATION 042: Fix Search Path Security for SECURITY DEFINER Functions
-- ============================================================================
-- Purpose:
--   - Adds SET search_path = public to all SECURITY DEFINER functions
--   - Prevents search_path injection attacks (CVE-2018-1058)
--   - Follows Supabase security best practices
--
-- Security Context:
--   - Without fixed search_path, malicious users could create objects in
--     public schema that override intended tables/functions
--   - Setting search_path locks function to public schema only
--
-- Functions Fixed:
--   1. get_daily_tasks
--   2. get_task_progress
--   3. award_task_points
--   4. get_foundational_tasks
--   5. handle_new_user
--   6. handle_new_user_subscription
-- ============================================================================

-- ============================================================================
-- 1. Fix get_daily_tasks
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. Fix get_task_progress
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. Fix award_task_points
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 4. Fix get_foundational_tasks
-- ============================================================================
CREATE OR REPLACE FUNCTION get_foundational_tasks(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_tasks JSONB;
BEGIN
  -- Select all foundational tasks with their completion status
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'task_key', t.task_key,
      'title', t.title,
      'description', t.description,
      'points', t.points,
      'task_type', t.task_type,
      'display_order', t.display_order,
      'completed', CASE WHEN c.id IS NOT NULL THEN true ELSE false END,
      'completed_at', c.completion_date,
      'points_awarded', COALESCE(c.points_awarded, 0)
    ) ORDER BY t.display_order
  ) INTO v_tasks
  FROM pet_tasks t
  LEFT JOIN pet_task_completions c 
    ON t.id = c.task_id 
    AND c.user_id = p_user_id
  WHERE t.task_type = 'foundational';

  RETURN COALESCE(v_tasks, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 5. Fix handle_new_user (latest version from migration 038)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  parsed_first TEXT;
  parsed_last TEXT;
BEGIN
  -- Get full name from OAuth metadata or email
  full_name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);

  -- Parse into first/last name
  IF full_name LIKE '% %' THEN
    -- Has space - split into first and last
    parsed_first = SPLIT_PART(full_name, ' ', 1);
    parsed_last = SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1);
  ELSE
    -- No space - put entire string in first_name
    parsed_first = full_name;
    parsed_last = '';
  END IF;

  -- Insert profile with parsed names (name column will auto-sync via trigger)
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (NEW.id, parsed_first, parsed_last);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 6. Fix handle_new_user_subscription
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 7. Fix increment_quota (reapply fix - function may have been recreated)
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_quota(
  user_id_param UUID,
  quota_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user_subscriptions record exists
  INSERT INTO public.user_subscriptions (user_id)
  VALUES (user_id_param)
  ON CONFLICT (user_id) DO NOTHING;

  -- Increment the appropriate quota field
  IF quota_type = 'studio' THEN
    UPDATE public.user_subscriptions
    SET trial_studio_jobs_used = COALESCE(trial_studio_jobs_used, 0) + 1,
        updated_at = NOW()
    WHERE user_id = user_id_param;
  ELSIF quota_type = 'audio' THEN
    UPDATE public.user_subscriptions
    SET trial_audio_jobs_used = COALESCE(trial_audio_jobs_used, 0) + 1,
        updated_at = NOW()
    WHERE user_id = user_id_param;
  END IF;
END;
$$;

-- ============================================================================
-- 8. Fix get_user_quota
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_quota(user_id_param UUID)
RETURNS TABLE(
  tier TEXT,
  status TEXT,
  trial_ends_at TIMESTAMPTZ,
  studio_jobs_remaining INTEGER,
  audio_jobs_remaining INTEGER,
  is_trial_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.tier,
    us.status,
    us.trial_ends_at,
    CASE 
      WHEN us.tier = 'premium' THEN NULL
      ELSE GREATEST(0, 5 - COALESCE(us.trial_studio_jobs_used, 0))
    END AS studio_jobs_remaining,
    CASE 
      WHEN us.tier = 'premium' THEN NULL
      ELSE GREATEST(0, 3 - COALESCE(us.trial_audio_jobs_used, 0))
    END AS audio_jobs_remaining,
    (us.tier = 'trial' AND NOW() > us.trial_ends_at) AS is_trial_expired
  FROM public.user_subscriptions us
  WHERE us.user_id = user_id_param;
END;
$$;

-- ============================================================================
-- 9. Fix update_updated_at_column (trigger function - best practice)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================================
-- 10. Fix sync_full_name (trigger function - best practice)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate name as "first_name last_name"
  NEW.name = TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================================
-- 11. Fix search_embeddings (regular function - best practice)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_embeddings(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  filter_notebook_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  material_id uuid,
  chunk_text text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.material_id,
    embeddings.chunk_text,
    embeddings.metadata,
    1 - (embeddings.embedding <=> query_embedding) AS similarity
  FROM public.embeddings
  WHERE 
    (filter_notebook_id IS NULL OR embeddings.notebook_id = filter_notebook_id)
    AND 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

