import React from 'react';
import { View, Text, TouchableOpacity, Alert, ActionSheetIOS, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import type { ThemeMode } from '@/lib/store/slices/themeSlice';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export const HomeHeader: React.FC = () => {
    const router = useRouter();
    const { authUser, themeMode, setThemeMode } = useStore();
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    const handleThemeChange = () => {
        const options = ['System', 'Light', 'Dark', 'Cancel'];
        const themeValues: ThemeMode[] = ['system', 'light', 'dark'];
        
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 3,
                    title: 'Appearance',
                    message: `Current: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}`,
                },
                (buttonIndex) => {
                    if (buttonIndex < 3) {
                        setThemeMode(themeValues[buttonIndex]);
                    }
                }
            );
        } else {
            // Android fallback using Alert
            Alert.alert(
                'Appearance',
                `Current: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}`,
                [
                    { text: 'System', onPress: () => setThemeMode('system') },
                    { text: 'Light', onPress: () => setThemeMode('light') },
                    { text: 'Dark', onPress: () => setThemeMode('dark') },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    };

    const handleProfilePress = () => {
        const buttons = authUser
            ? [
                {
                    text: 'Appearance' as const,
                    onPress: handleThemeChange,
                },
                {
                    text: 'Sign Out' as const,
                    style: 'destructive' as const,
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/auth');
                    },
                },
                {
                    text: 'Cancel' as const,
                    style: 'cancel' as const,
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
        <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            paddingHorizontal: 24, 
            paddingVertical: 16, 
            backgroundColor: colors.background 
        }}>
            <Text
                style={{ fontFamily: 'Nunito-Bold', fontSize: 24, color: colors.text }}
            >
                PrepAI
            </Text>
            <TouchableOpacity
                style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 20, 
                    backgroundColor: '#FFB800', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                }}
                onPress={handleProfilePress}
            >
                <Text style={{ fontSize: 20 }}>👤</Text>
            </TouchableOpacity>
        </View>
    );
};
