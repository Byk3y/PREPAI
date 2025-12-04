/**
 * useCamera Hook
 * Handles camera permissions and launching native camera
 */

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  cancelled: boolean;
}

export const useCamera = () => {
  const [isLoading, setIsLoading] = useState(false);

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
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission.');
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
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  };

  return {
    takePhoto,
    isLoading,
  };
};







