-- Migration: Fix notebook UPDATE policy to include WITH CHECK clause
-- This fixes the RLS error when soft-deleting notebooks (updating deleted_at)

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own notebooks" ON notebooks;

-- Recreate with WITH CHECK clause
CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



























