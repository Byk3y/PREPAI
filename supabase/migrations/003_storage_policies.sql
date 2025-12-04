-- Migration: Storage Policies
-- Note: Storage bucket and policies must be created via Supabase dashboard or API
-- This file documents the required policies for the 'uploads' bucket

-- Storage bucket: 'uploads' (private)
-- Path structure: uploads/{user_id}/{material_id}/{filename}

-- Policy: Users can read files in their own user_id folder
-- Policy name: "Users can read own uploads"
-- Operation: SELECT
-- Policy definition:
--   (bucket_id = 'uploads'::text) 
--   AND ((storage.foldername(name))[1] = (auth.uid())::text)

-- Policy: Users can upload files to their own user_id folder
-- Policy name: "Users can upload to own folder"
-- Operation: INSERT
-- Policy definition:
--   (bucket_id = 'uploads'::text) 
--   AND ((storage.foldername(name))[1] = (auth.uid())::text)

-- Policy: Users can delete files in their own user_id folder
-- Policy name: "Users can delete own uploads"
-- Operation: DELETE
-- Policy definition:
--   (bucket_id = 'uploads'::text) 
--   AND ((storage.foldername(name))[1] = (auth.uid())::text)

-- Note: These policies must be created via Supabase dashboard:
-- Storage > Policies > New Policy > Select bucket 'uploads' > Configure above policies

