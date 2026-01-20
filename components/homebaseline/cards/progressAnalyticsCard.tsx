

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { formatNumber, getWeekdayAbbreviation } from '@/utils/homeHelpers';
import type { WeeklyProgress } from '@/types/home';

interface ProgressAnalyticsCardProps {
  weeklyProgress: WeeklyProgress;
  onViewAnalytics: () => void;
}

export function ProgressAnalyticsCard({
  weeklyProgress,
  onViewAnalytics,
}: ProgressAnalyticsCardProps) {
  const { avgCalories, status, dailyIntake, goalCalories } = weeklyProgress;

  // Get status color and text
  const getStatusColor = () => {
    switch (status) {
      case 'on_track':
        return Colors.success;
      case 'needs_attention':
        return Colors.warning;
      case 'over_budget':
        return Colors.error;
      default:
        return Colors.steelBlue;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'on_track':
        return 'On track';
      case 'needs_attention':
        return 'Needs attention';
      case 'over_budget':
        return 'Over budget';
      default:
        return 'On track';
    }
  };

  // Calculate max value for bar chart scaling
  const maxValue = Math.max(...dailyIntake, goalCalories);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="trending-up" size={20} color={Colors.vividTeal} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Weekly calorie trend</Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.avgValue}>{formatNumber(avgCalories)} avg</Text>
          <Text style={[styles.statusBadge, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Mini bar chart */}
      <View style={styles.chartContainer}>
        {dailyIntake.map((calories, index) => {
          const heightPercentage = (calories / maxValue) * 100;
          const isAboveGoal = calories > goalCalories;
          
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${heightPercentage}%`,
                      backgroundColor: isAboveGoal ? Colors.warning : Colors.vividTeal,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>
                {getWeekdayAbbreviation(index)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Goal line indicator */}
      <Text style={styles.goalText}>{formatNumber(goalCalories)} goal</Text>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onViewAnalytics}
        activeOpacity={0.7}
      >
        <Text style={styles.ctaText}>View Full Analytics</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.vividTeal} />
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  avgValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 2,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: Spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barContainer: {
    width: '80%',
    height: 60,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.steelBlue,
  },
  goalText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightCream,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
});