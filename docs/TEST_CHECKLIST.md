# Test Checklist for Supabase Implementation

## Pre-Migration Setup
- [ ] Verify `.env` file exists with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Verify Supabase project is active and accessible
- [ ] Restart Expo dev server after creating/updating `.env`

## Migration Execution
- [ ] Run migration `001_initial_schema.sql` via Supabase MCP
- [ ] Verify all tables created: profiles, materials, notebooks, notebook_shares, flashcards, processing_jobs, pet_states
- [ ] Verify all indexes created
- [ ] Verify UNIQUE constraint on notebooks.material_id
- [ ] Run migration `002_rls_policies.sql` via Supabase MCP
- [ ] Verify RLS enabled on all tables
- [ ] Verify all RLS policies created
- [ ] Create Storage bucket `uploads` via Supabase dashboard
- [ ] Set Storage RLS policies for `uploads` bucket (see `003_storage_policies.sql`)

## Authentication Tests
- [ ] Sign up via magic link
  - [ ] Enter email address
  - [ ] Receive magic link email
  - [ ] Click link and verify redirect to app
  - [ ] Verify profile auto-created in `profiles` table
- [ ] Sign in via social (Google)
  - [ ] Click "Continue with Google"
  - [ ] Complete OAuth flow
  - [ ] Verify redirect to app
  - [ ] Verify profile auto-created
- [ ] Sign in via social (Apple)
  - [ ] Click "Continue with Apple"
  - [ ] Complete OAuth flow
  - [ ] Verify redirect to app
  - [ ] Verify profile auto-created
- [ ] Sign out
  - [ ] Verify user redirected to auth screen
  - [ ] Verify notebooks not accessible

## Notebook Creation Tests
- [ ] Upload PDF
  - [ ] Select PDF file
  - [ ] Verify material created in `materials` table (processed=false)
  - [ ] Verify notebook created in `notebooks` table (status='processing')
  - [ ] Verify file uploaded to Storage at `uploads/{user_id}/{material_id}/{filename}`
  - [ ] Verify notebook appears in list immediately (optimistic update)
  - [ ] Verify notebook shows "Processing" badge
- [ ] Upload image
  - [ ] Select image from gallery
  - [ ] Verify material created (processed=false)
  - [ ] Verify notebook created (status='processing')
  - [ ] Verify file uploaded to Storage
  - [ ] Verify notebook appears in list
- [ ] Upload audio
  - [ ] Select audio file
  - [ ] Verify material created (processed=false)
  - [ ] Verify notebook created (status='processing')
  - [ ] Verify file uploaded to Storage
  - [ ] Verify notebook appears in list
- [ ] Paste text
  - [ ] Enter title and content
  - [ ] Verify material created (processed=true, content set)
  - [ ] Verify notebook created (status='ready')
  - [ ] Verify notebook appears in list with "Ready" badge
  - [ ] No file upload (text-only)

## Processing Tests
- [ ] Trigger Edge Function stub
  - [ ] Call `/functions/v1/process-material` with material_id
  - [ ] Verify material.processed = true
  - [ ] Verify material.processed_at set
  - [ ] Verify material.content populated with sample text
  - [ ] Verify notebook.status = 'ready'
  - [ ] Verify notebook.meta.summary populated
  - [ ] Verify processing_jobs entry created and completed
- [ ] Verify UI updates
  - [ ] Notebook badge changes from "Processing" to "Ready"
  - [ ] Content available for viewing

## RLS Security Tests
- [ ] User A cannot see User B's notebooks
  - [ ] Create notebook as User A
  - [ ] Sign in as User B
  - [ ] Verify User B's notebook list does not include User A's notebook
- [ ] Public notebook visible to all users
  - [ ] Create notebook as User A with is_public = true
  - [ ] Sign in as User B
  - [ ] Verify User B can see User A's public notebook
- [ ] Shared notebook accessible via share_key
  - [ ] Create share link for notebook (share_key)
  - [ ] Sign in as User B
  - [ ] Access notebook via share_key
  - [ ] Verify User B can view shared notebook

## Soft Delete Tests
- [ ] Soft delete notebook
  - [ ] Delete a notebook
  - [ ] Verify notebook.deleted_at set in database
  - [ ] Verify notebook not visible in list
  - [ ] Verify notebook still exists in database (not hard deleted)
- [ ] Materials not deleted
  - [ ] Delete notebook
  - [ ] Verify associated material still exists in database

## Data Persistence Tests
- [ ] App restart persistence
  - [ ] Create notebooks
  - [ ] Close app completely
  - [ ] Reopen app
  - [ ] Verify notebooks load from Supabase
  - [ ] Verify all data intact

## Edge Cases
- [ ] Upload very large file (>10MB)
- [ ] Upload file with special characters in filename
- [ ] Create notebook with very long title
- [ ] Create multiple notebooks rapidly
- [ ] Network interruption during upload
- [ ] Sign out during upload process

## Performance Tests
- [ ] Load time with 50+ notebooks
- [ ] Upload time for 5MB PDF
- [ ] List rendering with 100+ notebooks

## Notes
- All tests should be performed on physical device (iPhone) via Expo Go
- Verify console logs for errors
- Check Supabase dashboard for data integrity
- Monitor Supabase logs for RLS policy violations

