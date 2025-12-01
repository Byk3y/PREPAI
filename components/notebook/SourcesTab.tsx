/**
 * SourcesTab - Displays material sources and preview
 * Shows loading state during extraction, preview when ready
 */

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Notebook } from '@/lib/store';
import { PreviewSkeleton } from './PreviewSkeleton';
import { getTopicEmoji } from '@/lib/emoji-matcher';

interface SourcesTabProps {
  notebook: Notebook;
}

export const SourcesTab: React.FC<SourcesTabProps> = ({ notebook }) => {
  const material = notebook.materials?.[0];
  const materialCount = notebook.materials?.length || 0;

  // Render loading state with skeleton
  if (notebook.status === 'extracting') {
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

          {/* Disclaimer */}
          <View className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mt-4">
            <Text className="text-xs text-neutral-600 text-center">
              PrepAI can be inaccurate, so double-check.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Render preview content
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

        {/* Preview Content (if available) */}
        {notebook.meta?.preview?.tl_dr && (
          <View className="mb-4">
            <Text className="text-base text-neutral-700 leading-6">
              {notebook.meta.preview.tl_dr}
            </Text>
          </View>
        )}

        {/* Key Points (if available) */}
        {notebook.meta?.preview?.bullets && notebook.meta.preview.bullets.length > 0 && (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-neutral-900 mb-2">
              Key Points
            </Text>
            {notebook.meta.preview.bullets.map((bullet, index) => (
              <View key={index} className="flex-row mb-2">
                <Text className="text-neutral-400 mr-2">•</Text>
                <Text className="flex-1 text-neutral-700">{bullet}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Who is this for */}
        {notebook.meta?.preview?.who_for && (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-neutral-900 mb-2">
              Who is this for?
            </Text>
            <Text className="text-neutral-700">{notebook.meta.preview.who_for}</Text>
          </View>
        )}

        {/* Next Step */}
        {notebook.meta?.preview?.next_step && (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-neutral-900 mb-2">
              Next step
            </Text>
            <Text className="text-neutral-700">{notebook.meta.preview.next_step}</Text>
          </View>
        )}

        {/* Disclaimer */}
        <View className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mt-4">
          <Text className="text-xs text-neutral-600 text-center">
            PrepAI can be inaccurate, so double-check.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
