# Supabase Database Schema & Auth Implementation Plan

## Migration Order

1. Create `profiles` table + trigger
2. Create `materials` table
3. Create `notebooks` table (with UNIQUE constraint on material_id)
4. Create `notebook_shares` table
5. Create optional tables: `flashcards`, `processing_jobs`, `pet_states`
6. Enable RLS on all tables
7. Create RLS policies
8. Create Storage bucket `uploads` + policies

## Phase 1: Database Schema Creation

### 1.1 Create `profiles` table
- Map to `auth.users.id` (foreign key)
- Columns: `id` (uuid, primary key, references auth.users), `name` (text), `avatar_url` (text, nullable), `streak` (int, default 0), `coins` (int, default 0), `meta` (jsonb, default '{}'), `created_at` (timestamptz), `updated_at` (timestamptz)
- Trigger: Auto-create profile on `auth.users` insert
- Enable RLS

### 1.2 Create `materials` table
- Columns: `id` (uuid, primary key), `user_id` (uuid, references auth.users, NOT NULL), `title` (text), `kind` (text NOT NULL: pdf/audio/image/website/youtube/copied-text/photo/text/note), `storage_path` (text, nullable), `external_url` (text, nullable), `content` (text, nullable), `thumbnail` (text, nullable), `processed` (boolean, default false), `processed_at` (timestamptz, nullable), `meta` (jsonb, default '{}'), `created_at` (timestamptz), `updated_at` (timestamptz)
- Indexes: `(user_id)`, `(user_id, kind)`, `(user_id, processed)`, GIN on `meta` (optional)
- Enable RLS

### 1.3 Create `notebooks` table
- Columns: `id` (uuid, primary key), `user_id` (uuid, references auth.users, NOT NULL), `material_id` (uuid, references materials, NOT NULL, UNIQUE - enforces 1:1 MVP), `title` (text), `emoji` (text, nullable), `color` (text: blue/green/orange/purple/pink), `status` (text, default 'processing': draft/processing/ready/failed), `meta` (jsonb, default '{}'), `flashcard_count` (int, default 0), `progress` (int, default 0), `last_studied` (timestamptz, nullable), `is_public` (boolean, default false), `deleted_at` (timestamptz, nullable), `created_at` (timestamptz), `updated_at` (timestamptz)
- Indexes: `(user_id)`, `(user_id, status)`, `(created_at)`
- Constraint: UNIQUE(material_id) for MVP 1:1 relationship
- Enable RLS

### 1.4 Create `notebook_shares` table
- Columns: `id` (uuid, primary key), `notebook_id` (uuid, references notebooks, NOT NULL), `shared_with_user_id` (uuid, references auth.users, nullable), `share_key` (text, unique), `role` (text: viewer/editor), `expires_at` (timestamptz, nullable), `created_by` (uuid, references auth.users), `revoked_at` (timestamptz, nullable), `created_at` (timestamptz)
- Indexes: `(notebook_id)`, `(shared_with_user_id)`, `(share_key)`
- Enable RLS

### 1.5 Create optional tables
- `flashcards`: id, notebook_id, question, answers (jsonb), correct_answer (int), explanation, qa_hash (text, for dedupe), created_at, updated_at
- `processing_jobs`: id, material_id, status, error_message, retry_count, created_at, updated_at
- `pet_states`: id, user_id, level, xp, xp_to_next, name, mood, meta, created_at, updated_at

### 1.6 Set up Supabase Storage
- Create `uploads` bucket (private)
- RLS policy: Users can upload/read/delete only within `uploads/{user_id}/*`
- Storage path structure: `uploads/{user_id}/{material_id}/{filename}`
- Use signed URLs for serving

## Phase 2: Authentication Implementation

### 2.1 Update Supabase client
- Add SecureStore adapter back to `lib/supabase.ts` for auth token persistence
- Configure auth with `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`

### 2.2 Create auth screens/components
- Create `app/auth/` directory with:
  - `index.tsx` - Auth landing (magic link + social options)
  - `magic-link.tsx` - Magic link email input
  - `callback.tsx` - Handle auth callbacks
- Implement magic link flow: `supabase.auth.signInWithOtp()`
- Implement social logins: Google, Apple (via Supabase Auth providers)
- Handle auth state changes and redirects
- Profile auto-created via database trigger (no app logic needed)

## Phase 3: Store Integration

### 3.1 Update `lib/store.ts`
- Keep Zustand for UI state management
- Add Supabase sync functions:
  - `loadNotebooks()` - Fetch user's notebooks from Supabase (where deleted_at IS NULL)
  - `syncNotebookToSupabase()` - Save notebook to Supabase
  - `syncMaterialToSupabase()` - Save material to Supabase
- Modify `addNotebook()` to implement zero-friction flow:
  1. Upload file to Supabase Storage (if applicable) → get storage_path
  2. Create material record in Supabase (processed=false, status=processing)
  3. Create notebook record in Supabase (status='processing', link to material)
  4. Update Zustand store immediately (optimistic update)
  5. Background worker will update processed/content/status later
- Add auth state management to store

### 3.2 Update `app/index.tsx`
- Add auth check on mount (redirect to auth if not logged in)
- Load notebooks from Supabase on mount (if authenticated)
- Update all notebook creation flows: PDF/image/audio/text → auto-create material + notebook (no confirmation modal)
- Show processing status in UI (notebook.status = 'processing' vs 'ready')

## Phase 4: File Upload Implementation

### 4.1 Create upload utility
- Create `lib/upload.ts` with:
  - `uploadMaterialFile(userId, materialId, file, filename)` - Upload to Supabase Storage
  - Storage path: `uploads/{user_id}/{material_id}/{filename}`
  - Handle different file types (PDF, image, audio)
  - Return storage_path for material record
  - Handle errors and progress
  - Dev mode: Allow local URI fallback (hybrid approach)

### 4.2 Update material creation flows
- `handlePDFUpload()` - Upload PDF to Storage → create material (kind='pdf', processed=false) → create notebook (status='processing')
- `handlePhotoUpload()` - Upload image to Storage → create material (kind='image', processed=false) → create notebook (status='processing')
- `handleAudioUpload()` - Upload audio to Storage → create material (kind='audio', processed=false) → create notebook (status='processing')
- `handleTextSave()` - Create material (kind='text'/'note', content=text, processed=true) → create notebook (status='ready')
- All flows: Zero-friction, no confirmation modals

## Phase 5: RLS Policies

### 5.1 Profiles policies
- SELECT: Users can read their own profile
- UPDATE: Users can update their own profile
- INSERT: Auto-created via trigger (no policy needed)

### 5.2 Materials policies
- SELECT: Users can read their own materials
- INSERT: Users can create materials with their own user_id
- UPDATE: Users can update their own materials
- DELETE: Users can delete their own materials

### 5.3 Notebooks policies
- SELECT: Users can read:
  - Their own notebooks (where deleted_at IS NULL)
  - Public notebooks (where is_public = true AND deleted_at IS NULL)
  - Shared notebooks (via notebook_shares join where expires_at IS NULL OR expires_at > now())
- INSERT: Users can create notebooks with their own user_id
- UPDATE: Users can update their own notebooks
- DELETE: Soft delete (set deleted_at) - users can only soft-delete their own

### 5.4 Notebook shares policies
- SELECT: Users can see shares for notebooks they own or are shared with (where revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()))
- INSERT: Users can create shares for notebooks they own
- UPDATE: Users can update shares for notebooks they own
- DELETE: Users can delete/revoke shares for notebooks they own

### 5.5 Storage policies (uploads bucket)
- SELECT: Users can read files in `uploads/{user_id}/*` paths
- INSERT: Users can upload files to `uploads/{user_id}/*` paths
- DELETE: Users can delete files in `uploads/{user_id}/*` paths

## Phase 6: Edge Function Stub

### 6.1 Create minimal processing function
- Edge Function: `process-material` (Node.js/Deno)
- Input: material_id (from webhook or manual trigger)
- Logic:
  1. Fetch material (where processed=false)
  2. If storage_path exists, download file
  3. Simulate processing: set processed=true, processed_at=now()
  4. Update material.content with sample text
  5. Update notebook.meta.summary with sample summary
  6. Set notebook.status='ready'
  7. Log to processing_jobs table
- No LLM calls (stub for testing)
- Return success/error

## Phase 7: Migration & Testing

### 7.1 Run migrations via Supabase MCP
- Use `apply_migration` for each migration file
- Order: profiles → materials → notebooks → notebook_shares → optional tables → RLS policies
- Verify all tables, indexes, constraints created

### 7.2 Test checklist
- [ ] Sign up via magic link
- [ ] Sign in via social (Google/Apple)
- [ ] Profile auto-created on first login
- [ ] Upload PDF → material created (processed=false) → notebook created (status='processing')
- [ ] Upload image → material created → notebook created (status='processing')
- [ ] Paste text → material created (processed=true) → notebook created (status='ready')
- [ ] View notebooks list (only own + public)
- [ ] Trigger Edge Function stub → material.processed=true, notebook.status='ready'
- [ ] RLS: User A cannot see User B's notebooks
- [ ] RLS: Public notebook visible to all users
- [ ] Create share link (share_key) → verify access
- [ ] Soft delete notebook → verify deleted_at set, not visible in list
- [ ] App restart → notebooks persist from Supabase

## Files to Modify/Create

**New files:**
- `app/auth/index.tsx` - Auth landing screen
- `app/auth/magic-link.tsx` - Magic link input
- `app/auth/callback.tsx` - Auth callback handler
- `lib/upload.ts` - File upload utilities
- `supabase/migrations/001_initial_schema.sql` - Complete DDL migration
- `supabase/migrations/002_rls_policies.sql` - RLS policies
- `supabase/functions/process-material/index.ts` - Edge Function stub

**Modify existing:**
- `lib/supabase.ts` - Add SecureStore adapter back
- `lib/store.ts` - Add Supabase sync functions, auth state
- `app/index.tsx` - Add auth check, load from Supabase, zero-friction uploads
- `app/_layout.tsx` - Add auth state listener

**Database (via Supabase MCP):**
- Run migration `001_initial_schema.sql`
- Run migration `002_rls_policies.sql`
- Create Storage bucket `uploads` via dashboard or MCP
- Set Storage RLS policies

