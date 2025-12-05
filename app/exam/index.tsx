/**
 * Exam Hub - List of available exams with option to start exam plans
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import { useStore } from '@/lib/store';

export default function ExamHubScreen() {
  const router = useRouter();
  const { exams, startExamPlan } = useStore();

  const handleStartPlan = (examId: string) => {
    const plan = startExamPlan(examId);
    // TODO: Navigate to exam plan detail or show success message
    alert(`Exam plan created! Start date: ${new Date(plan.startDate).toLocaleDateString()}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-success';
      case 'medium':
        return 'bg-warning';
      case 'hard':
        return 'bg-error';
      default:
        return 'bg-neutral-400';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 bg-white border-b border-neutral-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
        >
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-neutral-900">
          Exam Hub
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {exams.map((exam, index) => (
            <MotiView
              key={exam.id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: index * 100 }}
            >
              <View className="bg-white rounded-xl p-5 mb-4 shadow-sm border border-neutral-200">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-xl font-semibold text-neutral-800 mb-1">
                      {exam.title}
                    </Text>
                    <Text className="text-sm text-neutral-500">{exam.subject}</Text>
                  </View>
                  <View
                    className={`${getDifficultyColor(exam.difficulty)} px-3 py-1 rounded-full`}
                  >
                    <Text className="text-xs font-medium text-white capitalize">
                      {exam.difficulty}
                    </Text>
                  </View>
                </View>

                {/* Progress */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm text-neutral-600">Progress</Text>
                    <Text className="text-sm font-semibold text-neutral-800">
                      {exam.completedQuestions} / {exam.totalQuestions}
                    </Text>
                  </View>
                  <View className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <MotiView
                      from={{ width: 0 }}
                      animate={{
                        width: `${(exam.completedQuestions / exam.totalQuestions) * 100
                          }%`,
                      }}
                      transition={{ type: 'timing', duration: 500 }}
                      className="h-full bg-primary-500 rounded-full"
                    />
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => handleStartPlan(exam.id)}
                    className="flex-1 bg-primary-500 py-3 rounded-lg items-center"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white font-semibold">
                      Start Exam Plan
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push(`/quiz/${exam.id}`)}
                    className="flex-1 bg-secondary-500 py-3 rounded-lg items-center"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white font-semibold">Practice</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </MotiView>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

