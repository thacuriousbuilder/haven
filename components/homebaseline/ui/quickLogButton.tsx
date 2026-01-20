

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface QuickLogButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function QuickLogButton({
  icon,
  label,
  onPress,
  variant = 'secondary',
}: QuickLogButtonProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          isPrimary ? styles.iconContainerPrimary : styles.iconContainerSecondary,
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={isPrimary ? Colors.white : Colors.vividTeal}
        />
      </View>
      <Text
        style={[
          styles.label,
          isPrimary ? styles.labelPrimary : styles.labelSecondary,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  buttonPrimary: {
    // Additional styling for primary variant
  },
  buttonSecondary: {
    // Additional styling for secondary variant
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerPrimary: {
    backgroundColor: Colors.energyOrange,
  },
  iconContainerSecondary: {
    backgroundColor: Colors.lightCream,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelPrimary: {
    color: Colors.graphite,
  },
  labelSecondary: {
    color: Colors.steelBlue,
  },
});