// components/progress/cards/weeklyBudgetPerformanceCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/colors';

interface WeekData {
  weekLabel: string; // "Week 1", "Week 2", etc.
  budgetUsed: number; // calories consumed
  budgetTotal: number; // weekly budget
  percentageUsed: number; // calculated percentage
}

interface WeeklyBudgetPerformanceCardProps {
  weeks: WeekData[];
}

export function WeeklyBudgetPerformanceCard({ weeks }: WeeklyBudgetPerformanceCardProps) {
    const avgPercentage = weeks.length > 0
      ? Math.round(weeks.reduce((sum, w) => sum + w.percentageUsed, 0) / weeks.length)
      : 0;
  
    const getStatusColor = (percentage: number): string => {
      if (percentage <= 95) return '#10B981';
      if (percentage <= 105) return Colors.energyOrange;
      return '#EF4444';
    };
  
    const getStatusText = (): string => {
      if (avgPercentage <= 95) return 'Great job!';
      if (avgPercentage <= 105) return 'Almost there';
      return 'Over budget';
    };
  
    // Show message if only 1 week
    const isSingleWeek = weeks.length === 1;
  
    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="trending-up" size={20} color={Colors.vividTeal} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Weekly Budget Performance</Text>
            <Text style={styles.subtitle}>
              {isSingleWeek ? 'First week' : `Last ${weeks.length} weeks`}
            </Text>
          </View>
          <View style={styles.statsContainer}>
            <Text style={styles.avgValue}>{avgPercentage}% avg</Text>
            <Text style={[styles.statusText, { color: getStatusColor(avgPercentage) }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
  
        {isSingleWeek ? (
          // Single week display
          <View style={styles.singleWeekContainer}>
            <View style={styles.singleWeekBar}>
              <View
                style={[
                  styles.singleWeekFill,
                  {
                    width: `${Math.min(100, weeks[0].percentageUsed)}%`,
                    backgroundColor: getStatusColor(weeks[0].percentageUsed),
                  },
                ]}
              />
            </View>
            <Text style={styles.singleWeekLabel}>
              {Math.round(weeks[0].percentageUsed)}% of weekly budget used
            </Text>
            <Text style={styles.singleWeekHelper}>
              Track for a few more weeks to see your trends
            </Text>
          </View>
        ) : (
          // Multi-week chart
          <>
            <View style={styles.chartContainer}>
              {weeks.map((week, index) => {
                const heightPercentage = Math.min(100, week.percentageUsed);
                const barColor = getStatusColor(week.percentageUsed);
                
                return (
                  <View key={index} style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${heightPercentage}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.weekLabel}>{week.weekLabel}</Text>
                    <Text style={[styles.percentageLabel, { color: barColor }]}>
                      {Math.round(week.percentageUsed)}%
                    </Text>
                  </View>
                );
              })}
            </View>
  
            {/* Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>On track (≤95%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.energyOrange }]} />
                <Text style={styles.legendText}>Close (96-105%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Over ({'>'}105%)</Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  }

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  statsContainer: {
    alignItems: 'flex-end',
  },
  avgValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: 2,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  barContainer: {
    width: '70%',
    height: 80,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  weekLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.steelBlue,
  },
  percentageLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  legendContainer: {
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
  legendText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
  singleWeekContainer: {
    paddingVertical: Spacing.xl,
  },
  singleWeekBar: {
    height: 12,
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  singleWeekFill: {
    height: '100%',
    borderRadius: BorderRadius.xs,
  },
  singleWeekLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  singleWeekHelper: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    textAlign: 'center',
  },
});