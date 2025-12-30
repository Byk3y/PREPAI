import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { getThemeColors } from '@/lib/ThemeContext';
import { TypewriterText } from '../components/TypewriterText';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';

const { width } = Dimensions.get('window');

interface Screen4_EducationProps {
    colors: ReturnType<typeof getThemeColors>;
}

const EDUCATION_LEVELS = [
    { id: 'middle_high', label: 'Middle / High School', icon: '🎒' },
    { id: 'university', label: 'University / College', icon: '🎓' },
    { id: 'professional', label: 'Professional / Career', icon: '💼' },
    { id: 'lifelong', label: 'Lifelong Learner', icon: '☕️' },
];

const AGE_BRACKETS = [
    { id: 'under_18', label: 'Under 18' },
    { id: '18_24', label: '18 - 24' },
    { id: '25_34', label: '25 - 34' },
    { id: '35_plus', label: '35+' },
];

export function Screen4_Education({ colors }: Screen4_EducationProps) {
    const { educationLevel, setEducationLevel, ageBracket, setAgeBracket } = useStore();
    const [headlineComplete, setHeadlineComplete] = useState(false);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <TypewriterText
                    text="Let's calibrate your mentor"
                    style={[styles.headline, { color: colors.text }]}
                    speed={40}
                    delay={500}
                    onComplete={() => setHeadlineComplete(true)}
                />
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 10 }}
                    transition={{ type: 'timing', duration: 500 } as any}
                >
                    <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
                        Brigo will use this to pick the right analogies for you.
                    </Text>
                </MotiView>
            </View>

            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 20 }}
                transition={{ type: 'timing', duration: 600, delay: 200 } as any}
                style={styles.section}
            >
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>STUDY MISSION</Text>
                <View style={styles.grid}>
                    {EDUCATION_LEVELS.map((level) => (
                        <TouchableOpacity
                            key={level.id}
                            activeOpacity={0.7}
                            onPress={() => setEducationLevel(level.id)}
                            style={[
                                styles.optionCard,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: educationLevel === level.id ? colors.primary : colors.border,
                                },
                                educationLevel === level.id && styles.selectedCard
                            ]}
                        >
                            <Text style={styles.optionIcon}>{level.icon}</Text>
                            <Text style={[styles.optionLabel, { color: colors.text }]}>{level.label}</Text>
                            {educationLevel === level.id && (
                                <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="checkmark" size={12} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </MotiView>

            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: educationLevel ? 1 : 0, translateY: educationLevel ? 0 : 20 }}
                transition={{ type: 'timing', duration: 600 } as any}
                style={styles.section}
            >
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>AGE GROUP</Text>
                <View style={styles.ageGrid}>
                    {AGE_BRACKETS.map((bracket) => (
                        <TouchableOpacity
                            key={bracket.id}
                            activeOpacity={0.7}
                            onPress={() => setAgeBracket(bracket.id)}
                            style={[
                                styles.ageCard,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: ageBracket === bracket.id ? colors.primary : colors.border,
                                },
                                ageBracket === bracket.id && styles.selectedCard
                            ]}
                        >
                            <Text style={[
                                styles.ageLabel,
                                { color: ageBracket === bracket.id ? colors.primary : colors.text }
                            ]}>
                                {bracket.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </MotiView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 32,
    },
    headline: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk-Bold',
        lineHeight: 34,
        marginBottom: 12,
    },
    subheadline: {
        fontSize: 16,
        fontFamily: 'SpaceGrotesk-Medium',
        lineHeight: 22,
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 16,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionCard: {
        width: (width - 48 - 12) / 2,
        padding: 20,
        borderRadius: 24,
        borderWidth: 2,
        alignItems: 'center',
        gap: 12,
        position: 'relative',
    },
    selectedCard: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8,
    },
    optionIcon: {
        fontSize: 32,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk-Bold',
        textAlign: 'center',
    },
    checkBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    ageCard: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 16,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
    },
    ageLabel: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk-Bold',
    },
});
