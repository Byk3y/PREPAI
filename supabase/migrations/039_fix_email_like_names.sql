-- Fix profiles where first_name contains email (incorrectly set during account creation)
-- This migration cleans up bad data and allows OAuth extraction to fix it on next sign-in

-- Clear first_name and last_name for profiles where first_name contains '@' (email-like)
-- The sync_name_trigger will update profiles.name accordingly
UPDATE profiles
SET 
  first_name = NULL,
  last_name = NULL
WHERE first_name LIKE '%@%';

-- Note: After this migration, when users sign in via OAuth, the auth callback
-- will extract their names from OAuth metadata and update first_name/last_name.
-- For magic link users, they'll provide names during signup.

-- The sync_name_trigger will automatically update profiles.name from first_name + last_name
-- If both are NULL, profiles.name will be an empty string, which the app handles gracefully
-- by falling back to email or "User" in the UI.


