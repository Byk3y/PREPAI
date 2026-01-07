-- Migration: Add granular status to materials table
-- This allows us to track processing errors at the material level rather than the notebook level.

-- 1. Add the status column with a check constraint
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS status text DEFAULT 'processing';
ALTER TABLE public.materials ADD CONSTRAINT materials_status_check CHECK (status = ANY (ARRAY['processing'::text, 'processed'::text, 'failed'::text]));

-- 2. Migrate existing data based on the 'processed' boolean
UPDATE public.materials SET status = 'processed' WHERE processed = true;
UPDATE public.materials SET status = 'processing' WHERE processed = false;

-- 3. We keep the 'processed' boolean for backward compatibility in the short term,
-- but we'll primarily use 'status' moving forward.

-- 4. Add an error field to materials meta if it doesn't exist (handled dynamically by JSONB, but good to note)
COMMENT ON COLUMN public.materials.status IS 'The processing status of this specific material source.';
