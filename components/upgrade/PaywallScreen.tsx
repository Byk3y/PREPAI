/**
 * PaywallScreen - Re-engineered for maximum premium feel
 * Final refinements: Daily cost framing, Unlimited status, Moti animations
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/purchases';
import { useUpgrade } from '@/lib/hooks/useUpgrade';
import { PurchasesPackage } from 'react-native-purchases';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PaywallScreenProps {
    onClose: () => void;
    onPurchaseSuccess?: () => void;
    source?: string;
}

const FEATURES = [
    {
        title: 'Unlimited AI Tutor Access',
        description: '24/7 personalized coaching tailored to your learning style.',
        icon: 'sparkles',
        color: '#8B5CF6'
    },
    {
        title: 'Infinite Smart Flashcards',
        description: 'Create and study unlimited cards with adaptive spaced repetition.',
        icon: 'layers',
        color: '#F97316'
    },
    {
        title: 'Unlimited Audio Overviews',
        description: 'Convert any length of material into studio-quality audio summaries.',
        icon: 'headset',
        color: '#3B82F6'
    },
    {
        title: 'Pro Sync & Cloud Storage',
        description: 'Unlimited notebooks synced instantly across all your devices.',
        icon: 'cloud-done',
        color: '#10B981'
    }
];

export const PaywallScreen: React.FC<PaywallScreenProps> = ({
    onClose,
    onPurchaseSuccess,
    source = 'paywall'
}) => {
    const { isDarkMode } = useTheme();
    const { authUser, loadSubscription } = useStore();
    const { trackUpgradeButtonClicked } = useUpgrade();

    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

    useEffect(() => {
        const fetchOfferings = async () => {
            try {
                const offering = await getOfferings();
                if (offering && offering.availablePackages.length > 0) {
                    setPackages(offering.availablePackages);
                }
            } catch (error) {
                console.error('Error fetching offerings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOfferings();
    }, []);

    const selectedPackage = packages.find(pkg =>
        billingCycle === 'annual' ? pkg.packageType === 'ANNUAL' : pkg.packageType === 'MONTHLY'
    ) || packages[0];

    // Daily cost calculation (~$0.21/day for annual)
    const dailyCost = selectedPackage ? (selectedPackage.product.price / 365).toFixed(2) : '0.22';

    // Monthly equivalent for annual (~$6.67/mo)
    const monthlyEquivalent = selectedPackage ? (selectedPackage.product.price / 12).toFixed(2) : '6.67';

    // Extract currency symbol from priceString (e.g., "$79.99" -> "$")
    const currencySymbol = selectedPackage?.product.priceString.replace(/[0-9.,\s]/g, '') || '$';

    const handlePurchase = async () => {
        if (!selectedPackage) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        trackUpgradeButtonClicked(source);
        setIsPurchasing(true);

        try {
            const result = await purchasePackage(selectedPackage);
            if ('userCancelled' in result && result.userCancelled) return;

            if (result.isPro) {
                if (authUser) await loadSubscription(authUser.id);
                Alert.alert('🎉 Welcome to Pro!', 'Your study superpowers are now active.', [
                    { text: 'Let\'s Go!', onPress: () => { onPurchaseSuccess?.(); onClose(); } }
                ]);
            }
        } catch (error) {
            Alert.alert('Purchase Failed', 'Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setIsRestoring(true);
        try {
            const { isPro } = await restorePurchases();
            if (isPro) {
                if (authUser) await loadSubscription(authUser.id);
                Alert.alert('Restored!', 'Your Pro access has been restored.', [{ text: 'Great!', onPress: onClose }]);
            } else {
                Alert.alert('No Purchases Found', 'We couldn\'t find any previous Pro subscriptions.');
            }
        } catch (error) {
            Alert.alert('Restore Failed', 'Please try again.');
        } finally {
            setIsRestoring(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#FFF' }]}>
                <ActivityIndicator size="large" color="#F97316" />
            </View>
        );
    }

    const isOnboarding = source === 'onboarding';

    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#FFF' }]}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={isDarkMode ? ['#2D1B4D', '#000000'] : ['#F3E8FF', '#FFFFFF']}
                style={styles.headerGradient}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.topActions}>
                    <TouchableOpacity onPress={onClose} style={styles.iconCircle}>
                        <Ionicons name="close" size={22} color={isDarkMode ? '#FFF' : '#000'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleRestore}>
                        <Text style={[styles.restoreText, { color: isDarkMode ? '#A1A1AA' : '#64748B' }]}>
                            {isRestoring ? 'Restoring...' : 'Restore'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.headerSection}>
                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'timing', duration: 800 } as any}
                        >
                            <Text style={[styles.headline, { color: isDarkMode ? '#FFF' : '#111827' }]}>
                                Unlock your personalized study partner today
                            </Text>
                        </MotiView>
                        <Text style={[styles.subHeadline, { color: isDarkMode ? '#A1A1AA' : '#6B7280' }]}>
                            {isOnboarding ? 'First 7 days are free' : 'Experience the full power of Brigo AI'}
                        </Text>
                    </View>

                    <View style={[styles.toggleContainer, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}>
                        <TouchableOpacity
                            style={[styles.toggleHalf, billingCycle === 'annual' && styles.toggleActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setBillingCycle('annual');
                            }}
                        >
                            <View style={styles.toggleLabelRow}>
                                <Text style={[styles.toggleText, billingCycle === 'annual' && styles.toggleTextActive]}>Annual</Text>
                                <View style={styles.savingsBadge}>
                                    <Text style={styles.savingsBadgeText}>SAVE 33%</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleHalf, billingCycle === 'monthly' && styles.toggleActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setBillingCycle('monthly');
                            }}
                        >
                            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
                        </TouchableOpacity>
                    </View>

                    {billingCycle === 'annual' && (
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 200 } as any}
                            style={styles.valueProposition}
                        >
                            <Ionicons name="sparkles" size={16} color="#10B981" />
                            <Text style={[styles.valueText, { color: isDarkMode ? '#10B981' : '#059669' }]}>
                                {`Just ${currencySymbol}${monthlyEquivalent}/mo • Best for long-term mastery`}
                            </Text>
                        </MotiView>
                    )}

                    <View style={styles.featuresList}>
                        {FEATURES.map((item, index) => (
                            <MotiView
                                key={index}
                                from={{ opacity: 0, translateX: -20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                transition={{ type: 'timing', duration: 400, delay: 300 + (index * 100) } as any}
                                style={styles.featureRow}
                            >
                                <View style={[styles.featureIconBox, { backgroundColor: isDarkMode ? '#27272A' : '#FAFAFA', shadowOpacity: isDarkMode ? 0 : 0.05 }]}>
                                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                                </View>
                                <View style={styles.featureContent}>
                                    <Text style={[styles.featureTitle, { color: isDarkMode ? '#FFF' : '#111827' }]}>{item.title}</Text>
                                    <Text style={[styles.featureDesc, { color: isDarkMode ? '#A1A1AA' : '#6B7280' }]}>{item.description}</Text>
                                </View>
                            </MotiView>
                        ))}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: isDarkMode ? '#FFF' : '#000' }]}
                        onPress={handlePurchase}
                        disabled={isPurchasing}
                        activeOpacity={0.9}
                    >
                        {isPurchasing ? (
                            <ActivityIndicator color={isDarkMode ? '#000' : '#FFF'} />
                        ) : (
                            <View style={styles.buttonInnerCentric}>
                                <Text style={[styles.buttonLabel, { color: isDarkMode ? '#000' : '#FFF' }]}>
                                    {isOnboarding ? 'Start free trial' : 'Upgrade Now'}
                                </Text>
                                <Text style={[styles.buttonPriceInline, { color: '#F97316' }]}>
                                    {billingCycle === 'annual'
                                        ? `${currencySymbol}${monthlyEquivalent}/mo`
                                        : `${selectedPackage?.product.priceString}/mo`
                                    }
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={[styles.legalNote, { color: isDarkMode ? '#71717A' : '#9CA3AF' }]}>
                        Cancel anytime. No commitment.
                    </Text>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.35,
    },
    safeArea: { flex: 1 },
    topActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    restoreText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 35,
    },
    headline: {
        fontSize: SCREEN_WIDTH > 400 ? 34 : 30,
        fontFamily: 'Outfit-Bold',
        textAlign: 'center',
        lineHeight: 40,
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    subHeadline: {
        fontSize: 16,
        fontFamily: 'Outfit-Regular',
        textAlign: 'center',
        opacity: 0.7,
    },
    toggleContainer: {
        flexDirection: 'row',
        padding: 6,
        borderRadius: 30, // More pill-like
        marginBottom: 35,
        width: '100%',
    },
    toggleHalf: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 24,
    },
    toggleActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    toggleText: {
        fontSize: 15,
        fontFamily: 'Outfit-Medium',
        color: '#6B7280',
    },
    toggleTextActive: {
        color: '#111827',
    },
    toggleLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    savingsBadge: {
        backgroundColor: '#F97316',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    savingsBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
    },
    valueProposition: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 24,
        marginTop: -15,
    },
    valueText: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
    },
    featuresList: {
        gap: 20,
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: 16,
        borderRadius: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    featureIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22, // Round like reference
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 1,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 13,
        fontFamily: 'Outfit-Regular',
        lineHeight: 18,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        paddingTop: 10,
    },
    actionButton: {
        height: 64, // Slightly taller
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonInnerCentric: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    buttonLabel: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
    },
    buttonPriceInline: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    legalNote: {
        fontSize: 12,
        fontFamily: 'Outfit-Regular',
        marginTop: 14,
        textAlign: 'center',
        opacity: 0.5,
    },
});

export default PaywallScreen;
