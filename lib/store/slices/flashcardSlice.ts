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
  // Mock flashcards
  flashcards: [
    {
      id: 'fc-1',
      question: 'What is the capital of France?',
      answers: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2,
      explanation: 'Paris is the capital and largest city of France.',
    },
    {
      id: 'fc-2',
      question: 'What is 2 + 2?',
      answers: ['3', '4', '5', '6'],
      correctAnswer: 1,
      explanation: 'Basic arithmetic: 2 + 2 = 4',
    },
    {
      id: 'fc-3',
      question: 'Which planet is closest to the Sun?',
      answers: ['Venus', 'Earth', 'Mercury', 'Mars'],
      correctAnswer: 2,
      explanation: 'Mercury is the closest planet to the Sun.',
    },
  ],

  setFlashcards: (flashcards) => set({ flashcards }),
});
