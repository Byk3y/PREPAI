/**
 * Exam slice - Exam state management
 */

import type { StateCreator } from 'zustand';
import type { Exam, ExamPlan } from '../types';

export interface ExamSlice {
  exams: Exam[];
  setExams: (exams: Exam[]) => void;
  startExamPlan: (examId: string) => ExamPlan;
}

export const createExamSlice: StateCreator<ExamSlice> = (set) => ({
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

    // TODO: Save exam plan to Supabase (when exam_plans table is implemented)
    return plan;
  },
});
