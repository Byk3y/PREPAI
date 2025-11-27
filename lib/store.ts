/**
 * Zustand store with mock data
 * TODO: Replace with Supabase real-time subscriptions
 */

import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  streak: number;
  coins: number;
  avatar?: string;
}

export interface PetState {
  level: number;
  xp: number;
  xpToNext: number;
  name: string;
  mood: 'happy' | 'neutral' | 'sad';
}

export interface Flashcard {
  id: string;
  question: string;
  answers: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  completedQuestions: number;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  subject: string;
  duration: number; // minutes
  completed: boolean;
}

export interface ExamPlan {
  id: string;
  examId: string;
  startDate: string;
  endDate: string;
  dailyGoal: number; // flashcards per day
  progress: number; // percentage
}

export interface Material {
  id: string;
  type: 'pdf' | 'audio' | 'image' | 'website' | 'youtube' | 'copied-text' | 'photo' | 'text' | 'note'; // Keep old types for backward compatibility
  uri?: string; // For PDF/photo/image/audio files or website/youtube URLs
  content?: string; // For text/note/copied-text content
  title: string;
  createdAt: string;
  thumbnail?: string; // Optional preview image
}

export interface Notebook {
  id: string;
  title: string;
  emoji?: string;
  flashcardCount: number;
  lastStudied?: string; // ISO date string
  progress: number; // 0-100 percentage
  createdAt: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'pink';
  materials: Material[]; // Track source materials
}

interface AppState {
  // User state
  user: User;
  setUser: (user: Partial<User>) => void;

  // Pet state
  petState: PetState;
  setPetState: (petState: Partial<PetState>) => void;
  addPetXP: (amount: number) => void;

  // Flashcards
  flashcards: Flashcard[];
  setFlashcards: (flashcards: Flashcard[]) => void;

  // Exams
  exams: Exam[];
  setExams: (exams: Exam[]) => void;
  startExamPlan: (examId: string) => ExamPlan;

  // Lessons
  lessons: Lesson[];
  setLessons: (lessons: Lesson[]) => void;
  completeLesson: (lessonId: string) => void;

  // Continue studying (recent items)
  recentItems: Array<{ type: 'lesson' | 'exam'; id: string; title: string; progress: number }>;
  addRecentItem: (item: { type: 'lesson' | 'exam'; id: string; title: string; progress: number }) => void;

  // Notebooks
  notebooks: Notebook[];
  setNotebooks: (notebooks: Notebook[]) => void;
  addNotebook: (notebook: Omit<Notebook, 'id' | 'createdAt'>) => void;
  deleteNotebook: (id: string) => void;
  updateNotebook: (id: string, updates: Partial<Notebook>) => void;
  addMaterial: (notebookId: string, material: Omit<Material, 'id' | 'createdAt'>) => void;
  deleteMaterial: (notebookId: string, materialId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial user state
  user: {
    id: 'user-1',
    name: 'Alex',
    streak: 7,
    coins: 250,
  },

  setUser: (updates) => set((state) => ({
    user: { ...state.user, ...updates },
  })),

  // Initial pet state
  petState: {
    level: 1,
    xp: 23,
    xpToNext: 100,
    name: 'Sparky',
    mood: 'happy',
  },

  setPetState: (updates) => set((state) => ({
    petState: { ...state.petState, ...updates },
  })),

  addPetXP: (amount) => set((state) => {
    const newXP = state.petState.xp + amount;
    const xpToNext = state.petState.xpToNext;

    if (newXP >= xpToNext) {
      // Level up!
      return {
        petState: {
          ...state.petState,
          level: state.petState.level + 1,
          xp: newXP - xpToNext,
          xpToNext: xpToNext * 1.5, // Increase XP needed for next level
          mood: 'happy',
        },
      };
    }

    return {
      petState: {
        ...state.petState,
        xp: newXP,
      },
    };
  }),

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

  // Mock exams
  exams: [
    {
      id: 'exam-1',
      title: 'SAT Math Practice',
      subject: 'Mathematics',
      difficulty: 'medium',
      totalQuestions: 50,
      completedQuestions: 12,
    },
    {
      id: 'exam-2',
      title: 'AP Biology Review',
      subject: 'Biology',
      difficulty: 'hard',
      totalQuestions: 60,
      completedQuestions: 0,
    },
    {
      id: 'exam-3',
      title: 'History Final Prep',
      subject: 'History',
      difficulty: 'easy',
      totalQuestions: 40,
      completedQuestions: 8,
    },
  ],

  setExams: (exams) => set({ exams }),

  startExamPlan: (examId) => {
    const plan: ExamPlan = {
      id: `plan-${Date.now()}`,
      examId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      dailyGoal: 10,
      progress: 0,
    };

    // TODO: Save to Supabase
    return plan;
  },

  // Mock lessons
  lessons: [
    {
      id: 'lesson-1',
      title: 'Introduction to Algebra',
      content: 'Algebra is a branch of mathematics that uses symbols and letters to represent numbers and quantities in formulas and equations...',
      subject: 'Mathematics',
      duration: 15,
      completed: false,
    },
    {
      id: 'lesson-2',
      title: 'Photosynthesis Basics',
      content: 'Photosynthesis is the process by which plants convert light energy into chemical energy...',
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

  completeLesson: (lessonId) => set((state) => ({
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

  addRecentItem: (item) => set((state) => {
    // Remove if already exists and add to front
    const filtered = state.recentItems.filter((i) => !(i.type === item.type && i.id === item.id));
    return { recentItems: [item, ...filtered].slice(0, 5) }; // Keep last 5
  }),

  // Notebooks - start with empty array
  notebooks: [],

  setNotebooks: (notebooks) => set({ notebooks }),

  addNotebook: (notebook) => set((state) => ({
    notebooks: [
      {
        ...notebook,
        id: `notebook-${Date.now()}`,
        createdAt: new Date().toISOString(),
        materials: notebook.materials || [],
      },
      ...state.notebooks,
    ],
  })),

  deleteNotebook: (id) => set((state) => ({
    notebooks: state.notebooks.filter((n) => n.id !== id),
  })),

  updateNotebook: (id, updates) => set((state) => ({
    notebooks: state.notebooks.map((n) =>
      n.id === id ? { ...n, ...updates } : n
    ),
  })),

  addMaterial: (notebookId, material) => set((state) => ({
    notebooks: state.notebooks.map((n) =>
      n.id === notebookId
        ? {
            ...n,
            materials: [
              ...n.materials,
              {
                ...material,
                id: `material-${Date.now()}`,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : n
    ),
  })),

  deleteMaterial: (notebookId, materialId) => set((state) => ({
    notebooks: state.notebooks.map((n) =>
      n.id === notebookId
        ? {
            ...n,
            materials: n.materials.filter((m) => m.id !== materialId),
          }
        : n
    ),
  })),
}));

