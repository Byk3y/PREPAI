-- ============================================================================
-- MIGRATION 024: RLS Policies for Pet Tasks System
-- ============================================================================
-- Purpose:
--   - Enable Row Level Security on pet_tasks and pet_task_completions tables
--   - pet_tasks: Read-only for all authenticated users (tasks are global)
--   - pet_task_completions: Users can only view/insert their own completions
--   - Also enable RLS on flashcard_completions and study_sessions
--
-- Data Migration Plan:
--   - No data migration needed (RLS policies only)
--   - Existing data remains accessible based on policies
--   - Policies are additive (can be dropped without data loss)
--
-- Rollback Instructions:
--   See ROLLBACK section at bottom of file
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE pet_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PET TASKS POLICIES
-- ============================================================================
-- Tasks are global definitions, all authenticated users can read them
-- No INSERT/UPDATE/DELETE policies (tasks are managed by admins/system)

-- All authenticated users can view all tasks
CREATE POLICY "Authenticated users can view all tasks"
  ON pet_tasks FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- PET TASK COMPLETIONS POLICIES
-- ============================================================================
-- Users can only view their own task completions
CREATE POLICY "Users can view own task completions"
  ON pet_task_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own task completions
CREATE POLICY "Users can insert own task completions"
  ON pet_task_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE or DELETE policies
-- Task completions should be immutable (prevent gaming the system)
-- If correction needed, use database admin access

-- ============================================================================
-- FLASHCARD COMPLETIONS POLICIES
-- ============================================================================
-- Users can only view their own flashcard completions
CREATE POLICY "Users can view own flashcard completions"
  ON flashcard_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own flashcard completions
CREATE POLICY "Users can insert own flashcard completions"
  ON flashcard_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE or DELETE policies
-- Completions are immutable to prevent gaming

-- ============================================================================
-- STUDY SESSIONS POLICIES
-- ============================================================================
-- Users can view their own study sessions
CREATE POLICY "Users can view own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own study sessions
CREATE POLICY "Users can insert own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own study sessions (to set end_at, duration)
CREATE POLICY "Users can update own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: No DELETE policy (sessions are historical records)

-- ============================================================================
-- VERIFICATION QUERIES (for reference)
-- ============================================================================
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('pet_tasks', 'pet_task_completions', 'flashcard_completions', 'study_sessions');
--
-- List all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('pet_tasks', 'pet_task_completions', 'flashcard_completions', 'study_sessions');

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run the following SQL:
--
-- -- Drop all policies
-- DROP POLICY IF EXISTS "Users can update own study sessions" ON study_sessions;
-- DROP POLICY IF EXISTS "Users can insert own study sessions" ON study_sessions;
-- DROP POLICY IF EXISTS "Users can view own study sessions" ON study_sessions;
-- DROP POLICY IF EXISTS "Users can insert own flashcard completions" ON flashcard_completions;
-- DROP POLICY IF EXISTS "Users can view own flashcard completions" ON flashcard_completions;
-- DROP POLICY IF EXISTS "Users can insert own task completions" ON pet_task_completions;
-- DROP POLICY IF EXISTS "Users can view own task completions" ON pet_task_completions;
-- DROP POLICY IF EXISTS "Authenticated users can view all tasks" ON pet_tasks;
--
-- -- Disable RLS (optional - tables will still exist)
-- ALTER TABLE study_sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE flashcard_completions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pet_task_completions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pet_tasks DISABLE ROW LEVEL SECURITY;
--
-- Note: Disabling RLS makes tables accessible to all users. Only do this if you
--       have other security measures in place (e.g., application-level auth).

