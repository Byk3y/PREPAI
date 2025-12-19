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
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { Ionicons } from '@expo/vector-icons';
import { useStore, Notebook, Material } from '@/lib/store';
import { SourcesTab } from '@/components/notebook/SourcesTab';
import { ChatTab } from '@/components/notebook/ChatTab';
import { StudioTab } from '@/components/notebook/StudioTab';
import { supabase } from '@/lib/supabase';
import { getTopicEmoji } from '@/lib/emoji-matcher';
import { getFilenameFromPath } from '@/lib/utils';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { useFeedback } from '@/lib/feedback';
import { notebookService } from '@/lib/services/notebookService';
import { LockedNotebookOverlay } from '@/components/upgrade/LockedNotebookOverlay';
import { canAccessNotebook, getAccessibleNotebookIds } from '@/lib/services/subscriptionService';
import { SUBSCRIPTION_CONSTANTS } from '@/lib/constants';

type TabType = 'sources' | 'chat' | 'studio';

export default function NotebookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { handleError } = useErrorHandler();
  const { notebooks, loadNotebooks, setNotebooks, deleteNotebook, updateNotebook, tier, status, isExpired } = useStore();
  const { play } = useFeedback();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggerQuizGeneration, setTriggerQuizGeneration] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showLockedOverlay, setShowLockedOverlay] = useState(false);

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
      
      if (found) {
        setNotebook(found);
        setLoading(false);
        return;
      }

      // Notebook not found in store - try fetching directly from database
      // This handles race conditions where the notebook was just created
      // but hasn't been loaded into the store yet
      try {
        const fetchedNotebook = await notebookService.getNotebookById(id);
        if (fetchedNotebook) {
          setNotebook(fetchedNotebook);
          // Also update the store with the fetched notebook
          setNotebooks([fetchedNotebook, ...currentNotebooks]);
        } else {
          setNotebook(null);
        }
      } catch (error) {
        console.error('Error fetching notebook from database:', error);
        setNotebook(null);
      } finally {
        setLoading(false);
      }
    };

    loadNotebook();
    // Only depend on id - don't re-run when notebooks array changes
    // Real-time updates will handle state changes directly
  }, [id]);

  // Check if notebook access is restricted (limited access mode)
  useEffect(() => {
    if (!id || !isExpired || tier === 'premium') return;

    // Get the most recent notebooks (accessible in limited access mode)
    const accessibleIds = getAccessibleNotebookIds(
      notebooks,
      SUBSCRIPTION_CONSTANTS.LIMITED_ACCESS_NOTEBOOK_COUNT
    );

    // Check if this notebook is accessible
    const canAccess = canAccessNotebook(id, accessibleIds);

    if (!canAccess) {
      setShowLockedOverlay(true);
    }
  }, [id, isExpired, tier, notebooks]);

  // Ref to track if we're currently reloading materials (prevent multiple simultaneous reloads)
  const isReloadingRef = React.useRef(false);

  // Real-time subscription for notebook updates
  useEffect(() => {
    if (!id) {
      return;
    }

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
        if (status === 'CHANNEL_ERROR' && err) {
          console.error('Channel subscription error:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('Subscription timed out');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      isReloadingRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [id]); // Only re-subscribe when id changes

  // Dark mode support
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: 'Nunito-Regular' }}>Loading notebook...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!notebook) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 24 }}>📚</Text>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito-SemiBold', color: colors.text, marginTop: 16 }}>
            Notebook not found
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', fontFamily: 'Nunito-Regular' }}>
            This notebook may have been deleted or doesn't exist.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 24, backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#FFFFFF', fontFamily: 'Nunito-SemiBold' }}>Go Back</Text>
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
      await handleError(error, {
        operation: 'rename_notebook',
        component: 'notebook-detail',
        metadata: { notebookId: id }
      });
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
              await handleError(error, {
                operation: 'delete_notebook',
                component: 'notebook-detail',
                metadata: { notebookId: id }
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }} numberOfLines={1}>
            {notebook.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleMenuPress}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
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
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row' }}>
          {/* Sources Tab */}
          <TouchableOpacity
            onPress={() => {
              setActiveTab('sources');
            }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
          >
            <Ionicons
              name={activeTab === 'sources' ? 'library' : 'library-outline'}
              size={22}
              color={colors.icon}
            />
            <Text style={{ fontSize: 12, marginTop: 4, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
              Sources
            </Text>
          </TouchableOpacity>

          {/* Chat Tab */}
          <TouchableOpacity
            onPress={() => {
              setActiveTab('chat');
            }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
          >
            <Ionicons
              name={activeTab === 'chat' ? 'chatbubbles' : 'chatbubbles-outline'}
              size={22}
              color={colors.icon}
            />
            <Text style={{ fontSize: 12, marginTop: 4, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
              Chat
            </Text>
          </TouchableOpacity>

          {/* Studio Tab */}
          <TouchableOpacity
            onPress={() => {
              setActiveTab('studio');
            }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
          >
            <Ionicons
              name={activeTab === 'studio' ? 'color-palette' : 'color-palette-outline'}
              size={22}
              color={colors.icon}
            />
            <Text style={{ fontSize: 12, marginTop: 4, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
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
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setRenameModalVisible(false)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: '100%', maxWidth: 400 }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
                  Rename Notebook
                </Text>
                <TextInput
                  value={renameValue}
                  onChangeText={setRenameValue}
                  placeholder="Enter notebook name"
                  placeholderTextColor={colors.textMuted}
                  style={{ 
                    backgroundColor: colors.surfaceAlt, 
                    borderWidth: 1, 
                    borderColor: colors.border, 
                    borderRadius: 12, 
                    paddingHorizontal: 16, 
                    paddingVertical: 12, 
                    fontSize: 16, 
                    color: colors.text, 
                    marginBottom: 16,
                    fontFamily: 'Nunito-Regular'
                  }}
                  autoFocus
                  maxLength={100}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setRenameModalVisible(false)}
                    style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 16, fontFamily: 'Nunito-SemiBold', color: colors.textSecondary }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveRename}
                    style={{ flex: 1, backgroundColor: isDarkMode ? '#F9FAFB' : '#111827', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                    disabled={!renameValue.trim()}
                  >
                    <Text style={{ fontSize: 16, fontFamily: 'Nunito-SemiBold', color: isDarkMode ? '#111827' : '#FFFFFF' }}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Locked Notebook Overlay */}
      <LockedNotebookOverlay
        visible={showLockedOverlay}
        totalNotebooks={notebooks.length}
        delayMs={SUBSCRIPTION_CONSTANTS.LOCKED_NOTEBOOK_OVERLAY_DELAY_MS}
        onUpgrade={() => {
          setShowLockedOverlay(false);
          router.push('/upgrade');
        }}
        onDismiss={() => setShowLockedOverlay(false)}
      />
    </SafeAreaView>
  );
}
