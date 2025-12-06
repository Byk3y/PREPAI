import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface HomeActionButtonsProps {
    onCameraPress: () => void;
    onAddPress: () => void;
}

export const HomeActionButtons: React.FC<HomeActionButtonsProps> = ({
    onCameraPress,
    onAddPress
}) => {
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
                className="w-14 h-14 rounded-full bg-white items-center justify-center shadow-sm border border-neutral-200"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                }}
            >
                <MaterialIcons name="camera-alt" size={24} color="#4B5563" />
            </TouchableOpacity>

            {/* Add Materials Button */}
            <TouchableOpacity
                onPress={onAddPress}
                className="bg-neutral-900 px-8 py-4 rounded-full shadow-lg flex-row items-center gap-2"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                <Text
                    style={{ fontFamily: 'SpaceGrotesk-SemiBold' }}
                    className="text-white text-base"
                >
                    Add Materials
                </Text>
            </TouchableOpacity>
        </View>
    );
};
