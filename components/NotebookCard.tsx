/**
 * NotebookCard - Card component for notebook list
 * Shows notebook info with progress and last studied
 */

import React, { useState } from 'react';
import { TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import type { Notebook } from '@/lib/store';
import { getTopicEmoji } from '@/lib/emoji-matcher';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { TikTokLoader } from '@/components/TikTokLoader';

interface NotebookCardProps {
    notebook: Notebook;
    onPress: () => void;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({
    notebook,
    onPress,
}) => {
    const [isRetrying, setIsRetrying] = useState(false);
    const { notebooks, setNotebooks } = useStore();

    // Generate consistent color based on notebook ID
    const getNotebookColor = () => {
        const colors = ['#EEF2FF', '#ECFDF5', '#FEF3C7', '#F5F3FF', '#FFF1F2'];
        const hash = notebook.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const handleRetry = async (e: any) => {
        // Prevent triggering onPress when clicking retry
        e.stopPropagation();

        if (!notebook.materials?.[0]?.id) {
            console.error('No material ID found for retry');
            return;
        }

        setIsRetrying(true);

        try {
            // Update notebook status to 'extracting' in database
            await supabase
                .from('notebooks')
                .update({ status: 'extracting' })
                .eq('id', notebook.id);

            // Update local state
            setNotebooks(
                notebooks.map((n) =>
                    n.id === notebook.id ? { ...n, status: 'extracting' as const } : n
                )
            );

            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Retry timeout after 60s')), 60000)
            );

            // Retry Edge Function
            const result = await Promise.race([
                supabase.functions.invoke('process-material', {
                    body: { material_id: notebook.materials[0].id },
                }),
                timeoutPromise,
            ]);

            const { data, error } = result as any;

            if (error) {
                console.error('Failed to retry Edge Function:', error);
                // Update back to failed
                await supabase
                    .from('notebooks')
                    .update({ status: 'failed' })
                    .eq('id', notebook.id);

                setNotebooks(
                    notebooks.map((n) =>
                        n.id === notebook.id ? { ...n, status: 'failed' as const } : n
                    )
                );
            } else {
                console.log('Edge Function retry successful:', data);
            }
        } catch (error) {
            console.error('Error during retry:', error);
            // Update back to failed
            await supabase
                .from('notebooks')
                .update({ status: 'failed' })
                .eq('id', notebook.id);

            setNotebooks(
                notebooks.map((n) =>
                    n.id === notebook.id ? { ...n, status: 'failed' as const } : n
                )
            );
        } finally {
            setIsRetrying(false);
        }
    };

    const getTimeAgoText = () => {
        if (!notebook.createdAt) return 'Just now';

        const createdDate = new Date(notebook.createdAt);
        const now = new Date();
        const diffInMs = now.getTime() - createdDate.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        
        // For dates older than a week, show the date
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[createdDate.getMonth()];
        const day = createdDate.getDate();
        const year = createdDate.getFullYear();
        return `${month} ${day}, ${year}`;
    };

    const materialCount = notebook.materials?.length || 0;

    return (
        <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 300 }}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                className="rounded-2xl p-4 mb-3 flex-row items-center"
                style={{ backgroundColor: getNotebookColor() }}
            >
                {/* Emoji on the left */}
                <View className="mr-3">
                    <Text className="text-3xl">{getTopicEmoji(notebook.title)}</Text>
                </View>

                {/* Content */}
                <View className="flex-1">
                    <Text className="text-lg font-bold text-neutral-900 mb-0.5" numberOfLines={1} ellipsizeMode="tail">
                        {notebook.title}
                    </Text>
                    <Text className="text-xs text-neutral-600">
                        {materialCount} source{materialCount !== 1 ? 's' : ''} • {getTimeAgoText()}
                    </Text>

                    {/* Failed status with retry button */}
                    {notebook.status === 'failed' && (
                        <View className="mt-2 flex-row items-center gap-2">
                            <Text className="text-xs text-red-600 font-medium">Processing failed</Text>
                            <TouchableOpacity
                                onPress={handleRetry}
                                disabled={isRetrying}
                                className="bg-red-100 px-3 py-1 rounded-full flex-row items-center gap-1"
                                activeOpacity={0.7}
                            >
                                {isRetrying ? (
                                    <ActivityIndicator size="small" color="#DC2626" />
                                ) : (
                                    <Text className="text-xs text-red-600 font-semibold">Retry</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* TikTok loader on the right side for extracting status */}
                {notebook.status === 'extracting' && (
                    <View className="ml-3 items-center justify-center">
                        <TikTokLoader size={10} color="#6366f1" containerWidth={50} />
                    </View>
                )}
            </TouchableOpacity>
        </MotiView>
    );
};
