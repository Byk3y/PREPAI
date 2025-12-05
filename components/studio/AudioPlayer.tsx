/**
 * AudioPlayer - Inline audio playback component
 * Features: play/pause, progress slider, time display, playback speed
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Slider } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { AudioOverview } from '@/lib/store/types';

interface AudioPlayerProps {
  audio: AudioOverview;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audio }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(audio.duration * 1000); // Convert to ms
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Load audio on mount
  useEffect(() => {
    loadAudio();
    return () => {
      // Cleanup
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audio.audio_url]);

  const loadAudio = async () => {
    try {
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: audio.audio_url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(audioSound);
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || duration);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleSeek = async (value: number) => {
    if (!sound) return;
    await sound.setPositionAsync(value);
  };

  const handleSpeedChange = async () => {
    if (!sound) return;

    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

    setPlaybackSpeed(nextSpeed);
    await sound.setRateAsync(nextSpeed, true);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
      {/* Title */}
      <Text className="text-base font-semibold text-neutral-900 mb-4">
        {audio.title}
      </Text>

      {/* Progress Slider */}
      <View className="mb-3">
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor="#3b82f6"
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor="#3b82f6"
        />
        <View className="flex-row justify-between">
          <Text className="text-xs text-neutral-500">
            {formatTime(position)}
          </Text>
          <Text className="text-xs text-neutral-500">
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-between">
        {/* Playback Speed */}
        <TouchableOpacity
          onPress={handleSpeedChange}
          className="bg-white border border-neutral-200 rounded-full px-3 py-2"
        >
          <Text className="text-sm font-medium text-neutral-700">
            {playbackSpeed}x
          </Text>
        </TouchableOpacity>

        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={handlePlayPause}
          className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center"
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color="#ffffff"
          />
        </TouchableOpacity>

        {/* Duration */}
        <View className="bg-white border border-neutral-200 rounded-full px-3 py-2">
          <Text className="text-sm font-medium text-neutral-700">
            {Math.round(audio.duration / 60)} min
          </Text>
        </View>
      </View>
    </View>
  );
};
