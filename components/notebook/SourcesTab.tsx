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
import { getSignedUrl } from '@/lib/upload';

interface SourcesTabProps {
  notebook: Notebook;
}

export const SourcesTab: React.FC<SourcesTabProps> = ({ notebook }) => {
  const material = notebook.materials?.[0];
  const router = useRouter();

  // Handle viewing image
  const handleViewImage = async (mat: Material) => {
    if (!mat.uri) return;

    const { url, error } = await getSignedUrl(mat.uri, 3600);
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
      <ScrollView className="flex-1 bg-white">
        <View className="px-6 py-6">
          {/* Material Icon & Title */}
          <View className="flex-row items-start mb-6">
            <Text className="text-5xl mr-3">{getTopicEmoji(notebook.title)}</Text>
            <View className="flex-1">
              <Text
                className="text-2xl text-neutral-900 mb-1"
                style={{ fontFamily: 'SpaceGrotesk-Bold' }}
              >
                {notebook.title}
              </Text>
              <Text className="text-sm text-neutral-500">
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
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 pt-3 pb-6">
        {/* OCR Quality Warning Banner (for camera photos) */}
        {material?.meta?.ocr_quality?.lowQuality &&
          (material.type === 'photo' || material.type === 'image') && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                <Text className="text-yellow-800 text-sm flex-1">
                  📸 Photo quality could be better. Try retaking for best results.
                </Text>
              </View>
              {material.meta.ocr_quality.confidence && (
                <Text className="text-yellow-600 text-xs mt-1">
                  OCR confidence: {Math.round(material.meta.ocr_quality.confidence)}%
                </Text>
              )}
            </View>
          )}

        {/* Sources List */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-neutral-900 mb-3">Sources</Text>
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
                    className={`bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 flex-row items-center ${index < notebook.materials.length - 1 ? 'mb-3' : ''}`}
                  >
                    <View className="w-10 h-10 bg-neutral-200 rounded-lg items-center justify-center mr-3">
                      <Ionicons name={getMaterialIcon()} size={20} color="#525252" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-neutral-900" numberOfLines={1}>
                        {mat.filename || mat.title || `Source ${index + 1}`}
                      </Text>
                      <Text className="text-sm text-neutral-500 mt-0.5">
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
            <Text className="text-neutral-500">No sources available</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
