/**
 * Hook for tracking background PDF processing status
 * Uses Supabase Realtime to subscribe to processing queue updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type ProcessingQueueRow = Database['public']['Tables']['processing_queue']['Row'];
type JobStatus = Database['public']['Enums']['processing_job_status'];

export interface ProcessingJobStatus {
    id: string;
    status: JobStatus;
    progress: number;
    progressMessage: string | null;
    estimatedPages: number | null;
    processedPages: number | null;
    errorMessage: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
}

interface UseBackgroundProcessingOptions {
    notebookId?: string;
    materialId?: string;
    jobId?: string;
    onComplete?: (result: any) => void;
    onError?: (error: string) => void;
    onProgress?: (progress: number, message: string) => void;
}

// Helper to convert DB row to ProcessingJobStatus
function toJobStatus(data: ProcessingQueueRow): ProcessingJobStatus {
    return {
        id: data.id,
        status: data.status,
        progress: data.progress,
        progressMessage: data.progress_message,
        estimatedPages: data.estimated_pages,
        processedPages: data.processed_pages,
        errorMessage: data.error_message,
        createdAt: data.created_at,
        startedAt: data.started_at,
        completedAt: data.completed_at,
    };
}

export function useBackgroundProcessing(options: UseBackgroundProcessingOptions) {
    const { notebookId, materialId, jobId, onComplete, onError, onProgress } = options;

    const [job, setJob] = useState<ProcessingJobStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch current job status
    const fetchJobStatus = useCallback(async () => {
        try {
            let query = supabase.from('processing_queue').select('*');

            if (jobId) {
                query = query.eq('id', jobId);
            } else if (notebookId) {
                query = query.eq('notebook_id', notebookId);
            } else if (materialId) {
                query = query.eq('material_id', materialId);
            } else {
                setIsLoading(false);
                return;
            }

            const { data, error: fetchError } = await query
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchError) {
                console.error('[useBackgroundProcessing] Fetch error:', fetchError);
                setError(fetchError.message);
                setIsLoading(false);
                return;
            }

            if (data) {
                const jobStatus = toJobStatus(data);
                setJob(jobStatus);

                // Trigger callbacks based on status
                if (jobStatus.status === 'completed' && onComplete) {
                    onComplete(data.result);
                } else if (jobStatus.status === 'failed' && onError) {
                    onError(jobStatus.errorMessage || 'Processing failed');
                }
            }

            setIsLoading(false);
        } catch (err: any) {
            console.error('[useBackgroundProcessing] Error:', err);
            setError(err.message);
            setIsLoading(false);
        }
    }, [jobId, notebookId, materialId, onComplete, onError]);

    // Set up realtime subscription
    useEffect(() => {
        if (!jobId && !notebookId && !materialId) return;

        let channel: RealtimeChannel | null = null;

        const setupSubscription = async () => {
            // Initial fetch
            await fetchJobStatus();

            // Build filter for realtime subscription
            let filterString = '';
            if (jobId) {
                filterString = `id=eq.${jobId}`;
            } else if (notebookId) {
                filterString = `notebook_id=eq.${notebookId}`;
            } else if (materialId) {
                filterString = `material_id=eq.${materialId}`;
            }

            // Subscribe to changes
            channel = supabase
                .channel(`processing_queue:${jobId || notebookId || materialId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'processing_queue',
                        filter: filterString,
                    },
                    (payload) => {
                        console.log('[useBackgroundProcessing] Realtime update:', payload);

                        if (payload.new) {
                            const data = payload.new as ProcessingQueueRow;
                            const jobStatus = toJobStatus(data);

                            setJob(jobStatus);

                            // Trigger progress callback
                            if (onProgress && jobStatus.status === 'processing') {
                                onProgress(jobStatus.progress, jobStatus.progressMessage || '');
                            }

                            // Trigger completion/error callbacks
                            if (jobStatus.status === 'completed' && onComplete) {
                                onComplete(data.result);
                            } else if (jobStatus.status === 'failed' && onError) {
                                onError(jobStatus.errorMessage || 'Processing failed');
                            }
                        }
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [jobId, notebookId, materialId, fetchJobStatus, onComplete, onError, onProgress]);

    // Cancel job
    const cancelJob = useCallback(async () => {
        if (!job?.id) return;

        try {
            const { error: cancelError } = await supabase
                .from('processing_queue')
                .update({ status: 'cancelled', completed_at: new Date().toISOString() })
                .eq('id', job.id)
                .eq('status', 'pending'); // Can only cancel pending jobs

            if (cancelError) {
                console.error('[useBackgroundProcessing] Cancel error:', cancelError);
                return false;
            }

            setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
            return true;
        } catch (err: any) {
            console.error('[useBackgroundProcessing] Cancel error:', err);
            return false;
        }
    }, [job?.id]);

    // Retry failed job
    const retryJob = useCallback(async () => {
        if (!job?.id || job.status !== 'failed') return;

        try {
            const { error: retryError } = await supabase
                .from('processing_queue')
                .update({
                    status: 'pending',
                    error_message: null,
                    error_details: null,
                    next_retry_at: null,
                })
                .eq('id', job.id);

            if (retryError) {
                console.error('[useBackgroundProcessing] Retry error:', retryError);
                return false;
            }

            // Trigger background worker
            await supabase.functions.invoke('process-large-pdf', {
                body: { job_id: job.id },
            });

            setJob((prev) => (prev ? { ...prev, status: 'pending', progress: 0 } : null));
            return true;
        } catch (err: any) {
            console.error('[useBackgroundProcessing] Retry error:', err);
            return false;
        }
    }, [job?.id, job?.status]);

    return {
        job,
        isLoading,
        error,
        cancelJob,
        retryJob,
        refetch: fetchJobStatus,
        isProcessing: job?.status === 'processing' || job?.status === 'pending',
        isComplete: job?.status === 'completed',
        isFailed: job?.status === 'failed',
    };
}

/**
 * Helper to check if a material is being processed in background
 */
export async function getBackgroundProcessingStatus(
    notebookId: string
): Promise<ProcessingJobStatus | null> {
    const { data, error } = await supabase
        .from('processing_queue')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    return toJobStatus(data);
}
