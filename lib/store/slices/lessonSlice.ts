/**
 * Lesson slice - Lesson state management
 */

import type { StateCreator } from 'zustand';
import type { Lesson } from '../types';

export interface LessonSlice {
  lessons: Lesson[];
  setLessons: (lessons: Lesson[]) => void;
  completeLesson: (lessonId: string) => void;
  recentItems: Array<{
    type: 'lesson' | 'exam';
    id: string;
    title: string;
    progress: number;
  }>;
  addRecentItem: (item: {
    type: 'lesson' | 'exam';
    id: string;
    title: string;
    progress: number;
  }) => void;
}

export const createLessonSlice: StateCreator<LessonSlice> = (set) => ({
  // Mock lessons
  lessons: [
    {
      id: 'lesson-1',
      title: 'Introduction to Algebra',
      content:
        'Algebra is a branch of mathematics that uses symbols and letters to represent numbers and quantities in formulas and equations...',
      subject: 'Mathematics',
      duration: 15,
      completed: false,
    },
    {
      id: 'lesson-2',
      title: 'Photosynthesis Basics',
      content:
        'Photosynthesis is the process by which plants convert light energy into chemical energy...',
      subject: 'Biology',
      duration: 20,
      completed: true,
    },
    {
      id: 'lesson-3',
      title: 'World War II Overview',
      content: 'World War II was a global war that lasted from 1939 to 1945...',
      subject: 'History',
      duration: 25,
      completed: false,
    },
  ],

  setLessons: (lessons) => set({ lessons }),

  completeLesson: (lessonId) =>
    set((state) => ({
      lessons: state.lessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, completed: true } : lesson
      ),
    })),

  // Recent items for "Continue Studying"
  recentItems: [
    { type: 'lesson', id: 'lesson-1', title: 'Introduction to Algebra', progress: 60 },
    { type: 'exam', id: 'exam-1', title: 'SAT Math Practice', progress: 24 },
    { type: 'lesson', id: 'lesson-3', title: 'World War II Overview', progress: 30 },
  ],

  addRecentItem: (item) =>
    set((state) => {
      // Remove if already exists and add to front
      const filtered = state.recentItems.filter(
        (i) => !(i.type === item.type && i.id === item.id)
      );
      return { recentItems: [item, ...filtered].slice(0, 5) }; // Keep last 5
    }),
});
