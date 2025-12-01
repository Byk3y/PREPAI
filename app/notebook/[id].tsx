/**
 * Notebook Detail Screen - NotebookLM Style
 * Shows material details with Sources/Chat/Studio tabs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, Notebook, Material } from '@/lib/store';
import { SourcesTab } from '@/components/notebook/SourcesTab';
import { ChatTab } from '@/components/notebook/ChatTab';
import { StudioTab } from '@/components/notebook/StudioTab';
import { supabase } from '@/lib/supabase';
import { getTopicEmoji } from '@/lib/emoji-matcher';

type TabType = 'sources' | 'chat' | 'studio';

export default function NotebookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notebooks, loadNotebooks, setNotebooks } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('sources');
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggerQuizGeneration, setTriggerQuizGeneration] = useState(false);

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

      // Find the notebook
      const found = notebooks.find((n) => n.id === id);
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
    if (!id || !notebook) {
      // Only set up subscription when notebook is loaded
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
              supabase
                .from('notebooks')
                .select(`
                  *,
                  materials (*)
                `)
                .eq('id', id)
                .single()
                .then(({ data: refreshedData, error }) => {
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
                })
                .catch((error) => {
                  isReloadingRef.current = false;
                  console.error('Error reloading notebook:', error);
                  // Fallback: update with what we have
                  const updatedNotebook = transformNotebook(updated, currentNotebook.materials);
                  setNotebook(updatedNotebook);
                });
              
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
  }, [id, notebook?.id]); // Re-subscribe when notebook ID changes or when notebook is loaded

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
  const handleTakeQuiz = () => {
    setActiveTab('studio');
    setTriggerQuizGeneration(true);
    // Reset trigger after a short delay
    setTimeout(() => setTriggerQuizGeneration(false), 100);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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

        <TouchableOpacity className="w-10 h-10 items-center justify-center">
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
            onGenerateQuiz={triggerQuizGeneration ? () => {} : undefined}
          />
        )}
      </View>

      {/* Tab Bar */}
      <View className="border-t border-neutral-200 bg-white">
        <View className="flex-row">
          {/* Sources Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('sources')}
            className={`flex-1 items-center py-3 ${
              activeTab === 'sources' ? 'border-t-2 border-primary-500' : ''
            }`}
          >
            <Ionicons
              name="document-text-outline"
              size={24}
              color={activeTab === 'sources' ? '#6366f1' : '#737373'}
            />
            <Text
              className={`text-xs mt-1 ${
                activeTab === 'sources' ? 'text-primary-500 font-medium' : 'text-neutral-500'
              }`}
            >
              Sources
            </Text>
          </TouchableOpacity>

          {/* Chat Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('chat')}
            className={`flex-1 items-center py-3 ${
              activeTab === 'chat' ? 'border-t-2 border-primary-500' : ''
            }`}
          >
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={activeTab === 'chat' ? '#6366f1' : '#737373'}
            />
            <Text
              className={`text-xs mt-1 ${
                activeTab === 'chat' ? 'text-primary-500 font-medium' : 'text-neutral-500'
              }`}
            >
              Chat
            </Text>
          </TouchableOpacity>

          {/* Studio Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('studio')}
            className={`flex-1 items-center py-3 ${
              activeTab === 'studio' ? 'border-t-2 border-primary-500' : ''
            }`}
          >
            <Ionicons
              name="sparkles-outline"
              size={24}
              color={activeTab === 'studio' ? '#6366f1' : '#737373'}
            />
            <Text
              className={`text-xs mt-1 ${
                activeTab === 'studio' ? 'text-primary-500 font-medium' : 'text-neutral-500'
              }`}
            >
              Studio
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
