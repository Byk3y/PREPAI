import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, ActionSheetIOS, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import type { ThemeMode } from '@/lib/store/slices/themeSlice';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

// Convert HSL to RGB
const hslToRgb = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `rgb(${r}, ${g}, ${b})`;
};

// Generate unique gradient colors from a string (user ID or email)
const generateGradientFromString = (str: string, isDark: boolean): string[] => {
    // Hash the string to get consistent values
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate two colors from the hash
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 60) % 360; // Complementary color
    
    // For light mode: brighter, more saturated colors
    // For dark mode: slightly darker, more muted colors
    const saturation = isDark ? 65 : 75;
    const lightness1 = isDark ? 55 : 60;
    const lightness2 = isDark ? 50 : 55;

    const color1 = hslToRgb(hue1, saturation, lightness1);
    const color2 = hslToRgb(hue2, saturation, lightness2);

    return [color1, color2];
};

export const HomeHeader: React.FC = () => {
    const router = useRouter();
    const { authUser, themeMode, setThemeMode } = useStore();
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    // Generate unique gradient for this user
    const gradientColors = useMemo(() => {
        const identifier = authUser?.id || authUser?.email || 'default';
        return generateGradientFromString(identifier, isDarkMode);
    }, [authUser?.id, authUser?.email, isDarkMode]);

    const handleThemeChange = () => {
        const options = ['System', 'Light', 'Dark', 'Cancel'];
        const themeValues: ThemeMode[] = ['system', 'light', 'dark'];
        
        // Safely get the current theme mode with fallback to 'system'
        const currentTheme = themeMode || 'system';
        const currentThemeDisplay = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
        
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 3,
                    title: 'Appearance',
                    message: `Current: ${currentThemeDisplay}`,
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
                `Current: ${currentThemeDisplay}`,
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
                Brigo
            </Text>
            <TouchableOpacity
                onPress={handleProfilePress}
                activeOpacity={0.8}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                }}
            >
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        flex: 1,
                        width: '100%',
                        height: '100%',
                    }}
                />
            </TouchableOpacity>
        </View>
    );
};
