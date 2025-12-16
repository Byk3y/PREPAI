-- Add first_name and last_name columns to profiles table
-- Keep existing 'name' column for backward compatibility

-- Add new columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate existing data (split current name on first space)
UPDATE profiles
SET
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE
    WHEN name LIKE '% %' THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL;

-- Function to sync full name from first_name + last_name
CREATE OR REPLACE FUNCTION sync_full_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate name as "first_name last_name"
  NEW.name = TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-sync name whenever first_name or last_name changes
DROP TRIGGER IF EXISTS sync_name_trigger ON profiles;
CREATE TRIGGER sync_name_trigger
  BEFORE INSERT OR UPDATE OF first_name, last_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_full_name();

-- Update handle_new_user function to parse OAuth names into first/last
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  parsed_first TEXT;
  parsed_last TEXT;
BEGIN
  -- Get full name from OAuth metadata or email
  full_name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);

  -- Parse into first/last name
  IF full_name LIKE '% %' THEN
    -- Has space - split into first and last
    parsed_first = SPLIT_PART(full_name, ' ', 1);
    parsed_last = SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1);
  ELSE
    -- No space - put entire string in first_name
    parsed_first = full_name;
    parsed_last = '';
  END IF;

  -- Insert profile with parsed names (name column will auto-sync via trigger)
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (NEW.id, parsed_first, parsed_last);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
