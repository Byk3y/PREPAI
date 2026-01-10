/**
 * Activity Deep Link Handler
 * 
 * This route catches widget deep links like:
 * brigo://activity?type=notebook&id=123&notebookId=456
 * 
 * It redirects to the appropriate screen based on the activity type.
 */

import { useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export default function ActivityRedirect() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);
    const hasNavigated = useRef(false);

    useEffect(() => {
        // Prevent double navigation
        if (hasNavigated.current) return;

        const type = params.type as string;
        const id = params.id as string;
        const notebookId = params.notebookId as string;

        console.log(`[Activity Router] Redirecting: type=${type}, id=${id}, notebookId=${notebookId}`);

        // Build target path
        let targetPath = '/';

        if (type === 'notebook' && id) {
            targetPath = `/notebook/${id}`;
        } else if (type === 'podcast' && id) {
            targetPath = `/audio-player/${id}`;
        } else if (type === 'quiz' && id) {
            targetPath = `/quiz/${id}`;
        } else if (type === 'flashcards' && id) {
            targetPath = `/flashcards/${id}`;
        }

        // Small delay to ensure the router is ready
        const timer = setTimeout(() => {
            hasNavigated.current = true;

            // Use dismissAll + replace to clear any existing stack and go to target
            // This prevents duplicate screens when tapping widget multiple times
            try {
                router.dismissAll();
            } catch (e) {
                // dismissAll may fail if there's nothing to dismiss, that's OK
            }

            // Navigate to home first, then to target (ensures clean stack)
            if (targetPath === '/') {
                router.replace('/');
            } else {
                // Replace to home first, then push the target
                router.replace('/');
                setTimeout(() => {
                    router.push(targetPath as any);
                }, 50);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [params, router]);

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
