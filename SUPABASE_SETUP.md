# Supabase Setup Guide

This guide will help you set up Supabase for your PrepAI study app.

## ✅ Step 1: Install Dependencies (Already Done)

The following packages have been installed:
- `@supabase/supabase-js` - Supabase JavaScript client
- `expo-secure-store` - Secure storage for auth tokens

## 📋 Step 2: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: Your project name (e.g., "PrepAI")
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start

4. Wait for project to initialize (2-3 minutes)

## 🔑 Step 3: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: A long JWT token starting with `eyJ...`
   - **service_role key**: (Keep this secret! Only for server-side)

## 🔐 Step 4: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: 
- The `.env` file is already in `.gitignore` (won't be committed)
- Restart your Expo dev server after creating/updating `.env`
- Use `EXPO_PUBLIC_` prefix so Expo can access these variables

## 🗄️ Step 5: Set Up Database Schema

Based on your PRD, you'll need these tables:

### Core Tables:
1. **profiles** - User profiles
2. **pet_states** - Pet companion state
3. **flashcards** - Flashcard questions/answers
4. **exam_plans** - User exam study plans
5. **entitlements** - Subscription/payment status
6. **notebooks** - User notebooks
7. **materials** - Study materials (PDFs, images, etc.)
8. **lessons** - Lesson content
9. **exams** - Exam definitions

### Quick Setup Options:

**Option A: Use Supabase MCP (Recommended)**
If you have Supabase MCP configured, you can use it to:
- List/create tables
- Apply migrations
- Check RLS policies

**Option B: SQL Editor**
1. Go to **SQL Editor** in Supabase dashboard
2. Run migration scripts to create tables
3. Enable Row-Level Security (RLS) on all tables

**Option C: Supabase CLI**
```bash
npm install -g supabase
supabase init
supabase link --project-ref your-project-ref
# Create migrations in supabase/migrations/
```

## 🔒 Step 6: Enable Row-Level Security (RLS)

**Critical for Security!** Enable RLS on all user-facing tables:

```sql
-- Example for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

Repeat for all tables with user data.

## 🧪 Step 7: Test the Connection

The Supabase client is configured in `lib/supabase.ts`. You can test it:

```typescript
import { supabase } from '@/lib/supabase';

// Test connection
const { data, error } = await supabase.from('profiles').select('*');
console.log('Supabase connected:', !error);
```

## 📚 Step 8: Generate TypeScript Types (Optional but Recommended)

Generate types from your database schema:

```bash
# Install Supabase CLI globally
npm install -g supabase

# Generate types
npx supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

Then update `lib/supabase.ts` to use these types.

## 🔐 Step 9: Set Up Authentication

1. In Supabase dashboard: **Authentication** → **Providers**
2. Enable providers you want (Email, Google, Apple, etc.)
3. Configure email templates if needed
4. Set up redirect URLs for your app

Example auth flow:
```typescript
import { supabase } from '@/lib/supabase';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

## 📦 Step 10: Set Up Storage (For File Uploads)

1. Go to **Storage** in Supabase dashboard
2. Create buckets:
   - `materials` - For PDFs, images, audio files
   - `avatars` - For user profile pictures
3. Set up RLS policies for storage buckets

## 🚀 Next Steps

1. Replace mock data in `lib/store.ts` with Supabase queries
2. Set up real-time subscriptions for live updates
3. Implement authentication flows
4. Connect file uploads to Supabase Storage
5. Set up Edge Functions for AI processing (if needed)

## 📖 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

## ⚠️ Security Checklist

- [ ] RLS enabled on all tables
- [ ] Service role key kept secret (never in client code)
- [ ] Environment variables in `.env` (not committed)
- [ ] Auth tokens stored in SecureStore
- [ ] Storage buckets have proper RLS policies
- [ ] API keys are anon/public keys (not service role)

## 🆘 Troubleshooting

**"Missing Supabase environment variables" error:**
- Make sure `.env` file exists in root directory
- Check variable names start with `EXPO_PUBLIC_`
- Restart Expo dev server after creating `.env`

**Connection errors:**
- Verify your Project URL and anon key are correct
- Check Supabase project is not paused
- Ensure your IP is not blocked (check Supabase dashboard)

**Auth not persisting:**
- Verify `expo-secure-store` is installed
- Check SecureStore permissions in app.json

