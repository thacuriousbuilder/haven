import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface OptionCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionCard({ title, description, selected, onPress }: OptionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
      {description && (
        <Text style={[styles.description, selected && styles.descriptionSelected]}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#3D5A5C',
    backgroundColor: '#F5F7F7',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 2,
  },
  titleSelected: {
    color: '#3D5A5C',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  descriptionSelected: {
    color: '#3D5A5C',
  },
});
