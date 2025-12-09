import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';

export const HomeHeader: React.FC = () => {
    const router = useRouter();
    const { authUser } = useStore();

    const handleProfilePress = () => {
        const buttons = authUser
            ? [
                {
                    text: 'Cancel' as const,
                    style: 'cancel' as const,
                },
                {
                    text: 'Sign Out' as const,
                    style: 'destructive' as const,
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/auth');
                    },
                },
            ]
            : [
                {
                    text: 'OK' as const,
                    style: 'default' as const,
                },
            ];

        Alert.alert(
            'Account',
            authUser ? `Signed in as ${authUser.email}` : 'Not signed in',
            buttons,
        );
    };

    return (
        <View className="flex-row items-center justify-between px-6 py-4 bg-white">
            <Text
                style={{ fontFamily: 'SpaceGrotesk-Bold' }}
                className="text-2xl text-neutral-900"
            >
                PrepAI
            </Text>
            <TouchableOpacity
                className="w-10 h-10 rounded-full bg-primary-500 items-center justify-center"
                onPress={handleProfilePress}
            >
                <Text className="text-xl">👤</Text>
            </TouchableOpacity>
        </View>
    );
};
