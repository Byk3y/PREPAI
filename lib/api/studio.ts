/**
 * Studio API Client
 * Handles communication with the generate-studio-content Edge Function
 */

import { supabase } from '../supabase';

export interface GenerateStudioContentRequest {
  notebook_id: string;
  content_type: 'flashcards' | 'quiz';
}

export interface GenerateStudioContentResponse {
  success: boolean;
  notebook_id: string;
  content_type: string;
  generated_count: number;
  content_id?: string; // quiz_id for quizzes
  message: string;
}

export interface StudioError {
  error: string;
  remaining?: number;
  limit?: number;
}

/**
 * Generate studio content (flashcards or quiz) for a notebook
 *
 * @param request - Generation request parameters
 * @returns Response with generated count and IDs
 * @throws Error if generation fails
 */
export async function generateStudioContent(
  request: GenerateStudioContentRequest
): Promise<GenerateStudioContentResponse> {
  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error('Not authenticated. Please sign in to generate content.');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  // Call Edge Function
  const response = await fetch(
    `${supabaseUrl}/functions/v1/generate-studio-content`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorData: StudioError = await response.json();

    // Create error with quota details preserved
    const error: any = new Error(errorData.error || `Failed to generate ${request.content_type}`);
    
    // Preserve quota information for better error handling
    if (errorData.remaining !== undefined) {
      error.remaining = errorData.remaining;
    }
    if (errorData.limit !== undefined) {
      error.limit = errorData.limit;
    }
    
    throw error;
  }

  const data: GenerateStudioContentResponse = await response.json();
  return data;
}

export interface FlashcardProgress {
  notebook_id: string;
  last_flashcard_id: string | null;
  last_index: number;
  updated_at: string;
}

/**
 * Fetch the user's last viewed flashcard for a notebook.
 * Returns null when unauthenticated or no progress exists.
 */
export async function fetchFlashcardProgress(
  notebookId: string
): Promise<FlashcardProgress | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  const { data, error, status } = await supabase
    .from('user_flashcard_progress')
    .select('notebook_id,last_flashcard_id,last_index,updated_at')
    .eq('user_id', user.id)
    .eq('notebook_id', notebookId)
    .maybeSingle();

  // MaybeSingle returns 406 when no rows; treat as null
  if (status === 406 || (error && error.code === 'PGRST116')) {
    return null;
  }
  if (error) throw error;
  return data as FlashcardProgress | null;
}

/**
 * Upsert the user's flashcard progress for a notebook.
 * No-op for unauthenticated users.
 */
export async function upsertFlashcardProgress(params: {
  notebookId: string;
  lastFlashcardId: string | null;
  lastIndex: number;
}): Promise<FlashcardProgress | null> {
  const { notebookId, lastFlashcardId, lastIndex } = params;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_flashcard_progress')
    .upsert({
      user_id: user.id,
      notebook_id: notebookId,
      last_flashcard_id: lastFlashcardId,
      last_index: lastIndex,
    }, { onConflict: 'user_id,notebook_id' })
    .select('notebook_id,last_flashcard_id,last_index,updated_at')
    .single();

  if (error) throw error;
  return data as FlashcardProgress;
}
