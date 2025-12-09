import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';

interface HomeActionButtonsProps {
    onCameraPress: () => void;
    onAddPress: () => void;
}

export const HomeActionButtons: React.FC<HomeActionButtonsProps> = ({
    onCameraPress,
    onAddPress
}) => {
    const { isDarkMode } = useTheme();

    // In light mode, use solid styling with shadow for visibility
    // In dark mode, use liquid glass effect
    const useLiquidGlass = isDarkMode && Platform.OS === 'ios';

    return (
        <View
            style={{
                position: 'absolute',
                bottom: 40,
                left: 24,
                right: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                zIndex: 10,
            }}
        >
            {/* Camera Button */}
            <TouchableOpacity
                onPress={onCameraPress}
                activeOpacity={0.8}
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    overflow: 'hidden',
                    // Light mode shadow
                    ...(!useLiquidGlass && {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 8,
                    }),
                }}
            >
                {useLiquidGlass ? (
                    <BlurView
                        intensity={40}
                        tint="light"
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        }}
                    >
                        <MaterialIcons 
                            name="camera-alt" 
                            size={24} 
                            color="#FFFFFF"
                        />
                    </BlurView>
                ) : (
                    <View
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#e5e4df',
                            borderRadius: 28,
                        }}
                    >
                        <MaterialIcons 
                            name="camera-alt" 
                            size={24} 
                            color="#1a1a1a"
                        />
                    </View>
                )}
            </TouchableOpacity>

            {/* Add Materials Button */}
            <TouchableOpacity
                onPress={onAddPress}
                activeOpacity={0.8}
                style={{
                    borderRadius: 999,
                    overflow: 'hidden',
                    // Light mode shadow
                    ...(!useLiquidGlass && {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 8,
                    }),
                }}
            >
                {useLiquidGlass ? (
                    <BlurView
                        intensity={40}
                        tint="light"
                        style={{
                            paddingHorizontal: 32,
                            paddingVertical: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        }}
                    >
                        <MaterialIcons 
                            name="add" 
                            size={20} 
                            color="#FFFFFF"
                        />
                        <Text
                            style={{ 
                                fontFamily: 'Nunito-SemiBold', 
                                fontSize: 16,
                                color: '#FFFFFF',
                            }}
                        >
                            Add Material
                        </Text>
                    </BlurView>
                ) : (
                    <View
                        style={{
                            paddingHorizontal: 32,
                            paddingVertical: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#e5e4df',
                            borderRadius: 999,
                        }}
                    >
                        <MaterialIcons 
                            name="add" 
                            size={20} 
                            color="#1a1a1a"
                        />
                        <Text
                            style={{ 
                                fontFamily: 'Nunito-SemiBold', 
                                fontSize: 16,
                                color: '#1a1a1a',
                            }}
                        >
                            Add Material
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};
