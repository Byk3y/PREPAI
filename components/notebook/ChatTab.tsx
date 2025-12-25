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
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { Notebook } from '@/lib/store';
import { MarkdownText } from '@/components/MarkdownText';
import { PreviewSkeleton } from './PreviewSkeleton';
import { getTopicEmoji } from '@/lib/emoji-matcher';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { BackgroundProcessingIndicator } from '@/components/BackgroundProcessingIndicator';
import { SourceSelectionModal } from './SourceSelectionModal';
import { useNotebookChat } from '@/lib/hooks/useNotebookChat';
import { useStore } from '@/lib/store';

interface ChatTabProps {
  notebook: Notebook;
  onTakeQuiz?: () => void;
}

const TypingIndicator = ({ color }: { color: string }) => {
  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.delay(500 - (delay % 500)), // Adjust delay to keep cycle length consistent
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 8, paddingHorizontal: 4 }}>
      <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: dot1 }} />
      <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: dot2 }} />
      <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: dot3 }} />
    </View>
  );
};

export const ChatTab: React.FC<ChatTabProps> = ({ notebook, onTakeQuiz }) => {
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(
    notebook.materials?.map(m => m.id) || []
  );
  const [sourceModalVisible, setSourceModalVisible] = useState(false);

  const materialCount = notebook.materials?.length || 0;
  const selectedCount = selectedMaterialIds.length;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  const { sendMessage, isStreaming } = useNotebookChat(notebook.id);

  // Reactively select chat messages from the store to ensure updates (like optimistic ones) are shown
  const chatMessages = useStore(state =>
    state.notebooks.find(n => n.id === notebook.id)?.chat_messages || []
  );
  const petName = useStore(state => state.petState.name);

  // Theme
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Track if we've done the initial scroll to avoid annoying "quick scroll" animation on entry
  const hasInitiallyScrolled = useRef(false);

  // Load chat messages on mount
  useEffect(() => {
    useStore.getState().loadChatMessages(notebook.id);
    hasInitiallyScrolled.current = false; // Reset when notebook changes
  }, [notebook.id]);

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    if (chatMessages.length > 0 || isStreaming) {
      const shouldAnimate = hasInitiallyScrolled.current;

      // We use a short timeout to ensure layout has finished
      const timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: shouldAnimate });
        hasInitiallyScrolled.current = true;
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [chatMessages, isStreaming]);

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

  const handleTakeQuiz = () => {
    if (notebook.status === 'extracting') return;
    if (onTakeQuiz) {
      onTakeQuiz();
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return;
    const msg = inputText.trim();
    setInputText('');
    Keyboard.dismiss();
    sendMessage(msg, selectedMaterialIds);
  };

  const handleCopy = async (content: string) => {
    if (!content) return;
    await Clipboard.setStringAsync(content);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const selectAllMaterials = () => {
    if (selectedMaterialIds.length === materialCount) {
      setSelectedMaterialIds([]);
    } else {
      setSelectedMaterialIds(notebook.materials.map(m => m.id));
    }
  };


  // Check if background processing is active
  // Show progress indicator if extracting
  const isExtracting = notebook.status === 'extracting';
  const isBackgroundProcessing = (notebook.meta as any)?.background_processing === true;

  // Render loading state with skeleton or background indicator
  if (isExtracting) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          {/* Material Icon & Title */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Text style={{ fontSize: 48, marginRight: 12 }}>{notebook.emoji || getTopicEmoji(notebook.title)}</Text>
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

          {/* Background Processing Progress or Skeleton */}
          {isBackgroundProcessing ? (
            <View style={{ marginBottom: 24 }}>
              <BackgroundProcessingIndicator notebookId={notebook.id} />

              <View style={{ marginTop: 24, padding: 16, backgroundColor: colors.surfaceAlt, borderRadius: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  <Text style={{ marginLeft: 8, fontSize: 16, color: colors.text, fontFamily: 'Nunito-SemiBold' }}>
                    Processing Large Document
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, fontFamily: 'Nunito-Regular' }}>
                  This is a large file and we're processing it in the background. You can safely leave this page and come back later. We'll show the overview as soon as it's ready!
                </Text>
              </View>
            </View>
          ) : (
            <PreviewSkeleton lines={8} />
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Material Icon & Title */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={{ fontSize: 48, marginRight: 12 }}>{notebook.emoji || getTopicEmoji(notebook.title)}</Text>
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
        <View style={{ flex: 1 }}>
          {chatMessages.length === 0 && !(notebook.meta?.preview?.overview || notebook.meta?.preview?.tl_dr) && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
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
          )}

          {chatMessages.map((msg, index) => (
            <View
              key={msg.id || index}
              style={{
                flexDirection: 'row',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 16,
              }}
            >
              <View style={{ maxWidth: '85%' }}>
                <View
                  style={{
                    backgroundColor: msg.role === 'user' ? '#3B82F6' : colors.surfaceAlt,
                    borderRadius: 18,
                    borderTopRightRadius: msg.role === 'user' ? 4 : 18,
                    borderTopLeftRadius: msg.role === 'assistant' ? 4 : 18,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  {msg.role === 'user' ? (
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Nunito-Medium' }}>
                      {msg.content}
                    </Text>
                  ) : (
                    msg.content === '' ? (
                      <TypingIndicator color={colors.textSecondary} />
                    ) : (
                      <MarkdownText
                        selectable={false}
                        style={{
                          fontSize: 16,
                          color: colors.text,
                          lineHeight: 24,
                          fontFamily: 'Nunito-Regular',
                        }}
                      >
                        {msg.content}
                      </MarkdownText>
                    )
                  )}
                </View>
                {/* Copy button for assistant messages */}
                {msg.role === 'assistant' && msg.content !== '' && (
                  <TouchableOpacity
                    onPress={() => handleCopy(msg.content)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 6,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4, fontFamily: 'Nunito-Regular' }}>
                      Copy
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Bottom Interface logic (Pills + Input) */}
      <View style={{ backgroundColor: colors.background, paddingTop: 8 }}>
        {/* Floating Suggested Chat Pills */}
        {chatMessages.length === 0 && (
          <View style={{ marginBottom: 8 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 8 }}
            >
              {/* AI Suggested Questions */}
              {notebook.meta?.preview?.suggested_questions?.map((question: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setInputText('');
                    sendMessage(question, selectedMaterialIds);
                  }}
                  style={{
                    backgroundColor: isDarkMode ? '#2d2d30' : '#ffffff',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#3a3a3c' : '#e5e5e7',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontFamily: 'Nunito-Medium' }}>
                    {question}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Take Quiz Pill */}
              <TouchableOpacity
                onPress={handleTakeQuiz}
                style={{
                  backgroundColor: isDarkMode ? '#2d2d30' : '#ffffff',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#3a3a3c' : '#e5e5e7',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontFamily: 'Nunito-Medium' }}>
                  Take quiz
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {!isInputFocused && inputText.length === 0 && (
          <Text
            style={{
              fontSize: 10,
              color: colors.textMuted,
              textAlign: 'center',
              marginBottom: 8,
              fontFamily: 'Nunito-Regular',
              opacity: 0.8,
            }}
          >
            Brigo can be inaccurate, so double-check.
          </Text>
        )}

        <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: isInputFocused ? colors.primary : (isDarkMode ? '#505052' : '#d1d1d6'),
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: isDarkMode ? '#1e1e20' : '#ffffff',
              minHeight: isInputFocused || inputText.length > 0 ? 80 : 60,
              paddingHorizontal: 14,
              paddingVertical: isInputFocused || inputText.length > 0 ? 12 : 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
              flexDirection: 'row',
              alignItems: isInputFocused || inputText.length > 0 ? 'flex-start' : 'center',
              borderBottomWidth: 0,
            }}
          >
            <View style={{ flex: 1, flexDirection: isInputFocused || inputText.length > 0 ? 'column' : 'row', alignItems: isInputFocused || inputText.length > 0 ? 'stretch' : 'center' }}>
              <TextInput
                ref={inputRef}
                placeholder={`Ask ${petName}...`}
                placeholderTextColor={colors.textSecondary}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 16,
                  fontFamily: 'Nunito-Medium',
                  textAlignVertical: 'top',
                  paddingTop: Platform.OS === 'ios' ? (isInputFocused || inputText.length > 0 ? 4 : 0) : 0,
                  paddingBottom: isInputFocused || inputText.length > 0 ? 40 : 0,
                }}
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                multiline
              />

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                  position: (isInputFocused || inputText.length > 0) ? 'absolute' : 'relative',
                  bottom: (isInputFocused || inputText.length > 0) ? 0 : undefined,
                  right: (isInputFocused || inputText.length > 0) ? 0 : undefined,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSourceModalVisible(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#2d2d30' : '#f0f0f2',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 14,
                    gap: 6,
                    borderWidth: 1.5,
                    borderColor: isDarkMode ? '#3a3a3c' : '#e5e5e7',
                  }}
                >
                  <Ionicons name="library-outline" size={14} color={colors.text} />
                  <Text style={{ fontSize: 13, color: colors.text, fontFamily: 'Nunito-SemiBold' }}>
                    {selectedCount}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                </TouchableOpacity>

                {(isInputFocused || inputText.trim().length > 0) && (
                  <TouchableOpacity
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: (inputText.trim().length > 0 && !isStreaming) ? '#3B82F6' : (isDarkMode ? '#2d2d30' : '#f0f0f2'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isStreaming}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="arrow-up-outline"
                      size={18}
                      color={(inputText.trim().length > 0 && !isStreaming) ? '#FFFFFF' : colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>

      <SourceSelectionModal
        visible={sourceModalVisible}
        onDismiss={() => setSourceModalVisible(false)}
        materials={notebook.materials || []}
        selectedMaterialIds={selectedMaterialIds}
        onToggleMaterial={toggleMaterial}
        onSelectAll={selectAllMaterials}
      />
    </KeyboardAvoidingView >
  );
};

