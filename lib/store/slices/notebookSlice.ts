/**
 * Notebook slice - Notebooks state management with Supabase CRUD operations
 */

import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { uploadMaterialFile } from '@/lib/upload';
import { getFilenameFromPath } from '@/lib/utils';
import type { Notebook, Material, SupabaseUser } from '../types';

export interface NotebookSlice {
  notebooks: Notebook[];
  setNotebooks: (notebooks: Notebook[]) => void;
  loadNotebooks: () => Promise<void>;
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

  loadNotebooks: async () => {
    const { authUser } = get();
    if (!authUser) {
      // No user, clear notebooks and return
      set({ notebooks: [] });
      return;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('notebooks')
          .select(`
            *,
            materials (*)
          `)
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }

        // Transform Supabase data to Notebook format
        const notebooks: Notebook[] = (data || []).map((nb: any) => ({
          id: nb.id,
          title: nb.title,
          flashcardCount: nb.flashcard_count || 0,
          lastStudied: nb.last_studied,
          progress: nb.progress || 0,
          createdAt: nb.created_at,
          color: nb.color,
          status: nb.status as Notebook['status'],
          meta: nb.meta || {},
          materials: nb.materials
            ? [
              {
                id: nb.materials.id,
                type: nb.materials.kind as Material['type'],
                uri: nb.materials.storage_path || nb.materials.external_url,
                filename: getFilenameFromPath(nb.materials.storage_path),
                content: nb.materials.content,
                preview_text: nb.materials.preview_text,
                title: nb.title, // Use notebook title as fallback for Material interface compatibility
                createdAt: nb.materials.created_at,
                thumbnail: nb.materials.thumbnail,
              },
            ]
            : [],
        }));

        set({ notebooks });

        // If user has notebooks, automatically set hasCreatedNotebook flag
        if (notebooks.length > 0 && get().setHasCreatedNotebook) {
          get().setHasCreatedNotebook!(true);
        }

        // Success - return early
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error loading notebooks (attempt ${attempt}/${maxRetries}):`, lastError);

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          // On final failure, still set empty array to prevent stale data
          set({ notebooks: [] });
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Failed to load notebooks after retries');
  },

  addNotebook: async (notebook) => {
    // Get user from store first, but fallback to Supabase if store is stale
    let authUser = get().authUser;

    // If no user in store, check Supabase directly (handles race conditions)
    if (!authUser) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('No authenticated user', error);
        throw new Error('No authenticated user');
      }
      authUser = user;
      // Update store with fresh user data
      get().setAuthUser(user);
    }

    try {
      // Step 1: Upload file if provided
      let storagePath: string | undefined;
      if (notebook.material?.fileUri && notebook.material?.filename) {
        const materialId = `temp-${Date.now()}`;
        const uploadResult = await uploadMaterialFile(
          authUser.id,
          materialId,
          notebook.material.fileUri,
          notebook.material.filename
        );
        if (uploadResult.error) {
          console.error('Upload error:', uploadResult.error);
          // Continue with local URI in dev mode
          storagePath = notebook.material.fileUri;
        } else {
          storagePath = uploadResult.storagePath;
        }
      }

      // Step 2: Determine upload type
      const isFileUpload =
        !!storagePath ||
        (notebook.material?.type &&
          ['pdf', 'audio', 'image', 'photo'].includes(notebook.material.type));
      const isTextUpload =
        notebook.material?.type === 'text' ||
        notebook.material?.type === 'note' ||
        notebook.material?.type === 'copied-text';

      // Step 3: Create material record
      // Note: Title is stored in notebooks table, not materials table
      // Edge Function will generate AI title and update notebooks.title
      const materialData: any = {
        user_id: authUser.id,
        kind: notebook.material?.type || 'text',
        storage_path: storagePath,
        external_url: notebook.material?.uri?.startsWith('http')
          ? notebook.material.uri
          : null,
        content: isFileUpload ? null : notebook.material?.content, // Files: null (will be extracted), Text: content
        preview_text: null, // Will be set by Edge Function for all types
        processed: false, // All materials go through Edge Function now
        processed_at: null,
      };

      const { data: material, error: materialError } = await supabase
        .from('materials')
        .insert(materialData)
        .select()
        .single();

      if (materialError) {
        console.error('Error creating material:', materialError);
        throw materialError;
      }

      // Step 4: Create notebook record
      const notebookData: any = {
        user_id: authUser.id,
        material_id: material.id,
        title: notebook.title,
        color: notebook.color,
        status: 'extracting', // All materials start as extracting, Edge Function will set to preview_ready
        meta: {}, // Preview will be generated by Edge Function
        flashcard_count: notebook.flashcardCount || 0,
        progress: notebook.progress || 0,
      };

      const { data: newNotebook, error: notebookError } = await supabase
        .from('notebooks')
        .insert(notebookData)
        .select(`
          *,
          materials (*)
        `)
        .single();

      if (notebookError) {
        console.error('Error creating notebook:', notebookError);
        throw notebookError;
      }

      // Update user profile - set has_created_notebook flag (non-blocking)
      // Fetch-then-merge pattern to preserve existing meta data
      supabase
        .from('profiles')
        .select('meta')
        .eq('id', authUser.id)
        .single()
        .then(({ data: profile }) => {
          // Merge with existing meta to preserve other fields
          const updatedMeta = {
            ...(profile?.meta || {}),
            has_created_notebook: true
          };

          return supabase
            .from('profiles')
            .update({ meta: updatedMeta })
            .eq('id', authUser.id);
        })
        .then(() => {
          // Update local state
          get().setHasCreatedNotebook?.(true);
        })
        .catch((err) => {
          console.error('Failed to update has_created_notebook flag:', err);
        });

      // Step 5: Update Zustand store (optimistic update)
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
              title: newNotebook.title, // Use notebook title as fallback for Material interface compatibility
              createdAt: newNotebook.materials.created_at,
              thumbnail: newNotebook.materials.thumbnail,
            },
          ]
          : [],
      };

      set((state) => ({
        notebooks: [transformedNotebook, ...state.notebooks],
      }));

      // Step 6: Trigger Edge Function for ALL uploads (files AND text)
      // Edge Function will generate AI title and preview for all materials

      // Check if file upload failed and fell back to local URI
      // Edge Function cannot process local file URIs, so mark as failed immediately
      if (isFileUpload && storagePath && storagePath.startsWith('file://')) {
        console.warn(
          'File upload failed, using local URI. Edge Function cannot process local files. Marking as failed.'
        );
        // Update notebook status to 'failed' since Edge Function cannot process local URIs
        supabase
          .from('notebooks')
          .update({ status: 'failed' })
          .eq('id', newNotebook.id)
          .then(() => {
            // Update local state
            set((state) => ({
              notebooks: state.notebooks.map((n) =>
                n.id === newNotebook.id ? { ...n, status: 'failed' as const } : n
              ),
            }));
          })
          .then(null, (updateError: any) => {
            console.error('Failed to update notebook status to failed:', updateError);
            // Still update local state even if database update fails
            set((state) => ({
              notebooks: state.notebooks.map((n) =>
                n.id === newNotebook.id ? { ...n, status: 'failed' as const } : n
              ),
            }));
          });
      } else if (material.id) {
        // Trigger Edge Function asynchronously (don't await - let it process in background)
        // Only trigger if we have a valid storage path (not local URI) or it's a text upload

        // Create timeout promise (60 seconds)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Edge Function request timed out after 60s')), 60000)
        );

        // Race between Edge Function invocation and timeout
        Promise.race([
          supabase.functions.invoke('process-material', {
            body: { material_id: material.id },
          }),
          timeoutPromise,
        ])
          .then((result: any) => {
            const { data, error } = result;
            if (error) {
              console.error('Failed to trigger Edge Function:', error);
              // Update notebook status to 'failed' if Edge Function fails to start
              supabase
                .from('notebooks')
                .update({ status: 'failed' })
                .eq('id', newNotebook.id)
                .then(() => {
                  // Update local state
                  set((state) => ({
                    notebooks: state.notebooks.map((n) =>
                      n.id === newNotebook.id ? { ...n, status: 'failed' as const } : n
                    ),
                  }));
                })
                .then(null, (updateError: any) => {
                  console.error('Failed to update notebook status to failed:', updateError);
                  // Still update local state even if database update fails
                  set((state) => ({
                    notebooks: state.notebooks.map((n) =>
                      n.id === newNotebook.id ? { ...n, status: 'failed' as const } : n
                    ),
                  }));
                });
            } else {
              console.log('Edge Function triggered successfully:', data);
            }
          })
          .catch((err) => {
            // Check if this is a timeout or network error
            const isTimeout = err.message?.includes('timed out');
            const isNetworkError = err.message?.includes('fetch') || err.message?.includes('network');

            if (isTimeout) {
              console.error('Edge Function request timed out (will retry on app foreground):', err);
              // Don't mark as failed - will be retried when app returns to foreground
            } else if (isNetworkError) {
              console.error('Network error invoking Edge Function (will retry on app foreground):', err);
              // Don't mark as failed - might be due to app backgrounding
            } else {
              console.error('Error invoking Edge Function:', err);
              // Permanent error, mark as failed
              supabase
                .from('notebooks')
                .update({ status: 'failed' })
                .eq('id', newNotebook.id)
                .then(() => {
                  set((state) => ({
                    notebooks: state.notebooks.map((n) =>
                      n.id === newNotebook.id ? { ...n, status: 'failed' as const } : n
                    ),
                  }));
                });
            }
          });
      }

      // Return the notebook ID for navigation
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
      // Step 1: Fetch notebook with material to get storage path
      const { data: notebook, error: fetchError } = await supabase
        .from('notebooks')
        .select(`
          *,
          materials (*)
        `)
        .eq('id', id)
        .eq('user_id', authUser.id)
        .single();

      if (fetchError) {
        console.error('Error fetching notebook for deletion:', fetchError);
        return;
      }

      if (!notebook) {
        console.error('Notebook not found');
        return;
      }

      const material = notebook.materials;

      // Step 2: Delete storage file if it exists
      if (material?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('uploads')
          .remove([material.storage_path]);

        if (storageError) {
          console.error('Error deleting storage file:', storageError);
          // Continue with deletion even if storage cleanup fails
        }
      }

      // Step 3: Delete material (this will cascade delete the notebook)
      // Foreign keys with CASCADE will automatically delete:
      // - notebooks (via notebooks.material_id -> materials.id CASCADE)
      // - notebook_shares (via notebook_shares.notebook_id -> notebooks.id CASCADE)
      // - flashcards (via flashcards.notebook_id -> notebooks.id CASCADE)
      // - embeddings (via embeddings.notebook_id -> notebooks.id CASCADE)
      // - suggested_actions (via suggested_actions.notebook_id -> notebooks.id CASCADE)
      // usage_logs will have notebook_id set to NULL (SET NULL)
      if (material?.id) {
        const { error: deleteError } = await supabase
          .from('materials')
          .delete()
          .eq('id', material.id)
          .eq('user_id', authUser.id);

        if (deleteError) {
          console.error('Error deleting material:', deleteError);
          return;
        }
      }

      // Step 4: Update local state
      set((state) => ({
        notebooks: state.notebooks.filter((n) => n.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting notebook:', error);
    }
  },

  updateNotebook: async (id, updates) => {
    const { authUser } = get();
    if (!authUser) return;

    try {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.flashcardCount !== undefined)
        updateData.flashcard_count = updates.flashcardCount;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.lastStudied !== undefined)
        updateData.last_studied = updates.lastStudied;
      if (updates.meta !== undefined) updateData.meta = updates.meta;

      const { error } = await supabase
        .from('notebooks')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', authUser.id);

      if (error) {
        console.error('Error updating notebook:', error);
        return;
      }

      // Update local state
      set((state) => ({
        notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      }));
    } catch (error) {
      console.error('Error updating notebook:', error);
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
