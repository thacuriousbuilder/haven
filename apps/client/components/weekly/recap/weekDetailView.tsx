import React, { useEffect, useRef } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { WeekSummary, DaySummary } from '@/types/recap';
import { useDayDetail } from '@/hooks/useDayDetail';

type Props = {
  week: WeekSummary;
  onBack: () => void;
  onSelectDay: (day: DaySummary) => void;
  initialDate?: string;
};

export default function WeekDetailView({ week, onBack, onSelectDay, initialDate }: Props) {
  const { days, loading, error } = useDayDetail(week.startISO);

  // Auto-select today once — parent clears initialDate on back nav so this
  // never re-fires when user returns to the week list
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (!initialDate || loading || !days.length) return;
    if (hasAutoSelected.current) return;
    const match = days.find(d => d.fullDate === initialDate);
    if (match) {
      hasAutoSelected.current = true;
      onSelectDay(match);
    }
  }, [initialDate, days, loading]);

  if (initialDate && !hasAutoSelected.current) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.vividTeal} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.vividTeal} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load week.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back nav */}
      <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={16} color={Colors.graphite} />
        <Text style={styles.backText}>All Weeks</Text>
      </TouchableOpacity>

      {/* Teal hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroWeekLabel}>Week {week.weekNumber}</Text>
        <Text style={styles.heroDateRange}>
          {week.startDate} - {week.endDate}
        </Text>
        <View style={styles.heroStats}>
          <Ionicons name="flame-outline" size={14} color={Colors.white} />
          <Text style={styles.heroStatText}>
            {week.totalCal.toLocaleString()} cal
          </Text>
          <Ionicons
            name="trending-up-outline"
            size={14}
            color={Colors.white}
            style={{ marginLeft: Spacing.md }}
          />
          <Text style={styles.heroStatText}>
            {week.avgPerDay.toLocaleString()} avg/day
          </Text>
        </View>
      </View>

      {/* Daily breakdown */}
      <Text style={styles.sectionTitle}>Daily Breakdown</Text>

      {days.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No days logged this week.</Text>
        </View>
      ) : (
        <View style={styles.dayList}>
          {days.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={styles.dayCard}
              onPress={() => onSelectDay(day)}
              activeOpacity={0.7}
            >
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{day.dayLabel}</Text>
              </View>
              <View style={styles.dayMiddle}>
                <Text style={styles.dayDate}>{day.date}</Text>
                <Text style={styles.mealsLogged}>
                  {day.mealsLogged} meals logged
                </Text>
              </View>
              <Text style={styles.dayCal}>
                {day.totalCal.toLocaleString()}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.steelBlue} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightCream },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  backText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.graphite,
    fontWeight: Typography.fontWeight.medium,
  },
  heroCard: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  heroWeekLabel: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: Typography.fontWeight.medium,
  },
  heroDateRange: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  heroStatText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginTop: Spacing.xs,
  },
  dayList: { gap: Spacing.sm },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },
  dayBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.tealOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
  },
  dayMiddle: { flex: 1 },
  dayDate: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  mealsLogged: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  dayCal: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
});