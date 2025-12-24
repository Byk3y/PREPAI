import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/lib/ThemeContext';
import { TypewriterText } from '../components/TypewriterText';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

import NovaFull from '../../../assets/pets/stage-1/full-view.png';

interface Screen4PetNamingProps {
  petName: string;
  onNameChange: (name: string) => void;
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen4_PetNaming({ petName, onNameChange, colors }: Screen4PetNamingProps) {
  const [headlineComplete, setHeadlineComplete] = useState(false);
  const suggestions = ['Nova', 'Buddy', 'Spark', 'Luna'];

  const handleHeadlineComplete = useCallback(() => {
    setHeadlineComplete(true);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Section: Pet + Speech Bubble */}
      <View style={styles.topSection}>
        <MotiView
          from={{ opacity: 0, scale: 0.5, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 300 } as any}
          style={styles.petContainer}
        >
          <MotiView
            animate={{ translateY: [-8, 8, -8] }}
            transition={{ loop: true, type: 'timing', duration: 3000 } as any}
          >
            <Image
              source={NovaFull}
              style={styles.petImage}
              resizeMode="contain"
            />
          </MotiView>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.8, translateY: 10 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 600 } as any}
          style={[styles.bubbleContainer, { backgroundColor: colors.surfaceElevated }]}
        >
          <TypewriterText
            text="Hi! I'm your Personal AI Mentor. What should you call me?"
            style={[styles.headline, { color: colors.text }]}
            speed={40}
            delay={1000}
            onComplete={handleHeadlineComplete}
          />
          <View style={styles.bubbleTail}>
            <Svg width="24" height="16" viewBox="0 0 24 16">
              <Path d="M12 16L0 0H24L12 16Z" fill={colors.surfaceElevated} />
            </Svg>
          </View>
        </MotiView>
      </View>

      {/* Input Section */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: headlineComplete ? 1 : 0, translateY: headlineComplete ? 0 : 20 }}
        transition={{ type: 'timing', duration: 600, delay: 200 } as any}
        style={styles.inputSection}
      >
        <TextInput
          value={petName}
          onChangeText={onNameChange}
          placeholder="Type my name..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surfaceElevated,
              borderColor: petName.trim() ? '#F97316' : 'transparent',
            }
          ]}
          maxLength={15}
          autoCapitalize="words"
          autoCorrect={false}
        />

        {/* Suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionTitle, { color: colors.textSecondary }]}>Need ideas?</Text>
          <View style={styles.suggestionsGrid}>
            {suggestions.map((name) => {
              const isSelected = petName === name;
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onNameChange(name);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: isSelected ? '#F9731608' : colors.surfaceElevated,
                      borderColor: isSelected ? '#F97316' : 'transparent',
                    }
                  ]}
                >
                  <Text style={[
                    styles.suggestionText,
                    { color: isSelected ? '#F97316' : colors.text }
                  ]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Explainer / Motivation */}
        <View style={[styles.infoCard, { backgroundColor: '#3B82F608', borderColor: '#3B82F620' }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            I'll grow as you learn, celebrate your wins, and keep you motivated every step of the way!
          </Text>
        </View>
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Space for the bottom button
  },
  topSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  petContainer: {
    width: width * 0.45,
    height: width * 0.45,
    zIndex: 1,
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  bubbleContainer: {
    marginTop: -5,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    width: '100%',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -15,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headline: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 24,
    textAlign: 'center',
  },
  inputSection: {
    width: '100%',
  },
  input: {
    height: 70,
    borderRadius: 24,
    paddingHorizontal: 24,
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  suggestionsContainer: {
    marginBottom: 32,
  },
  suggestionTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  suggestionChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  infoCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    lineHeight: 20,
    textAlign: 'center',
  },
});

