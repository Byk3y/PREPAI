import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { TikTokLoader } from '@/components/TikTokLoader';

interface StudioMediaItemProps {
    onPress?: () => void;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    subtitle?: string | React.ReactNode;
    onDelete?: () => void;
    isGenerating?: boolean;
    loadingColor?: string;
    loadingText?: string;
}

export const StudioMediaItem: React.FC<StudioMediaItemProps> = ({
    onPress,
    icon,
    iconColor,
    title,
    subtitle,
    onDelete,
    isGenerating,
    loadingColor = '#2563eb',
    loadingText = 'Generating...'
}) => {
    const content = (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            className={`p-3 mb-2 flex-row items-center ${!isGenerating ? 'bg-white' : ''}`}
            activeOpacity={0.7}
        >
            <View className="mr-4">
                <Ionicons name={icon} size={24} color={iconColor} />
            </View>
            <View className="flex-1">
                <Text className="text-base font-medium text-neutral-900">
                    {title}
                </Text>
                {isGenerating ? (
                    <View className="flex-row items-center mt-0.5">
                        <TikTokLoader size={10} color={loadingColor} containerWidth={50} />
                        <Text className="text-xs ml-2" style={{ color: loadingColor }}>
                            {loadingText}
                        </Text>
                    </View>
                ) : (
                    <Text className="text-xs text-neutral-500 mt-0.5">
                        {subtitle}
                    </Text>
                )}
            </View>
            {!isGenerating && onPress && (
                <Ionicons name="chevron-forward" size={20} color="#a3a3a3" />
            )}
        </TouchableOpacity>
    );

    if (onDelete) {
        return (
            <Swipeable
                renderRightActions={(progress, dragX) => {
                    const scale = dragX.interpolate({
                        inputRange: [-100, 0],
                        outputRange: [1, 0],
                        extrapolate: 'clamp',
                    });
                    return (
                        <TouchableOpacity
                            onPress={onDelete}
                            className="bg-red-500 justify-center items-center px-6 mb-2"
                            style={{ borderRadius: 8 }}
                        >
                            <Animated.View style={{ transform: [{ scale }] }}>
                                <Ionicons name="trash-outline" size={24} color="#fff" />
                            </Animated.View>
                        </TouchableOpacity>
                    );
                }}
                overshootRight={false}
            >
                {content}
            </Swipeable>
        );
    }

    return content;
};
