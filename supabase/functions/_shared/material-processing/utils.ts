/**
 * Utility functions for material processing
 */

/**
 * Strip markdown formatting from a string (removes **bold** and *italic* markers)
 *
 * @param text - Text with markdown formatting
 * @returns Text with markdown markers removed
 */
export function stripMarkdown(text: string): string {
  // Remove **bold** markers (double asterisks)
  let cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  // Remove *italic* markers (single asterisks)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  return cleaned;
}
