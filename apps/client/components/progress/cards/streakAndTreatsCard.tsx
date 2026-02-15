
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/colors';

interface StreakAndTreatsCardProps {
  currentStreak: number;
  treatDaysUsed: number;
}

export function StreakAndTreatsCard({ 
  currentStreak, 
  treatDaysUsed 
}: StreakAndTreatsCardProps) {
  return (
    <View style={styles.container}>
      {/* Streak Card */}
      <View style={styles.statCard}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.orangeOverlay }]}>
          <Ionicons name="flame" size={24} color={Colors.energyOrange} />
        </View>
        <Text style={styles.statNumber}>{currentStreak}</Text>
        <Text style={styles.statLabel}>Day Streak</Text>
      </View>

      {/* Treat Days Card */}
      <View style={styles.statCard}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.tealOverlay }]}>
          <Ionicons name="ice-cream" size={24} color={Colors.vividTeal} />
        </View>
        <Text style={styles.statNumber}>{treatDaysUsed}</Text>
        <Text style={styles.statLabel}>Treat Days</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.small,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statNumber: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
});