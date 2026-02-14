import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ContinueButtonProps {
  onPress: () => void;
  disabled?: boolean;
  text?: string;
}

export function ContinueButton({ onPress, disabled = false, text = 'Continue' }: ContinueButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  textDisabled: {
    color: '#9CA3AF',
  },
});