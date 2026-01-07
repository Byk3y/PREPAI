/**
 * Widget Bridge Type Definitions
 * Mirrors Swift WidgetData structures for type safety
 */

// MARK: - Widget Data Models

export interface StudyStatus {
  securedToday: boolean;      // secure_pet task completed today
  lastSecureDate: string;     // YYYY-MM-DD format
  sessionsToday: number;      // Count of completed study activities
}

export interface PetData {
  name: string;               // User's pet name
  stage: 1 | 2 | 3;          // Pet evolution stage
  isDying: boolean;           // Calculated: !securedToday && streak > 0
}

export interface ExamData {
  title: string;              // e.g., "WAEC 2026"
  date?: string;              // YYYY-MM-DD format (optional)
  daysRemaining: number;      // Pre-calculated in RN
}

export interface MilestoneData {
  type: 'level_up' | 'streak_milestone' | 'stage_up';
  value: number;              // Stage number or streak count
  achievedAt: string;         // ISO 8601 timestamp
}

export interface WidgetData {
  // Streak tracking
  streak: number;
  lastStreakDate: string;     // YYYY-MM-DD format

  // Study status (synced with daily_tasks table)
  studyStatus: StudyStatus;

  // Pet state
  pet: PetData;

  // Exam tracking (optional)
  nearestExam?: ExamData;

  // Recent achievements (optional)
  recentMilestone?: MilestoneData;

  // Metadata
  lastUpdate: string;         // ISO 8601 timestamp
}

// MARK: - Native Module Interface

export interface WidgetBridgeNative {
  /**
   * Update widget data in shared UserDefaults
   * @param data Widget data object
   * @returns Promise with success status
   */
  updateWidgetData(data: WidgetData): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Get current widget data from shared UserDefaults
   * @returns Promise with WidgetData or null
   */
  getWidgetData(): Promise<WidgetData | null>;

  /**
   * Manually reload all widget timelines
   * Forces WidgetKit to refresh widget display
   * @returns Promise with success status
   */
  reloadTimelines(): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Check if widget data is valid (not stale)
   * Returns false if data is older than 24 hours
   * @returns Promise with validity status
   */
  isDataValid(): Promise<{
    isValid: boolean;
  }>;

  /**
   * Clear all widget data (for testing/debugging)
   * @returns Promise with success status
   */
  clearWidgetData(): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Constants exported from native module
   */
  appGroupIdentifier: string;
  isWidgetAvailable: boolean;
}
