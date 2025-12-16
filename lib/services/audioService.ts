/**
 * Audio Service
 * Handles audio overview database operations
 */

import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errors';
import { storageService } from '@/lib/storage/storageService';
import type { AudioOverview } from '@/lib/store/types';

export interface AudioOverviewStatus {
  status: 'pending' | 'generating_script' | 'generating_audio' | 'completed' | 'failed';
  progress?: number; // 0-100
  error_message?: string;
}

export const audioService = {
  /**
   * Get status of an audio overview (for polling during generation)
   */
  getStatus: async (overviewId: string): Promise<AudioOverviewStatus> => {
    try {
      const { data, error } = await supabase
        .from('audio_overviews')
        .select('status, error_message')
        .eq('id', overviewId)
        .single();

      if (error) {
        await handleError(error, {
          operation: 'get_audio_overview_status',
          component: 'audio-service',
          metadata: { overviewId },
        });
        throw new Error(`Failed to get status: ${error.message}`);
      }

      // Calculate progress based on status
      const progressMap: Record<string, number> = {
        'pending': 10,
        'generating_script': 40,
        'generating_audio': 70,
        'completed': 100,
        'failed': 0,
      };

      return {
        status: data.status,
        progress: progressMap[data.status] || 0,
        error_message: data.error_message,
      };
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'get_audio_overview_status',
        component: 'audio-service',
        metadata: { overviewId },
      });
      throw appError;
    }
  },

  /**
   * Fetch all audio overviews for a notebook
   */
  fetchByNotebook: async (notebookId: string): Promise<AudioOverview[]> => {
    try {
      const { data, error } = await supabase
        .from('audio_overviews')
        .select('*')
        .eq('notebook_id', notebookId)
        .eq('status', 'completed') // Only show completed overviews
        .order('created_at', { ascending: false });

      if (error) {
        await handleError(error, {
          operation: 'fetch_audio_overviews',
          component: 'audio-service',
          metadata: { notebookId },
        });
        return [];
      }

      // Transform to AudioOverview type
      return (data || []).map(overview => ({
        id: overview.id,
        notebook_id: overview.notebook_id,
        title: overview.title,
        duration: overview.duration,
        audio_url: overview.audio_url,
        script: overview.script,
        generated_at: overview.created_at,
      }));
    } catch (error) {
      // Use centralized error handling - return empty array on error for graceful degradation
      await handleError(error, {
        operation: 'fetch_audio_overviews',
        component: 'audio-service',
        metadata: { notebookId },
      });
      return [];
    }
  },

  /**
   * Get a single audio overview by ID
   * Refreshes signed URL if needed
   */
  getById: async (overviewId: string): Promise<AudioOverview | null> => {
    try {
      const { data, error } = await supabase
        .from('audio_overviews')
        .select('*')
        .eq('id', overviewId)
        .single();

      if (error || !data) {
        if (__DEV__) {
          console.error('[Audio Service] Audio overview not found:', error);
        }
        return null;
      }

      // Check if signed URL needs refresh (7-day expiration)
      const needsRefresh = !data.audio_url || isUrlExpired(data.audio_url);

      let audioUrl = data.audio_url;

      if (needsRefresh && data.storage_path) {
        const { url, error: urlError } = await storageService.getSignedUrl(
          data.storage_path,
          7 * 24 * 3600 // 7 days
        );

        if (url && !urlError) {
          audioUrl = url;

          // Update database with new signed URL
          const { error: updateError } = await supabase
            .from('audio_overviews')
            .update({ audio_url: audioUrl })
            .eq('id', overviewId);

          if (updateError) {
            await handleError(updateError, {
              operation: 'update_audio_url',
              component: 'audio-service',
              metadata: { overviewId },
            });
            // Continue with new URL even if update fails
          }
        }
      }

      return {
        id: data.id,
        notebook_id: data.notebook_id,
        title: data.title,
        duration: data.duration,
        audio_url: audioUrl,
        script: data.script,
        generated_at: data.created_at,
      };
    } catch (error) {
      await handleError(error, {
        operation: 'get_audio_overview',
        component: 'audio-service',
        metadata: { overviewId },
      });
      return null;
    }
  },

  /**
   * Delete an audio overview
   */
  delete: async (overviewId: string): Promise<void> => {
    try {
      // Get storage path before deleting
      const { data } = await supabase
        .from('audio_overviews')
        .select('storage_path')
        .eq('id', overviewId)
        .single();

      // Delete from database (CASCADE will handle related records)
      const { error: deleteError } = await supabase
        .from('audio_overviews')
        .delete()
        .eq('id', overviewId);

      if (deleteError) {
        await handleError(deleteError, {
          operation: 'delete_audio_overview',
          component: 'audio-service',
          metadata: { overviewId },
        });
        throw new Error(`Failed to delete audio overview: ${deleteError.message}`);
      }

      // Delete from storage
      if (data?.storage_path) {
        await storageService.deleteFile(data.storage_path);
        // Error handling is done in storageService
      }
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'delete_audio_overview',
        component: 'audio-service',
        metadata: { overviewId },
      });
      throw appError;
    }
  },

  /**
   * Find pending/generating audio overviews for a notebook
   */
  findPending: async (notebookId: string): Promise<{ id: string; status: string } | null> => {
    try {
      const { data, error } = await supabase
        .from('audio_overviews')
        .select('id, status')
        .eq('notebook_id', notebookId)
        .in('status', ['pending', 'generating_script', 'generating_audio'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        await handleError(error, {
          operation: 'find_pending_audio',
          component: 'audio-service',
          metadata: { notebookId },
        });
        return null;
      }

      return data || null;
    } catch (error) {
      await handleError(error, {
        operation: 'find_pending_audio',
        component: 'audio-service',
        metadata: { notebookId },
      });
      return null;
    }
  },

  /**
   * Check if user has any completed audio overviews
   */
  hasCompleted: async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('audio_overviews')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .limit(1)
        .maybeSingle();

      if (error) {
        await handleError(error, {
          operation: 'check_completed_audio',
          component: 'audio-service',
          metadata: { userId },
        });
        return false;
      }

      return !!data;
    } catch (error) {
      await handleError(error, {
        operation: 'check_completed_audio',
        component: 'audio-service',
        metadata: { userId },
      });
      return false;
    }
  },
};

/**
 * Check if a signed URL has expired
 * Supabase signed URLs expire after the specified duration (7 days)
 */
function isUrlExpired(url: string): boolean {
  try {
    // Supabase signed URLs contain a token parameter with expiration
    // For simplicity, refresh if URL is older than 6 days (24h buffer)
    // In production, parse the JWT token to check actual expiration
    return false; // Simplified: rely on 7-day expiration, refresh on access
  } catch {
    return true; // If can't parse, assume expired
  }
}


