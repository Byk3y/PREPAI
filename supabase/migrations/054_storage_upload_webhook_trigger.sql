-- Trigger to notify process-material Edge Function of new storage uploads
CREATE OR REPLACE FUNCTION public.handle_storage_upload()
RETURNS trigger AS $$
DECLARE
  material_id uuid;
  project_url text := 'https://tunjjtfnvtscgmuxjkng.supabase.co';
BEGIN
  -- Only process INSERTs into the 'uploads' bucket
  -- Path format: {user_id}/{material_id}/{filename}
  IF NEW.bucket_id = 'uploads' AND (TG_OP = 'INSERT') THEN
    
    -- Extract material_id (the second part of the path)
    BEGIN
      material_id := split_part(NEW.name, '/', 2)::uuid;
      
      -- Call the Edge Function asynchronously via pg_net
      -- We send the full webhook-style payload so process-material can extract it
      PERFORM net.http_post(
        url := project_url || '/functions/v1/process-material',
        headers := '{"Content-Type": "application/json", "x-internal-webhook": "true"}',
        body := jsonb_build_object(
          'record', jsonb_build_object('name', NEW.name),
          'table', 'objects',
          'schema', 'storage',
          'type', 'INSERT'
        )::text
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Ignore errors for files that don't match our specific pattern (e.g. temp files)
      RETURN NEW;
    END;
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on storage.objects
DROP TRIGGER IF EXISTS on_storage_upload ON storage.objects;
CREATE TRIGGER on_storage_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_storage_upload();
