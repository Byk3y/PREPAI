/**
 * FactCard Component
 * Displays a fact with animation and progress indicator
 */

import React from 'react';
import { View, Text } from 'react-native';
import { MotiView } from 'moti';
import { TypewriterText } from '../../../components/TypewriterText';
import { styles } from '../styles';

interface FactCardProps {
    factNumber: number;
    totalFacts: number;
    factText: string;
    colors: {
        text: string;
        primary: string;
        surfaceElevated: string;
    };
    useTypewriter?: boolean;
    onTypewriterComplete?: () => void;
}

export function FactCard({
    factNumber,
    totalFacts,
    factText,
    colors,
    useTypewriter = false,
    onTypewriterComplete,
}: FactCardProps) {
    return (
        <MotiView
            key={factNumber}
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20 } as any}
            style={[
                styles.factCard,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.primary + '30' },
            ]}
        >
            <Text style={[styles.factNumber, { color: colors.primary }]}>
                {factNumber} of {totalFacts}
            </Text>
            {useTypewriter ? (
                <TypewriterText
                    text={factText}
                    style={[styles.factText, { color: colors.text }]}
                    speed={35}
                    onComplete={onTypewriterComplete}
                />
            ) : (
                <Text style={[styles.factText, { color: colors.text }]}>{factText}</Text>
            )}
        </MotiView>
    );
}
