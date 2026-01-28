

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { formatNumber } from '@/utils/homeHelpers';
import { MacroCircle } from '@/components/homebaseline/ui/macroCircle';

interface MacroData {
  protein: number;
  carbs: number;
  fat: number;
}

interface TodayStats {
  consumed: number;
  remaining: number;
  macros: MacroData;
  goal: number;
}

interface TodayCaloriesCardProps {
  todayStats: TodayStats;
}

export function TodayCaloriesCard({ todayStats }: TodayCaloriesCardProps) {
  const { consumed, remaining, macros, goal } = todayStats;

  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={styles.headerLabel}>Today's Calories</Text>

      {/* Main Stats Row */}
      <View style={styles.mainStatsRow}>
        {/* Consumed */}
        <View style={styles.statColumn}>
          <Text style={styles.mainValue}>{formatNumber(consumed)}</Text>
          <Text style={styles.mainLabel}>kcal</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Remaining */}
        <View style={styles.statColumn}>
          <Text style={styles.remainingLabel}>Remaining</Text>
          <Text style={[styles.mainValue, styles.remainingValue]}>
            {formatNumber(remaining)}
          </Text>
        </View>
      </View>

      {/* Macros Row - Using MacroCircle component */}
      <View style={styles.macrosRow}>
        <MacroCircle
          value={macros.protein}
          label="Protein"
          type="protein"
          size="small"
        />
        <MacroCircle
          value={macros.carbs}
          label="Carbs"
          type="carbs"
          size="small"
        />
        <MacroCircle
          value={macros.fat}
          label="Fat"
          type="fat"
          size="small"
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
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.steelBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  mainStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  mainValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  mainLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  remainingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.steelBlue,
    marginBottom: 4,
  },
  remainingValue: {
    color: Colors.vividTeal,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});