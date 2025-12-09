/**
 * ChatTab - Q&A interface with material
 * MVP: Uses suggested chat pills instead of full chat
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Notebook } from '@/lib/store';
import { MarkdownText } from '@/components/MarkdownText';
import { PreviewSkeleton } from './PreviewSkeleton';
import { getTopicEmoji } from '@/lib/emoji-matcher';

interface ChatTabProps {
  notebook: Notebook;
  onTakeQuiz?: () => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ notebook, onTakeQuiz }) => {
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const materialCount = notebook.materials?.length || 0;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Gentle pulse animation for emoji (breathing effect)
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const handleGetStudyPlan = () => {
    setShowStudyPlan(true);
  };

  const handleTakeQuiz = () => {
    if (onTakeQuiz) {
      onTakeQuiz();
    }
  };

  // Generate a simple study plan based on material type
  const generateStudyPlan = () => {
    const material = notebook.materials?.[0];
    const materialType = material?.type || 'material';

    return `Based on your ${materialType}, here's a suggested study plan:

1. **Review the material** (15-20 minutes)
   - Read through the key points and concepts
   - Highlight important sections

2. **Create flashcards** (10-15 minutes)
   - Use the Studio tab to generate AI flashcards
   - Review cards multiple times

3. **Take a practice quiz** (10 minutes)
   - Test your understanding with the Quiz feature
   - Review any mistakes

4. **Active recall** (10 minutes)
   - Try to explain concepts without looking
   - Use the Feynman technique

Remember to take breaks and space out your study sessions for better retention!`;
  };

  // Render loading state with skeleton
  if (notebook.status === 'extracting') {
    return (
      <ScrollView className="flex-1 bg-white">
        <View className="px-6 py-6">
          {/* Material Icon & Title */}
          <View className="flex-row items-start mb-6">
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
              }}
            >
              <Text className="text-5xl mr-3">{getTopicEmoji(notebook.title)}</Text>
            </Animated.View>
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ flexGrow: 1 }}>
        {/* Material Icon & Title */}
        <View className="flex-row items-start mb-6">
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
            }}
          >
            <Text className="text-5xl mr-3">{getTopicEmoji(notebook.title)}</Text>
          </Animated.View>
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

        {/* Overview Content (if available) - NotebookLM style narrative */}
        {(notebook.meta?.preview?.overview || notebook.meta?.preview?.tl_dr) && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-neutral-900 mb-3">Overview</Text>
            <MarkdownText style={{ fontSize: 16, color: '#404040', lineHeight: 24 }}>
              {notebook.meta.preview.overview || notebook.meta.preview.tl_dr || ''}
            </MarkdownText>
          </View>
        )}

        {/* Chat Messages Area */}
        {!showStudyPlan ? (
          // Empty state with icon (only show if no overview)
          !(notebook.meta?.preview?.overview || notebook.meta?.preview?.tl_dr) && (
            <View className="flex-1 items-center justify-center">
              <View className="w-20 h-20 bg-neutral-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="chatbubble-outline" size={32} color="#6366f1" />
              </View>
              <Text className="text-lg font-semibold text-neutral-900 mb-2">
                Ask questions about your material
              </Text>
              <Text className="text-sm text-neutral-600 text-center max-w-xs">
                Chat with your {materialCount} source{materialCount !== 1 ? 's' : ''} to get
                answers and insights.
              </Text>
            </View>
          )
        ) : (
          // Study plan conversation
          <View className="flex-1">
            {/* User message */}
            <View className="flex-row justify-end mb-4">
              <View className="bg-primary-500 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <Text className="text-white text-base">
                  Get study plan
                </Text>
              </View>
            </View>

            {/* AI response */}
            <View className="flex-row justify-start mb-4">
              <View className="bg-neutral-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <Text className="text-neutral-900 text-base leading-6">
                  {generateStudyPlan()}
                </Text>
              </View>
            </View>

            {/* Info note */}
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
              <Text className="text-xs text-amber-800">
                💡 This is a suggested study plan. Full chat functionality coming soon!
              </Text>
            </View>
          </View>
        )}
        {/* Suggested Chat Pills - moved inside ScrollView to sit below content */}
        {!showStudyPlan && (
          <View className="pt-6 pb-2">
            <Text className="text-xs text-neutral-500 mb-2">Suggested</Text>
            <View className="flex-row flex-wrap gap-2">
              {/* Get Study Plan Pill */}
              <TouchableOpacity
                onPress={handleGetStudyPlan}
                className="bg-neutral-100 rounded-full px-4 py-2.5 flex-row items-center"
                activeOpacity={0.7}
              >
                <Ionicons name="bulb-outline" size={16} color="#525252" className="mr-1.5" />
                <Text className="text-sm text-neutral-700 font-medium ml-1.5">
                  Get study plan
                </Text>
              </TouchableOpacity>

              {/* Take Quiz Pill */}
              <TouchableOpacity
                onPress={handleTakeQuiz}
                className="bg-neutral-100 rounded-full px-4 py-2.5 flex-row items-center"
                activeOpacity={0.7}
              >
                <Ionicons name="help-circle-outline" size={16} color="#525252" className="mr-1.5" />
                <Text className="text-sm text-neutral-700 font-medium ml-1.5">
                  Take quiz
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
