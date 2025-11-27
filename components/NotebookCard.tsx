/**
 * NotebookCard - Card component for notebook list
 * Shows notebook info with progress and last studied
 */

import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import type { Notebook } from '@/lib/store';

interface NotebookCardProps {
    notebook: Notebook;
    onPress: () => void;
}

const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
};

export const NotebookCard: React.FC<NotebookCardProps> = ({
    notebook,
    onPress,
}) => {
    const accentColor = colorMap[notebook.color || 'blue'];

    const getLastStudiedText = () => {
        if (!notebook.lastStudied) return 'Not studied yet';

        const lastStudiedDate = new Date(notebook.lastStudied);
        const now = new Date();
        const diffInMs = now.getTime() - lastStudiedDate.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Studied today';
        if (diffInDays === 1) return 'Studied yesterday';
        return `Studied ${diffInDays} days ago`;
    };

    const getMaterialIcon = (type: string) => {
        switch (type) {
            case 'pdf':
                return '📄';
            case 'photo':
                return '📸';
            case 'note':
                return '📝';
            case 'text':
                return '✍️';
            default:
                return '📄';
        }
    };

    const materialCount = notebook.materials?.length || 0;
    const materialTypes = notebook.materials?.map(m => getMaterialIcon(m.type)).join(' ') || '';

    return (
        <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 300 }}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-200 flex-row items-center"
            >
                {/* Colored accent bar */}
                <View className={`w-1 h-16 ${accentColor} rounded-full mr-4`} />

                {/* Content */}
                <View className="flex-1">
                    <Text className="text-lg font-semibold text-neutral-900 mb-1">
                        {notebook.emoji} {notebook.title}
                    </Text>
                    <Text className="text-sm text-neutral-500 mb-1">
                        {notebook.flashcardCount} flashcard{notebook.flashcardCount !== 1 ? 's' : ''} • {getLastStudiedText()}
                    </Text>
                    {materialCount > 0 && (
                        <View className="flex-row items-center mt-1">
                            <Text className="text-xs text-neutral-400 mr-1">
                                {materialCount} source{materialCount !== 1 ? 's' : ''}:
                            </Text>
                            <Text className="text-sm">{materialTypes}</Text>
                        </View>
                    )}
                </View>

                {/* Progress */}
                <View className="items-center ml-3">
                    <Text className="text-2xl font-bold text-neutral-800">
                        {notebook.progress}%
                    </Text>
                </View>
            </TouchableOpacity>
        </MotiView>
    );
};
