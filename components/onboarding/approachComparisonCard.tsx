
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ApproachComparisonCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  calories: string;
  badge: string;
  badgeColor: string;
  description: string;
  descriptionHighlight?: string;
  backgroundColor?: string;
  titleColor?: string;
};

export function ApproachComparisonCard({
  icon,
  iconColor,
  title,
  calories,
  badge,
  badgeColor,
  description,
  descriptionHighlight,
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  titleColor = 'rgba(255, 255, 255, 0.6)',
}: ApproachComparisonCardProps) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header with icon and title */}
      <View style={styles.header}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      </View>

      {/* Calories and Badge */}
      <View style={styles.caloriesContainer}>
        <Text style={styles.calories}>{calories}</Text>
        <View style={styles.badgeContainer}>
          <Text style={[styles.badge, { color: badgeColor }]}>{badge}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        {description}
        {descriptionHighlight && (
          <Text style={styles.descriptionHighlight}> {descriptionHighlight}</Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  calories: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  badgeContainer: {
    paddingBottom: 8,
  },
  badge: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  descriptionHighlight: {
    color: '#fff',
    fontWeight: '600',
  },
});