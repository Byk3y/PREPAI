-- ============================================================================
-- MIGRATION 038: Add Per-Option Explanations to Quiz Questions
-- ============================================================================
-- Adds explanations JSONB field to store educational explanations for each
-- option (A, B, C, D). Explanations are shown immediately after answer
-- selection to provide educational feedback.
-- ============================================================================

-- Add explanations column
ALTER TABLE public.studio_quiz_questions
  ADD COLUMN IF NOT EXISTS explanations JSONB DEFAULT NULL;

-- Add check constraint to ensure valid structure (all 4 options must exist)
ALTER TABLE public.studio_quiz_questions
  ADD CONSTRAINT explanations_has_all_options CHECK (
    explanations IS NULL OR (
      explanations ? 'A' AND
      explanations ? 'B' AND
      explanations ? 'C' AND
      explanations ? 'D'
    )
  );

-- Optional: Index for analytics/reporting
CREATE INDEX IF NOT EXISTS idx_quiz_questions_has_explanations
  ON public.studio_quiz_questions ((explanations IS NOT NULL))
  WHERE explanations IS NOT NULL;

-- Add comment
COMMENT ON COLUMN studio_quiz_questions.explanations IS
  'Per-option educational explanations shown after answer selection. Structure: {"A": "...", "B": "...", "C": "...", "D": "..."}';
