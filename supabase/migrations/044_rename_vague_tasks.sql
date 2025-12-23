-- ============================================================================
-- MIGRATION 044: Rename Vague Pet Tasks
-- ============================================================================
-- Purpose:
--   - Rename "achievement-style" task titles to be more action-oriented.
--   - Ensure users know exactly what to do to earn points.
--
-- Changes:
--   - "High Achiever" -> "Get a perfect quiz score"
--   - "Knowledge Gardener" -> "Add more study material"
--   - "Reviewer" -> "Rate an audio overview"
--   - "Early Bird" -> "Study early in the morning"
-- ============================================================================

UPDATE pet_tasks 
SET title = 'Get a perfect quiz score' 
WHERE task_key = 'quiz_perfect_score';

UPDATE pet_tasks 
SET title = 'Add more study material' 
WHERE task_key = 'add_material_daily';

UPDATE pet_tasks 
SET title = 'Rate an audio overview' 
WHERE task_key = 'audio_feedback_given';

UPDATE pet_tasks 
SET title = 'Study early in the morning' 
WHERE task_key = 'study_early_bird';
