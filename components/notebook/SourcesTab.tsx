/**
 * SourcesTab - Displays material sources and preview
 * Shows loading state during extraction, preview when ready
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Notebook, Material } from '@/lib/store';
import { PreviewSkeleton } from './PreviewSkeleton';
import { getTopicEmoji } from '@/lib/emoji-matcher';
import { storageService } from '@/lib/storage/storageService';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

interface SourcesTabProps {
  notebook: Notebook;
}

export const SourcesTab: React.FC<SourcesTabProps> = ({ notebook }) => {
  const material = notebook.materials?.[0];
  const router = useRouter();

  // Theme
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

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

  // Render loading state with skeleton
  if (notebook.status === 'extracting') {
    const materialCount = notebook.materials?.length || 0;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          {/* Material Icon & Title */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
            <Text style={{ fontSize: 48, marginRight: 12 }}>{notebook.emoji || getTopicEmoji(notebook.title)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, color: colors.text, marginBottom: 4, fontFamily: 'Nunito-Bold' }}>
                {notebook.title}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
                {materialCount} source{materialCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Skeleton Preview Content */}
          <PreviewSkeleton lines={6} />
        </View>
      </ScrollView>
    );
  }

  // Render preview content
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}>
        {/* OCR Quality Warning Banner (for camera photos) */}
        {material?.meta?.ocr_quality?.lowQuality &&
          (material.type === 'photo' || material.type === 'image') && (
            <View style={{ backgroundColor: isDarkMode ? 'rgba(120, 53, 15, 0.3)' : '#fefce8', borderWidth: 1, borderColor: isDarkMode ? '#92400e' : '#fde68a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                <Text style={{ color: isDarkMode ? '#fde68a' : '#854d0e', fontSize: 14, flex: 1 }}>
                  📸 Photo quality could be better. Try retaking for best results.
                </Text>
              </View>
              {material.meta.ocr_quality.confidence && (
                <Text style={{ color: isDarkMode ? '#fbbf24' : '#ca8a04', fontSize: 12, marginTop: 4 }}>
                  OCR confidence: {Math.round(material.meta.ocr_quality.confidence)}%
                </Text>
              )}
            </View>
          )}

        {/* Sources List */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito-SemiBold', color: colors.text, marginBottom: 12 }}>Sources</Text>
          {notebook.materials && notebook.materials.length > 0 ? (
            <View>
              {notebook.materials.map((mat, index) => {
                const getMaterialIcon = () => {
                  switch (mat.type) {
                    case 'pdf':
                      return 'document-text';
                    case 'audio':
                      return 'musical-notes';
                    case 'image':
                    case 'photo':
                      return 'image';
                    case 'website':
                      return 'globe';
                    case 'youtube':
                      return 'logo-youtube';
                    case 'copied-text':
                      return 'document';
                    default:
                      return 'document';
                  }
                };

                const isViewableImage = mat.type === 'image' || mat.type === 'photo';

                const sourceCard = (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: index < notebook.materials.length - 1 ? 12 : 0
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
                  </View>
                );

                return isViewableImage ? (
                  <TouchableOpacity
                    key={mat.id || index}
                    onPress={() => handleViewImage(mat)}
                    activeOpacity={0.7}
                  >
                    {sourceCard}
                  </TouchableOpacity>
                ) : (
                  <View key={mat.id || index}>
                    {sourceCard}
                  </View>
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
