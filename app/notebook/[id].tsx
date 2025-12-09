/**
 * Notebook Detail Screen - NotebookLM Style
 * Shows material details with Sources/Chat/Studio tabs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, Notebook, Material } from '@/lib/store';
import { SourcesTab } from '@/components/notebook/SourcesTab';
import { ChatTab } from '@/components/notebook/ChatTab';
import { StudioTab } from '@/components/notebook/StudioTab';
import { supabase } from '@/lib/supabase';
import { getTopicEmoji } from '@/lib/emoji-matcher';
import { getFilenameFromPath } from '@/lib/utils';

type TabType = 'sources' | 'chat' | 'studio';

export default function NotebookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notebooks, loadNotebooks, setNotebooks, deleteNotebook, updateNotebook } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggerQuizGeneration, setTriggerQuizGeneration] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Helper function to transform Supabase notebook data to Notebook format
  const transformNotebook = (nb: any, existingMaterials?: Material[]): Notebook => ({
    id: nb.id,
    title: nb.title,
    flashcardCount: nb.flashcard_count || 0,
    lastStudied: nb.last_studied,
    progress: nb.progress || 0,
    createdAt: nb.created_at,
    color: nb.color,
    status: nb.status as Notebook['status'],
    meta: nb.meta || {},
    materials: existingMaterials || (nb.materials ? [{
      id: nb.materials.id,
      type: nb.materials.kind as Material['type'],
      uri: nb.materials.storage_path || nb.materials.external_url,
      filename: getFilenameFromPath(nb.materials.storage_path),
      content: nb.materials.content,
      preview_text: nb.materials.preview_text,
      title: nb.title,
      createdAt: nb.materials.created_at,
      thumbnail: nb.materials.thumbnail,
    }] : []),
  });

  // Load notebook data - only on mount or when id changes
  useEffect(() => {
    const loadNotebook = async () => {
      if (!id) return;

      // If notebooks not loaded yet, load them
      if (notebooks.length === 0) {
        await loadNotebooks();
      }

      // Get fresh notebooks from store after loading (avoid stale closure)
      const currentNotebooks = useStore.getState().notebooks;
      const found = currentNotebooks.find((n) => n.id === id);
      setNotebook(found || null);
      setLoading(false);
    };

    loadNotebook();
    // Only depend on id - don't re-run when notebooks array changes
    // Real-time updates will handle state changes directly
  }, [id]);

  // Ref to track if we're currently reloading materials (prevent multiple simultaneous reloads)
  const isReloadingRef = React.useRef(false);

  // Real-time subscription for notebook updates
  useEffect(() => {
    if (!id) {
      return;
    }

    console.log('Setting up real-time subscription for notebook:', id);

    const channel = supabase
      .channel(`notebook:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notebooks',
          filter: `id=eq.${id}`,
        },
        async (payload) => {
          console.log('Real-time update received:', payload);
          const updated = payload.new as any;
          const oldStatus = (payload.old as any)?.status;
          const newStatus = updated.status as Notebook['status'];

          // Get current notebook state
          setNotebook((currentNotebook) => {
            if (!currentNotebook) return currentNotebook;

            const oldStatusFromState = currentNotebook.status;

            // Update Zustand store AFTER render (defer to avoid React warning)
            // Use queueMicrotask to schedule store update after current render cycle
            queueMicrotask(() => {
              const currentNotebooks = useStore.getState().notebooks;
              setNotebooks(
                currentNotebooks.map((n) =>
                  n.id === id
                    ? {
                      ...n,
                      status: newStatus,
                      title: updated.title,
                      meta: updated.meta || {},
                    }
                    : n
                )
              );
            });

            // If status changed to preview_ready, reload notebook with materials
            // to get the updated preview_text from materials table
            if (newStatus === 'preview_ready' && oldStatusFromState === 'extracting') {
              // Prevent multiple simultaneous reloads
          if (isReloadingRef.current) {
            console.log('Material reload already in progress, skipping...');
            return transformNotebook(updated, currentNotebook.materials);
          }

          isReloadingRef.current = true;

              // Fetch the notebook with materials from Supabase
              const reloadNotebook = async () => {
                try {
                  const { data: refreshedData, error } = await supabase
                    .from('notebooks')
                    .select(`
                  *,
                  materials (*)
                `)
                    .eq('id', id)
                    .single();

                  isReloadingRef.current = false;

                  if (!error && refreshedData) {
                    const refreshedNotebook = transformNotebook(refreshedData);
                    setNotebook(refreshedNotebook);
                    console.log('Notebook reloaded with updated materials');

                    // Update store with refreshed data
                    queueMicrotask(() => {
                      const currentNotebooks = useStore.getState().notebooks;
                      setNotebooks(
                        currentNotebooks.map((n) =>
                          n.id === id ? refreshedNotebook : n
                        )
                      );
                    });
                  } else {
                    console.error('Error reloading notebook:', error);
                    // Fallback: update with what we have
                    const updatedNotebook = transformNotebook(updated, currentNotebook.materials);
                    setNotebook(updatedNotebook);
                  }
                } catch (error) {
                  isReloadingRef.current = false;
                  console.error('Error reloading notebook:', error);
                  // Fallback: update with what we have
                  const updatedNotebook = transformNotebook(updated, currentNotebook.materials);
                  setNotebook(updatedNotebook);
                }
              };

              void reloadNotebook();

              // Return current state while reloading
              return transformNotebook(updated, currentNotebook.materials);
            } else {
              // For other updates, just update with existing materials
              return transformNotebook(updated, currentNotebook.materials);
            }
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to notebook updates');
        } else if (status === 'CHANNEL_ERROR') {
          // Only log if there's an actual error (not during cleanup)
          if (err) {
            console.error('Channel subscription error:', err);
          }
        } else if (status === 'TIMED_OUT') {
          console.warn('Subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('Subscription closed');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up real-time subscription for notebook:', id);
      isReloadingRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [id]); // Only re-subscribe when id changes

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="text-neutral-600 mt-4">Loading notebook...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!notebook) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl">📚</Text>
          <Text className="text-lg font-semibold text-neutral-900 mt-4">
            Notebook not found
          </Text>
          <Text className="text-neutral-600 mt-2 text-center">
            This notebook may have been deleted or doesn't exist.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 bg-primary-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const materialCount = notebook.materials?.length || 0;

  // Handle "Take quiz" action from Chat tab
  const handleTakeQuiz = async () => {
    if (!notebook || !id) return;

    try {
      // Check if a quiz already exists for this notebook
      const { data: existingQuizzes, error } = await supabase
        .from('studio_quizzes')
        .select('id')
        .eq('notebook_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking for existing quiz:', error);
        // Fall back to generating new quiz on error
        setActiveTab('studio');
        setTriggerQuizGeneration(true);
        setTimeout(() => setTriggerQuizGeneration(false), 100);
        return;
      }

      // If a quiz exists, navigate to it
      if (existingQuizzes && existingQuizzes.length > 0) {
        router.push(`/quiz/${existingQuizzes[0].id}`);
        return;
      }

      // No quiz exists, generate a new one
      setActiveTab('studio');
      setTriggerQuizGeneration(true);
      setTimeout(() => setTriggerQuizGeneration(false), 100);
    } catch (error) {
      console.error('Error in handleTakeQuiz:', error);
      // Fall back to generating new quiz on error
      setActiveTab('studio');
      setTriggerQuizGeneration(true);
      setTimeout(() => setTriggerQuizGeneration(false), 100);
    }
  };

  // Handle menu button press
  const handleMenuPress = () => {
    Alert.alert(
      notebook?.title || 'Notebook Options',
      undefined,
      [
        {
          text: 'Rename notebook',
          onPress: handleRenameNotebook,
        },
        {
          text: 'Delete notebook',
          style: 'destructive',
          onPress: handleDeleteNotebook,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Handle notebook rename
  const handleRenameNotebook = () => {
    if (!notebook) return;

    setRenameValue(notebook.title);
    setRenameModalVisible(true);
  };

  // Save renamed notebook
  const handleSaveRename = async () => {
    if (!notebook || !id || !renameValue.trim()) return;

    try {
      await updateNotebook(id, { title: renameValue.trim() });
      setNotebook({ ...notebook, title: renameValue.trim() });
      setRenameModalVisible(false);
    } catch (error) {
      console.error('Error renaming notebook:', error);
      Alert.alert('Error', 'Failed to rename notebook. Please try again.');
    }
  };

  // Handle notebook deletion
  const handleDeleteNotebook = () => {
    if (!notebook || !id) return;

    Alert.alert(
      'Delete Notebook',
      `Are you sure you want to delete "${notebook.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotebook(id);
              // Navigate back after successful deletion
              router.back();
            } catch (error) {
              console.error('Error deleting notebook:', error);
              Alert.alert('Error', 'Failed to delete notebook. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#171717" />
        </TouchableOpacity>

        <View className="flex-1 mx-3">
          <Text className="text-base font-medium text-neutral-900" numberOfLines={1}>
            {notebook.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleMenuPress}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#171717" />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View className="flex-1">
        {activeTab === 'sources' && <SourcesTab notebook={notebook} />}
        {activeTab === 'chat' && <ChatTab notebook={notebook} onTakeQuiz={handleTakeQuiz} />}
        {activeTab === 'studio' && (
          <StudioTab
            notebook={notebook}
            onGenerateQuiz={triggerQuizGeneration ? () => { } : undefined}
          />
        )}
      </View>

      {/* Tab Bar */}
      <View className="border-t border-neutral-200 bg-white">
        <View className="flex-row">
          {/* Sources Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('sources')}
            className="flex-1 items-center py-2.5"
          >
            <Ionicons
              name={activeTab === 'sources' ? 'library' : 'library-outline'}
              size={22}
              color="#171717"
            />
            <Text className="text-sm mt-1 text-neutral-600">
              Sources
            </Text>
          </TouchableOpacity>

          {/* Chat Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('chat')}
            className="flex-1 items-center py-2.5"
          >
            <Ionicons
              name={activeTab === 'chat' ? 'chatbubbles' : 'chatbubbles-outline'}
              size={22}
              color="#171717"
            />
            <Text className="text-sm mt-1 text-neutral-600">
              Chat
            </Text>
          </TouchableOpacity>

          {/* Studio Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('studio')}
            className="flex-1 items-center py-2.5"
          >
            <Ionicons
              name={activeTab === 'studio' ? 'color-palette' : 'color-palette-outline'}
              size={22}
              color="#171717"
            />
            <Text className="text-sm mt-1 text-neutral-600">
              Studio
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rename Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setRenameModalVisible(false)}
            className="flex-1 bg-black/50 justify-center items-center px-6"
          >
            <TouchableOpacity activeOpacity={1} className="w-full max-w-md">
              <View className="bg-white rounded-2xl p-6">
                <Text className="text-xl font-bold text-neutral-900 mb-4">
                  Rename Notebook
                </Text>
                <TextInput
                  value={renameValue}
                  onChangeText={setRenameValue}
                  placeholder="Enter notebook name"
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-900 mb-4"
                  autoFocus
                  maxLength={100}
                />
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setRenameModalVisible(false)}
                    className="flex-1 bg-neutral-100 rounded-xl py-3 items-center"
                  >
                    <Text className="text-base font-semibold text-neutral-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveRename}
                    className="flex-1 bg-neutral-900 rounded-xl py-3 items-center"
                    disabled={!renameValue.trim()}
                  >
                    <Text className="text-base font-semibold text-white">
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
