
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/colors';
import { formatNumber } from '@/utils/homeHelpers';

interface DailyCaloriesChartProps {
  weekStartDate: string;
  summaries: { summary_date: string; calories_consumed: number }[];
  dailyTarget: number;
  cheatDates: string[];
}

const buildWeekDays = (
  weekStartDate: string,
  summaries: { summary_date: string; calories_consumed: number }[]
) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().toISOString().split('T')[0];

  return days.map((label, index) => {
    const date = new Date(weekStartDate + 'T00:00:00');
    date.setDate(date.getDate() + index);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const summary = summaries.find(s => s.summary_date === dateStr);
    const isFuture = dateStr > today;
    const isToday = dateStr === today;

    return {
      label,
      dateStr,
      calories: summary?.calories_consumed || 0,
      isFuture,
      isToday,
    };
  });
};

export function DailyCaloriesChart({
  weekStartDate,
  summaries,
  dailyTarget,
  cheatDates,
}: DailyCaloriesChartProps) {
  const days = buildWeekDays(weekStartDate, summaries);
  const maxCalories = Math.max(dailyTarget * 1.3, ...days.map(d => d.calories));
  const targetLinePercent = (dailyTarget / maxCalories) * 100;

  const getBarColor = (day: typeof days[0]): string => {
    if (day.isFuture || day.calories === 0) return Colors.border;
    if (day.calories <= dailyTarget * 1.05) return Colors.vividTeal;
    return Colors.error;
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="bar-chart" size={20} color={Colors.vividTeal} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Daily Calories</Text>
          <Text style={styles.subtitle}>This week's intake</Text>
        </View>
        <View style={styles.targetBadge}>
          <Text style={styles.targetLabel}>Target</Text>
          <Text style={styles.targetValue}>{formatNumber(dailyTarget)}</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartWrapper}>
        {/* Target line */}
        <View
          style={[
            styles.targetLine,
            { bottom: `${targetLinePercent}%` },
          ]}
        />

        {/* Bars */}
        <View style={styles.barsContainer}>
          {days.map((day, index) => {
            const heightPercent = day.calories > 0
              ? (day.calories / maxCalories) * 100
              : 0;
            const isTreatDay = cheatDates.includes(day.dateStr);

            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  {/* Treat day star indicator */}
                  {isTreatDay && !day.isFuture && (
                    <Text style={styles.treatIndicator}>★</Text>
                  )}
                  {/* Calorie label */}
                  {day.calories > 0 && (
                    <Text style={styles.calorieLabel}>
                      {day.calories >= 1000
                        ? `${(day.calories / 1000).toFixed(1)}k`
                        : day.calories}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(heightPercent, day.calories > 0 ? 4 : 0)}%`,
                        backgroundColor: getBarColor(day),
                        opacity: day.isFuture ? 0.3 : 1,
                      },
                    ]}
                  />
                </View>
                <Text style={[
                  styles.dayLabel,
                  day.isToday && styles.dayLabelToday,
                ]}>
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.vividTeal }]} />
          <Text style={styles.legendText}>On target</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
          <Text style={styles.legendText}>Over target</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendStar}>★</Text>
          <Text style={styles.legendText}>Treat day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.border }]} />
          <Text style={styles.legendText}>No data</Text>
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
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.tealOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.steelBlue,
  },
  targetBadge: {
    alignItems: 'flex-end',
  },
  targetLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.steelBlue,
    marginBottom: 2,
  },
  targetValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  chartWrapper: {
    height: 140,
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: Colors.energyOrange,
    opacity: 0.6,
    zIndex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: Spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 6,
  },
  barContainer: {
    width: '80%',
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  treatIndicator: {
    fontSize: 10,
    color: Colors.energyOrange,
    marginBottom: 2,
  },
  calorieLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.steelBlue,
    marginBottom: 2,
  },
  bar: {
    width: '100%',
    borderRadius: BorderRadius.sm,
  },
  dayLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.steelBlue,
  },
  dayLabelToday: {
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendStar: {
    fontSize: 10,
    color: Colors.energyOrange,
  },
  legendText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
});