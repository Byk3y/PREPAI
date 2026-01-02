/**
 * QuestionCard Component
 * Displays a question with answer options
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import { styles } from '../styles';

interface QuestionCardProps {
    label: string;
    question: string;
    correctAnswer: string;
    incorrectLabel?: string;
    onCorrect: () => void;
    onIncorrect: () => void;
    colors: {
        text: string;
        primary: string;
        surfaceElevated: string;
        border: string;
    };
    animationKey?: string;
}

export function QuestionCard({
    label,
    question,
    correctAnswer,
    incorrectLabel = 'Not sure',
    onCorrect,
    onIncorrect,
    colors,
    animationKey,
}: QuestionCardProps) {
    return (
        <MotiView
            key={animationKey}
            from={{ opacity: 0, rotateY: '90deg' }}
            animate={{ opacity: 1, rotateY: '0deg' }}
            style={[
                styles.questionCard,
                { backgroundColor: colors.primary + '10', borderColor: colors.primary },
            ]}
        >
            <Text style={[styles.questionLabel, { color: colors.primary }]}>{label}</Text>
            <Text style={[styles.questionText, { color: colors.text }]}>{question}</Text>

            <View style={styles.answerButtons}>
                <TouchableOpacity
                    style={[styles.answerButton, { backgroundColor: colors.primary }]}
                    onPress={onCorrect}
                    activeOpacity={0.8}
                >
                    <Text style={styles.answerButtonText}>{correctAnswer}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.answerButton, { backgroundColor: colors.border }]}
                    onPress={onIncorrect}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.answerButtonText, { color: colors.text }]}>{incorrectLabel}</Text>
                </TouchableOpacity>
            </View>
        </MotiView>
    );
}
