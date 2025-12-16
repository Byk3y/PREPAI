-- Migration: Remove materials.title column
-- Rationale: Notebooks.title is the single source of truth for titles.
-- Materials don't need their own title field since notebooks and materials have a 1:1 relationship.

-- Drop the title column from materials table
ALTER TABLE materials DROP COLUMN IF EXISTS title;




























