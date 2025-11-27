/**
 * Document picker hook for selecting PDF files
 */

import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

interface DocumentResult {
  uri: string;
  name: string;
  type: string | undefined;
  size: number | undefined;
  cancelled: boolean;
}

export const useDocumentPicker = () => {
  const [loading, setLoading] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);

  const pickDocument = async (): Promise<DocumentResult | null> => {
    // Prevent multiple simultaneous picker calls
    if (isPickerActive || loading) {
      console.log('Document picker already active, ignoring call');
      return null;
    }

    try {
      setIsPickerActive(true);
      setLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      setLoading(false);
      setIsPickerActive(false);

      if (result.canceled) {
        return { cancelled: true, uri: '', name: '', type: undefined, size: undefined };
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
        size: asset.size,
        cancelled: false,
      };
    } catch (error) {
      setLoading(false);
      setIsPickerActive(false);

      // Only show alert if it's not the "already in progress" error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('in progress')) {
        Alert.alert('Error', 'Failed to pick document. Please try again.');
      }
      console.error('Document picker error:', error);
      return null;
    }
  };

  return { pickDocument, loading };
};
