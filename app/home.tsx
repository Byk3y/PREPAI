/**
 * Home Deep Link Handler
 * 
 * This route catches the fallback widget deep link:
 * brigo://home
 * 
 * It simply redirects to the main home screen (index).
 */

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export default function HomeRedirect() {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    useEffect(() => {
        // Small delay to ensure the router is ready, then go home
        const timer = setTimeout(() => {
            router.replace('/');
        }, 50);

        return () => clearTimeout(timer);
    }, [router]);

    // Show a brief loading state while redirecting
    return (
        <View style={{
            flex: 1,
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}
