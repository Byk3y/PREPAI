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
import { createAudioPlaybackSlice, type AudioPlaybackSlice } from './slices/audioPlaybackSlice';
import { createTaskSlice, type TaskSlice } from './slices/taskSlice';

import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Combined store type
type AppState = AuthSlice &
  UserSlice &
  PetSlice &
  NotebookSlice &
  FlashcardSlice &
  ExamSlice &
  LessonSlice &
  AudioPlaybackSlice &
  TaskSlice;

// Create the combined store
export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createUserSlice(...a),
      ...createPetSlice(...a),
      ...createNotebookSlice(...a),
      ...createFlashcardSlice(...a),
      ...createExamSlice(...a),
      ...createLessonSlice(...a),
      ...createAudioPlaybackSlice(...a),
      ...createTaskSlice(...a),
    }),
    {
      name: 'prep-ai-storage',
      version: 2, // Incremented to clear old petState from AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notebooks: state.notebooks,
        notebooksSyncedAt: state.notebooksSyncedAt,
        notebooksUserId: state.notebooksUserId,
        cachedPetState: state.cachedPetState,
        cachedPetSyncedAt: state.cachedPetSyncedAt,
        cachedPetUserId: state.cachedPetUserId,
        // petState removed in v2 - should always load from database per user
        authUser: state.authUser,
        hasCreatedNotebook: state.hasCreatedNotebook,
        playbackPositions: state.playbackPositions,
        dailyTasks: state.dailyTasks,
        taskProgress: state.taskProgress,
        // Add other persistent state here as needed
      }),
      migrate: (persistedState: any, version: number) => {
        // Clear petState from old persisted data when migrating to v2
        // Handle both old persisted state (no version) and v1
        if ((!version || version < 2) && persistedState?.petState) {
          const { petState, ...rest } = persistedState;
          return rest;
        }
        return persistedState;
      },
    }
  )
);

// Re-export all types for backward compatibility
export * from './types';
