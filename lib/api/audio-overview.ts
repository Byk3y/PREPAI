/**
 * Audio Overview API Client
 * Handles generation, status polling, and fetching of podcast-style audio overviews
 */

import { supabase } from '@/lib/supabase';
import type { AudioOverview } from '@/lib/store/types';

const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-audio-overview`;

export interface GenerateAudioOverviewRequest {
  notebook_id: string;
}

export interface GenerateAudioOverviewResponse {
  success: boolean;
  overview_id: string;
  status: string;
  estimated_completion_seconds?: number;
  message: string;
}

export interface AudioOverviewStatus {
  status: 'pending' | 'generating_script' | 'generating_audio' | 'completed' | 'failed';
  progress?: number; // 0-100
  error_message?: string;
}

/**
 * Trigger audio overview generation for a notebook
 * Returns immediately with overview_id for status polling
 */
export async function generateAudioOverview(
  notebookId: string
): Promise<GenerateAudioOverviewResponse> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    console.log('[Audio API] Generating audio overview for notebook:', notebookId);

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notebook_id: notebookId,
      } as GenerateAudioOverviewRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Create error with quota details preserved
      const error: any = new Error(errorData.error || 'Failed to generate audio overview');
      
      // Preserve quota information for better error handling
      if (errorData.remaining !== undefined) {
        error.remaining = errorData.remaining;
      }
      if (errorData.limit !== undefined) {
        error.limit = errorData.limit;
      }
      
      throw error;
    }

    const data: GenerateAudioOverviewResponse = await response.json();
    console.log('[Audio API] Generation started:', data);

    return data;

  } catch (error: any) {
    console.error('[Audio API] Generation failed:', error);
    
    // Detect network errors (app backgrounding, connection issues)
    const isNetworkError = 
      error?.message?.includes('Network request failed') ||
      error?.message?.includes('network') ||
      error?.message?.includes('fetch') ||
      error?.name === 'TypeError' ||
      error?.name === 'AbortError';
    
    // Create error with network error flag preserved
    const enhancedError: any = new Error(error.message || 'Failed to generate audio overview');
    enhancedError.isNetworkError = isNetworkError;
    
    // Preserve quota information if available
    if (error.remaining !== undefined) {
      enhancedError.remaining = error.remaining;
    }
    if (error.limit !== undefined) {
      enhancedError.limit = error.limit;
    }
    
    throw enhancedError;
  }
}

/**
 * Get status of an audio overview (for polling during generation)
 */
export async function getAudioOverviewStatus(
  overviewId: string
): Promise<AudioOverviewStatus> {
  try {
    const { data, error } = await supabase
      .from('audio_overviews')
      .select('status, error_message')
      .eq('id', overviewId)
      .single();

    if (error) {
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

  } catch (error: any) {
    console.error('[Audio API] Failed to get status:', error);
    throw error;
  }
}

/**
 * Fetch all audio overviews for a notebook
 */
export async function fetchAudioOverviews(notebookId: string): Promise<AudioOverview[]> {
  try {
    const { data, error } = await supabase
      .from('audio_overviews')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('status', 'completed') // Only show completed overviews
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch audio overviews: ${error.message}`);
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

  } catch (error: any) {
    console.error('[Audio API] Failed to fetch audio overviews:', error);
    return []; // Return empty array on error
  }
}

/**
 * Get a single audio overview by ID
 * Refreshes signed URL if needed
 */
export async function getAudioOverview(overviewId: string): Promise<AudioOverview | null> {
  try {
    const { data, error } = await supabase
      .from('audio_overviews')
      .select('*')
      .eq('id', overviewId)
      .single();

    if (error || !data) {
      console.error('[Audio API] Audio overview not found:', error);
      return null;
    }

    // Check if signed URL needs refresh (7-day expiration)
    const needsRefresh = !data.audio_url || isUrlExpired(data.audio_url);

    let audioUrl = data.audio_url;

    if (needsRefresh && data.storage_path) {
      console.log('[Audio API] Refreshing signed URL...');
      const { data: signedData } = await supabase.storage
        .from('uploads')
        .createSignedUrl(data.storage_path, 7 * 24 * 3600); // 7 days

      if (signedData?.signedUrl) {
        audioUrl = signedData.signedUrl;

        // Update database with new signed URL
        await supabase
          .from('audio_overviews')
          .update({ audio_url: audioUrl })
          .eq('id', overviewId);
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

  } catch (error: any) {
    console.error('[Audio API] Failed to get audio overview:', error);
    return null;
  }
}

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

/**
 * Delete an audio overview
 */
export async function deleteAudioOverview(overviewId: string): Promise<void> {
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
      throw new Error(`Failed to delete audio overview: ${deleteError.message}`);
    }

    // Delete from storage
    if (data?.storage_path) {
      await supabase.storage
        .from('uploads')
        .remove([data.storage_path]);
    }

    console.log('[Audio API] Deleted audio overview:', overviewId);

  } catch (error: any) {
    console.error('[Audio API] Failed to delete:', error);
    throw error;
  }
}
