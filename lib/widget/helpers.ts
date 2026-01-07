/**
 * Widget Bridge Helper Functions
 * Utilities for building WidgetData from app state
 */

import type { WidgetData, ExamData, MilestoneData } from './types';
import { getLocalDateString } from '@/lib/utils/time';

// MARK: - Widget Data Builders

/**
 * Build widget data from current app state
 * This is the main function to call when updating the widget
 *
 * @param params Widget data parameters from app state
 * @returns Complete WidgetData object ready for bridge
 */
export function buildWidgetData(params: {
  // From user state
  streak: number;
  lastStreakDate?: string;

  // From daily tasks
  securedToday: boolean;
  lastSecureDate: string;
  sessionsToday?: number;

  // From pet state
  petName: string;
  petStage: 1 | 2 | 3;

  // Optional: exam tracking
  nearestExam?: {
    title: string;
    date: string; // YYYY-MM-DD
  };

  // Optional: recent milestone
  recentMilestone?: {
    type: 'level_up' | 'streak_milestone' | 'stage_up';
    value: number;
  };
}): Omit<WidgetData, 'lastUpdate'> {
  const today = getLocalDateString();

  // Calculate if pet is dying
  // Pet is dying if streak > 0 AND not secured today
  const isDying = params.streak > 0 && !params.securedToday;

  // Build widget data
  const widgetData: Omit<WidgetData, 'lastUpdate'> = {
    // Streak tracking
    streak: params.streak,
    lastStreakDate: params.lastStreakDate || today,

    // Study status
    studyStatus: {
      securedToday: params.securedToday,
      lastSecureDate: params.lastSecureDate,
      sessionsToday: params.sessionsToday || 0,
    },

    // Pet state
    pet: {
      name: params.petName,
      stage: params.petStage,
      isDying,
    },

    // Optional: Exam tracking
    nearestExam: params.nearestExam
      ? {
          title: params.nearestExam.title,
          date: params.nearestExam.date,
          daysRemaining: calculateDaysRemaining(params.nearestExam.date),
        }
      : undefined,

    // Optional: Recent milestone
    recentMilestone: params.recentMilestone
      ? {
          type: params.recentMilestone.type,
          value: params.recentMilestone.value,
          achievedAt: new Date().toISOString(),
        }
      : undefined,
  };

  return widgetData;
}

/**
 * Calculate days remaining until a date
 * @param dateString Date in YYYY-MM-DD format
 * @returns Number of days remaining (can be negative if past)
 */
function calculateDaysRemaining(dateString: string): number {
  const targetDate = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if widget data should be updated
 * Prevents unnecessary updates when data hasn't changed
 *
 * @param newData New widget data
 * @param oldData Previous widget data
 * @returns True if data has changed significantly
 */
export function shouldUpdateWidget(
  newData: Omit<WidgetData, 'lastUpdate'>,
  oldData: WidgetData | null
): boolean {
  if (!oldData) {
    return true; // No previous data, definitely update
  }

  // Check critical fields that affect widget display
  const criticalChanges = [
    newData.streak !== oldData.streak,
    newData.studyStatus.securedToday !== oldData.studyStatus.securedToday,
    newData.pet.stage !== oldData.pet.stage,
    newData.pet.isDying !== oldData.pet.isDying,
    newData.pet.name !== oldData.pet.name,
  ];

  return criticalChanges.some(Boolean);
}

/**
 * Validate widget data before sending to native
 * @param data Widget data to validate
 * @returns True if valid, false otherwise
 */
export function validateWidgetData(data: Partial<WidgetData>): data is WidgetData {
  // Required fields
  if (typeof data.streak !== 'number') return false;
  if (typeof data.lastStreakDate !== 'string') return false;
  if (!data.studyStatus) return false;
  if (!data.pet) return false;

  // Validate study status
  if (typeof data.studyStatus.securedToday !== 'boolean') return false;
  if (typeof data.studyStatus.lastSecureDate !== 'string') return false;
  if (typeof data.studyStatus.sessionsToday !== 'number') return false;

  // Validate pet data
  if (typeof data.pet.name !== 'string') return false;
  if (![1, 2, 3].includes(data.pet.stage)) return false;
  if (typeof data.pet.isDying !== 'boolean') return false;

  return true;
}

/**
 * Get placeholder widget data for testing
 * @returns Sample widget data
 */
export function getPlaceholderWidgetData(): Omit<WidgetData, 'lastUpdate'> {
  return {
    streak: 7,
    lastStreakDate: getLocalDateString(),
    studyStatus: {
      securedToday: true,
      lastSecureDate: getLocalDateString(),
      sessionsToday: 2,
    },
    pet: {
      name: 'Bubbles',
      stage: 2,
      isDying: false,
    },
    nearestExam: {
      title: 'WAEC 2026',
      date: '2026-05-15',
      daysRemaining: 129,
    },
  };
}
