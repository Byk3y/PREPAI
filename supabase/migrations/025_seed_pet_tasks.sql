-- ============================================================================
-- MIGRATION 025: Seed Pet Tasks
-- ============================================================================
-- Purpose:
--   - Populate pet_tasks table with the 7 canonical tasks defined in Spec
--   - 3 Foundational Tasks
--   - 4 Daily Tasks
--
-- Dependencies:
--   - Requires pet_tasks table (Migration 021)
-- ============================================================================

INSERT INTO pet_tasks (task_key, task_type, title, description, points, trigger_event, display_order) 
VALUES
  -- Foundational Tasks
  ('name_pet', 'foundational', 'Name your pet', 'Edit your pet''s name in the Grow Your Pet bottom sheet.', 1, 'pet_name_updated', 10),
  ('add_material', 'foundational', 'Add your first study material', 'Add a PDF, image, link, text, or audio.', 1, 'material_created', 20),
  ('generate_audio_overview', 'foundational', 'Generate your first audio overview', 'Use the Studio to generate an audio overview for any notebook.', 2, 'audio_overview_completed', 30),

  -- Daily Tasks
  ('maintain_streak', 'daily', 'Maintain your daily streak', 'Earn streak credit by opening the app today.', 4, 'streak_incremented', 10),
  ('study_15_minutes', 'daily', 'Study for 15 minutes', 'Stay in study mode for 15 minutes combined.', 2, 'study_session_updated', 20),
  ('study_flashcards', 'daily', 'Study 5 flashcards', 'Complete any 5 flashcards inside Studio.', 1, 'flashcard_completed', 30),
  ('listen_audio_overview', 'daily', 'Listen to an audio overview', 'Play any generated audio overview.', 1, 'audio_playback_started', 40)
ON CONFLICT (task_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  points = EXCLUDED.points,
  trigger_event = EXCLUDED.trigger_event,
  display_order = EXCLUDED.display_order;
