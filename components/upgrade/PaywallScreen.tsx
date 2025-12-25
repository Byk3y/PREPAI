/**
 * PaywallScreen - Playful and Illustrated design
 * Inspired by friendly, high-contrast brand aesthetics
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';
import { useStore } from '@/lib/store';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/purchases';
import { useUpgrade } from '@/lib/hooks/useUpgrade';
import { PurchasesPackage } from 'react-native-purchases';

const STAGE_1_PET = require('@/assets/pets/stage-1/full-view.png');
const STAGE_2_PET = require('@/assets/pets/stage-2/full-view.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PaywallScreenProps {
    onClose: () => void;
    onPurchaseSuccess?: () => void;
    source?: string;
    showProgress?: boolean;
}

const FEATURES = [
    { text: 'Interactive Smart Chat', icon: 'chatbubbles' },
    { text: 'Study Flashcards & Quizzes', icon: 'school' },
    { text: 'Unlimited Podcast Summaries', icon: 'headset' },
    { text: 'Unlimited Notebooks & Storage', icon: 'infinite' },
];

export const PaywallScreen: React.FC<PaywallScreenProps> = ({
    onClose,
    onPurchaseSuccess,
    source = 'paywall',
    showProgress = true,
}) => {
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);
    const {
        authUser,
        loadSubscription,
        notebooks,
        user,
        cachedPetState,
        flashcardsStudied
    } = useStore();
    const { trackUpgradeButtonClicked } = useUpgrade();

    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

    // Warm, playful color palette
    const themeColors = {
        background: isDarkMode ? '#1C1C1E' : '#FDF8F0', // Cream background
        accent: '#FF9500', // Brand Orange
        text: isDarkMode ? '#FFFFFF' : '#1A1A1A',
        textSecondary: isDarkMode ? '#A1A1AA' : '#4B5563',
        card: isDarkMode ? '#2C2C2E' : '#FFFFFF',
        border: '#1A1A1A', // Thick black outlines
    };

    // Calculate stats for progress section
    const notebooksCount = notebooks.length;
    const streakDays = user?.streak || 0;
    const petName = cachedPetState?.name || 'Sparky';
    const petLevel = Math.floor((cachedPetState?.points || 0) / 50) + 1;

    useEffect(() => {
        const fetchOfferings = async () => {
            try {
                const offering = await getOfferings();
                if (offering && offering.availablePackages.length > 0) {
                    setPackages(offering.availablePackages);
                    const annual = offering.annual || offering.availablePackages[0];
                    setSelectedPackage(annual);
                }
            } catch (error) {
                console.error('Error fetching offerings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOfferings();
    }, []);

    const handlePurchase = async () => {
        if (!selectedPackage) return;
        trackUpgradeButtonClicked(source);
        setIsPurchasing(true);

        try {
            const result = await purchasePackage(selectedPackage);
            if ('userCancelled' in result && result.userCancelled) return;

            if (result.isPro) {
                if (authUser) await loadSubscription(authUser.id);
                Alert.alert('🎉 Welcome to Pro!', 'Enjoy unlimited learning!', [
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
                Alert.alert('Restored!', 'Your purchases have been restored.', [{ text: 'Great!', onPress: onClose }]);
            } else {
                Alert.alert('No Purchases Found', 'No previous purchases to restore.');
            }
        } catch (error) {
            Alert.alert('Restore Failed', 'Please try again.');
        } finally {
            setIsRestoring(false);
        }
    };

    const isAnnual = (pkg: PurchasesPackage) => pkg.packageType === 'ANNUAL';
    const isMonthly = (pkg: PurchasesPackage) => pkg.packageType === 'MONTHLY';

    const getSavingsPercent = () => {
        const annual = packages.find(isAnnual);
        const monthly = packages.find(isMonthly);
        if (annual && monthly) {
            const annualPrice = annual.product.price;
            const monthlyPrice = monthly.product.price;
            const totalMonthly = monthlyPrice * 12;
            const savings = ((totalMonthly - annualPrice) / totalMonthly) * 100;
            return Math.round(savings);
        }
        return 0;
    };

    const savingsPercent = getSavingsPercent();

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Back Link Style */}
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={20} color={themeColors.text} />
                        <Text style={[styles.backText, { color: themeColors.text }]}>Back</Text>
                    </TouchableOpacity>

                    {/* Illustrated Header */}
                    <View style={styles.header}>
                        <View style={styles.petContainer}>
                            <Image
                                source={cachedPetState?.stage === 2 ? STAGE_2_PET : STAGE_1_PET}
                                style={styles.petImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={[styles.title, { color: themeColors.text }]}>Brigo Pro</Text>
                        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                            Everything you need to master your studies.
                        </Text>
                    </View>

                    {/* Progress Section (Consolidated from the old screen) */}
                    {showProgress && (
                        <View style={[styles.progressCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                            <View style={styles.progressHeader}>
                                <Text style={[styles.progressTitle, { color: themeColors.text }]}>Your progress</Text>
                                <Text style={styles.partyEmoji}>🎉</Text>
                            </View>
                            <View style={styles.statsGrid}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statIcon}>📚</Text>
                                    <Text style={[styles.statText, { color: themeColors.text }]}>{notebooksCount} {notebooksCount === 1 ? 'notebook' : 'notebooks'}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statIcon}>🎴</Text>
                                    <Text style={[styles.statText, { color: themeColors.text }]}>{flashcardsStudied} studied</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statIcon}>🔥</Text>
                                    <Text style={[styles.statText, { color: themeColors.text }]}>{streakDays}-day streak</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statIcon}>🐾</Text>
                                    <Text style={[styles.statText, { color: themeColors.text }]}>{petName} • Lvl {petLevel}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Friendly Features */}
                    <View style={styles.featuresList}>
                        {FEATURES.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                                <View style={[styles.featureBullet, { backgroundColor: themeColors.accent }]}>
                                    <Ionicons name="checkmark" size={14} color="#1A1A1A" />
                                </View>
                                <Text style={[styles.featureText, { color: themeColors.text }]}>{feature.text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Package Options */}
                    <View style={styles.packagesContainer}>
                        {packages.map((pkg) => {
                            const isSelected = selectedPackage?.identifier === pkg.identifier;
                            return (
                                <TouchableOpacity
                                    key={pkg.identifier}
                                    style={[
                                        styles.packageCard,
                                        {
                                            backgroundColor: themeColors.card,
                                            borderColor: themeColors.border,
                                            borderWidth: isSelected ? 3 : 1.5,
                                            transform: [{ scale: isSelected ? 1.02 : 1 }],
                                        },
                                    ]}
                                    onPress={() => setSelectedPackage(pkg)}
                                    activeOpacity={0.9}
                                >
                                    {isAnnual(pkg) && (
                                        <View style={styles.saveBadge}>
                                            <Text style={styles.saveBadgeText}>BEST PRICE</Text>
                                        </View>
                                    )}
                                    <View style={styles.packageRow}>
                                        <View style={[styles.radio, { borderColor: themeColors.border, backgroundColor: isSelected ? themeColors.accent : 'transparent' }]}>
                                            {isSelected && <Ionicons name="checkmark" size={12} color="#1A1A1A" />}
                                        </View>
                                        <View style={styles.packageInfo}>
                                            <View style={styles.packageNameRow}>
                                                <Text style={[styles.packageName, { color: themeColors.text }]}>
                                                    {isAnnual(pkg) ? 'Yearly Access' : 'Monthly Access'}
                                                </Text>
                                                {isAnnual(pkg) && savingsPercent > 0 && (
                                                    <View style={[styles.savingsBadge, { backgroundColor: themeColors.accent + '20' }]}>
                                                        <Text style={[styles.savingsBadgeText, { color: themeColors.accent }]}>
                                                            Save {savingsPercent}%
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[styles.packagePrice, { color: themeColors.textSecondary }]}>
                                                {pkg.product.priceString}{isAnnual(pkg) ? ' / year' : ' / month'}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Bold CTA */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.ctaButton, { backgroundColor: themeColors.accent, borderColor: themeColors.border }]}
                            onPress={handlePurchase}
                            disabled={isPurchasing}
                        >
                            {isPurchasing ? (
                                <ActivityIndicator size="small" color="#1A1A1A" />
                            ) : (
                                <Text style={styles.ctaText}>Unlock Pro Access</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleRestore} style={styles.restoreLink}>
                            <Text style={[styles.restoreText, { color: themeColors.textSecondary }]}>Restore Purchases</Text>
                        </TouchableOpacity>

                        <Text style={[styles.legalText, { color: themeColors.textSecondary }]}>
                            Recurring billing. Cancel anytime.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginLeft: -4,
        marginBottom: 10,
    },
    backText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        marginLeft: 2,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    petContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    petImage: {
        width: 100,
        height: 100,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Nunito-Black',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        textAlign: 'center',
        opacity: 0.8,
        marginTop: 4,
        paddingHorizontal: 30,
    },
    // Progress Card Styling
    progressCard: {
        borderRadius: 20,
        borderWidth: 2,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressTitle: {
        fontSize: 18,
        fontFamily: 'Nunito-Black',
    },
    partyEmoji: {
        fontSize: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        width: '47%',
    },
    statIcon: {
        fontSize: 18,
    },
    statText: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
    },
    // Features List
    featuresList: {
        gap: 12,
        marginBottom: 24,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureBullet: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
    },
    packagesContainer: {
        gap: 12,
        marginBottom: 20,
    },
    packageCard: {
        borderRadius: 20,
        padding: 16,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    saveBadge: {
        position: 'absolute',
        top: -10,
        right: 20,
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    saveBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'Nunito-Black',
    },
    packageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    packageInfo: {
        flex: 1,
    },
    packageNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    savingsBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    savingsBadgeText: {
        fontSize: 12,
        fontFamily: 'Nunito-Black',
    },
    packageName: {
        fontSize: 17,
        fontFamily: 'Nunito-Black',
    },
    packagePrice: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        marginTop: 2,
    },
    footer: {
        marginTop: 10,
        alignItems: 'center',
    },
    ctaButton: {
        width: '100%',
        height: 60,
        borderRadius: 20,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 6,
        marginBottom: 16,
    },
    ctaText: {
        fontSize: 18,
        fontFamily: 'Nunito-Black',
        color: '#1A1A1A',
    },
    restoreLink: {
        paddingVertical: 8,
    },
    restoreText: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        textDecorationLine: 'underline',
    },
    legalText: {
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
        marginTop: 4,
        opacity: 0.6,
    },
});

export default PaywallScreen;
