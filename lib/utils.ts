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
