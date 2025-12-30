import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export const StudioEmptyState: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View style={{
        width: 80,
        height: 80,
        backgroundColor: colors.surfaceAlt,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
      }}>
        <Ionicons name="sparkles-outline" size={32} color={colors.iconMuted} />
      </View>

      <Text style={{ color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
        No generated media yet
      </Text>
      <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
        Tap a generator above to create audio, flashcards, or a quiz.
      </Text>
    </View>
  );
};
