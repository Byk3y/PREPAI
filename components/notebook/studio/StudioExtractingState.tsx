/**
 * StudioExtractingState - Loading state while material is being processed
 */

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export const StudioExtractingState: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 80,
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            backgroundColor: colors.surfaceAlt,
            borderRadius: 40,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Ionicons name="sparkles" size={32} color={colors.iconMuted} />
        </View>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Processing material...
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
          }}
        >
          Studio features will be available once your material is processed.
        </Text>
      </View>
    </ScrollView>
  );
};














