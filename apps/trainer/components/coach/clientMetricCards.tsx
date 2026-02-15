
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface ClientMetricCardsProps {
  dayStreak: number;
  todayMeals: number;
}

export function ClientMetricCards({ dayStreak, todayMeals }: ClientMetricCardsProps) {
  return (
    <View style={styles.container}>
      {/* Day Streak Card */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="flame" size={24} color={Colors.energyOrange} />
        </View>
        <Text style={styles.number}>{dayStreak}</Text>
        <Text style={styles.label}>Day Streak</Text>
      </View>

      {/* Today's Meals Card */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="restaurant" size={24} color={Colors.vividTeal} />
        </View>
        <Text style={styles.number}>{todayMeals}</Text>
        <Text style={styles.label}>Today's Meals</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    marginBottom: 12,
  },
  number: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});