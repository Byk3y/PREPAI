/**
 * Text Input Modal - Full screen modal for entering text/notes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    onSave(title.trim(), content.trim());

    // Reset fields
    setTitle('');
    setContent('');
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    onClose();
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
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {type === 'note' ? 'Add Note' : 'Add Text'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.headerButton,
                (!title.trim() || !content.trim()) && styles.headerButtonDisabled,
              ]}
              disabled={!title.trim() || !content.trim()}
            >
              <Text
                style={[
                  styles.saveText,
                  (!title.trim() || !content.trim()) && styles.saveTextDisabled,
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Enter a title..."
                placeholderTextColor="#A3A3A3"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                autoFocus={true}
              />
            </View>

            {/* Content Input */}
            <View style={[styles.inputContainer, styles.contentInputContainer]}>
              <Text style={styles.label}>
                {type === 'note' ? 'Note Content' : 'Text Content'}
              </Text>
              <TextInput
                style={styles.contentInput}
                placeholder={
                  type === 'note'
                    ? 'Write your notes here...'
                    : 'Enter your text here...'
                }
                placeholderTextColor="#A3A3A3"
                value={content}
                onChangeText={setContent}
                multiline={true}
                textAlignVertical="top"
              />
            </View>

            {/* Character count */}
            <Text style={styles.charCount}>
              {content.length} character{content.length !== 1 ? 's' : ''}
            </Text>
          </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#171717',
  },
  cancelText: {
    fontSize: 16,
    color: '#737373',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
    textAlign: 'right',
  },
  saveTextDisabled: {
    color: '#A3A3A3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  contentInputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 16,
    color: '#171717',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  contentInput: {
    fontSize: 16,
    color: '#171717',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 300,
  },
  charCount: {
    fontSize: 13,
    color: '#A3A3A3',
    textAlign: 'right',
    marginTop: 8,
  },
});
