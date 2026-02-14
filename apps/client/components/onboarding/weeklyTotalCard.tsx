
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type WeeklyTotalCardProps = {
  totalCalories: string;
  statusText: string;
  statusColor?: string;
};

export function WeeklyTotalCard({
  totalCalories,
  statusText,
  statusColor = '#4CAF50', // Green by default
}: WeeklyTotalCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>WEEKLY TOTAL</Text>
      <Text style={styles.totalCalories}>{totalCalories}</Text>
      
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  totalCalories: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});