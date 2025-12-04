# Store Architecture Diagram

## File Structure

```
lib/store/
├── index.ts                 # Main store entry point (36 lines)
├── types.ts                 # Shared type definitions (101 lines)
└── slices/
    ├── authSlice.ts         # Authentication state (18 lines)
    ├── userSlice.ts         # User profile state (24 lines)
    ├── petSlice.ts          # Pet companion state (155 lines)
    ├── notebookSlice.ts     # Notebooks CRUD (386 lines)
    ├── flashcardSlice.ts    # Flashcards state (40 lines)
    ├── examSlice.ts         # Exams state (58 lines)
    └── lessonSlice.ts       # Lessons & recent items (81 lines)
```

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                         index.ts                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Combined Store (useStore hook)                         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ Imports & Combines
                   │
    ┌──────────────┴─────────────────┐
    │                                │
    ▼                                ▼
┌────────────┐                ┌────────────────┐
│  types.ts  │◄───────────────│    slices/     │
│            │    Imports     │                │
│ • User     │                │ • authSlice    │
│ • PetState │                │ • userSlice    │
│ • Notebook │                │ • petSlice     │◄──┐
│ • Material │                │ • notebookSlice│◄──┤ Supabase
│ • Flashcard│                │ • flashcardSlice  │
│ • Exam     │                │ • examSlice    │   │
│ • Lesson   │                │ • lessonSlice  │   │
│ • ExamPlan │                └────────────────┘   │
└────────────┘                                     │
                                                   │
                                            ┌──────┴────────┐
                                            │               │
                                            │  External     │
                                            │  Dependencies │
                                            │               │
                                            │ • supabase.ts │
                                            │ • upload.ts   │
                                            └───────────────┘
```

## Slice Responsibilities

```
┌──────────────────────────────────────────────────────────────────┐
│                      Application State                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ authSlice   │  │  userSlice   │  │    petSlice         │   │
│  ├─────────────┤  ├──────────────┤  ├─────────────────────┤   │
│  │• authUser   │  │• user        │  │• petState           │   │
│  │• setAuthUser│  │• setUser     │  │• setPetState        │   │
│  │• isLoading  │  │              │  │• addPetXP           │   │
│  │             │  │              │  │• loadPetState       │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
│                                              │                  │
│                                              │ Supabase         │
│                                              ▼                  │
│                                      [pet_states table]         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              notebookSlice                              │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │• notebooks        • updateNotebook                      │   │
│  │• setNotebooks     • deleteNotebook                      │   │
│  │• loadNotebooks    • addMaterial                         │   │
│  │• addNotebook      • deleteMaterial                      │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           │ Supabase + File Upload             │
│                           ▼                                     │
│                   [notebooks, materials tables]                 │
│                   [Supabase Storage]                            │
│                   [Edge Functions]                              │
│                                                                  │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ flashcardSlice │  │  examSlice   │  │  lessonSlice     │   │
│  ├────────────────┤  ├──────────────┤  ├──────────────────┤   │
│  │• flashcards    │  │• exams       │  │• lessons         │   │
│  │• setFlashcards │  │• setExams    │  │• setLessons      │   │
│  │                │  │• startExam   │  │• completeLesson  │   │
│  │                │  │  Plan        │  │• recentItems     │   │
│  │                │  │              │  │• addRecentItem   │   │
│  └────────────────┘  └──────────────┘  └──────────────────┘   │
│    (Mock data)         (Mock data)       (Mock data + UI)      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Read Flow (Component → Store)
```
Component
   ↓
useStore() hook
   ↓
Combined Store (index.ts)
   ↓
Individual Slice
   ↓
Return State
```

### Write Flow (Component → Store → Supabase)
```
Component
   ↓
useStore() action (e.g., addNotebook)
   ↓
Individual Slice action
   ↓
├─→ Update Local State (optimistic)
│
└─→ Supabase Operation
       ↓
    ┌──┴──────────────────┐
    │                     │
  Success              Error
    │                     │
    └─→ Update State      └─→ Rollback/Log Error
```

### Load Flow (Supabase → Store → Component)
```
App Start / Auth Change
   ↓
loadNotebooks() / loadPetState()
   ↓
Fetch from Supabase
   ↓
Transform Data
   ↓
Update Store State
   ↓
Component Re-renders
```

## Type System

```
┌─────────────────────────────────────────────────────┐
│                    types.ts                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Core Entities:                                     │
│  • User          - User profile                     │
│  • PetState      - Pet companion                    │
│  • Notebook      - Study notebooks                  │
│  • Material      - Learning materials               │
│                                                     │
│  Study Content:                                     │
│  • Flashcard     - Quiz cards                       │
│  • Exam          - Practice exams                   │
│  • Lesson        - Learning content                 │
│  • ExamPlan      - Study schedule                   │
│                                                     │
│  External:                                          │
│  • SupabaseUser  - Auth user (re-export)           │
│                                                     │
└─────────────────────────────────────────────────────┘
              │
              │ Imported by
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌─────────┐        ┌──────────┐
│ Slices  │        │Components│
│         │        │          │
│• Auth   │        │• Cards   │
│• User   │        │• Lists   │
│• Pet    │        │• Modals  │
│• ...    │        │• Pages   │
└─────────┘        └──────────┘
```

## Component Integration

```
┌────────────────────────────────────────────────┐
│             Application Layer                   │
├────────────────────────────────────────────────┤
│                                                │
│  Pages:                                        │
│  • app/_layout.tsx      → Auth, Data Loading  │
│  • app/index.tsx        → Notebook Creation   │
│  • app/notebook/[id].tsx → Notebook Details   │
│  • app/pet-sheet.tsx    → Pet Display         │
│  • app/exam/index.tsx   → Exams List          │
│  • app/flashcard/[id]   → Flashcard Study     │
│  • app/lesson/[id].tsx  → Lesson View         │
│                                                │
│  Components:                                   │
│  • NotebookCard.tsx     → Notebook UI         │
│  • PetWidget.tsx        → Pet Widget          │
│  • notebook/SourcesTab  → Material Sources    │
│  • notebook/StudioTab   → Content Editor      │
│  • notebook/ChatTab     → AI Chat             │
│                                                │
└────────────────────┬───────────────────────────┘
                     │
                     │ useStore()
                     │
                     ▼
        ┌────────────────────────┐
        │   lib/store/index.ts   │
        │   (Combined Store)     │
        └────────────────────────┘
```

## Persistence Strategy

```
┌─────────────────────────────────────────────────────┐
│              State Management Strategy              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Zustand (Client State):                           │
│  ├─ Fast UI updates                                │
│  ├─ Optimistic updates                             │
│  ├─ In-memory state                                │
│  └─ React hook integration                         │
│                                                     │
│  Supabase (Persistence):                           │
│  ├─ Database (Postgres)                            │
│  │  • notebooks                                    │
│  │  • materials                                    │
│  │  • pet_states                                   │
│  │                                                  │
│  ├─ Storage (S3-compatible)                        │
│  │  • PDF files                                    │
│  │  • Images                                       │
│  │  • Audio files                                  │
│  │                                                  │
│  └─ Edge Functions (Deno)                          │
│     • process-material (AI processing)             │
│                                                     │
│  Hybrid Approach:                                   │
│  1. Component calls store action                   │
│  2. Store updates local state immediately          │
│  3. Store persists to Supabase asynchronously      │
│  4. UI remains responsive                          │
│  5. Errors logged, state optionally rolled back    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Benefits of Slice Architecture

```
┌─────────────────────────────────────────────────────┐
│             Modular Slice Benefits                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✅ Separation of Concerns                         │
│     Each domain has its own file                   │
│                                                     │
│  ✅ Easier Navigation                              │
│     Find pet logic? → petSlice.ts                  │
│                                                     │
│  ✅ Reduced Merge Conflicts                        │
│     Multiple devs work on different slices         │
│                                                     │
│  ✅ Better Testing                                 │
│     Test slices in isolation                       │
│                                                     │
│  ✅ Code Reusability                               │
│     Slices can be reused across projects           │
│                                                     │
│  ✅ Scalability                                    │
│     Add new slices without touching existing ones  │
│                                                     │
│  ✅ Type Safety                                    │
│     Centralized type definitions                   │
│                                                     │
│  ✅ Performance                                    │
│     No runtime overhead, same Zustand store        │
│                                                     │
└─────────────────────────────────────────────────────┘
```
