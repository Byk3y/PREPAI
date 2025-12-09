-- ============================================================================
-- MIGRATION 023: Create flashcard_completions and study_sessions tables
-- ============================================================================
-- Purpose:
--   - Track flashcard completions for "Study 5 flashcards" task
--   - Track study sessions for "Study for 15 minutes" task
--   - Support task completion detection and progress tracking
--
-- Data Migration Plan:
--   - These are new tables, no existing data to migrate
--   - flashcard_completions: Tracks each time a user completes a flashcard
--   - study_sessions: Tracks study time per notebook/session
--   - Existing flashcard data in studio_flashcards table is not affected
--
-- Dependencies:
--   - Requires uuid-ossp extension for uuid_generate_v4() function
--   - Extension should already be enabled (used by existing tables)
--   - Depends on studio_flashcards table (for flashcard_completions FK)
--   - Depends on notebooks table (for study_sessions FK)
--
-- Rollback Instructions:
--   See ROLLBACK section at bottom of file
-- ============================================================================

-- Ensure uuid-ossp extension is available (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FLASHCARD COMPLETIONS TABLE
-- ============================================================================
-- Tracks each time a user completes/studies a flashcard
-- Used for "Study 5 flashcards" daily task
CREATE TABLE IF NOT EXISTS flashcard_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and flashcard references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES studio_flashcards(id) ON DELETE CASCADE,
  
  -- Completion tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FLASHCARD COMPLETIONS INDEXES
-- ============================================================================
-- Index for querying user's flashcard completions (for task progress)
CREATE INDEX IF NOT EXISTS idx_flashcard_completions_user 
  ON flashcard_completions(user_id);

-- Index for querying by flashcard (analytics)
CREATE INDEX IF NOT EXISTS idx_flashcard_completions_flashcard 
  ON flashcard_completions(flashcard_id);

-- Composite index for common query: user's completions today
CREATE INDEX IF NOT EXISTS idx_flashcard_completions_user_date 
  ON flashcard_completions(user_id, created_at DESC);

-- ============================================================================
-- STUDY SESSIONS TABLE
-- ============================================================================
-- Tracks study sessions for timing and progress
-- Used for "Study for 15 minutes" daily task
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and notebook references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL,  -- Optional: may study without notebook
  
  -- Session timing
  start_at TIMESTAMPTZ NOT NULL,      -- When study session started
  end_at TIMESTAMPTZ,                  -- When study session ended (NULL if ongoing)
  duration_seconds INTEGER,            -- Calculated duration (end_at - start_at)
  
  -- Metadata
  session_type TEXT DEFAULT 'study',  -- e.g., 'study', 'review', 'quiz'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STUDY SESSIONS INDEXES
-- ============================================================================
-- Index for querying user's study sessions
CREATE INDEX IF NOT EXISTS idx_study_sessions_user 
  ON study_sessions(user_id);

-- Index for querying by notebook
CREATE INDEX IF NOT EXISTS idx_study_sessions_notebook 
  ON study_sessions(notebook_id);

-- Index for querying sessions by date (for daily task)
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_at 
  ON study_sessions(start_at DESC);

-- Composite index for common query: user's sessions today
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date 
  ON study_sessions(user_id, start_at DESC);

-- Index for querying ongoing sessions (end_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_study_sessions_ongoing 
  ON study_sessions(user_id, end_at) 
  WHERE end_at IS NULL;

-- ============================================================================
-- UPDATED_AT TRIGGER FOR STUDY SESSIONS
-- ============================================================================
CREATE TRIGGER update_study_sessions_updated_at 
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS (for reference, not created here)
-- ============================================================================
-- Calculate total study time for user today:
-- SELECT COALESCE(SUM(duration_seconds), 0) / 60.0 AS total_minutes
-- FROM study_sessions
-- WHERE user_id = $1
--   AND start_at >= CURRENT_DATE
--   AND end_at IS NOT NULL;
--
-- Get user's flashcard completion count today:
-- SELECT COUNT(*) AS completion_count
-- FROM flashcard_completions
-- WHERE user_id = $1
--   AND created_at >= CURRENT_DATE;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run the following SQL:
--
-- -- Rollback study_sessions
-- DROP TRIGGER IF EXISTS update_study_sessions_updated_at ON study_sessions;
-- DROP INDEX IF EXISTS idx_study_sessions_ongoing;
-- DROP INDEX IF EXISTS idx_study_sessions_user_date;
-- DROP INDEX IF EXISTS idx_study_sessions_start_at;
-- DROP INDEX IF EXISTS idx_study_sessions_notebook;
-- DROP INDEX IF EXISTS idx_study_sessions_user;
-- DROP TABLE IF EXISTS study_sessions;
--
-- -- Rollback flashcard_completions
-- DROP INDEX IF EXISTS idx_flashcard_completions_user_date;
-- DROP INDEX IF EXISTS idx_flashcard_completions_flashcard;
-- DROP INDEX IF EXISTS idx_flashcard_completions_user;
-- DROP TABLE IF EXISTS flashcard_completions;
--
-- Note: This will delete all completion and session records. Consider backing up data first.


