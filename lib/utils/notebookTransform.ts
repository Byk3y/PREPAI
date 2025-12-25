/**
 * Notebook transformation utilities
 * Converts Supabase notebook data to app Notebook format
 */

import type { Notebook, Material } from '@/lib/store';
import { getFilenameFromPath } from '@/lib/utils';

/**
 * Transform Supabase notebook data to Notebook format
 * @param nb - Raw notebook data from Supabase
 * @param existingMaterials - Optional existing materials to preserve
 * @returns Transformed Notebook object
 */
export function transformNotebook(nb: any, existingMaterials?: Material[]): Notebook {
  return {
    id: nb.id,
    title: nb.title,
    flashcardCount: nb.flashcard_count || 0,
    lastStudied: nb.last_studied,
    progress: nb.progress || 0,
    createdAt: nb.created_at,
    color: nb.color,
    emoji: nb.emoji,
    status: nb.status as Notebook['status'],
    meta: nb.meta || {},
    materials: existingMaterials || (nb.materials ? [{
      id: nb.materials.id,
      type: nb.materials.kind as Material['type'],
      uri: nb.materials.storage_path || nb.materials.external_url,
      filename: getFilenameFromPath(nb.materials.storage_path),
      content: nb.materials.content,
      preview_text: nb.materials.preview_text,
      title: nb.title,
      createdAt: nb.materials.created_at,
      thumbnail: nb.materials.thumbnail,
    }] : []),
  };
}







