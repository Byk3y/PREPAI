-- Migration: Switch notebooks from soft delete to hard delete
-- This migration removes the deleted_at column and updates all RLS policies and indexes

-- ============================================================================
-- STEP 1: Update RLS Policies - Remove deleted_at filters
-- ============================================================================

-- Update "Users can view own notebooks" - remove deleted_at filter
DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (auth.uid() = user_id);

-- Update "Users can view public notebooks" - remove deleted_at filter
DROP POLICY IF EXISTS "Users can view public notebooks" ON notebooks;
CREATE POLICY "Users can view public notebooks"
  ON notebooks FOR SELECT
  USING (is_public = true);

-- Update "Users can view shared notebooks" - remove deleted_at filter
DROP POLICY IF EXISTS "Users can view shared notebooks" ON notebooks;
CREATE POLICY "Users can view shared notebooks"
  ON notebooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notebook_shares
      WHERE notebook_shares.notebook_id = notebooks.id
        AND (
          notebook_shares.shared_with_user_id = auth.uid()
          OR notebook_shares.share_key IS NOT NULL
        )
        AND notebook_shares.revoked_at IS NULL
        AND (notebook_shares.expires_at IS NULL OR notebook_shares.expires_at > NOW())
    )
  );

-- Convert "Users can delete own notebooks" from UPDATE to DELETE policy
DROP POLICY IF EXISTS "Users can delete own notebooks" ON notebooks;
CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- Update "Users can view accessible flashcards" - remove deleted_at filter
DROP POLICY IF EXISTS "Users can view accessible flashcards" ON flashcards;
CREATE POLICY "Users can view accessible flashcards"
  ON flashcards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = flashcards.notebook_id
        AND (
          notebooks.user_id = auth.uid()
          OR notebooks.is_public = true
          OR EXISTS (
            SELECT 1 FROM notebook_shares
            WHERE notebook_shares.notebook_id = notebooks.id
              AND (
                notebook_shares.shared_with_user_id = auth.uid()
                OR notebook_shares.share_key IS NOT NULL
              )
              AND notebook_shares.revoked_at IS NULL
              AND (notebook_shares.expires_at IS NULL OR notebook_shares.expires_at > NOW())
          )
        )
    )
  );

-- ============================================================================
-- STEP 2: Drop indexes that reference deleted_at
-- ============================================================================

-- Drop index on deleted_at
DROP INDEX IF EXISTS idx_notebooks_deleted_at;

-- Drop and recreate idx_notebooks_preview_generated without deleted_at filter
DROP INDEX IF EXISTS idx_notebooks_preview_generated;
CREATE INDEX IF NOT EXISTS idx_notebooks_preview_generated 
  ON notebooks(preview_generated_at DESC) 
  WHERE preview_generated_at IS NOT NULL;

-- Drop and recreate idx_notebooks_studio_jobs without deleted_at filter
DROP INDEX IF EXISTS idx_notebooks_studio_jobs;
CREATE INDEX IF NOT EXISTS idx_notebooks_studio_jobs 
  ON notebooks(user_id, studio_jobs_count DESC);

-- ============================================================================
-- STEP 3: Drop deleted_at column
-- ============================================================================

ALTER TABLE notebooks DROP COLUMN IF EXISTS deleted_at;
































