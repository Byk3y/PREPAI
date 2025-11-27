/**
 * Home Screen - Notebook List (NotebookLM style)
 * Shows empty state or list of study notebooks
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useStore, Material } from '@/lib/store';
import { useCamera } from '@/lib/hooks/useCamera';
import { useDocumentPicker } from '@/lib/hooks/useDocumentPicker';
import { EmptyState } from '@/components/EmptyState';
import { NotebookCard } from '@/components/NotebookCard';
import { PetBubble } from '@/components/PetBubble';
import MaterialTypeSelector from '@/components/MaterialTypeSelector';
import TextInputModal from '@/components/TextInputModal';

export default function HomeScreen() {
  const router = useRouter();
  const { notebooks, addNotebook } = useStore();
  const { takePhoto, isLoading: cameraLoading } = useCamera();
  const { pickDocument, loading: documentLoading } = useDocumentPicker();

  // Modal states
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputType, setTextInputType] = useState<'text' | 'note'>('text');

  const handleCreateNotebook = () => {
    setShowMaterialSelector(true);
  };

  const handleMaterialTypeSelected = async (
    type: 'pdf' | 'audio' | 'image' | 'website' | 'youtube' | 'copied-text'
  ) => {
    switch (type) {
      case 'pdf':
        await handlePDFUpload();
        break;
      case 'image':
        await handlePhotoUpload();
        break;
      case 'audio':
        await handleAudioUpload();
        break;
      case 'website':
        Alert.alert('Coming Soon', 'Website import feature will be available soon.');
        break;
      case 'youtube':
        Alert.alert('Coming Soon', 'YouTube import feature will be available soon.');
        break;
      case 'copied-text':
        setTextInputType('text');
        setShowTextInput(true);
        break;
    }
  };

  const handleAudioUpload = async () => {
    try {
      const result = await pickDocument();
      if (!result || result.cancelled) {
        return;
      }
      // Create material object
      const material: Omit<Material, 'id' | 'createdAt'> = {
        type: 'audio',
        uri: result.uri,
        title: result.name,
      };
      // Create notebook with audio material
      addNotebook({
        title: result.name.replace(/\.(mp3|wav|m4a|aac)$/i, ''),
        emoji: '🎵',
        flashcardCount: 0,
        progress: 0,
        color: 'purple',
        materials: [material as Material],
      });
      Alert.alert('Success', 'Audio uploaded successfully!');
    } catch (error) {
      console.error('Error uploading audio:', error);
      Alert.alert('Error', 'Failed to upload audio. Please try again.');
    }
  };

  const handlePDFUpload = async () => {
    try {
      const result = await pickDocument();

      if (!result || result.cancelled) {
        return;
      }

      // Create material object
      const material: Omit<Material, 'id' | 'createdAt'> = {
        type: 'pdf',
        uri: result.uri,
        title: result.name,
      };

      // Create notebook with PDF material
      addNotebook({
        title: result.name.replace('.pdf', ''),
        emoji: '📄',
        flashcardCount: 0,
        progress: 0,
        color: 'blue',
        materials: [material as Material], // Will be properly created in store
      });

      Alert.alert('Success', 'PDF uploaded successfully!');
    } catch (error) {
      console.error('Error uploading PDF:', error);
      Alert.alert('Error', 'Failed to upload PDF. Please try again.');
    }
  };

  const handlePhotoUpload = async () => {
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable photo library access in your device settings to select images.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        exif: false,
      });

      if (result.canceled) {
        return;
      }

      const image = result.assets?.[0];
      if (!image) {
        return;
      }

      // Create material object
      const material: Omit<Material, 'id' | 'createdAt'> = {
        type: 'image',
        uri: image.uri,
        title: image.fileName || 'Image',
        thumbnail: image.uri,
      };

      // Create notebook with image material
      addNotebook({
        title: image.fileName?.replace(/\.[^/.]+$/, '') || 'Image Notes',
        emoji: '🖼️',
        flashcardCount: 0,
        progress: 0,
        color: 'green',
        materials: [material as Material],
      });

      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleCameraUpload = async () => {
    try {
      // Use camera hook to take photo
      const result = await takePhoto();

      if (!result || result.cancelled) {
        return;
      }

      // Create material object
      const material: Omit<Material, 'id' | 'createdAt'> = {
        type: 'image',
        uri: result.uri,
        title: 'Camera Photo',
        thumbnail: result.uri,
      };

      // Create notebook with image material
      addNotebook({
        title: 'Camera Photo',
        emoji: '📷',
        flashcardCount: 0,
        progress: 0,
        color: 'green',
        materials: [material as Material],
      });

      Alert.alert('Success', 'Photo taken successfully!');
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleTextSave = (title: string, content: string) => {
    // Create material object
    const material: Omit<Material, 'id' | 'createdAt'> = {
      type: textInputType,
      content: content,
      title: title,
    };

    // Create notebook with text/note material
    addNotebook({
      title: title,
      emoji: textInputType === 'note' ? '📝' : '✍️',
      flashcardCount: 0,
      progress: 0,
      color: textInputType === 'note' ? 'orange' : 'purple',
      materials: [material as Material],
    });

    setShowTextInput(false);
    Alert.alert('Success', `${textInputType === 'note' ? 'Note' : 'Text'} saved successfully!`);
  };

  const handleScanNotes = async () => {
    await handleCameraUpload();
  };

  const handleNotebookPress = (notebookId: string) => {
    // TODO: Navigate to notebook detail
    router.push(`/notebook/${notebookId}`);
  };

  return (
    <SafeAreaView 
      className="flex-1" 
      style={{ backgroundColor: 'transparent' }}
      edges={notebooks.length === 0 ? ['top'] : ['top', 'bottom']}
    >
      {/* Content */}
      {notebooks.length === 0 ? (
        // Empty State with full screen gradient
        <EmptyState
          icon="📚"
          title={{
            base: "A New Way of {word}",
            words: ["Studying", "Learning", "Mastery", "Success"]
          }}
          description={{
            base: "Transform any material into {word} study sessions",
            words: ["interactive", "engaging", "personalized", "intelligent"]
          }}
          primaryAction={{
            label: 'Upload Materials',
            onPress: handleCreateNotebook,
          }}
          secondaryAction={{
            icon: 'camera',
            onPress: handleScanNotes,
          }}
          header={
            <View className="flex-row items-center justify-between px-6 py-4">
              <Text 
                style={{ fontFamily: 'SpaceGrotesk-Bold' }}
                className="text-2xl text-neutral-900"
              >
                PrepAI
              </Text>
              <TouchableOpacity className="w-10 h-10 rounded-full bg-primary-500 items-center justify-center">
                <Text className="text-xl">👤</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        // Notebook List
        <>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 bg-neutral-50">
            <Text className="text-2xl font-bold text-neutral-900">PrepAI</Text>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-primary-500 items-center justify-center">
              <Text className="text-xl">👤</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-6 pt-6 bg-neutral-50" showsVerticalScrollIndicator={false}>
          <Text className="text-xl font-semibold text-neutral-800 mb-4">
            Your Study Materials
          </Text>

          {notebooks.map((notebook) => (
            <NotebookCard
              key={notebook.id}
              notebook={notebook}
              onPress={() => handleNotebookPress(notebook.id)}
            />
          ))}

          {/* Add New Button */}
          <TouchableOpacity
            onPress={handleCreateNotebook}
            className="bg-white rounded-2xl p-4 mb-6 border-2 border-dashed border-neutral-300 items-center justify-center"
            activeOpacity={0.7}
          >
            <Text className="text-base font-semibold text-neutral-600">
              + Add New Notebook
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </>
      )}

      {/* Floating Pet */}
      <PetBubble />

      {/* Material Type Selector Modal */}
      <MaterialTypeSelector
        visible={showMaterialSelector}
        onClose={() => setShowMaterialSelector(false)}
        onSelectType={handleMaterialTypeSelected}
      />

      {/* Text Input Modal */}
      <TextInputModal
        visible={showTextInput}
        type={textInputType}
        onClose={() => setShowTextInput(false)}
        onSave={handleTextSave}
      />
    </SafeAreaView>
  );
}
