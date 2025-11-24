/**
 * Pet Half-Sheet Modal - Shows pet details, streak, XP, and missions
 * Closes on swipe down or tap outside
 * TODO: Add swipe-to-dismiss gesture with react-native-gesture-handler
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useStore } from '@/lib/store';

export default function PetSheetScreen() {
  const router = useRouter();
  const { user, petState } = useStore();

  // Mock missions data
  const missions = [
    { id: '1', title: 'Complete 5 flashcards', progress: 3, total: 5, reward: 50 },
    { id: '2', title: 'Study for 30 minutes', progress: 20, total: 30, reward: 30 },
    { id: '3', title: 'Maintain 7-day streak', progress: 7, total: 7, reward: 100 },
  ];

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={() => router.back()}
    >
      <Pressable
        className="flex-1 bg-black/50"
        onPress={() => router.back()}
      >
        <Pressable className="flex-1" onPress={(e) => e.stopPropagation()}>
          <SafeAreaView className="flex-1 justify-end">
            <MotiView
              from={{ translateY: 500 }}
              animate={{ translateY: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              className="bg-white rounded-t-3xl max-h-[85%]"
            >
              {/* Handle bar */}
              <View className="items-center py-3">
                <View className="w-12 h-1 bg-neutral-300 rounded-full" />
              </View>

              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-6 pb-8">
                  {/* Close button */}
                  <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-4 right-6 z-10 w-8 h-8 items-center justify-center"
                  >
                    <Text className="text-2xl text-neutral-500">×</Text>
                  </TouchableOpacity>

                  {/* Pet Display */}
                  <View className="items-center py-6">
                    <MotiView
                      from={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{
                        type: 'timing',
                        duration: 2000,
                        loop: true,
                        repeatReverse: true,
                      }}
                      className="w-40 h-40 rounded-full bg-primary-200 items-center justify-center mb-4"
                    >
                      <Text className="text-7xl">🐾</Text>
                    </MotiView>
                    <Text className="text-2xl font-bold text-neutral-800">
                      {petState.name}
                    </Text>
                    <Text className="text-base text-neutral-500">
                      Level {petState.level}
                    </Text>
                  </View>

                  {/* Streak */}
                  <View className="bg-primary-50 rounded-xl p-4 mb-4 items-center">
                    <Text className="text-sm text-neutral-600 mb-1">Current Streak</Text>
                    <Text className="text-4xl font-bold text-primary-600">
                      {user.streak} 🔥
                    </Text>
                  </View>

                  {/* XP Bar */}
                  <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-base font-semibold text-neutral-800">
                        Experience Points
                      </Text>
                      <Text className="text-sm text-neutral-500">
                        {petState.xp} / {petState.xpToNext} XP
                      </Text>
                    </View>
                    <View className="h-4 bg-neutral-200 rounded-full overflow-hidden">
                      <MotiView
                        from={{ width: 0 }}
                        animate={{
                          width: `${(petState.xp / petState.xpToNext) * 100}%`,
                        }}
                        transition={{ type: 'timing', duration: 500 }}
                        className="h-full bg-primary-500 rounded-full"
                      />
                    </View>
                  </View>

                  {/* Missions */}
                  <View className="mb-4">
                    <Text className="text-xl font-semibold text-neutral-800 mb-4">
                      Missions
                    </Text>
                    {missions.map((mission) => (
                      <MotiView
                        key={mission.id}
                        from={{ opacity: 0, translateX: -20 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{ type: 'timing', duration: 300 }}
                        className="bg-neutral-50 rounded-lg p-4 mb-3"
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-base font-medium text-neutral-800 flex-1">
                            {mission.title}
                          </Text>
                          <Text className="text-sm font-semibold text-primary-600">
                            +{mission.reward} XP
                          </Text>
                        </View>
                        <View className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <MotiView
                            from={{ width: 0 }}
                            animate={{
                              width: `${
                                (mission.progress / mission.total) * 100
                              }%`,
                            }}
                            transition={{ type: 'timing', duration: 500 }}
                            className="h-full bg-primary-500 rounded-full"
                          />
                        </View>
                        <Text className="text-xs text-neutral-500 mt-1">
                          {mission.progress} / {mission.total}
                        </Text>
                      </MotiView>
                    ))}
                  </View>

                  {/* Stats */}
                  <View className="bg-neutral-50 rounded-xl p-4">
                    <Text className="text-base font-semibold text-neutral-800 mb-3">
                      Stats
                    </Text>
                    <View className="flex-row justify-between">
                      <View className="items-center">
                        <Text className="text-2xl font-bold text-neutral-800">
                          {user.coins}
                        </Text>
                        <Text className="text-xs text-neutral-500">Coins</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-2xl font-bold text-neutral-800">
                          {petState.level}
                        </Text>
                        <Text className="text-xs text-neutral-500">Level</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-2xl font-bold text-neutral-800">
                          {user.streak}
                        </Text>
                        <Text className="text-xs text-neutral-500">Streak</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </MotiView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

