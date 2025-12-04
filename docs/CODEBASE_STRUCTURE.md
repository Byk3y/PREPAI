# Codebase Structure

## Directory Organization

```
/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout with auth routing
│   ├── index.tsx          # Home screen (notebook list)
│   ├── auth/              # Authentication screens
│   │   ├── index.tsx      # Auth landing (magic link + social)
│   │   ├── magic-link.tsx # Magic link email input
│   │   └── callback.tsx   # OAuth/magic link callback handler
│   ├── exam/
│   │   └── index.tsx      # Exam hub screen
│   ├── lesson/
│   │   └── [id].tsx       # Lesson detail screen
│   ├── flashcard/
│   │   └── [id].tsx       # Flashcard player
│   └── pet-sheet.tsx      # Pet modal (half-sheet)
│
├── components/             # Reusable UI components
│   ├── EmptyState.tsx
│   ├── MaterialTypeSelector.tsx
│   ├── MotiViewCompat.tsx
│   ├── NotebookCard.tsx
│   ├── PetBubble.tsx
│   ├── PetWidget.tsx
│   └── TextInputModal.tsx
│
├── lib/                    # Core utilities and state
│   ├── hooks/             # Custom React hooks
│   │   ├── useCamera.ts
│   │   └── useDocumentPicker.ts
│   ├── store.ts           # Zustand store with Supabase sync
│   ├── supabase.ts        # Supabase client configuration
│   ├── theme.ts           # Design tokens
│   └── upload.ts          # File upload utilities
│
├── supabase/               # Supabase configuration
│   ├── migrations/        # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_storage_policies.sql (reference)
│   └── functions/         # Edge Functions
│       └── process-material/
│           └── index.ts   # Material processing stub
│
├── docs/                   # Documentation
│   ├── CODEBASE_STRUCTURE.md (this file)
│   ├── IMPLEMENTATION_PLAN.md
│   ├── SUPABASE_SETUP.md
│   ├── TEST_CHECKLIST.md
│   ├── stack_prd.md
│   └── pet_companion_spec.md
│
├── assets/                 # Static assets
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash.png
│
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind/NativeWind config
├── babel.config.js        # Babel configuration
├── metro.config.js        # Metro bundler config
├── global.css             # Global styles
└── README.md              # Main README
```

## File Organization Principles

### App Routes (`app/`)
- File-based routing (Expo Router)
- Dynamic routes use `[param]` syntax
- Auth routes grouped in `auth/` subdirectory
- Feature routes grouped by feature (exam, lesson, flashcard)

### Components (`components/`)
- Reusable UI components
- No business logic (that goes in `lib/`)
- One component per file
- Export default for main component

### Library (`lib/`)
- **`store.ts`**: Zustand store with Supabase integration
- **`supabase.ts`**: Supabase client configuration
- **`upload.ts`**: File upload utilities
- **`theme.ts`**: Design tokens and theme constants
- **`hooks/`**: Custom React hooks

### Supabase (`supabase/`)
- **`migrations/`**: SQL migration files (numbered sequentially)
- **`functions/`**: Edge Functions (Deno/TypeScript)

### Documentation (`docs/`)
- All project documentation
- Implementation plans
- Setup guides
- Test checklists
- Specifications

## Naming Conventions

- **Files**: PascalCase for components (`NotebookCard.tsx`), camelCase for utilities (`upload.ts`)
- **Directories**: lowercase with hyphens if needed (`auth/`, `use-camera/`)
- **Components**: PascalCase, match filename
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE or camelCase depending on context
- **Types/Interfaces**: PascalCase

## Missing Screens (Expected)

- `app/notebook/[id].tsx` - Notebook detail screen (TODO: implement)
  - Currently routes to `/notebook/${id}` but screen doesn't exist
  - Should display notebook content, material, flashcards, etc.

## Code Quality

### TODO Comments
- Most TODOs are for future features (notebook detail screen, flashcard generation)
- Some TODOs in store.ts are outdated (Supabase integration is done)
- Consider cleaning up outdated TODOs

### Dependencies
- All required packages installed
- No unused dependencies detected

### TypeScript
- Full TypeScript coverage
- Type definitions for Supabase will be generated later

## Environment Variables

Required in `.env` (not committed):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Git Ignore

- `.env` files
- `node_modules/`
- `.expo/`
- Build artifacts
- OS-specific files

