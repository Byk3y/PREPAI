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
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

interface ChatTabProps {
  notebook: Notebook;
  onTakeQuiz?: () => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ notebook, onTakeQuiz }) => {
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const materialCount = notebook.materials?.length || 0;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Theme
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

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
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          {/* Material Icon & Title */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Text style={{ fontSize: 48, marginRight: 12 }}>{getTopicEmoji(notebook.title)}</Text>
            </Animated.View>
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 24 }} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Material Icon & Title */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={{ fontSize: 48, marginRight: 12 }}>{getTopicEmoji(notebook.title)}</Text>
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, color: colors.text, marginBottom: 4, fontFamily: 'Nunito-Bold' }}>
              {notebook.title}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
              {materialCount} source{materialCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Overview Content (if available) - NotebookLM style narrative */}
        {(notebook.meta?.preview?.overview || notebook.meta?.preview?.tl_dr) && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, color: colors.text, marginBottom: 12, fontFamily: 'Nunito-SemiBold' }}>Overview</Text>
            <MarkdownText style={{ fontSize: 16, color: colors.textSecondary, lineHeight: 24, fontFamily: 'Nunito-Regular' }}>
              {notebook.meta.preview.overview || notebook.meta.preview.tl_dr || ''}
            </MarkdownText>
          </View>
        )}

        {/* Chat Messages Area */}
        {!showStudyPlan ? (
          // Empty state with icon (only show if no overview)
          !(notebook.meta?.preview?.overview || notebook.meta?.preview?.tl_dr) && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 80, height: 80, backgroundColor: colors.surfaceAlt, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="chatbubble-outline" size={32} color="#6366f1" />
              </View>
              <Text style={{ fontSize: 18, color: colors.text, marginBottom: 8, fontFamily: 'Nunito-SemiBold' }}>
                Ask questions about your material
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 280, fontFamily: 'Nunito-Regular' }}>
                Chat with your {materialCount} source{materialCount !== 1 ? 's' : ''} to get
                answers and insights.
              </Text>
            </View>
          )
        ) : (
          // Study plan conversation
          <View style={{ flex: 1 }}>
            {/* User message */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
              <View style={{ backgroundColor: '#FFB800', borderRadius: 16, borderTopRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '80%' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Nunito-Medium' }}>
                  Get study plan
                </Text>
              </View>
            </View>

            {/* AI response */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 16 }}>
              <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 16, borderTopLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '85%' }}>
                <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontFamily: 'Nunito-Regular' }}>
                  {generateStudyPlan()}
                </Text>
              </View>
            </View>

            {/* Info note */}
            <View style={{ backgroundColor: isDarkMode ? 'rgba(120, 53, 15, 0.3)' : '#fffbeb', borderWidth: 1, borderColor: isDarkMode ? '#92400e' : '#fde68a', borderRadius: 12, padding: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#fcd34d' : '#92400e', fontFamily: 'Nunito-Regular' }}>
                💡 This is a suggested study plan. Full chat functionality coming soon!
              </Text>
            </View>
          </View>
        )}
        {/* Suggested Chat Pills - moved inside ScrollView to sit below content */}
        {!showStudyPlan && (
          <View style={{ paddingTop: 24, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8, fontFamily: 'Nunito-Regular' }}>Suggested</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {/* Get Study Plan Pill */}
              <TouchableOpacity
                onPress={handleGetStudyPlan}
                style={{ backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Ionicons name="bulb-outline" size={16} color={colors.iconMuted} />
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 6, fontFamily: 'Nunito-Medium' }}>
                  Get study plan
                </Text>
              </TouchableOpacity>

              {/* Take Quiz Pill */}
              <TouchableOpacity
                onPress={handleTakeQuiz}
                style={{ backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Ionicons name="help-circle-outline" size={16} color={colors.iconMuted} />
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 6, fontFamily: 'Nunito-Medium' }}>
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
