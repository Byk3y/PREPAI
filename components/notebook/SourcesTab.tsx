/**
 * SourcesTab - Displays material sources and preview
 * Shows loading state during extraction, preview when ready
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { Notebook, Material } from '@/lib/store';
import { PreviewSkeleton } from './PreviewSkeleton';
import { getTopicEmoji } from '@/lib/emoji-matcher';
import { storageService } from '@/lib/storage/storageService';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { HomeActionButtons } from '@/components/home/HomeActionButtons';
import { useMaterialAddition } from '@/lib/hooks/useMaterialAddition';
import MaterialTypeSelector from '@/components/MaterialTypeSelector';
import TextInputModal from '@/components/TextInputModal';
import { TikTokLoader } from '@/components/TikTokLoader';
import { UpgradeModal } from '@/components/upgrade/UpgradeModal';
import { useStore } from '@/lib/store';
import { useUpgrade } from '@/lib/hooks/useUpgrade';

interface SourcesTabProps {
  notebook: Notebook;
}

export const SourcesTab: React.FC<SourcesTabProps> = ({ notebook }) => {
  const material = notebook.materials?.[0];
  const router = useRouter();

  // Theme
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Material Addition Logic
  const {
    isAddingMaterial,
    handleAudioUpload,
    handlePDFUpload,
    handlePhotoUpload,
    handleCameraUpload,
    handleTextSave,
    handleYouTubeImport,
    showUpgradeModal: showAddUpgradeModal,
    setShowUpgradeModal: setShowAddUpgradeModal,
    limitReason,
  } = useMaterialAddition(notebook.id);

  const { user, flashcardsStudied, notebooks } = useStore();
  const { trackUpgradeModalDismissed } = useUpgrade();

  // Modal states
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputType, setTextInputType] = useState<'text' | 'note'>('text');

  const handleMaterialTypeSelected = async (
    type: 'pdf' | 'audio' | 'image' | 'website' | 'youtube' | 'copied-text',
    providedUrl?: string
  ) => {
    switch (type) {
      case 'pdf': await handlePDFUpload(); break;
      case 'image': await handlePhotoUpload(); break;
      case 'audio': await handleAudioUpload(); break;
      case 'website':
        if (providedUrl) Alert.alert('Coming Soon', 'Website import soon.');
        else Alert.alert('Coming Soon', 'Website import soon.');
        break;
      case 'youtube':
        if (providedUrl) await handleYouTubeImport(providedUrl);
        else {
          Alert.prompt('Import YouTube', 'Paste URL below', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Import', onPress: (url: string | undefined) => url && handleYouTubeImport(url) }
          ], 'plain-text');
        }
        break;
      case 'copied-text':
        setTextInputType('text');
        setShowTextInput(true);
        break;
    }
  };

  const onTextSave = async (title: string, content: string) => {
    await handleTextSave(title, content, textInputType);
    setShowTextInput(false);
  };

  // Handle viewing image
  const handleViewImage = async (mat: Material) => {
    if (!mat.uri) return;

    const { url, error } = await storageService.getSignedUrl(mat.uri, 3600);
    if (!error && url) {
      // Navigate to image viewer screen
      router.push({
        pathname: '/image-viewer',
        params: {
          imageUrl: url,
          filename: mat.filename || 'Image',
        },
      });
    } else {
      console.error('Failed to get signed URL:', error);
    }
  };

  function renderModals() {
    return (
      <>
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

        <UpgradeModal
          visible={showAddUpgradeModal}
          onDismiss={() => {
            trackUpgradeModalDismissed('create_attempt');
            setShowAddUpgradeModal(false);
          }}
          source="create_attempt"
          notebooksCount={notebooks.length}
          flashcardsStudied={flashcardsStudied}
          streakDays={user.streak || 0}
          petName={user.name || 'Sparky'}
          petLevel={Math.floor((user.streak || 0) / 7) + 1}
          limitReason={limitReason}
        />

        {isAddingMaterial && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.6)' : 'rgba(255, 255, 255, 0.6)' }} />
            <TikTokLoader size={16} color="#6366f1" containerWidth={80} />
          </View>
        )}
      </>
    );
  }

  const renderContent = () => {
    // Render failed state
    if (notebook.status === 'failed') {
      const errorMessage = (notebook.meta as any)?.error || 'Something went wrong while processing this notebook.';
      const isYoutubeError = errorMessage.toLowerCase().includes('youtube');

      return (
        <ScrollView style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            </View>

            <Text style={{ fontSize: 24, fontFamily: 'Nunito-Bold', color: colors.text, textAlign: 'center', marginBottom: 12 }}>
              Processing Failed
            </Text>

            <Text style={{ fontSize: 16, fontFamily: 'Nunito-Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
              {isYoutubeError
                ? "We couldn't process this YouTube video. It might be too long, restricted, or have no transcripts available."
                : errorMessage}
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: colors.surfaceAlt,
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <Text style={{ fontSize: 16, fontFamily: 'Nunito-SemiBold', color: colors.text }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // Render extracting state
    if (notebook.status === 'extracting') {
      return (
        <ScrollView style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
              <Text style={{ fontSize: 48, marginRight: 12 }}>{notebook.emoji || getTopicEmoji(notebook.title)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, color: colors.text, marginBottom: 4, fontFamily: 'Nunito-Bold' }}>
                  {notebook.title}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
                  Extracting sources...
                </Text>
              </View>
            </View>
            <PreviewSkeleton lines={8} />

            {notebook.materials && notebook.materials.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 18, fontFamily: 'Nunito-SemiBold', color: colors.text, marginBottom: 12 }}>Current Sources</Text>
                {notebook.materials.map((mat, idx) => (
                  <View key={mat.id || idx} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <Text style={{ color: colors.text, fontFamily: 'Nunito-Medium' }}>{mat.filename || mat.title || 'Source'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      );
    }

    // Default: Ready state
    return (
      <ScrollView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 100 }}>
          {/* OCR Warning */}
          {material?.meta?.ocr_quality?.lowQuality && (material.type === 'photo' || material.type === 'image') && (
            <View style={{ backgroundColor: isDarkMode ? 'rgba(120, 53, 15, 0.3)' : '#fefce8', borderWidth: 1, borderColor: isDarkMode ? '#92400e' : '#fde68a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                <Text style={{ color: isDarkMode ? '#fde68a' : '#854d0e', fontSize: 14, flex: 1 }}>
                  📸 Photo quality could be better. Try retaking for best results.
                </Text>
              </View>
            </View>
          )}

          {/* Sources List */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Nunito-SemiBold', color: colors.text, marginBottom: 4 }}>Sources</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Nunito-Medium', color: colors.textSecondary, marginBottom: 12 }}>
              Tip: Include past questions for more accurate Quizzes.
            </Text>
            {notebook.materials && notebook.materials.length > 0 ? (
              <View>
                {notebook.materials.map((mat, index) => {
                  const getMaterialIcon = () => {
                    switch (mat.type) {
                      case 'pdf': return 'document-text';
                      case 'audio': return 'musical-notes';
                      case 'image':
                      case 'photo': return 'image';
                      case 'website': return 'globe';
                      case 'youtube': return 'logo-youtube';
                      case 'copied-text': return 'document';
                      default: return 'document';
                    }
                  };

                  const isViewableImage = mat.type === 'image' || mat.type === 'photo';

                  return (
                    <TouchableOpacity
                      key={mat.id || index}
                      onPress={() => isViewableImage ? handleViewImage(mat) : undefined}
                      activeOpacity={isViewableImage ? 0.7 : 1}
                      style={{
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12
                      }}
                    >
                      <View style={{ width: 40, height: 40, backgroundColor: colors.surfaceAlt, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Ionicons name={getMaterialIcon()} size={20} color={colors.iconMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Nunito-Medium', color: colors.text }} numberOfLines={1}>
                          {mat.filename || mat.title || `Source ${index + 1}`}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2, fontFamily: 'Nunito-Regular' }}>
                          {mat.type.charAt(0).toUpperCase() + mat.type.slice(1)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary }}>No sources available</Text>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {renderContent()}

      <HomeActionButtons
        onCameraPress={handleCameraUpload}
        onAddPress={() => setShowMaterialSelector(true)}
        bottom={8}
      />

      {renderModals()}
    </View>
  );
};
