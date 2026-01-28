
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { ProgressRing } from '../ui/progressRing';
import { MacroCircle } from '../ui/macroCircle';
import { formatNumber } from '@/utils/homeHelpers';
import type { MacroData } from '@/types/home';

interface SummaryStatsCardProps {
  totalCalories: number;    // Total consumed during baseline (e.g., 7290)
  daysLogged: number;       // Number of days with logs (e.g., 4)
  avgPerDay: number;        // Average per day (e.g., 1823)
  macros: MacroData;        // Total macros across all logged days
}

export function SummaryStatsCard({
  totalCalories,
  daysLogged,
  avgPerDay,
  macros,
}: SummaryStatsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topSection}>
        {/* Left: Progress ring */}
        <View style={styles.ringContainer}>
          <ProgressRing
            value={daysLogged}
            displayValue={totalCalories}
            label="total kcal"
            max={7}
            size={150}
            strokeWidth={16}
          />
        </View>

        {/* Right: Stats box (positioned with auto flex) */}
        <View style={styles.statsBox}>
          <Text style={styles.daysLoggedLabel}>
            {daysLogged} {daysLogged === 1 ? 'DAY' : 'DAYS'}
          </Text>
          <Text style={styles.loggedText}>LOGGED</Text>
          
          <Text style={styles.avgValue}>
            {formatNumber(avgPerDay)}
          </Text>
          <Text style={styles.avgLabel}>avg/day</Text>
        </View>
      </View>

      {/* Bottom: Macro row */}
      <View style={styles.macrosRow}>
        <View style={styles.macroItem}>
          <MacroCircle
            value={Math.round(macros.protein)}
            label="Protein"
            type="protein"
            size="small"
          />
        </View>
        <View style={styles.macroItem}>
          <MacroCircle
            value={Math.round(macros.carbs)}
            label="Carbs"
            type="carbs"
            size="small"
          />
        </View>
        <View style={styles.macroItem}>
          <MacroCircle
            value={Math.round(macros.fat)}
            label="Fat"
            type="fat"
            size="small"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingTop: Spacing.xxl,        // Extra top padding
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  ringContainer: {
    // No extra margin needed
  },
  statsBox: {
    backgroundColor: Colors.lightCream,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  daysLoggedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.graphite,
    letterSpacing: 0.5,
  },
  loggedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.steelBlue,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  avgValue: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 2,
  },
  avgLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  macroItem: {
    alignItems: 'center',
  },
});