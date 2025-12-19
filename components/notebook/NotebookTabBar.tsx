/**
 * NotebookTabBar - Tab navigation bar for Sources/Chat/Studio tabs
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export type TabType = 'sources' | 'chat' | 'studio';

interface NotebookTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const NotebookTabBar: React.FC<NotebookTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row' }}>
        {/* Sources Tab */}
        <TouchableOpacity
          onPress={() => onTabChange('sources')}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
        >
          <Ionicons
            name={activeTab === 'sources' ? 'library' : 'library-outline'}
            size={22}
            color={colors.icon}
          />
          <Text style={{ fontSize: 12, marginTop: 4, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
            Sources
          </Text>
        </TouchableOpacity>

        {/* Chat Tab */}
        <TouchableOpacity
          onPress={() => onTabChange('chat')}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
        >
          <Ionicons
            name={activeTab === 'chat' ? 'chatbubbles' : 'chatbubbles-outline'}
            size={22}
            color={colors.icon}
          />
          <Text style={{ fontSize: 12, marginTop: 4, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
            Chat
          </Text>
        </TouchableOpacity>

        {/* Studio Tab */}
        <TouchableOpacity
          onPress={() => onTabChange('studio')}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
        >
          <Ionicons
            name={activeTab === 'studio' ? 'color-palette' : 'color-palette-outline'}
            size={22}
            color={colors.icon}
          />
          <Text style={{ fontSize: 12, marginTop: 4, color: colors.textSecondary, fontFamily: 'Nunito-Regular' }}>
            Studio
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

