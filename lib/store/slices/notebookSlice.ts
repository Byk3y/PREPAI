/**
 * Notebook slice - Notebooks state management with Supabase CRUD operations
 */

import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase'; // Kept for auth check in addNotebook if needed, though service might handle auth context or we pass it
import { notebookService } from '@/lib/services/notebookService';
import { getFilenameFromPath } from '@/lib/utils'; // Keep if needed for local transformations, otherwise remove
import type { Notebook, Material, SupabaseUser, ChatMessage } from '../types';

export interface NotebookSlice {
  notebooks: Notebook[];
  notebooksSyncedAt: number | null;
  notebooksUserId: string | null;
  setNotebooks: (notebooks: Notebook[]) => void;
  loadNotebooks: (userId?: string) => Promise<void>;
  addNotebook: (
    notebook: Omit<Notebook, 'id' | 'createdAt' | 'materials'> & {
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
  loadChatMessages: (notebookId: string) => Promise<void>;
  addChatMessage: (notebookId: string, message: ChatMessage) => void;
  updateLastChatMessage: (notebookId: string, content: string) => void;
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
  notebooksSyncedAt: null,
  notebooksUserId: null,

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

        set({
          notebooks,
          notebooksSyncedAt: Date.now(),
          notebooksUserId: effectiveUserId,
        });

        if (notebooks.length > 0 && get().setHasCreatedNotebook) {
          get().setHasCreatedNotebook!(true);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error loading notebooks (attempt ${attempt}/${maxRetries}):`, lastError);

        if (attempt === maxRetries) {
          set({
            notebooks: [],
            notebooksSyncedAt: Date.now(),
            notebooksUserId: effectiveUserId,
          });
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
      // Force cast notebook to any to bypass strict type check against Service expecting 'materials'
      const { newNotebook, material, isFileUpload, storagePath } = await notebookService.createNotebook(authUser.id, notebook as any);

      // 2. Optimistic Update
      const materialsArr = Array.isArray(newNotebook.materials) ? newNotebook.materials : [];
      const materialObj = materialsArr[0];

      const transformedNotebook: Notebook = {
        id: newNotebook.id,
        title: newNotebook.title,
        flashcardCount: (newNotebook as any).flashcard_count || 0,
        lastStudied: (newNotebook as any).last_studied || undefined,
        progress: (newNotebook as any).progress || 0,
        createdAt: newNotebook.created_at || new Date().toISOString(),
        color: (newNotebook as any).color as Notebook['color'],
        status: newNotebook.status as Notebook['status'],
        meta: (newNotebook.meta as any) || {},
        materials: materialObj
          ? [
            {
              id: materialObj.id,
              type: materialObj.kind as Material['type'],
              uri:
                materialObj.storage_path ||
                materialObj.external_url ||
                undefined,
              filename: getFilenameFromPath(materialObj.storage_path || undefined),
              content: materialObj.content || undefined,
              preview_text: materialObj.preview_text || undefined,
              title: newNotebook.title,
              createdAt: materialObj.created_at || new Date().toISOString(),
              thumbnail: materialObj.thumbnail || undefined,
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
      notebookService.triggerProcessing(newNotebook.id, material.id, !!isFileUpload, storagePath, authUser.id)
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

  loadChatMessages: async (notebookId) => {
    try {
      const messages = await notebookService.fetchChatMessages(notebookId);
      set((state) => ({
        notebooks: state.notebooks.map((n) =>
          n.id === notebookId ? { ...n, chat_messages: messages } : n
        ),
      }));
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  },

  addChatMessage: (notebookId, message) =>
    set((state) => ({
      notebooks: state.notebooks.map((n) =>
        n.id === notebookId
          ? {
            ...n,
            chat_messages: [...(n.chat_messages || []), message],
          }
          : n
      ),
    })),

  updateLastChatMessage: (notebookId, content) =>
    set((state) => ({
      notebooks: state.notebooks.map((n) => {
        if (n.id === notebookId && n.chat_messages && n.chat_messages.length > 0) {
          const newMessages = [...n.chat_messages];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'assistant') {
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              content: content,
            };
            return { ...n, chat_messages: newMessages };
          }
        }
        return n;
      }),
    })),
});
