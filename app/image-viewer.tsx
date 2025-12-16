/**
 * Image Viewer Screen
 * Full-screen image viewer with horizontal slide navigation and swipe-back gesture
 */

import React, { useState } from 'react';
import {
    View,
    Image,
    Text,
    ActivityIndicator,
    Dimensions,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ImageViewerScreen() {
    const router = useRouter();
    const { imageUrl, filename } = useLocalSearchParams<{ imageUrl: string; filename: string }>();
    const [loading, setLoading] = useState(true);
    const { width } = Dimensions.get('window');

    if (!imageUrl) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <Text className="text-neutral-500">No image to display</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-neutral-200">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center"
                >
                    <Ionicons name="arrow-back" size={24} color="#171717" />
                </TouchableOpacity>
                <View className="flex-1 ml-3">
                    <Text className="text-base font-medium text-neutral-900" numberOfLines={1}>
                        {filename || 'Image'}
                    </Text>
                </View>
            </View>

            {/* Content */}
            <ScrollView className="flex-1">
                {/* Source Guide Section */}
                <View className="px-6 pt-4 pb-2">
                    <TouchableOpacity className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                            <Ionicons name="sparkles" size={20} color="#525252" />
                            <Text className="text-base font-medium text-neutral-900 ml-2">
                                Source Guide
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={20} color="#525252" />
                    </TouchableOpacity>
                </View>

                {/* Image Container */}
                <View className="px-4 items-center">
                    {loading && (
                        <ActivityIndicator
                            size="large"
                            color="#6366f1"
                            style={{ position: 'absolute', top: 200 }}
                        />
                    )}
                    <Image
                        source={{ uri: imageUrl }}
                        style={{
                            width: width - 32,
                            height: undefined,
                            aspectRatio: 0.7,
                        }}
                        resizeMode="contain"
                        onLoadEnd={() => setLoading(false)}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
