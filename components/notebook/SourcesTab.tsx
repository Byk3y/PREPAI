/**
 * SourcesTab - Displays material sources and preview
 * Shows loading state during extraction, preview when ready
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Notebook, Material } from '@/lib/store';
import { PreviewSkeleton } from './PreviewSkeleton';
import { storageService } from '@/lib/storage/storageService';
import { useTheme, getThemeColors, getThemeShadows } from '@/lib/ThemeContext';
import { HomeActionButtons } from '@/components/home/HomeActionButtons';
import { TikTokLoader } from '@/components/TikTokLoader';
import { useStore } from '@/lib/store';

interface SourcesTabProps {
  notebook: Notebook;
  onAddPress: () => void;
  onCameraPress: () => void;
  isAddingMaterial?: boolean; // Phase A: Uploading/Saving
}

export const SourcesTab: React.FC<SourcesTabProps> = ({
  notebook,
  onAddPress,
  onCameraPress,
  isAddingMaterial
}) => {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const shadows = getThemeShadows(isDarkMode);
  const { loadNotebooks } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadNotebooks();
    setRefreshing(false);
  };

  const handleViewImage = async (mat: Material) => {
    if (!mat.uri) return;
    const { url, error } = await storageService.getSignedUrl(mat.uri, 3600);
    if (!error && url) {
      router.push({
        pathname: '/image-viewer',
        params: { imageUrl: url, filename: mat.filename || 'Image' },
      });
    }
  };

  const getMaterialIcon = (type?: string) => {
    switch (type) {
      case 'pdf': return 'document-text';
      case 'audio': return 'musical-notes';
      case 'image':
      case 'photo': return 'image';
      case 'website': return 'globe';
      case 'youtube': return 'logo-youtube';
      default: return 'document';
    }
  };

  const renderContent = () => {
    // Initial extraction state (no materials yet)
    if (notebook.status === 'extracting' && (!notebook.materials || notebook.materials.length === 0)) {
      return (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
          <PreviewSkeleton />
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Sources</Text>
            <View style={[styles.loadingSourceItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TikTokLoader size={12} color="#6366f1" containerWidth={60} />
              <Text style={{ color: colors.textSecondary, marginLeft: 12, fontFamily: 'Nunito-Medium' }}>
                Uploading and analyzing...
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // If all materials failed and there's a notebook error, we might still show a message,
    // but we generally want to avoid blocking the whole notebook view now.

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleManualRefresh} tintColor="#6366f1" />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sources</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontFamily: 'Nunito-Medium' }}>
            {notebook.materials?.length || 0} items
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {/* Phase A Loading: Uploading (Local State) */}
          {isAddingMaterial && (
            <View style={[styles.materialItem, { backgroundColor: colors.surface, borderColor: colors.border, borderStyle: 'dashed' }]}>
              <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
                <TikTokLoader size={10} color="#6366f1" containerWidth={40} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.materialTitle, { color: colors.text }]}>Uploading source...</Text>
                <Text style={[styles.materialSubtitle, { color: colors.textSecondary }]}>Please wait a moment</Text>
              </View>
            </View>
          )}

          {/* Phase B Loading: Backend Processing (DB State) */}
          {notebook.materials && notebook.materials.map((mat, index) => {
            const isImage = mat.type === 'image' || mat.type === 'photo';
            const isProcessing = mat.processed === false || mat.status === 'processing';
            const isFailed = mat.status === 'failed';
            const errorMessage = mat.meta?.error;

            return (
              <TouchableOpacity
                key={mat.id || index}
                onPress={() => (isImage && !isProcessing && !isFailed) ? handleViewImage(mat) : undefined}
                activeOpacity={(isImage && !isProcessing && !isFailed) ? 0.7 : 1}
                style={[
                  styles.materialItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isFailed ? colors.error : isProcessing ? '#6366f1' : colors.border,
                    borderWidth: (isProcessing || isFailed) ? 1.5 : 1
                  },
                  shadows.small
                ]}
              >
                <View style={[styles.iconContainer, { backgroundColor: isFailed ? colors.error + '15' : colors.surfaceAlt }]}>
                  {isProcessing ? (
                    <TikTokLoader size={10} color="#6366f1" containerWidth={40} />
                  ) : isFailed ? (
                    <Ionicons name="alert-circle" size={24} color={colors.error} />
                  ) : (
                    <Ionicons name={getMaterialIcon(mat.type)} size={22} color={colors.textSecondary} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text numberOfLines={1} style={[
                    styles.materialTitle,
                    { color: isFailed ? colors.error : (isProcessing ? '#6366f1' : colors.text) }
                  ]}>
                    {mat.title || mat.filename || 'Untitled Source'}
                  </Text>
                  <Text style={[styles.materialSubtitle, { color: isFailed ? colors.error : colors.textSecondary }]}>
                    {isProcessing ? 'Analyzing content...' :
                      isFailed ? (errorMessage || 'Processing failed') :
                        `${mat.type ? mat.type.charAt(0).toUpperCase() + mat.type.slice(1) : 'Source'} • ${new Date(mat.createdAt).toLocaleDateString()}`}
                  </Text>
                </View>
                {(!isProcessing && !isFailed) && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
                {isFailed && (
                  <TouchableOpacity onPress={onAddPress} style={styles.miniRetryButton}>
                    <Ionicons name="refresh" size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {(!isAddingMaterial && (!notebook.materials || notebook.materials.length === 0)) && (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>📥</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No sources yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Add PDFs, notes, or website links to start learning.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {renderContent()}
      <HomeActionButtons onCameraPress={onCameraPress} onAddPress={onAddPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontFamily: 'Nunito-Bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  loadingSourceItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  materialItem: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  materialTitle: { fontSize: 15, fontFamily: 'Nunito-Bold' },
  materialSubtitle: { fontSize: 12, fontFamily: 'Nunito-Medium', marginTop: 2 },
  emptyContainer: { borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontFamily: 'Nunito-Bold' },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 4, fontFamily: 'Nunito-Regular' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', textAlign: 'center' },
  errorText: { textAlign: 'center', marginTop: 8, fontFamily: 'Nunito-Regular' },
  retryButton: { marginTop: 24, backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { color: '#FFFFFF', fontFamily: 'Nunito-SemiBold' },
  miniRetryButton: { backgroundColor: '#6366f1', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
