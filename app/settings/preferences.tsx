import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { Ionicons } from '@expo/vector-icons';

export default function PreferencesScreen() {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);
    const router = useRouter();
    const { themeMode, setThemeMode } = useStore();

    const options = [
        { label: 'System', value: 'system', icon: 'settings-outline', description: 'Match your device settings' },
        { label: 'Light', value: 'light', icon: 'sunny-outline', description: 'Always bright and clear' },
        { label: 'Dark', value: 'dark', icon: 'moon-outline', description: 'Easy on the eyes in the dark' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Preferences</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>

                <View style={styles.cardList}>
                    {options.map((option) => {
                        const isSelected = (themeMode || 'system') === option.value;
                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionCard,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                        borderWidth: isSelected ? 2 : 1
                                    }
                                ]}
                                onPress={() => setThemeMode(option.value as any)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionLeft}>
                                    <View style={[styles.iconWrapper, { backgroundColor: isSelected ? colors.primary + '15' : colors.surfaceAlt }]}>
                                        <Ionicons
                                            name={option.icon as any}
                                            size={22}
                                            color={isSelected ? colors.primary : colors.textSecondary}
                                        />
                                    </View>
                                    <View>
                                        <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                                        <Text style={[styles.optionDesc, { color: colors.textMuted }]}>{option.description}</Text>
                                    </View>
                                </View>
                                <View style={[
                                    styles.radioCircle,
                                    { borderColor: isSelected ? colors.primary : colors.border }
                                ]}>
                                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={[styles.infoBox, { backgroundColor: colors.primary + '05', borderColor: colors.primary + '20' }]}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Switching to Dark Mode can help reduce eye strain and improve battery life on OLED screens.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Nunito-Bold',
    },
    scrollContent: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        letterSpacing: 1.2,
        marginBottom: 16,
        marginLeft: 4,
    },
    cardList: {
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 17,
        fontFamily: 'Nunito-Bold',
    },
    optionDesc: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        marginTop: 2,
    },
    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    infoBox: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 40,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Nunito-Medium',
        lineHeight: 20,
    },
});
