-- Migration: Create Processing Queue for Background PDF Processing
-- This enables reliable background processing of large PDFs without hitting Edge Function timeouts

-- Create job status enum
DO $$ BEGIN
  CREATE TYPE processing_job_status AS ENUM (
    'pending',      -- Job queued, waiting to be picked up
    'processing',   -- Job is being processed
    'completed',    -- Job finished successfully
    'failed',       -- Job failed with error
    'cancelled'     -- Job was cancelled by user
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create processing queue table
CREATE TABLE IF NOT EXISTS processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  
  -- Job configuration
  job_type TEXT NOT NULL DEFAULT 'pdf_extraction',
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = more priority
  
  -- Job status
  status processing_job_status NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0, -- 0-100 percent
  progress_message TEXT, -- Human-readable progress update
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Processing metadata
  estimated_pages INTEGER,
  processed_pages INTEGER DEFAULT 0,
  file_size_bytes BIGINT,
  
  -- Results
  result JSONB, -- Success result data
  error_message TEXT, -- Error message if failed
  error_details JSONB, -- Full error details
  
  -- Retry handling
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Indexes for efficient querying
  CONSTRAINT processing_queue_progress_range CHECK (progress >= 0 AND progress <= 100)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_processing_queue_user_status 
  ON processing_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_pending 
  ON processing_queue(status, priority DESC, created_at ASC) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_processing_queue_material 
  ON processing_queue(material_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_notebook 
  ON processing_queue(notebook_id);

-- Enable RLS
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own queue items"
  ON processing_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all queue items"
  ON processing_queue FOR ALL
  USING (auth.role() = 'service_role');

-- Enable realtime for processing queue
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;

-- Function to get pending jobs for processing (used by background worker)
CREATE OR REPLACE FUNCTION get_next_pending_job()
RETURNS TABLE (
  job_id UUID,
  p_material_id UUID,
  p_notebook_id UUID,
  p_user_id UUID,
  p_job_type TEXT,
  p_estimated_pages INTEGER,
  p_file_size_bytes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Select and lock the next pending job
  SELECT pq.id INTO v_job_id
  FROM processing_queue pq
  WHERE pq.status = 'pending'
    AND (pq.next_retry_at IS NULL OR pq.next_retry_at <= now())
  ORDER BY pq.priority DESC, pq.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_job_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Update job status to processing
  UPDATE processing_queue
  SET 
    status = 'processing',
    started_at = now(),
    attempt_count = attempt_count + 1
  WHERE id = v_job_id;
  
  -- Return key identifiers
  RETURN QUERY
  SELECT 
    pq.id,
    pq.material_id,
    pq.notebook_id,
    pq.user_id,
    pq.job_type,
    pq.estimated_pages,
    pq.file_size_bytes
  FROM processing_queue pq
  WHERE pq.id = v_job_id;
END;
$$;

-- Function to update job progress
CREATE OR REPLACE FUNCTION update_job_progress(
  p_job_id UUID,
  p_progress INTEGER,
  p_message TEXT DEFAULT NULL,
  p_processed_pages INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE processing_queue
  SET 
    progress = LEAST(p_progress, 100),
    progress_message = COALESCE(p_message, progress_message),
    processed_pages = COALESCE(p_processed_pages, processed_pages)
  WHERE id = p_job_id
    AND status = 'processing';
END;
$$;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_job(
  p_job_id UUID,
  p_result JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE processing_queue
  SET 
    status = 'completed',
    progress = 100,
    progress_message = 'Processing complete',
    completed_at = now(),
    result = p_result
  WHERE id = p_job_id;
END;
$$;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_job(
  p_job_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL,
  p_should_retry BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INTEGER;
  v_max_attempts INTEGER;
BEGIN
  -- Get current attempt info
  SELECT attempt_count, max_attempts
  INTO v_attempt_count, v_max_attempts
  FROM processing_queue
  WHERE id = p_job_id;
  
  -- Determine if we should retry
  IF p_should_retry AND v_attempt_count < v_max_attempts THEN
    -- Schedule retry with exponential backoff
    UPDATE processing_queue
    SET 
      status = 'pending',
      error_message = p_error_message,
      error_details = p_error_details,
      next_retry_at = now() + (interval '1 minute' * power(2, v_attempt_count))
    WHERE id = p_job_id;
  ELSE
    -- Mark as permanently failed
    UPDATE processing_queue
    SET 
      status = 'failed',
      completed_at = now(),
      error_message = p_error_message,
      error_details = p_error_details
    WHERE id = p_job_id;
  END IF;
END;
$$;

-- Function to enqueue a new processing job
CREATE OR REPLACE FUNCTION enqueue_processing_job(
  p_user_id UUID,
  p_material_id UUID,
  p_notebook_id UUID,
  p_job_type TEXT DEFAULT 'pdf_extraction',
  p_estimated_pages INTEGER DEFAULT NULL,
  p_file_size_bytes BIGINT DEFAULT NULL,
  p_priority INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO processing_queue (
    user_id,
    material_id,
    notebook_id,
    job_type,
    estimated_pages,
    file_size_bytes,
    priority
  )
  VALUES (
    p_user_id,
    p_material_id,
    p_notebook_id,
    p_job_type,
    p_estimated_pages,
    p_file_size_bytes,
    p_priority
  )
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;

-- Clean up old completed/failed jobs (run via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM processing_queue
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < now() - interval '7 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_next_pending_job() TO service_role;
GRANT EXECUTE ON FUNCTION update_job_progress(UUID, INTEGER, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION complete_job(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION fail_job(UUID, TEXT, JSONB, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_processing_job(UUID, UUID, UUID, TEXT, INTEGER, BIGINT, INTEGER) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_jobs() TO service_role;

COMMENT ON TABLE processing_queue IS 'Queue for background processing of large PDFs and other resource-intensive operations';
COMMENT ON FUNCTION enqueue_processing_job IS 'Enqueue a new processing job for background execution';
COMMENT ON FUNCTION get_next_pending_job IS 'Atomically get and lock the next pending job for processing';
