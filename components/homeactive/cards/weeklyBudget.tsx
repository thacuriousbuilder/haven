import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { ProgressRing } from '@/components/homebaseline/ui/progressRing';
import { formatNumber } from '@/utils/homeHelpers';

interface WeeklyBudgetCardProps {
  weeklyBudget: number;      // Total weekly budget (e.g., 14000)
  totalConsumed: number;     // Calories used so far (e.g., 11430)
  totalRemaining: number;    // Calories remaining (e.g., 2570)
  daysIntoWeek: number;      // How many days into the week (for avg calculation)
}

export function WeeklyBudgetCard({
  weeklyBudget,
  totalConsumed,
  totalRemaining,
  daysIntoWeek,
}: WeeklyBudgetCardProps) {
  // Calculate avg per day
  const avgPerDay = daysIntoWeek > 0 ? Math.round(totalConsumed / daysIntoWeek) : 0;
  
  // Calculate percentage for ring
  const percentage = weeklyBudget > 0 ? (totalConsumed / weeklyBudget) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.topSection}>
        {/* Left: Progress ring */}
        <View style={styles.ringContainer}>
          <ProgressRing
            value={totalConsumed}
            max={weeklyBudget}
            size={150}
            strokeWidth={16}
            label="Total consumed"
            color={Colors.vividTeal}
            showPercentage={false}
          />
        </View>

        {/* Right: Stats boxes */}
        <View style={styles.statsContainer}>
          {/* Used so far */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WEEKLY BUDGET</Text>
            <Text style={styles.statValue}>{formatNumber(weeklyBudget)}</Text>
            <Text style={styles.statSubtext}>
              {formatNumber(avgPerDay)} avg/day
            </Text>
          </View>

          {/* Remaining */}
          <View style={[styles.statBox, styles.remainingBox]}>
            <Text style={styles.statLabel}>REMAINING</Text>
            <Text style={[styles.statValue, styles.remainingValue]}>
              {formatNumber(totalRemaining)}
            </Text>
          </View>
        </View>
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
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringContainer: {
    // Ring takes up left side
  },
  statsContainer: {
    flex: 1,
    marginLeft: Spacing.lg,
    gap: Spacing.md,
  },
  statBox: {
    backgroundColor: Colors.lightCream,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  remainingBox: {
    // Same styling as statBox
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.steelBlue,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 2,
  },
  remainingValue: {
    color: Colors.vividTeal,
  },
  statSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
});