/**
 * Text Input Modal - NotebookLM style for pasting copied text
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface TextInputModalProps {
  visible: boolean;
  type: 'text' | 'note';
  onClose: () => void;
  onSave: (title: string, content: string) => void;
}

export default function TextInputModal({
  visible,
  type,
  onClose,
  onSave,
}: TextInputModalProps) {
  const [content, setContent] = useState('');
  const [inputHeight, setInputHeight] = useState(80);

  const handleSave = () => {
    if (!content.trim()) {
      return;
    }

    // Generate title from first line or first 50 characters
    const firstLine = content.trim().split('\n')[0];
    const title = firstLine.length > 50 
      ? firstLine.substring(0, 50).trim() + '...'
      : firstLine.trim() || 'Untitled';

    onSave(title, content.trim());

    // Reset field
    setContent('');
    setInputHeight(80);
  };

  const handleCancel = () => {
    setContent('');
    setInputHeight(80);
    onClose();
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    // Expand input as content grows
    if (text.trim()) {
      const lines = text.split('\n').length;
      const newHeight = Math.min(Math.max(80, lines * 24 + 32), 450);
      setInputHeight(newHeight);
    } else {
      setInputHeight(80);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#171717" />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#171717" />
            </TouchableOpacity>
          </View>

          {/* Main Content - Dismiss keyboard on tap outside */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
            {/* Central Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="document-text" size={32} color="#3B82F6" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Paste Copied Text</Text>

            {/* Description */}
            <Text style={styles.description}>
              Paste your copied text below to upload as a source in PrepAI.
            </Text>

            {/* Text Input - Starts small, expands with content */}
            <TextInput
              style={[
                styles.textInput,
                { height: inputHeight },
              ]}
              placeholder="Paste text here"
              placeholderTextColor="#A3A3A3"
              value={content}
              onChangeText={handleContentChange}
              multiline={true}
              textAlignVertical="top"
              autoFocus={true}
              onContentSizeChange={(event) => {
                const { height } = event.nativeEvent.contentSize;
                // Slightly increased max height for better text preview
                const newHeight = Math.min(Math.max(80, height + 16), 450);
                setInputHeight(newHeight);
              }}
            />

            {/* Add Button */}
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.addButton,
                !content.trim() && styles.addButtonDisabled,
              ]}
              disabled={!content.trim()}
            >
              <Text
                style={[
                  styles.addButtonText,
                  !content.trim() && styles.addButtonTextDisabled,
                ]}
              >
                Add
              </Text>
            </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#737373',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  textInput: {
    width: '100%',
    fontSize: 16,
    color: '#171717',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  addButton: {
    width: '100%',
    backgroundColor: '#171717',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 32,
  },
  addButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButtonTextDisabled: {
    color: '#A3A3A3',
  },
});
