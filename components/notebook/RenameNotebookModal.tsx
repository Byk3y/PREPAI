/**
 * RenameNotebookModal - Modal for renaming a notebook
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

interface RenameNotebookModalProps {
  visible: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}

export const RenameNotebookModal: React.FC<RenameNotebookModalProps> = ({
  visible,
  value,
  onValueChange,
  onSave,
  onDismiss,
}) => {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onDismiss}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
                Rename Notebook
              </Text>
              <TextInput
                value={value}
                onChangeText={onValueChange}
                placeholder="Enter notebook name"
                placeholderTextColor={colors.textMuted}
                style={{ 
                  backgroundColor: colors.surfaceAlt, 
                  borderWidth: 1, 
                  borderColor: colors.border, 
                  borderRadius: 12, 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  fontSize: 16, 
                  color: colors.text, 
                  marginBottom: 16,
                  fontFamily: 'Nunito-Regular'
                }}
                autoFocus
                maxLength={100}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={onDismiss}
                  style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 16, fontFamily: 'Nunito-SemiBold', color: colors.textSecondary }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSave}
                  style={{ flex: 1, backgroundColor: isDarkMode ? '#F9FAFB' : '#111827', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  disabled={!value.trim()}
                >
                  <Text style={{ fontSize: 16, fontFamily: 'Nunito-SemiBold', color: isDarkMode ? '#111827' : '#FFFFFF' }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

