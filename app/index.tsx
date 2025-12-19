/**
 * Home Screen - Notebook List (NotebookLM style)
 * Shows empty state or list of study notebooks
 */

import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useNotebookCreation } from '@/lib/hooks/useNotebookCreation';
import { PetBubble } from '@/components/PetBubble';
import MaterialTypeSelector from '@/components/MaterialTypeSelector';
import TextInputModal from '@/components/TextInputModal';
import { TikTokLoader } from '@/components/TikTokLoader';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeActionButtons } from '@/components/home/HomeActionButtons';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { NotebookList } from '@/components/home/NotebookList';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { UpgradeModal } from '@/components/upgrade/UpgradeModal';
import { useUpgrade } from '@/lib/hooks/useUpgrade';
import { useHomeSubscriptions } from '@/hooks/useHomeSubscriptions';
import { useHomeNavigation } from '@/hooks/useHomeNavigation';
import { useTrialSubscriptionUI } from '@/hooks/useTrialSubscriptionUI';
import { useNotebookList } from '@/hooks/useNotebookList';
import { useHomeAnalytics } from '@/hooks/useHomeAnalytics';

export default function HomeScreen() {
  const router = useRouter();
  const {
    notebooks,
    loadNotebooks,
    authUser,
    isInitialized,
    notebooksSyncedAt,
    notebooksUserId,
    user,
    flashcardsStudied,
  } = useStore();

  // Theme
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Custom Hook for creation logic
  const {
    isAddingNotebook,
    handleAudioUpload,
    handlePDFUpload,
    handlePhotoUpload,
    handleCameraUpload,
    handleTextSave,
    showUpgradeModal: showCreateUpgradeModal,
    setShowUpgradeModal: setShowCreateUpgradeModal,
    upgradeModalProps,
  } = useNotebookCreation();

  // Navigation with flash prevention
  const { navigateToNotebook, isNavigatingRef } = useHomeNavigation();

  // Real-time subscriptions (needs navigation ref to prevent flash)
  useHomeSubscriptions(isNavigatingRef);

  // Trial/subscription UI state
  const {
    showTrialReminder,
    showUpgradeModal,
    showLimitedAccess,
    daysRemaining,
    accessibleCount,
    totalCount,
    setShowTrialReminder,
    setShowUpgradeModal,
  } = useTrialSubscriptionUI(notebooks);

  // Notebook list filtering and sorting
  const { accessibleNotebooks } = useNotebookList({
    notebooks,
    showLimitedAccess,
  });

  // Analytics tracking
  useHomeAnalytics();

  // Analytics tracking functions
  const { trackUpgradeModalDismissed } = useUpgrade();

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'bottom']}
    >
      <HomeHeader />

      {/* Content */}
      {!canShowContent ? (
        <HomeEmptyState isSignedIn={!!authUser} />
      ) : (
        <NotebookList
          notebooks={accessibleNotebooks}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onNotebookPress={handleNotebookPress}
          onCreateNotebook={handleCreateNotebook}
          showTrialReminder={showTrialReminder}
          daysRemaining={daysRemaining}
          notebooksCount={notebooks.length}
          streakDays={user.streak || 0}
          showLimitedAccess={showLimitedAccess}
          accessibleCount={accessibleCount}
          totalCount={totalCount}
          onUpgrade={() => router.push('/upgrade')}
          onDismissTrialReminder={() => setShowTrialReminder(false)}
        />
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
              backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.6)' : 'rgba(255, 255, 255, 0.6)',
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

      {/* Upgrade Modal (trial expired on first app open) */}
      <UpgradeModal
        visible={showUpgradeModal && !showCreateUpgradeModal}
        onDismiss={() => {
          trackUpgradeModalDismissed('trial_expired');
          setShowUpgradeModal(false);
        }}
        source="trial_expired"
        notebooksCount={notebooks.length}
        flashcardsStudied={flashcardsStudied}
        streakDays={user.streak || 0}
        petName={user.name || 'Sparky'}
        petLevel={Math.floor((user.streak || 0) / 7) + 1} // Simple level calculation
      />

      {/* Upgrade Modal (create attempt blocked) */}
      <UpgradeModal
        visible={showCreateUpgradeModal}
        onDismiss={() => {
          trackUpgradeModalDismissed('create_attempt');
          setShowCreateUpgradeModal(false);
        }}
        source="create_attempt"
        {...upgradeModalProps}
      />
    </SafeAreaView>
  );
}
