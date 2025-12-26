-- Update get_daily_tasks to include completed_at timestamp
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
  v_comp RECORD;
BEGIN
  v_completion_date := (NOW() AT TIME ZONE COALESCE(NULLIF(p_timezone, ''), 'UTC'))::DATE;

  v_has_notebooks := EXISTS(SELECT 1 FROM public.notebooks WHERE user_id = p_user_id LIMIT 1);
  v_has_flashcards := EXISTS(SELECT 1 FROM public.studio_flashcard_sets sfs JOIN public.notebooks n ON sfs.notebook_id = n.id WHERE n.user_id = p_user_id LIMIT 1);
  v_has_quizzes := EXISTS(SELECT 1 FROM public.studio_quizzes sq JOIN public.notebooks n ON sq.notebook_id = n.id WHERE n.user_id = p_user_id LIMIT 1);
  v_has_audio := EXISTS(SELECT 1 FROM public.audio_overviews ao WHERE ao.user_id = p_user_id LIMIT 1);

  IF v_has_quizzes THEN v_pool := array_append(v_pool, 'quiz_5_questions'); END IF;
  IF v_has_flashcards THEN v_pool := array_append(v_pool, 'study_flashcards'); END IF;
  IF v_has_audio THEN v_pool := array_append(v_pool, 'podcast_3_min'); END IF;
  IF v_has_notebooks THEN v_pool := array_append(v_pool, 'chat_with_notebook'); END IF;

  IF array_length(v_pool, 1) < 2 OR v_pool IS NULL THEN
    v_pool := ARRAY['quiz_5_questions', 'study_flashcards', 'podcast_3_min', 'chat_with_notebook'];
  END IF;

  -- Always include secure_pet
  FOR v_task IN SELECT id, task_key, title, description, points FROM pet_tasks WHERE task_key = 'secure_pet' LOOP
    SELECT completed, completed_at INTO v_comp FROM (
      SELECT true as completed, completed_at FROM pet_task_completions 
      WHERE user_id = p_user_id AND task_id = v_task.id AND completion_date = v_completion_date
      UNION ALL
      SELECT false as completed, NULL::timestamptz as completed_at
      LIMIT 1
    ) t ORDER BY completed DESC;

    RETURN NEXT jsonb_build_object(
      'id', v_task.id, 'task_key', v_task.task_key, 'title', v_task.title, 'description', v_task.description, 'points', v_task.points,
      'completed', v_comp.completed,
      'completed_at', v_comp.completed_at
    );
  END LOOP;

  -- Select 2 others from the dynamically built pool
  v_selected := (SELECT ARRAY(SELECT unnest FROM unnest(v_pool) ORDER BY md5(p_user_id::text || v_completion_date::text || unnest) LIMIT 2));

  FOR v_task IN SELECT id, task_key, title, description, points FROM pet_tasks WHERE task_key = ANY(v_selected) ORDER BY display_order LOOP
    SELECT completed, completed_at INTO v_comp FROM (
      SELECT true as completed, completed_at FROM pet_task_completions 
      WHERE user_id = p_user_id AND task_id = v_task.id AND completion_date = v_completion_date
      UNION ALL
      SELECT false as completed, NULL::timestamptz as completed_at
      LIMIT 1
    ) t ORDER BY completed DESC;

    RETURN NEXT jsonb_build_object(
      'id', v_task.id, 'task_key', v_task.task_key, 'title', v_task.title, 'description', v_task.description, 'points', v_task.points,
      'completed', v_comp.completed,
      'completed_at', v_comp.completed_at
    );
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql;
