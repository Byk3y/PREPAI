/**
 * Answer Options Component
 * Container for all answer options
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { AnswerOptionsProps, AnswerOption } from '@/lib/quiz/types';
import { AnswerOption as AnswerOptionComponent } from './AnswerOption';

export function AnswerOptions({
  question,
  selectedAnswer,
  isSubmitted,
  isReviewMode,
  answers,
  onSelectAnswer,
  onOptionLayout,
  colors,
  isDarkMode,
}: AnswerOptionsProps) {
  const wasSkipped = isReviewMode && !selectedAnswer;

  return (
    <View style={styles.container}>
      {(Object.keys(question.options) as Array<AnswerOption>).map((key) => {
        const isSelected = selectedAnswer === key;
        const isCorrect = question.correct === key;
        const showCorrect = (isSubmitted && isCorrect) || (wasSkipped && isCorrect);
        const showIncorrect = isSubmitted && isSelected && !isCorrect;
        const explanationEligible = question.explanations && (isSubmitted || isReviewMode);
        const shouldShowExplanation = explanationEligible && (isCorrect || (isSelected && !isCorrect));
        const explanationText = question.explanations?.[key];

        return (
          <AnswerOptionComponent
            key={key}
            optionKey={key}
            optionText={question.options[key]}
            isSelected={isSelected}
            isCorrect={isCorrect}
            showCorrect={showCorrect}
            showIncorrect={showIncorrect}
            explanation={shouldShowExplanation ? explanationText : undefined}
            isSubmitted={isSubmitted}
            isReviewMode={isReviewMode}
            onSelect={onSelectAnswer}
            onLayout={(option, y) => onOptionLayout(question.id, option, y)}
            colors={colors}
            isDarkMode={isDarkMode}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});

