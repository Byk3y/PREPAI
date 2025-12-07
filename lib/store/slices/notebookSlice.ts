/**
 * Notebook slice - Notebooks state management with Supabase CRUD operations
 */

import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase'; // Kept for auth check in addNotebook if needed, though service might handle auth context or we pass it
import { notebookService } from '@/lib/services/notebookService';
import { getFilenameFromPath } from '@/lib/utils'; // Keep if needed for local transformations, otherwise remove
import type { Notebook, Material, SupabaseUser } from '../types';

export interface NotebookSlice {
  notebooks: Notebook[];
  setNotebooks: (notebooks: Notebook[]) => void;
  loadNotebooks: (userId?: string) => Promise<void>;
  addNotebook: (
    notebook: Omit<Notebook, 'id' | 'createdAt'> & {
      material?: Omit<Material, 'id' | 'createdAt'> & {
        fileUri?: string;
        filename?: string;
      };
    }
  ) => Promise<string>;
  deleteNotebook: (id: string) => Promise<void>;
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  addMaterial: (notebookId: string, material: Omit<Material, 'id' | 'createdAt'>) => void;
  deleteMaterial: (notebookId: string, materialId: string) => void;
}

export const createNotebookSlice: StateCreator<
  NotebookSlice & {
    authUser: SupabaseUser | null;
    setAuthUser: (user: SupabaseUser | null) => void;
    setHasCreatedNotebook?: (value: boolean) => void;
  },
  [],
  [],
  NotebookSlice
> = (set, get) => ({
  notebooks: [],

  setNotebooks: (notebooks) => set({ notebooks }),

  loadNotebooks: async (userId?: string) => {
    // Use passed userId if available, otherwise fall back to store
    // This avoids race condition when auth state hasn't propagated yet
    const effectiveUserId = userId || get().authUser?.id;
    if (!effectiveUserId) {
      set({ notebooks: [] });
      return;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const notebooks = await notebookService.fetchNotebooks(effectiveUserId);

        set({ notebooks });

        if (notebooks.length > 0 && get().setHasCreatedNotebook) {
          get().setHasCreatedNotebook!(true);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error loading notebooks (attempt ${attempt}/${maxRetries}):`, lastError);

        if (attempt === maxRetries) {
          set({ notebooks: [] });
          throw lastError;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  },

  addNotebook: async (notebook) => {
    let authUser = get().authUser;

    if (!authUser) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('No authenticated user', error);
        throw new Error('No authenticated user');
      }
      authUser = user;
      get().setAuthUser(user);
    }

    try {
      // 1. Create Notebook (Upload + DB Insert)
      const { newNotebook, material, isFileUpload, storagePath } = await notebookService.createNotebook(authUser.id, notebook);

      // 2. Optimistic Update
      const transformedNotebook: Notebook = {
        id: newNotebook.id,
        title: newNotebook.title,
        flashcardCount: newNotebook.flashcard_count || 0,
        lastStudied: newNotebook.last_studied,
        progress: newNotebook.progress || 0,
        createdAt: newNotebook.created_at,
        color: newNotebook.color,
        status: newNotebook.status as Notebook['status'],
        meta: newNotebook.meta || {},
        materials: newNotebook.materials
          ? [
            {
              id: newNotebook.materials.id,
              type: newNotebook.materials.kind as Material['type'],
              uri:
                newNotebook.materials.storage_path ||
                newNotebook.materials.external_url,
              filename: getFilenameFromPath(newNotebook.materials.storage_path),
              content: newNotebook.materials.content,
              preview_text: newNotebook.materials.preview_text,
              title: newNotebook.title,
              createdAt: newNotebook.materials.created_at,
              thumbnail: newNotebook.materials.thumbnail,
            },
          ]
          : [],
      };

      set((state) => ({
        notebooks: [transformedNotebook, ...state.notebooks],
        // Update hasCreatedNotebook locally if not already set, though service tries to update profile too
      }));
      if (get().setHasCreatedNotebook) {
        get().setHasCreatedNotebook!(true);
      }


      // 3. Trigger Processing (Edge Function)
      // Run in background, don't await blocking the UI return
      notebookService.triggerProcessing(newNotebook.id, material.id, isFileUpload, storagePath)
        .then((result) => {
          if (result.status === 'failed') {
            set((state) => ({
              notebooks: state.notebooks.map((n) =>
                n.id === newNotebook.id ? { ...n, status: 'failed' as const } : n
              ),
            }));
          }
        });

      return newNotebook.id;
    } catch (error) {
      console.error('Error adding notebook:', error);
      throw error;
    }
  },

  deleteNotebook: async (id) => {
    const { authUser } = get();
    if (!authUser) return;

    try {
      await notebookService.deleteNotebook(authUser.id, id);

      set((state) => ({
        notebooks: state.notebooks.filter((n) => n.id !== id),
      }));
    } catch (error) {
      // Error is logged in service
    }
  },

  updateNotebook: async (id, updates) => {
    const { authUser } = get();
    if (!authUser) return;

    try {
      await notebookService.updateNotebook(authUser.id, id, updates);

      set((state) => ({
        notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      }));
    } catch (error) {
      // Error is logged in service
    }
  },

  addMaterial: (notebookId, material) =>
    set((state) => ({
      notebooks: state.notebooks.map((n) =>
        n.id === notebookId
          ? {
            ...n,
            materials: [
              ...n.materials,
              {
                ...material,
                id: `material-${Date.now()}`,
                createdAt: new Date().toISOString(),
              },
            ],
          }
          : n
      ),
    })),

  deleteMaterial: (notebookId, materialId) =>
    set((state) => ({
      notebooks: state.notebooks.map((n) =>
        n.id === notebookId
          ? {
            ...n,
            materials: n.materials.filter((m) => m.id !== materialId),
          }
          : n
      ),
    })),
});
