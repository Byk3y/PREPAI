-- ============================================================================
-- MIGRATION 020: Update pet_states to use Points/Stage system
-- ============================================================================
-- Purpose:
--   - Rename 'level' → 'current_stage' (aligns with PRD terminology)
--   - Rename 'xp' → 'current_points' (aligns with PRD terminology)
--   - Remove 'xp_to_next' column (no longer needed with fixed 100 points/stage)
--   - Preserve all existing data during migration
--
-- Data Migration Plan:
--   1. Existing 'level' values map 1:1 to 'current_stage' (no conversion needed)
--   2. Existing 'xp' values map 1:1 to 'current_points' (no conversion needed)
--   3. Stage calculation: current_stage = FLOOR(current_points / 100) + 1
--      - 0-100 points → Stage 1
--      - 101-200 points → Stage 2
--      - 201-300 points → Stage 3
--   4. 'xp_to_next' is dropped (can be calculated: 100 - (current_points % 100))
--
-- Rollback Instructions:
--   See ROLLBACK section at bottom of file
-- ============================================================================

-- Step 1: Rename 'level' to 'current_stage'
-- This preserves all existing data, just changes the column name
ALTER TABLE pet_states 
  RENAME COLUMN level TO current_stage;

-- Step 2: Rename 'xp' to 'current_points'
-- This preserves all existing data, just changes the column name
ALTER TABLE pet_states 
  RENAME COLUMN xp TO current_points;

-- Step 3: Drop 'xp_to_next' column
-- This column is no longer needed since we use fixed 100 points per stage
-- Points to next stage can be calculated: 100 - (current_points % 100)
ALTER TABLE pet_states 
  DROP COLUMN IF EXISTS xp_to_next;

-- Step 4: Update any default values in comments/documentation
-- (No code changes needed, defaults remain the same)

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to verify data integrity)
-- ============================================================================
-- Check that all rows have valid stage values:
-- SELECT user_id, current_stage, current_points, 
--        FLOOR(current_points / 100) + 1 AS calculated_stage
-- FROM pet_states;
--
-- Verify stage matches calculated stage (should all show 'OK'):
-- SELECT user_id, current_stage, current_points,
--        CASE 
--          WHEN current_stage = FLOOR(current_points / 100) + 1 THEN 'OK'
--          ELSE 'MISMATCH - needs correction'
--        END AS stage_check
-- FROM pet_states;
--
-- Count total rows to ensure no data loss:
-- SELECT COUNT(*) AS total_rows FROM pet_states;
--
-- Verify column names were renamed correctly:
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'pet_states'
--   AND column_name IN ('current_stage', 'current_points', 'level', 'xp', 'xp_to_next');
-- Expected: Should show 'current_stage' and 'current_points', NOT 'level', 'xp', or 'xp_to_next'

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run the following SQL:
--
-- -- Step 1: Re-add xp_to_next column (with default calculation)
-- ALTER TABLE pet_states 
--   ADD COLUMN xp_to_next INTEGER DEFAULT 100;
--
-- -- Step 2: Calculate xp_to_next for existing rows
-- -- Handle edge case: if current_points is exactly 100, 200, etc., xp_to_next should be 100
-- UPDATE pet_states 
-- SET xp_to_next = CASE 
--   WHEN current_points % 100 = 0 AND current_points > 0 THEN 100
--   ELSE 100 - (current_points % 100)
-- END
-- WHERE xp_to_next IS NULL OR xp_to_next = 100;
--
-- -- Step 3: Rename current_points back to xp
-- ALTER TABLE pet_states 
--   RENAME COLUMN current_points TO xp;
--
-- -- Step 4: Rename current_stage back to level
-- ALTER TABLE pet_states 
--   RENAME COLUMN current_stage TO level;
--
-- Note: Rollback preserves all data, just restores original column names
-- The xp_to_next calculation handles edge cases where points are exactly at stage boundaries


