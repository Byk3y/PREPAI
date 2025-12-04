/**
 * File Upload Utilities
 * Handles uploading files to Supabase Storage
 */

import { supabase } from './supabase';

export interface UploadResult {
  storagePath: string;
  error?: string;
}

/**
 * Upload a material file to Supabase Storage
 * @param userId - The user's ID
 * @param materialId - The material's ID
 * @param fileUri - Local file URI (from expo-image-picker or expo-document-picker)
 * @param filename - The filename to use in storage
 * @returns Storage path or error
 */
export async function uploadMaterialFile(
  userId: string,
  materialId: string,
  fileUri: string,
  filename: string
): Promise<UploadResult> {
  try {
    // Storage path: uploads/{user_id}/{material_id}/{filename}
    const storagePath = `${userId}/${materialId}/${filename}`;

    // For React Native, use FormData with file URI
    const mimeType = getContentType(filename);
    
    // Create FormData for React Native
    const formData = new FormData();
    // @ts-ignore - React Native FormData format
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: filename,
    });

    // Upload to Supabase Storage
    // Use Supabase client's storage API which handles React Native properly
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(storagePath, formData as any, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { storagePath: '', error: error.message };
    }

    return { storagePath: data.path };
  } catch (error: any) {
    console.error('Upload error:', error);
    // Dev mode: return local URI as fallback
    if (__DEV__) {
      console.warn('Upload failed, using local URI in dev mode');
      return { storagePath: fileUri };
    }
    return { storagePath: '', error: error.message || 'Upload failed' };
  }
}

/**
 * Get content type from filename
 */
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Get a signed URL for a storage path
 * @param storagePath - The storage path
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL or error
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<{ url: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      return { url: '', error: error.message };
    }

    return { url: data.signedUrl };
  } catch (error: any) {
    return { url: '', error: error.message || 'Failed to get signed URL' };
  }
}

