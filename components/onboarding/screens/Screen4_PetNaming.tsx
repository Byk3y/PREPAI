/**
 * Screen 4: Pet Naming
 * Lets user name their study companion (renamed from Screen4 to Screen4_PetNaming)
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MotiView, MotiImage } from 'moti';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/lib/ThemeContext';

interface Screen4PetNamingProps {
  petName: string;
  onNameChange: (name: string) => void;
  colors: ReturnType<typeof getThemeColors>;
}

export function Screen4_PetNaming({ petName, onNameChange, colors }: Screen4PetNamingProps) {
  const suggestions = ['Nova', 'Buddy', 'Spark', 'Luna'];

  return (
    <ScrollView
      contentContainerStyle={styles.screenContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Pet Image */}
      <MotiImage
        source={require('@/assets/pets/stage-1/full-view.png')}
        style={styles.petImage}
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 100 }}
      />

      {/* Pet speaks in first person */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={400}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.petTextContainer}
      >
        <Text style={[styles.headline, { color: colors.text, fontSize: 28 }]}>
          "Hi! I'm your study companion."
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary, marginTop: 12 }]}>
          I'll grow as you learn, celebrate your wins, and keep you motivated every step of the way.
        </Text>

        {/* Name input */}
        <View style={styles.nameInputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>
            What should you call me?
          </Text>
          <TextInput
            value={petName}
            onChangeText={onNameChange}
            placeholder="Enter a name..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: petName ? colors.accent : colors.border,
              },
            ]}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {/* Suggestions */}
          <View style={styles.suggestions}>
            {suggestions.map((name) => (
              <TouchableOpacity
                key={name}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onNameChange(name);
                }}
                style={[
                  styles.suggestionChip,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: petName === name ? colors.accent : 'transparent',
                    borderWidth: 2,
                  },
                ]}
              >
                <Text
                  style={{
                    color: petName === name ? colors.text : colors.textSecondary,
                    fontWeight: petName === name ? '600' : '400',
                  }}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petImage: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  petTextContainer: {
    width: '100%',
    alignItems: 'center',
  },
  headline: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
    paddingHorizontal: 8,
  },
  body: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  nameInputContainer: {
    width: '100%',
    marginTop: 32,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk-SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk-Medium',
  },
  suggestions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
