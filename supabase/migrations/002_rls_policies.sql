-- Migration: RLS Policies
-- Enables Row-Level Security and creates policies for all tables

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- INSERT is handled by trigger, no policy needed

-- ============================================================================
-- MATERIALS POLICIES
-- ============================================================================
-- Users can read their own materials
CREATE POLICY "Users can view own materials"
  ON materials FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create materials with their own user_id
CREATE POLICY "Users can create own materials"
  ON materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own materials
CREATE POLICY "Users can update own materials"
  ON materials FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own materials
CREATE POLICY "Users can delete own materials"
  ON materials FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- NOTEBOOKS POLICIES
-- ============================================================================
-- Users can read their own notebooks (not deleted)
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  );

-- Users can read public notebooks (not deleted)
CREATE POLICY "Users can view public notebooks"
  ON notebooks FOR SELECT
  USING (
    is_public = true 
    AND deleted_at IS NULL
  );

-- Users can read shared notebooks (via notebook_shares)
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
    AND deleted_at IS NULL
  );

-- Users can create notebooks with their own user_id
CREATE POLICY "Users can create own notebooks"
  ON notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notebooks
CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can soft-delete their own notebooks
CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- NOTEBOOK SHARES POLICIES
-- ============================================================================
-- Users can see shares for notebooks they own or are shared with
CREATE POLICY "Users can view relevant shares"
  ON notebook_shares FOR SELECT
  USING (
    created_by = auth.uid()
    OR shared_with_user_id = auth.uid()
    OR (
      share_key IS NOT NULL
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Users can create shares for notebooks they own
CREATE POLICY "Users can create shares for own notebooks"
  ON notebook_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = notebook_shares.notebook_id
        AND notebooks.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update shares for notebooks they own
CREATE POLICY "Users can update shares for own notebooks"
  ON notebook_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = notebook_shares.notebook_id
        AND notebooks.user_id = auth.uid()
    )
  );

-- Users can delete/revoke shares for notebooks they own
CREATE POLICY "Users can delete shares for own notebooks"
  ON notebook_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = notebook_shares.notebook_id
        AND notebooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FLASHCARDS POLICIES
-- ============================================================================
-- Users can read flashcards for notebooks they have access to
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
        AND notebooks.deleted_at IS NULL
    )
  );

-- Users can create flashcards for notebooks they own
CREATE POLICY "Users can create flashcards for own notebooks"
  ON flashcards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = flashcards.notebook_id
        AND notebooks.user_id = auth.uid()
    )
  );

-- Users can update flashcards for notebooks they own
CREATE POLICY "Users can update flashcards for own notebooks"
  ON flashcards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = flashcards.notebook_id
        AND notebooks.user_id = auth.uid()
    )
  );

-- Users can delete flashcards for notebooks they own
CREATE POLICY "Users can delete flashcards for own notebooks"
  ON flashcards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = flashcards.notebook_id
        AND notebooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROCESSING JOBS POLICIES
-- ============================================================================
-- Users can read processing jobs for their own materials
CREATE POLICY "Users can view own processing jobs"
  ON processing_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = processing_jobs.material_id
        AND materials.user_id = auth.uid()
    )
  );

-- Service role can create/update processing jobs (no policy for INSERT/UPDATE)
-- This allows background workers to create jobs

-- ============================================================================
-- PET STATES POLICIES
-- ============================================================================
-- Users can read their own pet state
CREATE POLICY "Users can view own pet state"
  ON pet_states FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own pet state
CREATE POLICY "Users can create own pet state"
  ON pet_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pet state
CREATE POLICY "Users can update own pet state"
  ON pet_states FOR UPDATE
  USING (auth.uid() = user_id);

