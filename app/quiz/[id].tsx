/**
 * Quiz Screen - Full quiz viewer
 * Route: /quiz/[id] where id = quiz_id
 */

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { QuizViewer } from '@/components/studio/QuizViewer';
import { TikTokLoader } from '@/components/TikTokLoader';
import type { Quiz } from '@/lib/store/types';
import { supabase } from '@/lib/supabase';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export default function QuizScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>(); // quiz_id
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch quiz with questions
      const { data, error: fetchError } = await supabase
        .from('studio_quizzes')
        .select('*, questions:studio_quiz_questions(*)')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        setError('Quiz not found');
        return;
      }

      // Transform data to match Quiz interface
      const quizData: Quiz = {
        id: data.id,
        notebook_id: data.notebook_id,
        title: data.title,
        total_questions: data.total_questions,
        created_at: data.created_at,
        questions: (data.questions || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correct: q.correct_answer,
            hint: q.hint ?? null,
            explanations: q.explanations ?? null,
          })),
      };

      setQuiz(quizData);
    } catch (err: any) {
      console.error('Error fetching quiz:', err);
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <TikTokLoader size={14} color="#6366f1" containerWidth={60} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading quiz...</Text>
      </View>
    );
  }

  if (error || !quiz) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
          {error || 'Quiz not available'}
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Generate a quiz from the Studio tab to test your knowledge
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <QuizViewer quiz={quiz} onClose={handleClose} />
    </View>
  );
}
