-- ============================================================================
-- MIGRATION 041: Add Timezone Column to Profiles Table
-- ============================================================================
-- Adds timezone column to profiles table for storing user's IANA timezone string
-- This supports timezone-aware streak tracking and task scheduling
-- ============================================================================

-- Step 1: Add timezone column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Step 2: Add comment documenting the timezone field
COMMENT ON COLUMN profiles.timezone IS
'IANA timezone string (e.g., "America/New_York", "Europe/London", "Asia/Tokyo"). 
Used for timezone-aware streak tracking and task scheduling. 
If NULL, the app will fallback to device timezone.';

-- Step 3: Create index for potential timezone-based queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_profiles_timezone 
ON profiles(timezone) 
WHERE timezone IS NOT NULL;

