
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/colors';
import { Insight, RecapInsightsResult } from '@/hooks/useRecapInsights';

type Props = Pick<RecapInsightsResult, 'insights' | 'weeksLogged' | 'hasEnoughData' | 'loading'>;

export default function InsightsSection({ insights, weeksLogged, hasEnoughData, loading }: Props) {
  if (loading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Insights</Text>
        {hasEnoughData && (
          <Text style={styles.weeksLabel}>Based on {weeksLogged} weeks</Text>
        )}
      </View>

      {!hasEnoughData ? <LockedState /> : (
        insights.map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))
      )}
    </View>
  );
}

function LockedState() {
  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedIconCircle}>
        <Ionicons name="trending-up-outline" size={22} color={Colors.vividTeal} />
      </View>
      <Text style={styles.lockedTitle}>Insights</Text>
      <Text style={styles.lockedSub}>
        Log for 2 weeks to see insights about your eating patterns
      </Text>
    </View>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const isTeal = insight.variant === 'teal';
  return (
    <View style={[styles.card, isTeal ? styles.cardTeal : styles.cardOrange]}>
      <View style={styles.cardLabelRow}>
        <View style={styles.cardIconCircle}>
          <Ionicons name={insight.icon as any} size={14} color={Colors.white} />
        </View>
        <Text style={styles.cardLabel}>{insight.label.toUpperCase()}</Text>
      </View>
      <Text style={styles.cardValue}>{insight.value}</Text>
      <Text style={styles.cardSubtitle}>{insight.subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  weeksLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },

  // Locked
  lockedCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.lightCream,
  },
  lockedIconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.tealOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  lockedTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  lockedSub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    textAlign: 'center',
    lineHeight: Typography.fontSize.sm * 1.5,
  },

  // Insight cards
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  cardTeal: { backgroundColor: Colors.vividTeal },
  cardOrange: { backgroundColor: Colors.energyOrange },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cardIconCircle: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
  },
  cardValue: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  cardSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: Typography.fontSize.sm * 1.5,
  },
});