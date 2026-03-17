
import React, { useState } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { WeekSummary } from '@/types/recap';
import InsightsSection from '@/components/weekly/recap/insightSection';
import { useRecapInsights } from '@/hooks/useRecapInsights';

const DEFAULT_VISIBLE = 2;
const EXPAND_BY = 2;

type Props = {
  weeks: WeekSummary[];
  loading: boolean;
  error: string | null;
  onSelectWeek: (week: WeekSummary) => void;
};

export default function RecapTab({ weeks, loading, error, onSelectWeek }: Props) {
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);
  const insightsData = useRecapInsights();

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
        <Text style={styles.errorText}>Could not load history.</Text>
      </View>
    );
  }

  const visibleWeeks = weeks.slice(0, visibleCount);
  const canShowMore = visibleCount < weeks.length;
  const canShowLess = visibleCount > DEFAULT_VISIBLE;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Insights */}
      <InsightsSection {...insightsData} />

      <View style={styles.divider} />

      {/* Weekly History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Weekly History</Text>

        {weeks.length === 0 ? (
          <Text style={styles.emptyText}>No weeks logged yet.</Text>
        ) : (
          <>
            {visibleWeeks.map(week => (
              <TouchableOpacity
                key={week.id}
                style={styles.card}
                onPress={() => onSelectWeek(week)}
                activeOpacity={0.7}
              >
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>W{week.weekNumber}</Text>
                </View>

                <View style={styles.cardMiddle}>
                  <Text style={styles.dateRange}>
                    {week.startDate} - {week.endDate}
                  </Text>
                  <Text style={styles.daysLogged}>{week.daysLogged} days logged</Text>
                  <Text style={styles.avgDay}>
                    {week.avgPerDay.toLocaleString()} avg/day
                  </Text>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.totalCal}>
                    {week.totalCal.toLocaleString()}
                  </Text>
                  <Text style={styles.totalCalLabel}>total cal</Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={Colors.steelBlue} />
              </TouchableOpacity>
            ))}

            {/* Pagination */}
            <View style={styles.paginationRow}>
              {canShowMore && (
                <TouchableOpacity
                  onPress={() => setVisibleCount(v => v + EXPAND_BY)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.paginationText}>Show 2 more weeks</Text>
                </TouchableOpacity>
              )}
              {canShowLess && (
                <TouchableOpacity
                  onPress={() => setVisibleCount(DEFAULT_VISIBLE)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.paginationText}>Show less</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightCream },
  content:   { paddingBottom: Spacing.xxxl },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  historySection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.vividTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  cardMiddle: { flex: 1 },
  dateRange: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  daysLogged: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  avgDay: {
    fontSize: Typography.fontSize.xs,
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 2,
  },
  cardRight: { alignItems: 'flex-end' },
  totalCal: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  totalCalLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
  paginationRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  paginationText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
});