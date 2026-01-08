/**
 * Not Found Screen
 * 
 * Graceful fallback for any unmatched routes.
 * Redirects users back to home instead of showing an error.
 */

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);

    const handleGoHome = () => {
        router.replace('/');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="compass-outline" size={64} color={colors.textMuted} />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>
                    Oops! Page Not Found
                </Text>

                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Looks like this page doesn't exist. Let's get you back on track.
                </Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={handleGoHome}
                    activeOpacity={0.8}
                >
                    <Ionicons name="home" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Go Home</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Nunito-Bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Nunito-Regular',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
    },
});
