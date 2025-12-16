/**
 * Storage Service
 * Handles all Supabase Storage operations (upload, signed URLs, delete)
 */

import { supabase } from '@/lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { handleError } from '@/lib/errors';

export interface UploadResult {
  storagePath: string;
  error?: string;
}

/**
 * Compress image before upload
 * Reduces file size from ~5MB to ~500KB while maintaining quality for OCR
 */
async function compressImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 2000 } }], // Max width 2000px (good for OCR)
      {
        compress: 0.8, // 80% quality (balance OCR accuracy vs size)
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original URI if compression fails
    return uri;
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

export const storageService = {
  /**
   * Upload a material file to Supabase Storage
   * @param userId - The user's ID
   * @param materialId - The material's ID
   * @param fileUri - Local file URI (from expo-image-picker or expo-document-picker)
   * @param filename - The filename to use in storage
   * @returns Storage path or error
   */
  uploadMaterialFile: async (
    userId: string,
    materialId: string,
    fileUri: string,
    filename: string
  ): Promise<UploadResult> => {
    try {
      // Storage path: uploads/{user_id}/{material_id}/{filename}
      const storagePath = `${userId}/${materialId}/${filename}`;

      // For React Native, use FormData with file URI
      const mimeType = getContentType(filename);

      // Compress images before upload
      let uploadUri = fileUri;
      if (mimeType.startsWith('image/')) {
        uploadUri = await compressImage(fileUri);
      }

      // Create FormData for React Native
      const formData = new FormData();
      // @ts-ignore - React Native FormData format
      formData.append('file', {
        uri: uploadUri,
        type: mimeType,
        name: filename,
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(storagePath, formData as any, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        await handleError(error, {
          operation: 'upload_material_file',
          component: 'storage-service',
          metadata: { userId, materialId, filename },
        });
        return { storagePath: '', error: error.message };
      }

      return { storagePath: data.path };
    } catch (error: any) {
      await handleError(error, {
        operation: 'upload_material_file',
        component: 'storage-service',
        metadata: { userId, materialId, filename },
      });
      // Dev mode: return local URI as fallback
      if (__DEV__) {
        console.warn('Upload failed, using local URI in dev mode');
        return { storagePath: fileUri };
      }
      return { storagePath: '', error: error.message || 'Upload failed' };
    }
  },

  /**
   * Get a signed URL for a storage path
   * @param storagePath - The storage path
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL or error
   */
  getSignedUrl: async (
    storagePath: string,
    expiresIn: number = 3600
  ): Promise<{ url: string; error?: string }> => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(storagePath, expiresIn);

      if (error) {
        await handleError(error, {
          operation: 'get_signed_url',
          component: 'storage-service',
          metadata: { storagePath, expiresIn },
        });
        return { url: '', error: error.message };
      }

      return { url: data.signedUrl };
    } catch (error: any) {
      await handleError(error, {
        operation: 'get_signed_url',
        component: 'storage-service',
        metadata: { storagePath, expiresIn },
      });
      return { url: '', error: error.message || 'Failed to get signed URL' };
    }
  },

  /**
   * Delete a file from storage
   * @param storagePath - The storage path to delete
   * @returns Success status or error
   */
  deleteFile: async (
    storagePath: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.storage
        .from('uploads')
        .remove([storagePath]);

      if (error) {
        await handleError(error, {
          operation: 'delete_file',
          component: 'storage-service',
          metadata: { storagePath },
        });
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      await handleError(error, {
        operation: 'delete_file',
        component: 'storage-service',
        metadata: { storagePath },
      });
      return { success: false, error: error.message || 'Failed to delete file' };
    }
  },
};


