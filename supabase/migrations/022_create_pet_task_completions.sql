-- ============================================================================
-- MIGRATION 022: Create pet_task_completions table
-- ============================================================================
-- Purpose:
--   - Track user task completions (both foundational and daily)
--   - Prevent duplicate completions (via UNIQUE constraint)
--   - Support daily task reset logic (via completion_date)
--   - Track points awarded for audit/debugging
--
-- Data Migration Plan:
--   - This is a new table, no existing data to migrate
--   - Completions will be inserted as users complete tasks
--   - Daily tasks use completion_date for reset logic
--   - Foundational tasks can use any date (only one completion ever)
--
-- Dependencies:
--   - Requires uuid-ossp extension for uuid_generate_v4() function
--   - Extension should already be enabled (used by existing tables)
--   - Depends on pet_tasks table (created in migration 021)
--
-- Rollback Instructions:
--   See ROLLBACK section at bottom of file
-- ============================================================================

-- Ensure uuid-ossp extension is available (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PET TASK COMPLETIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pet_task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and task references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES pet_tasks(id) ON DELETE CASCADE,
  
  -- Completion tracking
  completed_at TIMESTAMPTZ DEFAULT NOW(),  -- Exact timestamp of completion
  completion_date DATE NOT NULL,            -- Date for daily reset logic (local date)
  
  -- Points tracking
  points_awarded INTEGER NOT NULL,          -- Points awarded (for audit/debugging)
  
  -- Source tracking (optional, for debugging)
  source TEXT,                               -- e.g., 'automatic', 'manual', 'migration'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
-- Prevent duplicate completions per user per task per day
-- This ensures:
--   - Foundational tasks can only be completed once (same date for all)
--   - Daily tasks can only be completed once per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_pet_task_completions_unique 
  ON pet_task_completions(user_id, task_id, completion_date);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for querying user's completions
CREATE INDEX IF NOT EXISTS idx_task_completions_user 
  ON pet_task_completions(user_id);

-- Index for querying by task
CREATE INDEX IF NOT EXISTS idx_task_completions_task 
  ON pet_task_completions(task_id);

-- Index for daily reset queries (find completions for a specific date)
CREATE INDEX IF NOT EXISTS idx_task_completions_date 
  ON pet_task_completions(completion_date);

-- Composite index for common query: user's completions on a specific date
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date 
  ON pet_task_completions(user_id, completion_date);

-- Index for querying by completion timestamp (for analytics)
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at 
  ON pet_task_completions(completed_at DESC);

-- ============================================================================
-- HELPER QUERIES (for reference)
-- ============================================================================
-- Check if user has completed a task today:
-- SELECT EXISTS (
--   SELECT 1 FROM pet_task_completions
--   WHERE user_id = $1 
--     AND task_id = $2 
--     AND completion_date = CURRENT_DATE
-- );
--
-- Get user's completed foundational tasks:
-- SELECT ptc.*, pt.task_key, pt.title
-- FROM pet_task_completions ptc
-- JOIN pet_tasks pt ON ptc.task_id = pt.id
-- WHERE ptc.user_id = $1 
--   AND pt.task_type = 'foundational';
--
-- Get user's daily task completions for today:
-- SELECT ptc.*, pt.task_key, pt.title, pt.points
-- FROM pet_task_completions ptc
-- JOIN pet_tasks pt ON ptc.task_id = pt.id
-- WHERE ptc.user_id = $1 
--   AND pt.task_type = 'daily'
--   AND ptc.completion_date = CURRENT_DATE;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run the following SQL:
--
-- DROP INDEX IF EXISTS idx_task_completions_completed_at;
-- DROP INDEX IF EXISTS idx_task_completions_user_date;
-- DROP INDEX IF EXISTS idx_task_completions_date;
-- DROP INDEX IF EXISTS idx_task_completions_task;
-- DROP INDEX IF EXISTS idx_task_completions_user;
-- DROP INDEX IF EXISTS idx_pet_task_completions_unique;
-- DROP TABLE IF EXISTS pet_task_completions;
--
-- Note: This will delete all completion records. Consider backing up data first.
















