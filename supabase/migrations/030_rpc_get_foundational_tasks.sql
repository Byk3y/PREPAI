-- ============================================================================
-- MIGRATION 030: RPC to Get Foundational Tasks
-- ============================================================================
-- Purpose:
--   - Return all foundational tasks for a user (both completed and incomplete)
--   - Used to display onboarding tasks in the pet sheet UI
--   - Completed tasks remain visible with checkmark for user validation
--   - Foundational tasks are shown until completed, even in Stage 2+
--
-- Dependencies:
--   - Requires pet_tasks table (Migration 021)
--   - Requires pet_task_completions table (Migration 022)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant execute permission
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_foundational_tasks(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================
-- Get foundational tasks for a user (returns all, with completion status):
-- SELECT get_foundational_tasks('user-uuid');
--
-- After completing a task, it should still appear with completed=true:
-- SELECT award_task_points('user-uuid', 'name_pet', CURRENT_DATE, 'UTC');
-- SELECT get_foundational_tasks('user-uuid');  -- Should include 'name_pet' with completed=true
