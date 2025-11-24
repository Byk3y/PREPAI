/**
 * Home Screen - Main landing screen with progress, CTAs, and continue studying
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
import { MotiView } from 'moti';
import { useStore } from '@/lib/store';
import { HomeCard } from '@/components/HomeCard';
import { ContinueCard } from '@/components/ContinueCard';
import { PetBubble } from '@/components/PetBubble';

export default function HomeScreen() {
  const router = useRouter();
  const { user, recentItems } = useStore();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-neutral-200">
          <View>
            <Text className="text-2xl font-bold text-neutral-900">
              Prep AI
            </Text>
            <Text className="text-sm text-neutral-500">Welcome back, {user.name}! 👋</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-primary-400 items-center justify-center">
            <Text className="text-xl">👤</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Progress Card */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          className="mx-6 mt-6 bg-white rounded-xl p-5 shadow-sm border border-neutral-200"
        >
          <Text className="text-lg font-semibold text-neutral-800 mb-4">
            Today's Progress
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="items-center">
              <Text className="text-3xl font-bold text-primary-500">
                {user.streak}
              </Text>
              <Text className="text-sm text-neutral-500 mt-1">Day Streak 🔥</Text>
            </View>
            <View className="items-center">
              <Text className="text-3xl font-bold text-secondary-500">
                {user.coins}
              </Text>
              <Text className="text-sm text-neutral-500 mt-1">Coins 💰</Text>
            </View>
            <View className="items-center">
              <Text className="text-3xl font-bold text-accent-500">3</Text>
              <Text className="text-sm text-neutral-500 mt-1">Tasks Done ✅</Text>
            </View>
          </View>
        </MotiView>

        {/* CTA Cards */}
        <View className="px-6 mt-6">
          <HomeCard
            title="Study for an Exam"
            subtitle="Prepare with flashcards and practice tests"
            icon="📝"
            color="primary"
            onPress={() => router.push('/exam')}
          />
          <HomeCard
            title="Learn Something New"
            subtitle="Explore lessons and expand your knowledge"
            icon="📚"
            color="secondary"
            onPress={() => router.push('/lesson/lesson-1')}
          />
        </View>

        {/* Continue Studying Section */}
        <View className="px-6 mt-6 mb-8">
          <Text className="text-xl font-semibold text-neutral-800 mb-4">
            Continue Studying
          </Text>
          {recentItems.map((item) => (
            <ContinueCard
              key={`${item.type}-${item.id}`}
              type={item.type}
              id={item.id}
              title={item.title}
              progress={item.progress}
            />
          ))}
        </View>
      </ScrollView>

      {/* Pet Bubble */}
      <PetBubble />
    </SafeAreaView>
  );
}

