/**
 * Utility Functions
 */

/**
 * Extract filename from storage path
 * @param storagePath - Path like "userId/materialId/filename.jpg"
 * @returns Filename or undefined
 */
export function getFilenameFromPath(storagePath: string | undefined): string | undefined {
    if (!storagePath) return undefined;
    const parts = storagePath.split('/');
    return parts[parts.length - 1] || undefined;
}

/**
 * Format seconds into MM:SS string
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
