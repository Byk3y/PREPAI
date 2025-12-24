import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/lib/ThemeContext';
import { TypewriterText } from '../components/TypewriterText';
import Svg, { Path } from 'react-native-svg';
import { notificationService } from '@/lib/services/notificationService';
import { useStore } from '@/lib/store';

const { width } = Dimensions.get('window');

import NovaFull from '../../../assets/pets/stage-1/full-view.png';

interface Screen4NotificationsProps {
    colors: ReturnType<typeof getThemeColors>;
    petName: string;
    onDone: () => void;
}

export function Screen4_Notifications({ colors, petName, onDone }: Screen4NotificationsProps) {
    const [headlineComplete, setHeadlineComplete] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);
    const authUser = useStore((state) => state.authUser);
    const nameToUse = petName || 'your pet';

    const handleHeadlineComplete = useCallback(() => {
        setHeadlineComplete(true);
    }, []);

    const handleEnable = async () => {
        setIsRequesting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const token = await notificationService.registerForPushNotificationsAsync(true);
            if (token && authUser?.id) {
                await notificationService.saveTokenToProfile(authUser.id, token);
            }
        } catch (error) {
            console.error('Failed to enable notifications:', error);
        } finally {
            setIsRequesting(false);
            onDone();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.topSection}>
                <MotiView
                    from={{ opacity: 0, scale: 0.5, translateY: 20 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    transition={{ type: 'spring', damping: 15, delay: 300 } as any}
                    style={styles.petContainer}
                >
                    <MotiView
                        animate={{ translateY: [-8, 8, -8] }}
                        transition={{ loop: true, type: 'timing', duration: 3000 } as any}
                    >
                        <Image
                            source={NovaFull}
                            style={styles.petImage}
                            resizeMode="contain"
                        />
                    </MotiView>
                </MotiView>

                <MotiView
                    from={{ opacity: 0, scale: 0.8, translateY: 10 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    transition={{ type: 'spring', damping: 12, delay: 600 } as any}
                    style={[styles.bubbleContainer, { backgroundColor: colors.surfaceElevated }]}
                >
                    <TypewriterText
                        text={`I'm so excited to help you grow! Can I send you a nudge if I see you're about to lose our streak?`}
                        style={[styles.headline, { color: colors.text }]}
                        speed={40}
                        delay={1000}
                        onComplete={handleHeadlineComplete}
                    />
                    <View style={styles.bubbleTail}>
                        <Svg width="24" height="16" viewBox="0 0 24 16">
                            <Path d="M12 16L0 0H24L12 16Z" fill={colors.surfaceElevated} />
                        </Svg>
                    </View>
                </MotiView>
            </View>

            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 20 }}
                transition={{ type: 'timing', duration: 600, delay: 200 } as any}
                style={styles.actionSection}
            >
                <TouchableOpacity
                    onPress={handleEnable}
                    disabled={isRequesting}
                    activeOpacity={0.8}
                    style={[styles.enableButton, { backgroundColor: '#F97316' }]}
                >
                    <Text style={styles.enableButtonText}>
                        {isRequesting ? 'Enabling...' : 'Yes, please!'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onDone}
                    disabled={isRequesting}
                    activeOpacity={0.7}
                    style={styles.skipButton}
                >
                    <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                        Maybe later
                    </Text>
                </TouchableOpacity>

                <View style={[styles.infoCard, { backgroundColor: '#3B82F608', borderColor: '#3B82F620' }]}>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        I promise not to be annoying. I'll only ping you for important stuff like streaks and finished notebooks.
                    </Text>
                </View>
            </MotiView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    petContainer: {
        width: width * 0.45,
        height: width * 0.45,
        zIndex: 1,
    },
    petImage: {
        width: '100%',
        height: '100%',
    },
    bubbleContainer: {
        marginTop: -5,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 24,
        width: '100%',
        zIndex: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    bubbleTail: {
        position: 'absolute',
        bottom: -15,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    headline: {
        fontSize: 17,
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk-Bold',
        lineHeight: 24,
        textAlign: 'center',
    },
    actionSection: {
        width: '100%',
        alignItems: 'center',
    },
    enableButton: {
        width: '100%',
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    enableButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    skipButton: {
        paddingVertical: 12,
        marginBottom: 32,
    },
    skipButtonText: {
        fontSize: 15,
        fontFamily: 'SpaceGrotesk-SemiBold',
    },
    infoCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        width: '100%',
    },
    infoText: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk-Medium',
        lineHeight: 20,
        textAlign: 'center',
    },
});
