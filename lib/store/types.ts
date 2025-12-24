/**
 * Type definitions for the Zustand store
 */

import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Profile metadata structure
 * Stored in profiles.meta JSONB field
 */
export interface ProfileMeta {
  // Existing onboarding fields
  has_created_notebook?: boolean;
  has_completed_onboarding?: boolean;
  onboarding_completed_at?: string; // ISO timestamp

  // Assessment fields (new - from onboarding assessment)
  learning_style?: 'visual' | 'auditory' | 'reading' | 'practice';
  study_goal?: 'exam_prep' | 'retention' | 'quick_review' | 'all';
  daily_commitment_minutes?: number; // 5, 15, 30, 60, etc.
  commitment_made_at?: string; // ISO timestamp
  assessment_completed_at?: string; // ISO timestamp
  assessment_version?: string; // e.g., '1.0' for versioning
}

export interface User {
  id: string;
  name: string;          // Full display name (auto-synced from first_name + last_name)
  first_name: string;    // First name for personalization
  last_name: string;     // Last name for personalization
  streak: number;
  coins: number;
  avatar?: string;
  meta?: ProfileMeta;    // Profile metadata from database
  created_at?: string;   // ISO timestamp
}

export interface PetState {
  stage: number;        // Stage 1, 2, 3... (calculated from points)
  points: number;       // Total points (0-100 for Stage 1, 100-200 for Stage 2, etc.)
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
  content?: string; // Extracted text only (PDF→text, audio→transcript, image→OCR, NOT summary)
  preview_text?: string; // Short TL;DR preview string
  title?: string; // Optional: For backward compatibility, but notebooks.title is the source of truth
  filename?: string; // Extracted from storage_path for display
  createdAt: string;
  thumbnail?: string; // Optional preview image
  meta?: {
    ocr_quality?: {
      confidence: number; // 0-100
      lowQuality: boolean; // true if confidence < 70% or very short text
      engine: 'tesseract' | 'google-vision';
      processingTime: number; // ms
      warning?: string; // Optional warning message
    };
    [key: string]: any; // Allow other metadata
  };
}

// Studio feature types (separate from legacy exam flashcards)
export interface FlashcardSet {
  id: string;
  notebook_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  cards?: StudioFlashcard[];
  total_cards?: number;
}

export interface StudioFlashcard {
  id: string;
  notebook_id: string;
  set_id?: string;
  question: string;
  answer: string;
  explanation?: string;
  tags?: string[];
  created_at: string;
}

export interface Quiz {
  id: string;
  notebook_id: string;
  title: string;
  questions: QuizQuestion[];
  score?: number;
  total_questions: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: 'A' | 'B' | 'C' | 'D';
  hint?: string | null;
  explanations?: { A: string; B: string; C: string; D: string } | null;
  selected?: 'A' | 'B' | 'C' | 'D';
}

export interface AudioOverview {
  id: string;
  notebook_id: string;
  title: string;
  duration: number; // seconds
  audio_url: string;
  storage_path?: string; // Storage path for deletion
  script: string;
  generated_at: string;
}

export interface AudioPlaybackPosition {
  audioOverviewId: string;
  notebookId: string;
  position: number; // Playback position in seconds
  duration: number; // Total duration in seconds
  audioUrl: string; // For validation (URL might change on refresh)
  lastPlayed: string; // ISO timestamp
  percentComplete: number; // 0-100, for UI and cleanup logic
}

export interface AudioPositionMap {
  [audioOverviewId: string]: AudioPlaybackPosition;
}

export interface Notebook {
  id: string;
  title: string;
  emoji?: string; // DEPRECATED: Not used - emojis computed dynamically via getTopicEmoji()
  flashcardCount: number;
  lastStudied?: string; // ISO date string
  progress: number; // 0-100 percentage
  createdAt: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'pink';
  status?: 'extracting' | 'preview_ready' | 'ready_for_studio' | 'failed'; // Processing status
  materials: Material[]; // Track source materials (for backward compatibility, but MVP is 1:1)
  meta?: {
    preview?: {
      overview: string; // Comprehensive narrative overview (150-200 words, Podcast style)
      // Backward compatibility: support old format
      tl_dr?: string; // DEPRECATED: Use overview instead
      bullets?: string[]; // DEPRECATED: No longer used
      who_for?: string; // DEPRECATED: No longer used
      next_step?: string; // DEPRECATED: No longer used
    };
    summary?: string | null; // Only set in Studio tab, null during upload
  };
  // Studio generated content
  flashcard_sets?: FlashcardSet[];
  quizzes?: Quiz[];
  audio_overviews?: AudioOverview[];
}


export type { User as SupabaseUser } from '@supabase/supabase-js';

// Theme types
export type { ThemeMode } from './slices/themeSlice';

// Task types
export interface DailyTask {
  id: string;
  task_key: string;
  title: string;
  description: string;
  points: number;
  task_type: 'foundational' | 'daily';
  completed: boolean;
  completed_at: string | null;
  points_awarded: number | null;
  display_order?: number;
}

export interface TaskProgress {
  current: number;
  goal: number;
  unit: string;
  percentage: number;
}

