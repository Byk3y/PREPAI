-- Migration: Initial Schema
-- Creates all tables, indexes, constraints, and triggers

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  streak INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MATERIALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pdf', 'audio', 'image', 'website', 'youtube', 'copied-text', 'photo', 'text', 'note')),
  storage_path TEXT,
  external_url TEXT,
  content TEXT,
  thumbnail TEXT,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for materials
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_user_id_kind ON materials(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_materials_user_id_processed ON materials(user_id, processed);
CREATE INDEX IF NOT EXISTS idx_materials_meta ON materials USING GIN(meta);

-- ============================================================================
-- NOTEBOOKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  emoji TEXT,
  color TEXT CHECK (color IN ('blue', 'green', 'orange', 'purple', 'pink')),
  status TEXT DEFAULT 'processing' CHECK (status IN ('draft', 'processing', 'ready', 'failed')),
  meta JSONB DEFAULT '{}',
  flashcard_count INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  last_studied TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(material_id) -- Enforces 1:1 relationship for MVP
);

-- Indexes for notebooks
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id_status ON notebooks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notebooks_created_at ON notebooks(created_at);
CREATE INDEX IF NOT EXISTS idx_notebooks_deleted_at ON notebooks(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- NOTEBOOK SHARES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notebook_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_key TEXT UNIQUE,
  role TEXT CHECK (role IN ('viewer', 'editor')),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notebook_shares
CREATE INDEX IF NOT EXISTS idx_notebook_shares_notebook_id ON notebook_shares(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_shares_shared_with_user_id ON notebook_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_shares_share_key ON notebook_shares(share_key);

-- ============================================================================
-- FLASHCARDS TABLE (Optional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answers JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  qa_hash TEXT, -- For deduplication
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_notebook_id ON flashcards(notebook_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_qa_hash ON flashcards(qa_hash);

-- ============================================================================
-- PROCESSING JOBS TABLE (Optional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_material_id ON processing_jobs(material_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);

-- ============================================================================
-- PET STATES TABLE (Optional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pet_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  xp_to_next INTEGER DEFAULT 100,
  name TEXT DEFAULT 'Sparky',
  mood TEXT DEFAULT 'happy' CHECK (mood IN ('happy', 'neutral', 'sad')),
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_pet_states_user_id ON pet_states(user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pet_states_updated_at BEFORE UPDATE ON pet_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

