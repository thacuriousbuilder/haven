

import React from 'react';
import {
  View, Text, ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { PlanData } from '@/hooks/usePlanData';
import ManageCaloriesCard from './manageCaloriesCard';

type Props = {
  planData: PlanData;
  refetch: () => void;
  adjustedBudget: number;
};

export default function BudgetView({ planData, refetch, adjustedBudget }: Props) {
  const { weeklyBudget, totalEaten, remaining, isOverBudget, overageAmount, days } = planData;

  const progressPct = Math.min(totalEaten / weeklyBudget, 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Teal hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>This Week</Text>

        <View style={styles.heroAmounts}>
          <Text style={styles.heroUsed}>
            {totalEaten.toLocaleString()}
          </Text>
          <Text style={styles.heroBudget}>
            {' '}/ {weeklyBudget.toLocaleString()}
          </Text>
          <Text style={styles.heroUnit}>cal</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            { width: `${progressPct * 100}%` },
            isOverBudget && styles.progressFillOver,
          ]} />
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterLabel}>Used</Text>
          <Text style={styles.heroFooterRight}>
            {isOverBudget
              ? 'Over budget'
              : `${remaining.toLocaleString()} remaining`}
          </Text>
        </View>
      </View>

      {/* Manage Calories card */}
      <ManageCaloriesCard planData={planData} refetch={refetch} />

      {/* Daily Targets label */}
      <Text style={styles.sectionTitle}>Daily Targets</Text>

      {planData.days.map((day) => {
        const isAdjustedToday = day.isToday && adjustedBudget > 0 && adjustedBudget !== day.target;
        const displayTarget   = day.isToday && adjustedBudget > 0 ? adjustedBudget : day.target;

        return (
          <View
            key={day.date}
            style={[styles.dayRow, day.isToday && styles.dayRowToday]}
          >
            {/* Badge */}
            <View style={[
              styles.dayBadge,
              day.isToday && styles.dayBadgeToday,
              day.isTreatDay && styles.dayBadgeTreat,
            ]}>
              <Text style={[
                styles.dayBadgeText,
                day.isToday && styles.dayBadgeTextToday,
              ]}>
                {day.dayNumber}
              </Text>
            </View>

            {/* Label */}
            <View style={styles.dayMiddle}>
              <Text style={[
                styles.dayName,
                day.isToday && styles.dayNameToday,
              ]}>
                {day.isToday ? 'Today' : day.dayLabel}
              </Text>
              {day.isTreatDay && (
                <Text style={styles.treatLabel}>Treat day</Text>
              )}
            </View>

            {/* Right: target + eaten */}
            <View style={styles.dayRight}>
              {(day.isAdjusted || isAdjustedToday) && (
                <Text style={styles.dayTargetOriginal}>
                  {day.baseTarget.toLocaleString()}
                </Text>
              )}
              <Text style={[
                styles.dayTarget,
                (day.isAdjusted || isAdjustedToday) && styles.dayTargetAdjusted,
              ]}>
                {displayTarget.toLocaleString()}
              </Text>
              {(day.isAdjusted || isAdjustedToday) && (
                <Text style={styles.adjustedLabel}>
                  {day.isToday ? 'recommended' : 'adjusted'}
                </Text>
              )}
              {(day.isPast || day.isToday) && day.eaten > 0 && (
                <Text style={[
                  styles.dayEaten,
                  day.eaten > displayTarget && styles.dayEatenOver,
                ]}>
                  {day.eaten.toLocaleString()} eaten
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },

  heroCard: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.small,
  },
  heroLabel: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  heroAmounts: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  heroUsed: {
    fontSize: Typography.fontSize.huge,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  heroBudget: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.regular,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  heroUnit: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
    marginLeft: Spacing.xs,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
  },
  progressFillOver: {
    backgroundColor: Colors.energyOrange,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroFooterLabel: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  heroFooterRight: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginTop: Spacing.xs,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  dayRowToday: {
    backgroundColor: Colors.tealOverlay,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeToday: {
    backgroundColor: Colors.vividTeal,
  },
  dayBadgeTreat: {
    backgroundColor: Colors.orangeOverlay,
  },
  dayBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.steelBlue,
  },
  dayBadgeTextToday: {
    color: Colors.white,
  },
  dayMiddle: { flex: 1 },
  dayName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
  },
  dayNameToday: {
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  treatLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.energyOrange,
    marginTop: 2,
  },
  dayRight: { alignItems: 'flex-end' },
  dayTargetOriginal: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  dayTarget: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  dayTargetAdjusted: {
    color: Colors.energyOrange,
  },
  adjustedLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.energyOrange,
    fontStyle: 'italic',
    marginTop: 1,
  },
  dayEaten: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  dayEatenOver: {
    color: Colors.energyOrange,
  },
});