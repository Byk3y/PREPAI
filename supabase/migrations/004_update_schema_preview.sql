-- ============================================================================
-- MIGRATION 004: Update Schema for Preview-Only Processing
-- ============================================================================
-- This migration updates the schema to support preview-only processing:
-- 1. Add preview_text column to materials table
-- 2. Update notebooks.status constraint to new values
-- 3. Update default status value
-- ============================================================================

-- Add preview_text column to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS preview_text TEXT;

-- Update notebooks.status constraint
-- First, drop the old constraint (if it exists)
ALTER TABLE notebooks 
DROP CONSTRAINT IF EXISTS notebooks_status_check;

-- Add new constraint with updated status values
ALTER TABLE notebooks 
ADD CONSTRAINT notebooks_status_check 
CHECK (status IN ('extracting', 'preview_ready', 'ready_for_studio'));

-- Update default status value
ALTER TABLE notebooks 
ALTER COLUMN status SET DEFAULT 'extracting';

-- Update any existing records with old status values to new values
-- 'processing' -> 'extracting'
-- 'ready' -> 'preview_ready'
-- 'draft' -> 'extracting'
-- 'failed' -> 'extracting' (or handle as needed)
UPDATE notebooks 
SET status = CASE 
  WHEN status = 'processing' THEN 'extracting'
  WHEN status = 'ready' THEN 'preview_ready'
  WHEN status = 'draft' THEN 'extracting'
  WHEN status = 'failed' THEN 'extracting'
  ELSE status
END
WHERE status IN ('draft', 'processing', 'ready', 'failed');

