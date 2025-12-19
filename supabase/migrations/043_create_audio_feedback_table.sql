-- ============================================================================
-- MIGRATION 043: Create audio_feedback table
-- ============================================================================
-- Purpose:
--   - Track user likes/dislikes for audio overviews
--   - Support feedback collection and analytics
--   - Allow users to change their feedback (like -> dislike or remove)
--
-- Data Migration Plan:
--   - This is a new table, no existing data to migrate
--   - Feedback will be inserted/updated as users interact with audio
--   - One feedback record per user per audio overview (upsert pattern)
--
-- Dependencies:
--   - Requires uuid-ossp extension for uuid_generate_v4() function
--   - Extension should already be enabled (used by existing tables)
--   - Depends on audio_overviews table (for audio_overview_id FK)
--   - Depends on auth.users table (for user_id FK)
--
-- Rollback Instructions:
--   See ROLLBACK section at bottom of file
-- ============================================================================

-- Ensure uuid-ossp extension is available (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AUDIO FEEDBACK TABLE
-- ============================================================================
-- Tracks user likes/dislikes for audio overviews
-- Uses upsert pattern: one feedback per user per audio overview
CREATE TABLE IF NOT EXISTS audio_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and audio overview references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_overview_id UUID NOT NULL REFERENCES audio_overviews(id) ON DELETE CASCADE,
  
  -- Feedback data
  is_liked BOOLEAN NOT NULL,  -- true = liked, false = disliked
  -- NULL is not allowed - user must explicitly like or dislike
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: One feedback per user per audio overview
  CONSTRAINT audio_feedback_user_audio_unique UNIQUE (user_id, audio_overview_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for querying user's feedback
CREATE INDEX IF NOT EXISTS idx_audio_feedback_user 
  ON audio_feedback(user_id);

-- Index for querying feedback by audio overview (analytics)
CREATE INDEX IF NOT EXISTS idx_audio_feedback_audio_overview 
  ON audio_feedback(audio_overview_id);

-- Composite index for common query: user's feedback for specific audio
CREATE INDEX IF NOT EXISTS idx_audio_feedback_user_audio 
  ON audio_feedback(user_id, audio_overview_id);

-- Index for analytics: count likes/dislikes per audio
CREATE INDEX IF NOT EXISTS idx_audio_feedback_audio_liked 
  ON audio_feedback(audio_overview_id, is_liked);

-- ============================================================================
-- UPDATE TRIGGER
-- ============================================================================
-- Automatically update updated_at timestamp on row update
CREATE OR REPLACE FUNCTION update_audio_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_audio_feedback_updated_at
  BEFORE UPDATE ON audio_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_audio_feedback_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE audio_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own audio feedback"
  ON audio_feedback FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own feedback
CREATE POLICY "Users can insert own audio feedback"
  ON audio_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own feedback (to change like/dislike or remove)
CREATE POLICY "Users can update own audio feedback"
  ON audio_feedback FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own feedback (to remove feedback)
CREATE POLICY "Users can delete own audio feedback"
  ON audio_feedback FOR DELETE
  USING (user_id = auth.uid());

-- Service role can manage all feedback (for Edge Functions/analytics)
CREATE POLICY "Service can manage audio feedback"
  ON audio_feedback FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE audio_feedback IS 'Tracks user likes/dislikes for audio overviews. One feedback record per user per audio overview.';
COMMENT ON COLUMN audio_feedback.is_liked IS 'true = liked, false = disliked. NULL not allowed - user must explicitly choose.';
COMMENT ON COLUMN audio_feedback.updated_at IS 'Automatically updated when feedback is changed (like -> dislike or vice versa)';

-- ============================================================================
-- HELPER QUERIES (for reference)
-- ============================================================================
-- Get user's feedback for a specific audio overview:
-- SELECT * FROM audio_feedback
-- WHERE user_id = $1 AND audio_overview_id = $2;
--
-- Count likes for an audio overview:
-- SELECT COUNT(*) FROM audio_feedback
-- WHERE audio_overview_id = $1 AND is_liked = true;
--
-- Count dislikes for an audio overview:
-- SELECT COUNT(*) FROM audio_feedback
-- WHERE audio_overview_id = $1 AND is_liked = false;
--
-- Get all feedback for a user:
-- SELECT af.*, ao.title, ao.notebook_id
-- FROM audio_feedback af
-- JOIN audio_overviews ao ON af.audio_overview_id = ao.id
-- WHERE af.user_id = $1
-- ORDER BY af.updated_at DESC;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run the following SQL:
--
-- DROP TRIGGER IF EXISTS trigger_update_audio_feedback_updated_at ON audio_feedback;
-- DROP FUNCTION IF EXISTS update_audio_feedback_updated_at();
-- DROP POLICY IF EXISTS "Service can manage audio feedback" ON audio_feedback;
-- DROP POLICY IF EXISTS "Users can delete own audio feedback" ON audio_feedback;
-- DROP POLICY IF EXISTS "Users can update own audio feedback" ON audio_feedback;
-- DROP POLICY IF EXISTS "Users can insert own audio feedback" ON audio_feedback;
-- DROP POLICY IF EXISTS "Users can view own audio feedback" ON audio_feedback;
-- DROP INDEX IF EXISTS idx_audio_feedback_audio_liked;
-- DROP INDEX IF EXISTS idx_audio_feedback_user_audio;
-- DROP INDEX IF EXISTS idx_audio_feedback_audio_overview;
-- DROP INDEX IF EXISTS idx_audio_feedback_user;
-- DROP TABLE IF EXISTS audio_feedback;
--
-- Note: This will delete all feedback records. Consider backing up data first.

