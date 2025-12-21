import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { generateGradientFromString } from '@/lib/utils/avatarGradient';

export const HomeHeader: React.FC = () => {
    const router = useRouter();
    const { authUser } = useStore();
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    // Generate unique gradient for this user
    const gradientColors = useMemo(() => {
        const identifier = authUser?.id || authUser?.email || 'default';
        return generateGradientFromString(identifier, isDarkMode);
    }, [authUser?.id, authUser?.email, isDarkMode]);

    const handleProfilePress = () => {
        router.push('/profile');
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
                    colors={gradientColors as [string, string]}
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
