/**
 * Flashcard Player - Single card view with multiple choice answers
 * Triggers PetWidget reactions on correct/incorrect answers
 * TODO: Connect to real flashcard data from Supabase
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { useStore } from '@/lib/store';
import { PetWidget } from '@/components/PetWidget';

export default function FlashcardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { flashcards, addPetXP } = useStore();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [petReaction, setPetReaction] = useState<'happy' | 'sad' | 'excited' | null>(null);

  // Get flashcard - in real app, fetch by id from Supabase
  const flashcard = flashcards[0] || flashcards[Math.floor(Math.random() * flashcards.length)];

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;

    setSelectedAnswer(answerIndex);
    setShowResult(true);

    const isCorrect = answerIndex === flashcard.correctAnswer;

    if (isCorrect) {
      setPetReaction('happy');
      addPetXP(10); // Reward XP for correct answer
      // TODO: Update user progress in Supabase
    } else {
      setPetReaction('sad');
    }

    // Reset after showing result
    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      setPetReaction(null);
    }, 2000);
  };

  const getAnswerStyle = (index: number) => {
    if (!showResult) {
      return selectedAnswer === index
        ? 'bg-primary-200 border-primary-500'
        : 'bg-white border-neutral-300';
    }

    if (index === flashcard.correctAnswer) {
      return 'bg-success border-success';
    }

    if (index === selectedAnswer && index !== flashcard.correctAnswer) {
      return 'bg-error border-error';
    }

    return 'bg-white border-neutral-300';
  };

  const getAnswerTextStyle = (index: number) => {
    if (!showResult) {
      return 'text-neutral-800';
    }

    if (index === flashcard.correctAnswer) {
      return 'text-white font-semibold';
    }

    if (index === selectedAnswer && index !== flashcard.correctAnswer) {
      return 'text-white font-semibold';
    }

    return 'text-neutral-600';
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 bg-white border-b border-neutral-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-neutral-800">
          Flashcard Practice
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {/* Pet Widget */}
          <View className="items-center mb-6">
            <PetWidget
              reaction={petReaction}
              onReactionComplete={() => setPetReaction(null)}
            />
          </View>

          {/* Question Card */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            className="bg-white rounded-xl p-6 mb-6 shadow-lg border border-neutral-200"
          >
            <Text className="text-xl font-semibold text-neutral-800 mb-4">
              {flashcard.question}
            </Text>

            {/* Answers */}
            <View className="gap-3">
              {flashcard.answers.map((answer, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  activeOpacity={0.7}
                  className={`${getAnswerStyle(index)} border-2 rounded-lg p-4`}
                >
                  <Text className={`${getAnswerTextStyle(index)} text-base`}>
                    {String.fromCharCode(65 + index)}. {answer}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Explanation */}
            {showResult && flashcard.explanation && (
              <MotiView
                from={{ opacity: 0, translateY: -10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300 }}
                className="mt-4 p-4 bg-neutral-100 rounded-lg"
              >
                <Text className="text-sm font-semibold text-neutral-700 mb-1">
                  Explanation:
                </Text>
                <Text className="text-sm text-neutral-600">
                  {flashcard.explanation}
                </Text>
              </MotiView>
            )}
          </MotiView>

          {/* Next Card Button */}
          {showResult && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 300 }}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowResult(false);
                  setSelectedAnswer(null);
                  // TODO: Load next flashcard
                }}
                className="bg-primary-500 py-4 rounded-lg items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-lg">
                  Next Card
                </Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

