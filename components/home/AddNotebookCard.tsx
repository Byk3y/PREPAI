/**
 * Add Notebook Card with animated gradient border
 * Uses the reusable AnimatedGradientBorder component
 */

import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { AnimatedGradientBorder } from '@/components/AnimatedGradientBorder';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

interface AddNotebookCardProps {
  onPress: () => void;
}

export const AddNotebookCard: React.FC<AddNotebookCardProps> = ({ onPress }) => {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ marginBottom: 16 }}
    >
      <AnimatedGradientBorder>
        <View
          style={{
            backgroundColor: colors.surface,
            paddingVertical: 16,
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontFamily: 'Nunito-SemiBold',
              color: colors.text,
            }}
          >
            + Add New Notebook
          </Text>
        </View>
      </AnimatedGradientBorder>
    </TouchableOpacity>
  );
};
