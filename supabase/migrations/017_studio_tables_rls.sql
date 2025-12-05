-- ============================================================================
-- MIGRATION 017: Studio Tables, Indexes, and RLS Policies
-- ============================================================================
-- Creates tables for AI-generated flashcards and quizzes
-- Includes comprehensive RLS policies for security
-- ============================================================================

-- ============================================================================
-- STUDIO FLASHCARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast notebook lookups
CREATE INDEX IF NOT EXISTS idx_studio_flashcards_notebook 
  ON studio_flashcards(notebook_id);
CREATE INDEX IF NOT EXISTS idx_studio_flashcards_created 
  ON studio_flashcards(created_at DESC);

-- ============================================================================
-- STUDIO QUIZZES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast notebook lookups
CREATE INDEX IF NOT EXISTS idx_studio_quizzes_notebook 
  ON studio_quizzes(notebook_id);
CREATE INDEX IF NOT EXISTS idx_studio_quizzes_created 
  ON studio_quizzes(created_at DESC);

-- ============================================================================
-- STUDIO QUIZ QUESTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES studio_quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- { "A": "...", "B": "...", "C": "...", "D": "..." }
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast quiz lookups  
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz 
  ON studio_quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order 
  ON studio_quiz_questions(quiz_id, display_order);

-- ============================================================================
-- USAGE LOGS TABLE (for cost/usage tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL, -- 'studio', 'audio', 'preview'
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_cents INTEGER,
  latency_ms INTEGER,
  status TEXT DEFAULT 'success', -- 'success', 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user 
  ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created 
  ON usage_logs(created_at DESC);

-- ============================================================================
-- USER SUBSCRIPTIONS TABLE (for quota management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'trial' CHECK (tier IN ('trial', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  trial_studio_jobs_used INTEGER DEFAULT 0,
  trial_audio_jobs_used INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user 
  ON user_subscriptions(user_id);

-- Trigger to auto-create subscription on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- ============================================================================
-- ENABLE RLS ON ALL STUDIO TABLES
-- ============================================================================
ALTER TABLE studio_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STUDIO FLASHCARDS RLS POLICIES
-- ============================================================================
-- Users can view flashcards for notebooks they own
CREATE POLICY "Users can view own flashcards"
  ON studio_flashcards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notebooks 
      WHERE notebooks.id = studio_flashcards.notebook_id 
        AND notebooks.user_id = auth.uid()
        AND notebooks.deleted_at IS NULL
    )
  );

-- Service role can insert (Edge Functions)
CREATE POLICY "Service can insert flashcards"
  ON studio_flashcards FOR INSERT
  WITH CHECK (true);

-- Users can delete their own flashcards
CREATE POLICY "Users can delete own flashcards"
  ON studio_flashcards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks 
      WHERE notebooks.id = studio_flashcards.notebook_id 
        AND notebooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STUDIO QUIZZES RLS POLICIES
-- ============================================================================
-- Users can view quizzes for notebooks they own
CREATE POLICY "Users can view own quizzes"
  ON studio_quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notebooks 
      WHERE notebooks.id = studio_quizzes.notebook_id 
        AND notebooks.user_id = auth.uid()
        AND notebooks.deleted_at IS NULL
    )
  );

-- Service role can insert
CREATE POLICY "Service can insert quizzes"
  ON studio_quizzes FOR INSERT
  WITH CHECK (true);

-- Users can delete their own quizzes
CREATE POLICY "Users can delete own quizzes"
  ON studio_quizzes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks 
      WHERE notebooks.id = studio_quizzes.notebook_id 
        AND notebooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STUDIO QUIZ QUESTIONS RLS POLICIES  
-- ============================================================================
-- Users can view questions for quizzes they can access
CREATE POLICY "Users can view quiz questions"
  ON studio_quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studio_quizzes
      JOIN notebooks ON notebooks.id = studio_quizzes.notebook_id
      WHERE studio_quizzes.id = studio_quiz_questions.quiz_id
        AND notebooks.user_id = auth.uid()
        AND notebooks.deleted_at IS NULL
    )
  );

-- Service role can insert
CREATE POLICY "Service can insert quiz questions"
  ON studio_quiz_questions FOR INSERT
  WITH CHECK (true);

-- Users can delete questions for their quizzes
CREATE POLICY "Users can delete quiz questions"
  ON studio_quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM studio_quizzes
      JOIN notebooks ON notebooks.id = studio_quizzes.notebook_id
      WHERE studio_quizzes.id = studio_quiz_questions.quiz_id
        AND notebooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- USAGE LOGS RLS POLICIES
-- ============================================================================
-- Users can view their own usage logs
CREATE POLICY "Users can view own usage logs"
  ON usage_logs FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert (Edge Functions)
CREATE POLICY "Service can insert usage logs"
  ON usage_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- USER SUBSCRIPTIONS RLS POLICIES
-- ============================================================================
-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own subscription (for local state only)
CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can manage all subscriptions
CREATE POLICY "Service can manage subscriptions"
  ON user_subscriptions FOR ALL
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE studio_flashcards IS 'AI-generated flashcards from notebook materials';
COMMENT ON TABLE studio_quizzes IS 'AI-generated quizzes with metadata';
COMMENT ON TABLE studio_quiz_questions IS 'Individual quiz questions with multiple choice options';
COMMENT ON TABLE usage_logs IS 'API usage tracking for cost monitoring';
COMMENT ON TABLE user_subscriptions IS 'User subscription and trial quota tracking';
