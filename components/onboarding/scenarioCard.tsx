
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ScenarioCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor: string;
  title: string;
  calories: string;
  badgeText: string;
  badgeColor: string;
};

export function ScenarioCard({
  icon,
  iconBackgroundColor,
  iconColor,
  title,
  calories,
  badgeText,
  badgeColor,
}: ScenarioCardProps) {
  return (
    <View style={styles.container}>
      {/* Icon Circle */}
      <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>

      {/* Text Content */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.calories}>{calories}</Text>
      </View>

      {/* Badge */}
      <View style={styles.badgeContainer}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
  calories: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});