-- ============================================================================
-- MIGRATION 045: Rename Audio Overview to Podcast
-- ============================================================================
-- Purpose:
--   - Update all user-facing terminology from "Audio Overview" to "Podcast".
--
-- Changes:
--   - "Generate your first audio overview" -> "Generate your first podcast"
--   - "Listen to an audio overview" -> "Listen to a podcast"
--   - "Rate an audio overview" -> "Rate a podcast"
-- ============================================================================

UPDATE pet_tasks 
SET 
  title = 'Generate your first podcast',
  description = 'Use the Studio to generate a podcast for any notebook.'
WHERE task_key = 'generate_audio_overview';

UPDATE pet_tasks 
SET 
  title = 'Listen to a podcast',
  description = 'Play any generated podcast.'
WHERE task_key = 'listen_audio_overview';

UPDATE pet_tasks 
SET 
  title = 'Rate a podcast',
  description = 'Give a thumbs up or down to any podcast.'
WHERE task_key = 'audio_feedback_given';
