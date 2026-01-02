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
    materials: existingMaterials || (nb.materials ? (Array.isArray(nb.materials) ? nb.materials : [nb.materials]) : []).map((m: any) => ({
      id: m.id,
      type: m.kind as Material['type'],
      uri: m.storage_path || m.external_url,
      filename: m.meta?.filename || getFilenameFromPath(m.storage_path),
      content: m.content,
      preview_text: m.preview_text,
      title: m.meta?.title || nb.title,
      createdAt: m.created_at,
      thumbnail: m.thumbnail,
      meta: m.meta,
    })),
  };
}







