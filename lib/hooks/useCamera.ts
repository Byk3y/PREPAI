/**
 * useCamera Hook
 * Handles camera permissions and launching native camera
 */

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useErrorHandler } from './useErrorHandler';

export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  cancelled: boolean;
}

export const useCamera = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { handleError } = useErrorHandler();

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      await handleError(error, {
        operation: 'request_camera_permission',
        component: 'camera-hook',
        metadata: {}
      });
      return false;
    }
  };

  const takePhoto = async (): Promise<CameraResult | null> => {
    try {
      setIsLoading(true);

      // Request permission first
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return null;
      }

      // Launch native camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        exif: false,
      });

      setIsLoading(false);

      if (result.canceled) {
        return {
          uri: '',
          width: 0,
          height: 0,
          cancelled: true,
        };
      }

      // Return the first photo (iOS/Android return array)
      const photo = result.assets?.[0];
      if (!photo) {
        return null;
      }

      return {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        cancelled: false,
      };
    } catch (error) {
      setIsLoading(false);
      await handleError(error, {
        operation: 'take_photo',
        component: 'camera-hook',
        metadata: {}
      });
      return null;
    }
  };

  return {
    takePhoto,
    isLoading,
  };
};







