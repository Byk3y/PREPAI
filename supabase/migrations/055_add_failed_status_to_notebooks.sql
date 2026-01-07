-- Add 'failed' character to the notebooks_status_check constraint
ALTER TABLE public.notebooks DROP CONSTRAINT IF EXISTS notebooks_status_check;
ALTER TABLE public.notebooks ADD CONSTRAINT notebooks_status_check CHECK (status = ANY (ARRAY['extracting'::text, 'preview_ready'::text, 'ready_for_studio'::text, 'failed'::text]));
