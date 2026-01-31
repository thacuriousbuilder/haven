

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { QuickLogButton } from '../ui/quickLogButton';

interface QuickLogCardProps {
  onCamera: () => void;
  onSearch: () => void;
  onPhoto: () => void;
  onRecipe: () => void;
}

export function QuickLogCard({
  onCamera,
  onSearch,
  onPhoto,
  onRecipe,
}: QuickLogCardProps) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quick Log</Text>
        <Text style={styles.addMealText}>+ Add meal</Text>
      </View>

      {/* Buttons Grid */}
      <View style={styles.buttonsContainer}>
        <QuickLogButton
          icon="camera"
          label="Scan"
          onPress={onCamera}
        />
        <QuickLogButton
          icon="search"
          label="Search"
          onPress={onSearch}
        />
        <QuickLogButton
          icon="image"
          label="Photo"
          onPress={onPhoto}
        />
        <QuickLogButton
          icon="restaurant"
          label="Recipe"
          onPress={onRecipe}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.graphite,
  },
  addMealText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});