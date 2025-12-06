import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GenerateOptionProps {
    type: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    label: string;
    bgColor: string;
    textColor: string;
    isGenerating: boolean;
    onPress: () => void;
    disabled: boolean;
}

export const GenerateOption: React.FC<GenerateOptionProps> = ({
    icon,
    color,
    label,
    bgColor,
    isGenerating,
    onPress,
    disabled
}) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        className={`${bgColor} rounded-full p-4 flex-row items-center mb-3`}
        activeOpacity={0.7}
    >
        <View className="mr-4 ml-1">
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text className="flex-1 text-base font-semibold text-neutral-900">
            {label}
        </Text>
        {isGenerating ? (
            <ActivityIndicator size="small" color={color} />
        ) : (
            <View className="w-10 h-10 bg-black/5 rounded-full items-center justify-center">
                <Ionicons name="pencil" size={18} color="#525252" />
            </View>
        )}
    </TouchableOpacity>
);
