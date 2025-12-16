/**
 * Time Formatting Utilities
 * Helper functions for formatting time durations in human-readable formats
 */

/**
 * Format minutes into a human-readable time string
 * Examples:
 * - 15 minutes -> "15 min"
 * - 60 minutes -> "1 hour"
 * - 90 minutes -> "1 hour" (rounded down)
 * - 120 minutes -> "2 hours"
 * 
 * @param minutes - Time in minutes
 * @returns Formatted time string (e.g., "15 min", "1 hour", "2 hours")
 */
export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hour' : `${hours} hours`;
};

/**
 * Format seconds into MM:SS string
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "5:30")
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format seconds into human-readable duration (e.g., 125 -> "2m 5s")
 * @param seconds - Time in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};


