/**
 * Flashcard slice - Flashcard state management
 */

import type { StateCreator } from 'zustand';
import type { Flashcard } from '../types';

export interface FlashcardSlice {
  flashcards: Flashcard[];
  setFlashcards: (flashcards: Flashcard[]) => void;
}

export const createFlashcardSlice: StateCreator<FlashcardSlice> = (set) => ({
  // Initialize with empty flashcards - populated from database
  flashcards: [],

  setFlashcards: (flashcards) => set({ flashcards }),
});
