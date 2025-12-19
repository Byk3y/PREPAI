/**
 * Upgrade Screen
 * Shows premium features and pricing
 * Fallback implementation until payment integration is ready
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors } from '@/lib/ThemeContext';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { ProgressSummary } from '@/components/upgrade/ProgressSummary';
import { useUpgrade } from '@/lib/hooks/useUpgrade';
import { useEffect } from 'react';

export default function UpgradeScreen() {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const router = useRouter();
  const { notebooks, user, cachedPetState, flashcardsStudied } = useStore();
  const { trackUpgradeScreenViewed } = useUpgrade();

  // Track when upgrade screen is viewed
  useEffect(() => {
    trackUpgradeScreenViewed();
  }, [trackUpgradeScreenViewed]);

  // Calculate stats
  const notebooksCount = notebooks.length;
  const streakDays = user.streak || 0;
  const petName = cachedPetState?.name || 'Sparky';
  const petLevel = Math.floor((cachedPetState?.points || 0) / 50) + 1;

  const handleUpgrade = () => {
    Alert.alert(
      'Premium Coming Soon!',
      "We're finalizing Premium subscriptions. We'll notify you as soon as it's ready!",
      [{ text: 'OK' }]
    );
  };

  const features = [
    { icon: 'folder-open-outline', text: 'Unlimited notebooks' },
    { icon: 'sparkles-outline', text: 'Unlimited AI generations' },
    { icon: 'headset-outline', text: 'Unlimited audio overviews' },
    { icon: 'download-outline', text: 'Export your notes' },
    { icon: 'cloud-upload-outline', text: 'Cloud backup' },
    { icon: 'shield-checkmark-outline', text: 'Priority support' },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Upgrade to Premium</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Summary */}
        <View style={styles.progressSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your amazing progress
          </Text>
          <ProgressSummary
            notebooksCount={notebooksCount}
            flashcardsStudied={flashcardsStudied}
            streakDays={streakDays}
            petName={petName}
            petLevel={petLevel}
          />
        </View>

        {/* Pricing */}
        <View
          style={[
            styles.pricingCard,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.primary },
          ]}
        >
          <View style={styles.pricingHeader}>
            <Text style={[styles.pricingTitle, { color: colors.text }]}>Premium</Text>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>BEST VALUE</Text>
            </View>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>$9.99</Text>
            <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/month</Text>
          </View>
          <Text style={[styles.priceSubtext, { color: colors.textMuted }]}>
            Cancel anytime
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Everything you need to succeed
          </Text>

          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={feature.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
          onPress={handleUpgrade}
        >
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  progressSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
    marginBottom: 12,
  },
  petSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  petEmoji: {
    fontSize: 80,
    marginBottom: 12,
  },
  petText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
  },
  pricingCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pricingTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
  },
  priceUnit: {
    fontSize: 18,
    fontFamily: 'Nunito-Regular',
    marginLeft: 4,
  },
  priceSubtext: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  upgradeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: '#FFFFFF',
  },
});
