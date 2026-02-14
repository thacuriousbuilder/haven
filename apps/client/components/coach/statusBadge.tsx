

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type BadgeVariant = 'active' | 'inactive';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const variantStyles = {
    active: {
      backgroundColor: '#D1FAE5',
      textColor: '#10B981',
    },
    inactive: {
      backgroundColor: '#FEE2E2',
      textColor: '#EF4444',
    },
  };

  const style = variantStyles[variant];

  return (
    <View style={[styles.container, { backgroundColor: style.backgroundColor }]}>
      <Text style={[styles.text, { color: style.textColor }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});