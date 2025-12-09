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
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useNotebookCreation } from '@/lib/hooks/useNotebookCreation';
import { NotebookCard } from '@/components/NotebookCard';
import { PetBubble } from '@/components/PetBubble';
import MaterialTypeSelector from '@/components/MaterialTypeSelector';
import TextInputModal from '@/components/TextInputModal';
import { TikTokLoader } from '@/components/TikTokLoader';
import { supabase } from '@/lib/supabase';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeActionButtons } from '@/components/home/HomeActionButtons';

export default function HomeScreen() {
  const router = useRouter();
  const {
    notebooks,
    loadNotebooks,
    authUser,
    isInitialized,
    notebooksSyncedAt,
    notebooksUserId,
  } = useStore();

  // Custom Hook for creation logic
  const {
    isAddingNotebook,
    handleAudioUpload,
    handlePDFUpload,
    handlePhotoUpload,
    handleCameraUpload,
    handleTextSave
  } = useNotebookCreation();

  // Navigation state (keeping local for flash prevention logic if needed)
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time updates
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
          if (!isNavigatingRef.current) {
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
          await loadNotebooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, loadNotebooks]);

  // Cleanup timeout
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

  // Navigation Helper
  const navigateToNotebook = (notebookId: string) => {
    // Prevent rapid double-taps from pushing the route twice
    if (isNavigatingRef.current) return;

    setIsNavigating(true);
    isNavigatingRef.current = true;
    router.push(`/notebook/${notebookId}`);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      isNavigatingRef.current = false;
    }, 800);
  };

  const handleCreateNotebook = () => {
    setShowMaterialSelector(true);
  };

  const handleMaterialTypeSelected = async (
    type: 'pdf' | 'audio' | 'image' | 'website' | 'youtube' | 'copied-text'
  ) => {
    let newNotebookId: string | null | undefined = null;

    switch (type) {
      case 'pdf':
        newNotebookId = await handlePDFUpload();
        break;
      case 'image':
        newNotebookId = await handlePhotoUpload();
        break;
      case 'audio':
        newNotebookId = await handleAudioUpload();
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

    if (newNotebookId) {
      navigateToNotebook(newNotebookId);
    }
  };

  const onTextSave = async (title: string, content: string) => {
    const newNotebookId = await handleTextSave(title, content, textInputType);
    setShowTextInput(false);
    if (newNotebookId) {
      navigateToNotebook(newNotebookId);
    }
  };

  const onScanNotes = async () => {
    const newNotebookId = await handleCameraUpload();
    if (newNotebookId) {
      navigateToNotebook(newNotebookId);
    }
  };

  const handleNotebookPress = (notebookId: string) => {
    navigateToNotebook(notebookId);
  };

  const handleRefresh = async () => {
    if (!authUser) return;
    try {
      setIsRefreshing(true);
      await loadNotebooks();
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fast-path render: if we have a recent cache for this user, show it immediately
  const isNotebookCacheFresh =
    !!authUser &&
    notebooksUserId === authUser.id &&
    typeof notebooksSyncedAt === 'number' &&
    Date.now() - notebooksSyncedAt < 24 * 60 * 60 * 1000; // 24h freshness window

  const canShowContent = authUser ? isInitialized || isNotebookCacheFresh : false;

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={['top', 'bottom']}
    >
      <HomeHeader />

      {/* Content */}
      {!canShowContent ? (
        !authUser ? (
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
          <View className="flex-1 bg-white" />
        )
      ) : (
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 120,
            flexGrow: 1, // allow pull-to-refresh from anywhere
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="transparent"
              colors={['transparent']}
              style={{ backgroundColor: 'transparent' }}
            />
          }
        >
          {isRefreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <TikTokLoader size={10} color="#6366f1" containerWidth={60} />
            </View>
          )}
          {[...notebooks]
            .sort((a, b) => {
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

          {/* Add New Button (List Item) */}
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

      {/* Loading Overlay */}
      {isAddingNotebook && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
            }}
          />
          <TikTokLoader size={16} color="#6366f1" containerWidth={80} />
        </View>
      )}

      {/* Floating Pet */}
      <PetBubble />

      {/* Bottom Action Buttons */}
      <HomeActionButtons
        onCameraPress={onScanNotes}
        onAddPress={handleCreateNotebook}
      />

      {/* Modals */}
      <MaterialTypeSelector
        visible={showMaterialSelector}
        onClose={() => setShowMaterialSelector(false)}
        onSelectType={handleMaterialTypeSelected}
      />

      <TextInputModal
        visible={showTextInput}
        type={textInputType}
        onClose={() => setShowTextInput(false)}
        onSave={onTextSave}
      />
    </SafeAreaView>
  );
}
