import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { ProgressRing } from '@/components/homebaseline/ui/progressRing';
import { formatNumber } from '@/utils/homeHelpers';
import { WeekInfo } from '@/utils/weekHelpers';

interface WeeklyBudgetCardProps {
  weeklyBudget: number;
  totalConsumed: number;
  totalRemaining: number;
  daysIntoWeek: number;
  weekInfo?: WeekInfo | null;
  isFirstWeek?: boolean; // NEW
}

export function WeeklyBudgetCard({
  weeklyBudget,
  totalConsumed,
  totalRemaining,
  daysIntoWeek,
  weekInfo,
  isFirstWeek = false, // NEW
}: WeeklyBudgetCardProps) {
  const avgPerDay = daysIntoWeek > 0 ? Math.round(totalConsumed / daysIntoWeek) : 0;

  // Only show partial week messaging if it's ALSO the user's first week
  const isActuallyPartial = weekInfo?.isPartialWeek && isFirstWeek;

  const budgetLabel = isActuallyPartial
    ? `${weekInfo!.daysTracked}-DAY BUDGET`
    : 'WEEKLY BUDGET';

  const budgetSubtext = isActuallyPartial
    ? `First week • Started mid-week`
    : `${formatNumber(avgPerDay)} avg/day`;

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
          {/* Budget box */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{budgetLabel}</Text>
            <Text style={styles.statValue}>{formatNumber(weeklyBudget)}</Text>
            <Text style={styles.statSubtext}>{budgetSubtext}</Text>
          </View>

          {/* Remaining box */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>REMAINING</Text>
            <Text style={[styles.statValue, styles.remainingValue]}>
              {formatNumber(Math.max(0, totalRemaining))}
            </Text>
            {isActuallyPartial && (
              <Text style={styles.partialWeekHint}>Extra flexibility this week!</Text>
            )}
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
  ringContainer: {},
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
  partialWeekHint: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.vividTeal,
    marginTop: 4,
  },
});