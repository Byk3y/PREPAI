-- ============================================================================
-- MIGRATION 021: Create pet_tasks table
-- ============================================================================
-- Purpose:
--   - Create table to store task definitions (foundational + daily tasks)
--   - Tasks are global definitions, not user-specific
--   - Supports PRD requirements: foundational tasks (one-time) and daily tasks
--
-- Data Migration Plan:
--   - This is a new table, no existing data to migrate
--   - Seed data will be inserted in a separate migration or via application
--   - Expected seed data:
--     * Foundational tasks (3): name_pet, add_material, generate_audio
--     * Daily tasks (4): study_flashcards, study_15min, listen_audio, maintain_streak
--
-- Dependencies:
--   - Requires uuid-ossp extension for uuid_generate_v4() function
--   - Extension should already be enabled (used by existing tables)
--
-- Rollback Instructions:
--   See ROLLBACK section at bottom of file
-- ============================================================================

-- Ensure uuid-ossp extension is available (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PET TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pet_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Task identification
  task_key TEXT UNIQUE NOT NULL,  -- e.g., 'name_pet', 'add_material', 'study_flashcards'
  
  -- Task classification
  task_type TEXT NOT NULL CHECK (task_type IN ('foundational', 'daily')),
  
  -- Task display information
  title TEXT NOT NULL,              -- e.g., "Name your pet"
  description TEXT,                  -- Optional detailed description
  
  -- Points awarded (per PRD: 1, 2, or 4 points)
  points INTEGER NOT NULL CHECK (points > 0 AND points <= 4),
  
  -- Event trigger (for automatic completion detection)
  trigger_event TEXT,                -- e.g., 'pet_name_updated', 'material_created'
  
  -- Display ordering
  display_order INTEGER DEFAULT 0,   -- For sorting tasks in UI
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for filtering by task type (foundational vs daily)
CREATE INDEX IF NOT EXISTS idx_pet_tasks_type 
  ON pet_tasks(task_type);

-- Index for quick lookup by task_key (used in completion checks)
CREATE INDEX IF NOT EXISTS idx_pet_tasks_key 
  ON pet_tasks(task_key);

-- Index for sorting by display order
CREATE INDEX IF NOT EXISTS idx_pet_tasks_display_order 
  ON pet_tasks(display_order, task_type);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_pet_tasks_updated_at 
  BEFORE UPDATE ON pet_tasks
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA TEMPLATE (for reference, not executed here)
-- ============================================================================
-- Foundational Tasks:
-- INSERT INTO pet_tasks (task_key, task_type, title, description, points, trigger_event, display_order) VALUES
--   ('name_pet', 'foundational', 'Name your pet', 'Edit your pet''s name', 1, 'pet_name_updated', 1),
--   ('add_material', 'foundational', 'Add your first study material', 'Upload a PDF, image, text, or link', 1, 'material_created', 2),
--   ('generate_audio', 'foundational', 'Generate your first audio overview', 'Use Studio → Audio Overview', 2, 'audio_overview_completed', 3);
--
-- Daily Tasks:
-- INSERT INTO pet_tasks (task_key, task_type, title, description, points, trigger_event, display_order) VALUES
--   ('study_flashcards', 'daily', 'Study 5 flashcards', 'Complete 5 flashcards from any set', 1, 'flashcard_completed', 10),
--   ('study_15min', 'daily', 'Study for 15 minutes', 'Timer tracks continuous study', 2, 'study_timer_15min', 11),
--   ('listen_audio', 'daily', 'Listen to an audio overview', 'Play a generated audio overview', 1, 'audio_playback_started', 12),
--   ('maintain_streak', 'daily', 'Maintain daily streak', 'Awarded automatically when streak increments', 4, 'streak_incremented', 13);

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run the following SQL:
--
-- DROP TRIGGER IF EXISTS update_pet_tasks_updated_at ON pet_tasks;
-- DROP INDEX IF EXISTS idx_pet_tasks_display_order;
-- DROP INDEX IF EXISTS idx_pet_tasks_key;
-- DROP INDEX IF EXISTS idx_pet_tasks_type;
-- DROP TABLE IF EXISTS pet_tasks;
--
-- Note: This will also drop any seed data that was inserted
















