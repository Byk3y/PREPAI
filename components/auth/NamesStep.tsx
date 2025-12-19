/**
 * Names Step Component
 * First and last name collection
 */

import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { AuthButton } from './components/AuthButton';
import type { NamesStepProps } from '@/lib/auth/types';

export function NamesStep({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  onSaveNames,
  loading,
  colors,
}: NamesStepProps) {
  return (
    <>
      <TextInput
        value={firstName}
        onChangeText={onFirstNameChange}
        placeholder="First name"
        autoCapitalize="words"
        autoComplete="name-given"
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        placeholderTextColor={colors.textSecondary}
        editable={!loading}
        autoFocus
      />

      <TextInput
        value={lastName}
        onChangeText={onLastNameChange}
        placeholder="Last name"
        autoCapitalize="words"
        autoComplete="name-family"
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        placeholderTextColor={colors.textSecondary}
        editable={!loading}
      />

      <AuthButton
        text="Continue"
        loadingText="Saving..."
        onPress={onSaveNames}
        disabled={loading}
        loading={loading}
        variant="primary"
        colors={colors}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    marginBottom: 16,
  },
});
