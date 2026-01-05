/**
 * Storage Service
 * Handles all Supabase Storage operations (upload, signed URLs, delete)
 */

import { supabase } from '@/lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/src/legacy/FileSystem';
import { handleError } from '@/lib/errors';

export interface UploadResult {
  storagePath: string;
  error?: string;
}

// Expo FileSystem legacy API enum values
// FileSystemUploadType.BINARY_CONTENT = 0
// FileSystemSessionType.BACKGROUND = 0
const BINARY_CONTENT = 0;
const BACKGROUND = 0;

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

/**
 * Sanitize filename to prevent path traversal attacks
 * Removes dangerous characters and path traversal sequences
 * @param filename - The original filename
 * @returns Sanitized filename
 * @throws Error if filename is invalid after sanitization
 */
function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  // Remove leading/trailing whitespace
  let sanitized = filename.trim();

  // Reject empty filenames
  if (sanitized.length === 0) {
    throw new Error('Filename cannot be empty');
  }

  // Remove path traversal sequences
  sanitized = sanitized.replace(/\.\./g, ''); // Remove .. sequences
  sanitized = sanitized.replace(/\.\//g, ''); // Remove ./ sequences
  sanitized = sanitized.replace(/\.\\/g, ''); // Remove .\ sequences (Windows)
  sanitized = sanitized.replace(/\\/g, '/'); // Normalize backslashes to forward slashes

  // Remove leading/trailing slashes
  sanitized = sanitized.replace(/^\/+|\/+$/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Reject filenames that start with . (hidden files)
  if (sanitized.startsWith('.')) {
    throw new Error('Filename cannot start with a dot (hidden files not allowed)');
  }

  // Limit filename length (255 characters is common filesystem limit)
  if (sanitized.length > 255) {
    // Try to preserve extension
    const ext = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    const maxNameLength = 255 - (ext ? ext.length + 1 : 0); // +1 for the dot
    sanitized = nameWithoutExt.substring(0, maxNameLength) + (ext ? `.${ext}` : '');
  }

  // Validate filename contains only safe characters
  // Allow: alphanumeric, dots, hyphens, underscores, spaces
  const safePattern = /^[a-zA-Z0-9._\-\s]+$/;
  if (!safePattern.test(sanitized)) {
    // Remove unsafe characters but keep the filename structure
    sanitized = sanitized.replace(/[^a-zA-Z0-9._\-\s]/g, '');
  }

  // Final validation - ensure not empty after all sanitization
  if (sanitized.length === 0) {
    throw new Error('Filename is invalid after sanitization');
  }

  return sanitized;
}

/**
 * Validate UUID format
 * @param uuid - The UUID string to validate
 * @returns true if valid UUID, false otherwise
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export const storageService = {
  /**
   * Sanitize filename to prevent path traversal attacks
   */
  sanitizeFilename,
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
      // Validate UUIDs
      if (!isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }
      if (!isValidUUID(materialId) && !materialId.startsWith('temp-')) {
        throw new Error('Invalid material ID format');
      }

      // Sanitize filename to prevent path traversal
      const sanitizedFilename = storageService.sanitizeFilename(filename);

      // Storage path: uploads/{user_id}/{material_id}/{filename}
      const storagePath = `${userId}/${materialId}/${sanitizedFilename}`;

      // Get content type
      const mimeType = getContentType(filename);

      // Compress images before upload
      let uploadUri = fileUri;
      if (mimeType.startsWith('image/')) {
        uploadUri = await compressImage(fileUri);
      }

      // 1. Proactive Token Refresh (Turbo-Plus)
      // Before starting a potentially long background upload, we refresh the session
      // to ensure the access token clock is reset to a full hour.
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn('[StorageService] Session refresh failed before upload:', refreshError.message);
        } else if (refreshData.session) {
          console.log('[StorageService] Session refreshed successfully for upload');
        }
      } catch (err) {
        console.warn('[StorageService] Session refresh exception:', err);
      }

      // Get current session for token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Construction of Supabase Storage Upload URL
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/uploads/${storagePath}`;

      console.log(`[StorageService] Starting background-safe upload to ${storagePath}`);

      // Use expo-file-system for background-safe upload
      // Note: We use BINARY_CONTENT for better performance and to avoid multipart overhead
      // when the server supports it (Supabase Storage does).
      const uploadTask = FileSystem.createUploadTask(
        uploadUrl,
        uploadUri,
        {
          httpMethod: 'POST',
          uploadType: BINARY_CONTENT,
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': mimeType,
            'x-upsert': 'false',
          },
          sessionType: BACKGROUND,
        }
      );

      // 2. Upload Timeout Guard (Turbo-Plus)
      // We set a 45-minute timeout. If an upload takes longer than 45 mins, 
      // the storage token (valid for 60 mins) will likely be near expiration anyway.
      const UPLOAD_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes

      const uploadPromise = uploadTask.uploadAsync();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Upload timed out after 45 minutes')), UPLOAD_TIMEOUT_MS);
      });

      const result = await Promise.race([uploadPromise, timeoutPromise]);

      if (!result || result.status < 200 || result.status >= 300) {
        const errorMsg = result?.body ? JSON.parse(result.body).message : `Upload failed with status ${result?.status}`;
        throw new Error(errorMsg);
      }

      console.log(`[StorageService] Upload successful: ${storagePath}`);
      return { storagePath };
    } catch (error: any) {
      await handleError(error, {
        operation: 'upload_material_file',
        component: 'storage-service',
        metadata: { userId, materialId, filename },
      });
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





