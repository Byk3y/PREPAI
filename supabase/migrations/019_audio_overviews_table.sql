-- Migration: Create audio_overviews table for NotebookLM-style podcast generation
-- Description: Stores generated audio overviews with metadata, costs, and status tracking

-- Create audio_overviews table
CREATE TABLE audio_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  title TEXT NOT NULL,
  duration REAL NOT NULL, -- Duration in seconds
  version INTEGER DEFAULT 1, -- Support regeneration (v1, v2, etc.)

  -- Storage
  storage_path TEXT NOT NULL, -- uploads/{user_id}/audio_overviews/{notebook_id}/{id}.mp3
  audio_url TEXT, -- Signed URL (7-day expiration, regenerated on access)
  file_size_bytes BIGINT, -- Track storage costs

  -- Generation data
  script TEXT NOT NULL, -- Full dialogue script (plain text with speaker labels)
  voice_config JSONB DEFAULT '{"host_a": "Alex", "host_b": "Morgan"}'::jsonb,

  -- Cost tracking
  generation_cost_cents INTEGER, -- Total cost (script LLM + TTS)
  llm_tokens INTEGER, -- Tokens used for script generation
  tts_audio_tokens INTEGER, -- Audio tokens used (32 tokens/second for Gemini TTS)

  -- Status tracking
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating_script', 'generating_audio', 'completed', 'failed')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(notebook_id, version) -- One audio overview per notebook per version
);

-- Create indexes for efficient queries
CREATE INDEX idx_audio_overviews_notebook ON audio_overviews(notebook_id);
CREATE INDEX idx_audio_overviews_user_status ON audio_overviews(user_id, status);
CREATE INDEX idx_audio_overviews_created ON audio_overviews(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE audio_overviews ENABLE ROW LEVEL SECURITY;

-- Users can view their own audio overviews
CREATE POLICY "Users can view own audio overviews"
  ON audio_overviews FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own audio overviews (via Edge Function)
CREATE POLICY "Users can insert own audio overviews"
  ON audio_overviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Service role can manage all audio overviews (for Edge Functions)
CREATE POLICY "Service can manage audio overviews"
  ON audio_overviews FOR ALL
  USING (auth.role() = 'service_role');

-- Update storage RLS policy for audio_overviews folder
-- Users can read audio files from their own audio_overviews folder
CREATE POLICY "Users can read own audio overviews from storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[2] = 'audio_overviews'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role can upload audio files to storage
CREATE POLICY "Service can upload audio overviews to storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[2] = 'audio_overviews'
    AND auth.role() = 'service_role'
  );

-- Add comment for documentation
COMMENT ON TABLE audio_overviews IS 'Stores NotebookLM-style podcast audio overviews generated from notebook materials using Gemini 2.5 Pro (script) and Gemini 2.5 Flash TTS (audio)';
COMMENT ON COLUMN audio_overviews.script IS 'Plain text dialogue script with speaker labels (Alex: ..., Morgan: ...)';
COMMENT ON COLUMN audio_overviews.tts_audio_tokens IS 'Gemini TTS uses 32 tokens/second of audio (1920 tokens/minute)';
COMMENT ON COLUMN audio_overviews.version IS 'Version number for regenerated audio (allows users to create new versions)';
