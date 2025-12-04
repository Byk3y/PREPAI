# Store Quick Reference Guide

## Import the Store

```typescript
// Import store hook
import { useStore } from '@/lib/store';

// Import types
import type { Notebook, Material, User, PetState } from '@/lib/store';
```

## Using the Store in Components

### Auth State
```typescript
const { authUser, setAuthUser, isLoadingAuth } = useStore();

// Set authenticated user
setAuthUser(user);

// Check auth state
if (authUser) {
  console.log('User ID:', authUser.id);
}
```

### User Profile
```typescript
const { user, setUser } = useStore();

// Update user profile
setUser({ name: 'John', coins: 300 });

// Access user data
console.log(`${user.name} has ${user.coins} coins`);
```

### Pet State
```typescript
const { petState, setPetState, addPetXP, loadPetState } = useStore();

// Load pet state from Supabase (call on app start)
await loadPetState();

// Add XP (handles level-up automatically)
await addPetXP(50);

// Update pet state
await setPetState({ mood: 'happy', name: 'Fluffy' });

// Access pet data
console.log(`Level ${petState.level}, XP: ${petState.xp}/${petState.xpToNext}`);
```

### Notebooks
```typescript
const {
  notebooks,
  loadNotebooks,
  addNotebook,
  updateNotebook,
  deleteNotebook
} = useStore();

// Load notebooks from Supabase
await loadNotebooks();

// Add new notebook with file
const notebookId = await addNotebook({
  title: 'Biology Notes',
  flashcardCount: 0,
  progress: 0,
  color: 'blue',
  materials: [],
  material: {
    type: 'pdf',
    fileUri: 'file:///path/to/file.pdf',
    filename: 'notes.pdf',
  }
});

// Add notebook with text content
const notebookId = await addNotebook({
  title: 'Quick Notes',
  flashcardCount: 0,
  progress: 0,
  color: 'green',
  materials: [],
  material: {
    type: 'text',
    content: 'Your text content here...',
  }
});

// Update notebook
await updateNotebook(notebookId, {
  title: 'Updated Title',
  color: 'purple',
  status: 'ready_for_studio',
});

// Delete notebook (soft delete)
await deleteNotebook(notebookId);

// Access notebooks
notebooks.forEach(notebook => {
  console.log(notebook.title, notebook.status);
});
```

### Flashcards
```typescript
const { flashcards, setFlashcards } = useStore();

// Access flashcards
flashcards.forEach(card => {
  console.log(card.question, card.answers);
});

// Set flashcards
setFlashcards([
  {
    id: 'fc-1',
    question: 'What is React?',
    answers: ['Library', 'Framework', 'Language', 'Tool'],
    correctAnswer: 0,
    explanation: 'React is a JavaScript library for building UIs'
  }
]);
```

### Exams
```typescript
const { exams, setExams, startExamPlan } = useStore();

// Access exams
exams.forEach(exam => {
  console.log(exam.title, exam.difficulty);
});

// Start exam plan
const plan = startExamPlan('exam-1');
console.log('Plan created:', plan.startDate, plan.dailyGoal);
```

### Lessons
```typescript
const {
  lessons,
  setLessons,
  completeLesson,
  recentItems,
  addRecentItem
} = useStore();

// Access lessons
lessons.forEach(lesson => {
  console.log(lesson.title, lesson.completed);
});

// Complete a lesson
completeLesson('lesson-1');

// Add to recent items
addRecentItem({
  type: 'lesson',
  id: 'lesson-1',
  title: 'Intro to Biology',
  progress: 75
});

// Access recent items
recentItems.forEach(item => {
  console.log(item.type, item.title, `${item.progress}%`);
});
```

## Common Patterns

### Load Data on App Start
```typescript
// In app/_layout.tsx or root component
useEffect(() => {
  const { authUser } = useStore.getState();

  if (authUser) {
    useStore.getState().loadNotebooks();
    useStore.getState().loadPetState();
  }
}, []);
```

### Optimistic Updates
```typescript
// Store updates local state first, then persists to Supabase
// UI remains responsive even if network is slow

const handleAddNotebook = async () => {
  try {
    const id = await addNotebook({...});
    // Local state updated immediately
    // Supabase persistence happens in background
    router.push(`/notebook/${id}`);
  } catch (error) {
    console.error('Failed to add notebook:', error);
    // Show error to user
  }
};
```

### Subscribe to State Changes
```typescript
// Zustand allows subscribing to specific state
useEffect(() => {
  const unsubscribe = useStore.subscribe(
    (state) => state.notebooks,
    (notebooks) => {
      console.log('Notebooks changed:', notebooks.length);
    }
  );

  return unsubscribe;
}, []);
```

### Accessing Store Outside Components
```typescript
// Use getState() to access store outside React components
import { useStore } from '@/lib/store';

// In utility functions
export async function processNotebook(id: string) {
  const notebooks = useStore.getState().notebooks;
  const notebook = notebooks.find(n => n.id === id);

  if (notebook) {
    await useStore.getState().updateNotebook(id, {
      status: 'processing'
    });
  }
}
```

## Type Definitions

### Notebook Status
```typescript
type NotebookStatus =
  | 'extracting'        // Currently processing file
  | 'preview_ready'     // Preview available
  | 'ready_for_studio'  // Ready for editing
  | 'failed';           // Processing failed
```

### Material Types
```typescript
type MaterialType =
  | 'pdf'           // PDF document
  | 'audio'         // Audio file (transcript generated)
  | 'image'         // Image (OCR performed)
  | 'photo'         // Photo (OCR performed)
  | 'website'       // Web URL
  | 'youtube'       // YouTube URL
  | 'text'          // Plain text
  | 'note'          // Text note
  | 'copied-text';  // Copied text
```

### Pet Mood
```typescript
type PetMood =
  | 'happy'    // Pet is happy
  | 'neutral'  // Pet is neutral
  | 'sad';     // Pet is sad
```

### Exam Difficulty
```typescript
type ExamDifficulty =
  | 'easy'
  | 'medium'
  | 'hard';
```

### Notebook Colors
```typescript
type NotebookColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'pink';
```

## Error Handling

```typescript
// All async actions should be wrapped in try-catch
const handleAction = async () => {
  try {
    await addNotebook({...});
  } catch (error) {
    console.error('Action failed:', error);
    // Show error message to user
    Alert.alert('Error', 'Failed to create notebook');
  }
};
```

## Best Practices

1. **Load Data Early**: Load notebooks and pet state in app layout after auth
2. **Use Optimistic Updates**: Store updates local state first for responsiveness
3. **Error Handling**: Always wrap async actions in try-catch
4. **Type Safety**: Import types from store, don't redefine them
5. **Selective Subscriptions**: Only subscribe to state you need
6. **Avoid Mutations**: Never mutate state directly, use actions
7. **Clean Up**: Unsubscribe from store subscriptions in useEffect cleanup

## Debugging

```typescript
// Log entire store state
console.log('Store state:', useStore.getState());

// Log specific slice
console.log('Notebooks:', useStore.getState().notebooks);

// Monitor state changes
useStore.subscribe((state) => {
  console.log('State changed:', state);
});
```

## Testing

```typescript
// Mock store in tests
import { useStore } from '@/lib/store';

beforeEach(() => {
  // Reset store state
  useStore.setState({
    notebooks: [],
    user: { id: 'test', name: 'Test User', streak: 0, coins: 0 },
    // ... reset other state
  });
});

// Test component with store
const { result } = renderHook(() => useStore());
act(() => {
  result.current.addNotebook({...});
});
expect(result.current.notebooks).toHaveLength(1);
```

## Migration from Old Store

No migration needed! All imports remain the same:

```typescript
// This still works ✅
import { useStore } from '@/lib/store';
import type { Notebook } from '@/lib/store';

// Store API is identical ✅
const { notebooks, addNotebook } = useStore();
```
