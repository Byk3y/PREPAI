/**
 * Notebook Detail Screen - NotebookLM Style
 * Shows material details with Sources/Chat/Studio tabs
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/lib/store';
import { SourcesTab } from '@/components/notebook/SourcesTab';
import { ChatTab } from '@/components/notebook/ChatTab';
import { StudioTab } from '@/components/notebook/StudioTab';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { LockedNotebookOverlay } from '@/components/upgrade/LockedNotebookOverlay';
import { SUBSCRIPTION_CONSTANTS } from '@/lib/constants';
import { NotebookHeader } from '@/components/notebook/NotebookHeader';
import { NotebookTabBar, type TabType } from '@/components/notebook/NotebookTabBar';
import { RenameNotebookModal } from '@/components/notebook/RenameNotebookModal';
import { useNotebookDetail } from '@/hooks/useNotebookDetail';
import { useNotebookSubscription } from '@/hooks/useNotebookSubscription';
import { useNotebookAccess } from '@/hooks/useNotebookAccess';
import { useNotebookActions } from '@/hooks/useNotebookActions';

export default function NotebookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notebooks } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [triggerQuizGeneration, setTriggerQuizGeneration] = useState(false);

  // Load notebook data
  const { notebook, loading, setNotebook } = useNotebookDetail(id);

  // Set up real-time subscription
  useNotebookSubscription(id, setNotebook);

  // Check access control
  const { showLockedOverlay, setShowLockedOverlay } = useNotebookAccess(id);

  // Notebook actions
  const {
    handleTakeQuiz,
    handleMenuPress,
    handleRenameNotebook,
    handleSaveRename,
    renameModalVisible,
    setRenameModalVisible,
    renameValue,
    setRenameValue,
  } = useNotebookActions(notebook, id, setNotebook, setActiveTab, setTriggerQuizGeneration);

  // Theme
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: 'Nunito-Regular' }}>
            Loading notebook...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not found state
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {/* Header */}
      <NotebookHeader
        title={notebook.title}
        onBack={() => router.back()}
        onMenuPress={handleMenuPress}
      />

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
      <NotebookTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Rename Modal */}
      <RenameNotebookModal
        visible={renameModalVisible}
        value={renameValue}
        onValueChange={setRenameValue}
        onSave={handleSaveRename}
        onDismiss={setRenameModalVisible}
      />

      {/* Locked Notebook Overlay */}
      <LockedNotebookOverlay
        visible={showLockedOverlay}
        totalNotebooks={notebooks.length}
        notebookId={id}
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
