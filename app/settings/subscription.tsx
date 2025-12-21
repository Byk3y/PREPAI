import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SubscriptionScreen() {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);
    const router = useRouter();
    const { tier, trialEndsAt, isExpired } = useStore();

    // Calculate subscription status
    const getDaysLeft = () => {
        if (!trialEndsAt) return 0;
        const now = new Date();
        const end = new Date(trialEndsAt);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };

    const daysLeft = getDaysLeft();
    const trialStatusText = tier === 'premium'
        ? 'Premium • Active'
        : isExpired
            ? 'Trial expired'
            : `Trial • ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;

    const badgeText = tier === 'premium' ? 'PREMIUM' : 'TRIAL';
    const planTitle = tier === 'premium' ? 'Brigo Plus' : 'Brigo Trial';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumCard}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{badgeText}</Text>
                        </View>
                        <Text style={styles.trialText}>{trialStatusText}</Text>
                    </View>

                    <Text style={styles.planTitle}>{planTitle}</Text>
                    <Text style={styles.planTagline}>Unlimited notebooks • Priority AI • No Ads</Text>

                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.featureText}>Unlimited Studio generation</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.featureText}>Advanced AI tutoring mode</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.featureText}>Exclusive pet customization</Text>
                        </View>
                    </View>
                </LinearGradient>

                <TouchableOpacity style={[styles.manageButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.manageButtonLeft}>
                        <Ionicons name="card-outline" size={22} color={colors.textSecondary} />
                        <Text style={[styles.manageButtonText, { color: colors.text }]}>Manage Billing</Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.restoreButton}>
                    <Text style={[styles.restoreButtonText, { color: colors.primary }]}>RESTORE PURCHASES</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        Subscription renews automatically unless canceled in settings.
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
    content: {
        padding: 24,
    },
    premiumCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    badge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    trialText: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: '#FFFFFF',
        opacity: 0.9,
    },
    planTitle: {
        fontSize: 28,
        fontFamily: 'Nunito-Bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    planTagline: {
        fontSize: 14,
        fontFamily: 'Nunito-Medium',
        color: '#FFFFFF',
        opacity: 0.8,
        marginBottom: 24,
    },
    featuresList: {
        gap: 10,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontSize: 14,
        fontFamily: 'Nunito-Medium',
        color: '#FFFFFF',
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    manageButtonLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    manageButtonText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
    },
    restoreButton: {
        alignItems: 'center',
        padding: 24,
        marginTop: 8,
    },
    restoreButtonText: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        letterSpacing: 0.8,
    },
    footer: {
        paddingHorizontal: 20,
        marginTop: 8,
    },
    footerText: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'Nunito-Regular',
        lineHeight: 18,
        opacity: 0.7,
    }
});
