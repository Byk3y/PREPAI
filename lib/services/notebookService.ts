import { supabase } from '@/lib/supabase';
import { storageService } from '@/lib/storage/storageService';
import { getFilenameFromPath } from '@/lib/utils';
import type { Notebook, Material, ChatMessage } from '@/lib/store/types';
import { handleError } from '@/lib/errors';

// Simple UUID v4 generator for React Native environments
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export const notebookService = {
    fetchNotebooks: async (userId: string) => {
        const { data, error } = await supabase
            .from('notebooks')
            .select(`
                *,
                materials!materials_notebook_id_fkey (*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .order('created_at', { foreignTable: 'materials', ascending: false });

        if (error) {
            // Use centralized error handling
            const appError = await handleError(error, {
                operation: 'fetch_notebooks',
                component: 'notebook-service',
                userId,
                metadata: { userId }
            });
            throw appError;
        }

        // Transform Supabase data to Notebook format
        return (data || []).map((nb: any) => ({
            id: nb.id,
            title: nb.title,
            flashcardCount: nb.flashcard_count || 0,
            lastStudied: nb.last_studied,
            progress: nb.progress || 0,
            createdAt: nb.created_at,
            color: nb.color,
            emoji: (nb as any).emoji,
            status: nb.status as Notebook['status'],
            meta: nb.meta || {},
            materials: (nb.materials ? (Array.isArray(nb.materials) ? nb.materials : [nb.materials]) : []).map((m: any) => ({
                id: m.id,
                type: m.kind as Material['type'],
                uri: m.storage_path || m.external_url,
                filename: m.meta?.filename || getFilenameFromPath(m.storage_path),
                content: m.content,
                preview_text: m.preview_text,
                title: m.meta?.title || nb.title,
                createdAt: m.created_at,
                processed: !!m.processed,
                thumbnail: m.thumbnail,
                meta: m.meta,
            })),
        }));
    },

    createNotebook: async (
        userId: string,
        notebook: Omit<Notebook, 'id' | 'createdAt'> & {
            material?: Omit<Material, 'id' | 'createdAt'> & {
                fileUri?: string;
                filename?: string;
            };
        }
    ) => {
        try {
            // Generating a unique material ID manually for path predictability
            // Must be a valid UUID for the DB schema
            const materialId = uuidv4();

            // Step 1: Pre-calculate storage path if there's a file
            let storagePath: string | undefined;
            const isFileUpload = !!(notebook.material?.fileUri && notebook.material?.filename);

            if (isFileUpload) {
                // We use a predictable path so we can insert the record BEFORE uploading
                const sanitizedFilename = storageService.sanitizeFilename(notebook.material!.filename!);
                storagePath = `${userId}/${materialId}/${sanitizedFilename}`;
            }

            // Step 2: Create material record FIRST (Fast)
            const materialData: any = {
                id: materialId,
                user_id: userId,
                kind: notebook.material?.type || 'text',
                storage_path: storagePath,
                external_url: notebook.material?.uri?.startsWith('http')
                    ? notebook.material.uri
                    : null,
                content: isFileUpload ? null : notebook.material?.content,
                preview_text: null,
                processed: false,
                processed_at: null,
            };

            const { data: material, error: materialError } = await supabase
                .from('materials')
                .insert(materialData)
                .select()
                .single();

            if (materialError) {
                throw materialError;
            }

            // Step 3: Create notebook record (Fast)
            const notebookData: any = {
                user_id: userId,
                material_id: material.id,
                title: notebook.title,
                color: notebook.color,
                status: 'extracting',
                meta: {},
                flashcard_count: notebook.flashcardCount || 0,
                progress: notebook.progress || 0,
            };

            const { data: newNotebook, error: notebookError } = await supabase
                .from('notebooks')
                .insert(notebookData)
                .select(`
                    *,
                    materials!materials_notebook_id_fkey (*)
                `)
                .single();

            if (notebookError) {
                throw notebookError;
            }

            // Step 4: Link material to notebook (Fast)
            await supabase
                .from('materials')
                .update({ notebook_id: newNotebook.id })
                .eq('id', material.id);

            // Step 5: Optimization - Return early so UI can navigate
            // The caller (Store/Hook) will handle the background upload and processing.
            return {
                newNotebook,
                material,
                isFileUpload,
                storagePath,
                // Pass the original file info for the background upload task
                fileUri: notebook.material?.fileUri,
                filename: notebook.material?.filename
            };
        } catch (error) {
            const appError = await handleError(error, {
                operation: 'create_notebook',
                component: 'notebook-service',
                userId,
                metadata: { notebookTitle: notebook.title, userId }
            });
            throw appError;
        }
    },

    addMaterialToNotebook: async (
        userId: string,
        notebookId: string,
        material: Omit<Material, 'id' | 'createdAt'> & {
            fileUri?: string;
            filename?: string;
        }
    ) => {
        try {
            // Generating a unique material ID manually for path predictability
            // Must be a valid UUID for the DB schema
            const materialId = uuidv4();

            // Step 1: Pre-calculate storage path if there's a file
            let storagePath: string | undefined;
            const isFileUpload = !!(material.fileUri && material.filename);

            if (isFileUpload) {
                // We use a predictable path so we can insert the record BEFORE uploading
                const sanitizedFilename = storageService.sanitizeFilename(material.filename!);
                storagePath = `${userId}/${materialId}/${sanitizedFilename}`;
            }

            // Step 2: Create material record (Fast)
            const materialData: any = {
                id: materialId,
                user_id: userId,
                notebook_id: notebookId,
                kind: material.type || 'text',
                storage_path: storagePath,
                external_url: material.uri?.startsWith('http')
                    ? material.uri
                    : null,
                content: isFileUpload ? null : material.content,
                preview_text: null,
                processed: false,
                processed_at: null,
                meta: {
                    title: material.title || material.filename || 'Source',
                    filename: material.filename
                }
            };

            const { data: newMaterial, error: materialError } = await supabase
                .from('materials')
                .insert(materialData)
                .select()
                .single();

            if (materialError) {
                throw materialError;
            }

            // Step 3: Update notebook status to extracting since new content is being added
            await supabase
                .from('notebooks')
                .update({ status: 'extracting' })
                .eq('id', notebookId);

            // Step 4: Return for instant UI update
            return {
                newMaterial,
                isFileUpload,
                storagePath,
                // Original file data for background task
                fileUri: material.fileUri,
                filename: material.filename
            };
        } catch (error) {
            const appError = await handleError(error, {
                operation: 'add_material_to_notebook',
                component: 'notebook-service',
                userId,
                metadata: { notebookId, userId }
            });
            throw appError;
        }
    },

    triggerProcessing: async (
        notebookId: string,
        materialId: string,
        isFileUpload: boolean,
        storagePath?: string,
        userId?: string
    ) => {
        // Check if file upload failed and fell back to local URI
        if (isFileUpload && storagePath && storagePath.startsWith('file://')) {
            console.warn(
                'File upload failed, using local URI. Edge Function cannot process local files. Marking as failed.'
            );
            await supabase
                .from('notebooks')
                .update({ status: 'failed' })
                .eq('id', notebookId);
            return { status: 'failed' };
        }

        if (materialId) {
            // Trigger Edge Function asynchronously
            // Create timeout promise (60 seconds)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Edge Function request timed out after 120s')), 120000)
            );

            // Race between Edge Function invocation and timeout
            try {
                const result: any = await Promise.race([
                    supabase.functions.invoke('process-material', {
                        body: { material_id: materialId },
                    }),
                    timeoutPromise,
                ]);

                const { data, error } = result;
                if (error) {
                    await handleError(error, {
                        operation: 'trigger_processing',
                        component: 'notebook-service',
                        userId,
                        metadata: { notebookId, materialId }
                    });
                    await supabase
                        .from('notebooks')
                        .update({ status: 'failed' })
                        .eq('id', notebookId);
                    return { status: 'failed', error };
                } else {
                    console.log('Edge Function triggered successfully:', data);

                    // Check if this is a background processing response
                    if (data?.background_processing && data?.job_id) {
                        console.log('Large PDF queued for background processing:', data.job_id);
                        return {
                            status: 'background_processing',
                            data,
                            jobId: data.job_id,
                            estimatedPages: data.estimated_pages,
                        };
                    }

                    return { status: 'success', data };
                }

            } catch (err: any) {
                // Check if this is a timeout or network error
                const isTimeout = err.message?.includes('timed out');
                const isNetworkError = err.message?.includes('fetch') || err.message?.includes('network');

                if (isTimeout) {
                    await handleError(err, {
                        operation: 'trigger_processing_timeout',
                        component: 'notebook-service',
                        userId,
                        metadata: { notebookId, materialId, errorType: 'timeout', timeout: '120s' }
                    });
                    // After 120s of no response, something is wrong. Mark as failed so user can retry.
                    await supabase
                        .from('notebooks')
                        .update({ status: 'failed' })
                        .eq('id', notebookId);
                    return { status: 'failed', error: err };
                } else if (isNetworkError) {
                    // Network errors during backgrounding are common and often false positives:
                    // - The request might have reached the server successfully
                    // - The response fetch was interrupted by app backgrounding
                    // - Realtime will push the actual status if it succeeded
                    // - AppState monitoring will retry if it truly failed
                    console.warn('[NotebookService] Network error during edge function trigger (likely app backgrounded):', err.message);
                    console.warn('[NotebookService] Relying on Realtime sync to get actual processing status');

                    // Don't mark as failed - let Realtime/AppState monitoring determine actual status
                    return { status: 'network_interrupted', error: err };
                } else {
                    await handleError(err, {
                        operation: 'trigger_processing_error',
                        component: 'notebook-service',
                        userId,
                        metadata: { notebookId, materialId, errorType: 'permanent' }
                    });
                    // Permanent error, mark as failed
                    await supabase
                        .from('notebooks')
                        .update({ status: 'failed' })
                        .eq('id', notebookId);
                    return { status: 'failed', error: err };
                }
            }
        }
        return { status: 'pending' };
    },

    deleteNotebook: async (userId: string, notebookId: string) => {
        try {
            // Step 1: Fetch notebook with material to get storage path
            const { data: notebook, error: fetchError } = await supabase
                .from('notebooks')
                .select(`
          *,
          materials!materials_notebook_id_fkey (*)
        `)
                .eq('id', notebookId)
                .eq('user_id', userId)
                .single();

            if (fetchError || !notebook) {
                await handleError(fetchError || new Error('Notebook not found'), {
                    operation: 'delete_notebook_fetch',
                    component: 'notebook-service',
                    userId,
                    metadata: { notebookId, userId }
                });
                return;
            }

            const materials = notebook.materials as any;
            const material = Array.isArray(materials) ? materials[0] : materials;

            // Step 2: Delete storage file if it exists
            if (material?.storage_path) {
                const { error } = await storageService.deleteFile(material.storage_path);
                if (error) {
                    // Error already handled by storageService
                }
            }

            // Step 3: Delete material (cascades)
            if (material?.id) {
                const { error: deleteError } = await supabase
                    .from('materials')
                    .delete()
                    .eq('id', material.id)
                    .eq('user_id', userId);

                if (deleteError) {
                    await handleError(deleteError, {
                        operation: 'delete_notebook_material',
                        component: 'notebook-service',
                        userId,
                        metadata: { notebookId, materialId: material?.id }
                    });
                    return;
                }
            }
        } catch (error) {
            const appError = await handleError(error, {
                operation: 'delete_notebook',
                component: 'notebook-service',
                userId,
                metadata: { notebookId, userId }
            });
            throw appError;
        }
    },

    updateNotebook: async (userId: string, notebookId: string, updates: Partial<Notebook>) => {
        try {
            const updateData: any = {};
            if (updates.title !== undefined) updateData.title = updates.title;
            if (updates.emoji !== undefined) updateData.emoji = updates.emoji;
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
                .eq('id', notebookId)
                .eq('user_id', userId);

            if (error) {
                const appError = await handleError(error, {
                    operation: 'update_notebook',
                    component: 'notebook-service',
                    userId,
                    metadata: { notebookId, updates }
                });
                throw appError;
            }
        } catch (error) {
            const appError = await handleError(error, {
                operation: 'update_notebook',
                component: 'notebook-service',
                userId,
                metadata: { notebookId, updates }
            });
            throw appError;
        }
    },

    /**
     * Get a single notebook by ID with materials
     * @param notebookId - The notebook's ID
     * @returns Notebook with materials or null if not found
     */
    getNotebookById: async (notebookId: string): Promise<Notebook | null> => {
        try {
            const { data, error } = await supabase
                .from('notebooks')
                .select(`
          *,
          materials!materials_notebook_id_fkey (*)
        `)
                .eq('id', notebookId)
                .order('created_at', { foreignTable: 'materials', ascending: false })
                .single();

            if (error) {
                await handleError(error, {
                    operation: 'get_notebook_by_id',
                    component: 'notebook-service',
                    metadata: { notebookId },
                });
                return null;
            }

            if (!data) {
                return null;
            }

            const materialsArr = data.materials
                ? (Array.isArray(data.materials) ? data.materials : [data.materials])
                : [];
            const materialObj = materialsArr[0];

            // Transform Supabase data to Notebook format
            return {
                id: data.id,
                title: data.title,
                emoji: (data as any).emoji,
                flashcardCount: (data as any).flashcard_count || 0,
                lastStudied: (data as any).last_studied || undefined,
                progress: (data as any).progress || 0,
                createdAt: data.created_at || new Date().toISOString(),
                color: (data as any).color as Notebook['color'],
                status: data.status as Notebook['status'],
                meta: (data.meta as any) || {},
                materials: materialsArr.map((m: any) => ({
                    id: m.id,
                    type: m.kind as Material['type'],
                    uri: m.storage_path || m.external_url || undefined,
                    filename: m.meta?.filename || getFilenameFromPath(m.storage_path || undefined),
                    content: m.content || undefined,
                    preview_text: m.preview_text || undefined,
                    title: m.meta?.title || data.title,
                    createdAt: m.created_at || new Date().toISOString(),
                    processed: !!m.processed,
                    thumbnail: m.thumbnail || undefined,
                    meta: m.meta,
                })),
            };
        } catch (error) {
            await handleError(error, {
                operation: 'get_notebook_by_id',
                component: 'notebook-service',
                metadata: { notebookId },
            });
            return null;
        }
    },

    /**
     * Get a single notebook by ID
     * @param notebookId - The notebook's ID
     * @returns Notebook title or null if not found
     */
    getNotebookTitle: async (notebookId: string): Promise<string | null> => {
        try {
            const { data, error } = await supabase
                .from('notebooks')
                .select('title')
                .eq('id', notebookId)
                .single();

            if (error) {
                await handleError(error, {
                    operation: 'get_notebook_title',
                    component: 'notebook-service',
                    metadata: { notebookId },
                });
                return null;
            }

            return data?.title || null;
        } catch (error) {
            await handleError(error, {
                operation: 'get_notebook_title',
                component: 'notebook-service',
                metadata: { notebookId },
            });
            return null;
        }
    },

    /**
     * Fetch chat messages for a notebook
     */
    fetchChatMessages: async (notebookId: string): Promise<ChatMessage[]> => {
        try {
            const { data, error } = await supabase
                .from('notebook_chat_messages')
                .select('*')
                .eq('notebook_id', notebookId)
                .order('created_at', { ascending: true });

            if (error) {
                await handleError(error, {
                    operation: 'fetch_chat_messages',
                    component: 'notebook-service',
                    metadata: { notebookId },
                });
                return [];
            }

            return (data || []).map(msg => ({
                ...msg,
                role: msg.role as 'user' | 'assistant',
                sources: Array.isArray(msg.sources) ? msg.sources : [],
            })) as ChatMessage[];
        } catch (error) {
            await handleError(error, {
                operation: 'fetch_chat_messages',
                component: 'notebook-service',
                metadata: { notebookId },
            });
            return [];
        }
    },

    /**
     * Perform the heavy lifting (Upload + Processing) in the background.
     * This should NOT be awaited by the UI.
     */
    performBackgroundUploadAndProcessing: async (
        userId: string,
        notebookId: string,
        materialId: string,
        isFileUpload: boolean,
        fileUri?: string,
        filename?: string,
        storagePath?: string
    ) => {
        try {
            // Step 1: Handle Upload if necessary
            if (isFileUpload && fileUri && filename) {
                console.log(`[NotebookService] Background upload starting for ${materialId}`);
                const uploadResult = await storageService.uploadMaterialFile(
                    userId,
                    materialId,
                    fileUri,
                    filename
                );

                if (uploadResult.error) {
                    console.error('[NotebookService] Background upload failed:', uploadResult.error);
                    await supabase.from('notebooks').update({ status: 'failed' }).eq('id', notebookId);
                    return { status: 'failed', error: uploadResult.error };
                }

                console.log(`[NotebookService] Background upload complete for ${materialId}. Storage path: ${uploadResult.storagePath}`);

                // Ensure storagePath matches what we pre-calculated
                if (uploadResult.storagePath !== storagePath) {
                    console.warn(`[NotebookService] Storage path mismatch! Expected ${storagePath}, got ${uploadResult.storagePath}`);
                }
            }

            // Step 2: Trigger Edge Function
            console.log(`[NotebookService] Triggering Edge Function 'process-material' for ${materialId}`);
            const triggerResult = await notebookService.triggerProcessing(
                notebookId,
                materialId,
                isFileUpload,
                storagePath,
                userId
            );
            console.log(`[NotebookService] Edge Function trigger result for ${materialId}:`, triggerResult?.status);
            return triggerResult;
        } catch (error) {
            console.error('[NotebookService] Background processing fatal error:', error);
            await supabase.from('notebooks').update({ status: 'failed' }).eq('id', notebookId);
            return { status: 'failed', error };
        }
    },
};
