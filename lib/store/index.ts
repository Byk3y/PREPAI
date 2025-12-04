/**
 * Main Zustand store - Combines all slices
 * Hybrid approach: Zustand for UI state, Supabase for persistence
 */

import { create } from 'zustand';
import { createAuthSlice, type AuthSlice } from './slices/authSlice';
import { createUserSlice, type UserSlice } from './slices/userSlice';
import { createPetSlice, type PetSlice } from './slices/petSlice';
import { createNotebookSlice, type NotebookSlice } from './slices/notebookSlice';
import { createFlashcardSlice, type FlashcardSlice } from './slices/flashcardSlice';
import { createExamSlice, type ExamSlice } from './slices/examSlice';
import { createLessonSlice, type LessonSlice } from './slices/lessonSlice';

// Combined store type
type AppState = AuthSlice &
  UserSlice &
  PetSlice &
  NotebookSlice &
  FlashcardSlice &
  ExamSlice &
  LessonSlice;

// Create the combined store
export const useStore = create<AppState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createUserSlice(...a),
  ...createPetSlice(...a),
  ...createNotebookSlice(...a),
  ...createFlashcardSlice(...a),
  ...createExamSlice(...a),
  ...createLessonSlice(...a),
}));

// Re-export all types for backward compatibility
export * from './types';
