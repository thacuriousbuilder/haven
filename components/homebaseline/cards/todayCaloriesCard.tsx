

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { MacroCircle } from '../ui/macroCircle';
import { formatNumber } from '@/utils/homeHelpers';
import type { TodayStats } from '@/types/home';

interface TodayCaloriesCardProps {
  todayStats: TodayStats;
}

export function TodayCaloriesCard({ todayStats }: TodayCaloriesCardProps) {
  const { consumed, remaining, macros } = todayStats;

  return (
    <View style={styles.card}>
      {/* Top: Calories row */}
      <View style={styles.caloriesRow}>
        {/* Left: Today's Calories */}
        <View style={styles.calorieColumn}>
          <Text style={styles.label}>Today's Calories</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{formatNumber(consumed)}</Text>
            <Text style={styles.unit}>kcal</Text>
          </View>
        </View>

        {/* Right: Remaining */}
        <View style={styles.calorieColumn}>
          <Text style={[styles.label, styles.labelRight]}>Remaining</Text>
          <Text style={[styles.value, styles.remainingValue]}>
            {formatNumber(remaining)}
          </Text>
        </View>
      </View>

      {/* Bottom: Macro circles */}
      <View style={styles.macrosContainer}>
        <MacroCircle
          value={Math.round(macros.protein)}
          label="Protein"
          type="protein"
          size="medium"
        />
        <MacroCircle
          value={Math.round(macros.carbs)}
          label="Carbs"
          type="carbs"
          size="medium"
        />
        <MacroCircle
          value={Math.round(macros.fat)}
          label="Fat"
          type="fat"
          size="medium"
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
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  calorieColumn: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
    marginBottom: 6,
  },
  labelRight: {
    textAlign: 'right',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.graphite,
  },
  unit: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  remainingValue: {
    color: Colors.vividTeal,
    textAlign: 'right',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
});