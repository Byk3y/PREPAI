/**
 * ActionButton Component
 * Primary action button with optional icon
 */

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface ActionButtonProps {
    text: string;
    onPress: () => void;
    backgroundColor: string;
    showArrow?: boolean;
    delay?: number;
    disabled?: boolean;
}

export function ActionButton({
    text,
    onPress,
    backgroundColor,
    showArrow = true,
    delay = 0,
    disabled = false,
}: ActionButtonProps) {
    return (
        <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay } as any}
            style={{ width: '100%' }}
        >
            <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor }]}
                onPress={onPress}
                activeOpacity={0.8}
                disabled={disabled}
            >
                <Text style={styles.primaryButtonText}>{text}</Text>
                {showArrow && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
        </MotiView>
    );
}
