/**
 * Home Screen - Notebook List (NotebookLM style)
 * Shows empty state or list of study notebooks
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { useStore, Material, Notebook } from '@/lib/store';
import { useCamera } from '@/lib/hooks/useCamera';
import { useDocumentPicker } from '@/lib/hooks/useDocumentPicker';
import { NotebookCard } from '@/components/NotebookCard';
import { PetBubble } from '@/components/PetBubble';
import MaterialTypeSelector from '@/components/MaterialTypeSelector';
import TextInputModal from '@/components/TextInputModal';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const { notebooks, addNotebook, loadNotebooks, authUser, hasCreatedNotebook, isInitialized } = useStore();
  const { takePhoto, isLoading: cameraLoading } = useCamera();
  const { pickDocument, loading: documentLoading } = useDocumentPicker();
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load notebooks once after initialization completes
  useEffect(() => {
    if (isInitialized && authUser && !hasLoadedOnce) {
      loadNotebooks().finally(() => setHasLoadedOnce(true));
    } else if (isInitialized && !authUser) {
      setHasLoadedOnce(true);
    }
  }, [isInitialized, authUser]);

  // Real-time subscription for notebooks (INSERT and UPDATE)
  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel('notebooks-list')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notebooks',
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          // Skip reload if user is navigating to notebook detail (prevents flash)
          if (!isNavigating) {
            await loadNotebooks();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notebooks',
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          // Reload notebooks to ensure we have latest data including materials
          await loadNotebooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, loadNotebooks, isNavigating]);

  // Cleanup navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Modal states
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputType, setTextInputType] = useState<'text' | 'note'>('text');

  // Helper to navigate without homepage flash
  const navigateToNotebook = (notebookId: string) => {
    setIsNavigating(true);
    router.push(`/notebook/${notebookId}`);

    // Reset flag after navigation completes
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
    }, 1000);
  };

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
      // Zero-friction: auto-create notebook with audio material
      const notebookId = await addNotebook({
        title: result.name.replace(/\.(mp3|wav|m4a|aac)$/i, ''),
        flashcardCount: 0,
        progress: 0,
        color: 'purple',
        material: {
          type: 'audio',
          uri: result.uri,
          title: result.name,
          fileUri: result.uri,
          filename: result.name,
        },
      });
      // Navigate to notebook detail page
      navigateToNotebook(notebookId);
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

      // Zero-friction: auto-create notebook with PDF material
      const notebookId = await addNotebook({
        title: result.name.replace('.pdf', ''),
        flashcardCount: 0,
        progress: 0,
        color: 'blue',
        material: {
          type: 'pdf',
          uri: result.uri,
          title: result.name,
          fileUri: result.uri,
          filename: result.name,
        },
      });
      // Navigate to notebook detail page
      navigateToNotebook(notebookId);
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

      // Zero-friction: auto-create notebook with image material
      const notebookId = await addNotebook({
        title: image.fileName?.replace(/\.[^/.]+$/, '') || 'Image Notes',
        flashcardCount: 0,
        progress: 0,
        color: 'green',
        material: {
          type: 'image',
          uri: image.uri,
          title: image.fileName || 'Image',
          thumbnail: image.uri,
          fileUri: image.uri,
          filename: image.fileName || 'image.jpg',
        },
      });
      // Navigate to notebook detail page
      navigateToNotebook(notebookId);
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

      // Zero-friction: auto-create notebook with camera photo
      const notebookId = await addNotebook({
        title: 'Camera Photo',
        flashcardCount: 0,
        progress: 0,
        color: 'green',
        material: {
          type: 'image',
          uri: result.uri,
          title: 'Camera Photo',
          thumbnail: result.uri,
          fileUri: result.uri,
          filename: `photo-${Date.now()}.jpg`,
        },
      });
      // Navigate to notebook detail page
      navigateToNotebook(notebookId);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleTextSave = async (title: string, content: string) => {
    try {
      // Zero-friction: auto-create notebook with text/note material (processed=true, status=preview_ready)
      const notebookId = await addNotebook({
        title: title,
        flashcardCount: 0,
        progress: 0,
        color: textInputType === 'note' ? 'orange' : 'purple',
        material: {
          type: textInputType,
          content: content,
          title: title,
        },
      });

      setShowTextInput(false);
      // Navigate to notebook detail page
      navigateToNotebook(notebookId);
    } catch (error) {
      console.error('Error saving text:', error);
      Alert.alert('Error', 'Failed to save text. Please try again.');
    }
  };

  const handleScanNotes = async () => {
    await handleCameraUpload();
  };

  const handleNotebookPress = (notebookId: string) => {
    // TODO: Create notebook detail screen at app/notebook/[id].tsx
    // For now, this route will show a placeholder
    router.push(`/notebook/${notebookId}`);
  };

  return (
    <SafeAreaView 
      className="flex-1 bg-white" 
      edges={['top', 'bottom']}
    >
      {/* Header - Always visible */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white">
        <Text
          style={{ fontFamily: 'SpaceGrotesk-Bold' }}
          className="text-2xl text-neutral-900"
        >
          PrepAI
        </Text>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-primary-500 items-center justify-center"
          onPress={async () => {
            Alert.alert(
              'Account',
              authUser ? `Signed in as ${authUser.email}` : 'Not signed in',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                ...(authUser ? [{
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace('/auth');
                  }
                }] : [])
              ]
            );
          }}
        >
          <Text className="text-xl">👤</Text>
        </TouchableOpacity>
      </View>

      {/* Content - Only render after initial load to prevent flashes */}
      {!hasLoadedOnce ? (
        // Initial load - show blank white space (very brief)
        <View className="flex-1 bg-white" />
      ) : !authUser ? (
        // Not authenticated - show sign in prompt
        <View className="flex-1 bg-white items-center justify-center px-6">
          <Text className="text-2xl font-bold text-neutral-900 mb-4">
            Not Signed In
          </Text>
          <Text className="text-neutral-600 mb-8 text-center">
            Please sign in to access your study materials
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth')}
            className="bg-primary-500 px-8 py-4 rounded-full"
          >
            <Text className="text-white font-semibold text-lg">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Notebook List - Show all notebooks
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120 }}
        >
          {[...notebooks]
            .sort((a, b) => {
              // Sort by creation date, most recent first
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            })
            .map((notebook) => (
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
      )}

      {/* Floating Pet - Always visible */}
      <PetBubble />

      {/* Bottom Action Buttons - Always visible */}
      <View
        style={{
          position: 'absolute',
          bottom: 40,
          left: 24,
          right: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: 10,
        }}
      >
        {/* Camera Button */}
        <TouchableOpacity
          onPress={handleScanNotes}
          className="w-14 h-14 rounded-full bg-white items-center justify-center shadow-sm border border-neutral-200"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <MaterialIcons name="camera-alt" size={24} color="#4B5563" />
        </TouchableOpacity>

        {/* Add Materials Button */}
        <TouchableOpacity
          onPress={handleCreateNotebook}
          className="bg-neutral-900 px-8 py-4 rounded-full shadow-lg flex-row items-center gap-2"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text
            style={{ fontFamily: 'SpaceGrotesk-SemiBold' }}
            className="text-white text-base"
          >
            Add Materials
          </Text>
        </TouchableOpacity>
      </View>

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
